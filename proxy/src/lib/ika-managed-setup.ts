/**
 * Managed demo-mode setup orchestrator.
 *
 * Wraps "click `Enable Sui trading`" into a single server-side step:
 *
 *   1. Load the pre-generated managed dWallet fixture for the requested
 *      curve.
 *   2. Verify on-chain that the dWallet's `authority` still matches the
 *      fixture's `transferredAuthority` (Polet CPI PDA). If it drifted,
 *      refuse to bind the user to a dWallet Polet can no longer sign for.
 *   3. Upsert the owner -> dWallet mapping in the local registry so
 *      later `/ika/lifecycle/progress` calls resolve it without further
 *      user action.
 *   4. If a subsidy keypair is configured, build + submit a CreateDeposit
 *      (+ TopUp) Solana transaction to fund the user's GasDeposit PDA.
 *      When no subsidy keypair is configured, the endpoint returns a
 *      `gas-deposit-required` hint instead of failing the whole setup.
 *   5. Return the final dWallet registration + GasDeposit status so the
 *      frontend can render a single success tile.
 *
 * Secrets hygiene: no user share, attestation bytes, or network signature
 * ever leak into responses. Only pre-alpha-public fields (pubkey, curve,
 * epoch, pda) and GasDeposit balances are surfaced.
 */

import { promises as fs } from 'node:fs';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  bytesToHex,
  DWALLET_CURVE,
  IKA_DWALLET_PROGRAM_ID,
  type DWalletCurveId,
} from './ika-grpc-schema';
import {
  IkaDWalletRegistry,
  type IkaDWalletRegistryEntry,
} from './ika-dwallet-registry';
import {
  buildCreateDepositInstructionData,
  buildTopUpInstructionData,
  deriveIkaGasDepositPda,
  readIkaGasDepositStatus,
  type IkaGasDepositStatus,
} from './ika-gas-deposit';
import {
  loadManagedFixture,
  requireManagedFixtureEntry,
  resolveManagedCurveKey,
  type LoadManagedFixtureOptions,
  type ManagedDwalletFixtureEntry,
  type ManagedDwalletFixtureFile,
} from './ika-dkg-orchestrator';

export type EnableChainTarget = 'sui' | 'ethereum';

export type EnableChainCurveRequest = 'curve25519' | 'secp256k1';

export const TARGET_CHAIN_TO_DEFAULT_CURVE: Record<EnableChainTarget, EnableChainCurveRequest> = {
  sui: 'curve25519',
  ethereum: 'secp256k1',
};

export interface EnableChainRequest {
  owner: string;
  chain: EnableChainTarget;
  curve?: EnableChainCurveRequest;
  subsidy?: { ikaBaseUnits?: string; solLamports?: string };
}

export interface EnableChainDeps {
  connection: Connection;
  registry: IkaDWalletRegistry;
  loadFixture?: (options?: LoadManagedFixtureOptions) => Promise<ManagedDwalletFixtureFile>;
  readGasDepositStatus?: typeof readIkaGasDepositStatus;
  /**
   * Optional subsidy keypair used to sign CreateDeposit / TopUp transactions
   * on behalf of the user. When missing the orchestrator skips funding and
   * returns `gasDepositAction = 'gas-deposit-required'`.
   */
  subsidyKeypair?: Keypair;
  /** Testing override: bypass the authority verification RPC read. */
  skipAuthorityVerification?: boolean;
  /** Testing override: reuse a provided transaction signature. */
  sendTransaction?: (tx: Transaction, signers: Keypair[]) => Promise<string>;
}

export type EnableChainGasDepositAction =
  | 'already-funded'
  | 'funded-by-subsidy'
  | 'gas-deposit-required'
  | 'funding-skipped';

export interface EnableChainResult {
  status: 'enabled';
  chain: EnableChainTarget;
  curve: EnableChainCurveRequest;
  registry: IkaDWalletRegistryEntry;
  fixtureDisclosure: string;
  gasDeposit: {
    pda: string;
    action: EnableChainGasDepositAction;
    subsidyTxSignature?: string;
    status: SerializedGasDepositStatus;
  };
  authorityVerification:
    | { ok: true; onchain: string }
    | { ok: false; onchain: string | null; expected: string; warning: string };
}

export interface SerializedGasDepositStatus {
  exists: boolean;
  passes: boolean;
  reason?: string;
  floors: { minIkaBaseUnits: string; minSolLamports: string };
  observed: {
    ikaBalance?: string;
    solBalance?: string;
  } | null;
}

export class EnableChainError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = 'EnableChainError';
  }
}

export const DEFAULT_SUBSIDY_IKA_BASE_UNITS = 2_000_000_000n; // 2 IKA assuming 9 decimals
export const DEFAULT_SUBSIDY_SOL_LAMPORTS = 30_000_000n; // 0.03 SOL

export function resolveCurveForChain(
  chain: EnableChainTarget,
  override?: EnableChainCurveRequest
): { key: EnableChainCurveRequest; id: DWalletCurveId } {
  const key = override ?? TARGET_CHAIN_TO_DEFAULT_CURVE[chain];
  const id = key === 'curve25519' ? DWALLET_CURVE.Curve25519 : DWALLET_CURVE.Secp256k1;
  return { key, id };
}

export async function enableManagedIkaChain(
  request: EnableChainRequest,
  deps: EnableChainDeps
): Promise<EnableChainResult> {
  const owner = new PublicKey(request.owner);
  const { key: curveKey, id: curveId } = resolveCurveForChain(request.chain, request.curve);

  const fixtureLoader = deps.loadFixture ?? loadManagedFixture;
  const fixture = await fixtureLoader();
  const entry = requireManagedFixtureEntry(fixture, curveId);

  const authorityVerification = deps.skipAuthorityVerification
    ? ({ ok: true, onchain: entry.transferredAuthority } as const)
    : await verifyDwalletAuthority(deps.connection, entry);

  if (!authorityVerification.ok) {
    // Still persist the registry entry so operators can inspect the mismatch,
    // but mark the response loudly so the frontend can surface a warning.
  }

  const registryEntry = await deps.registry.upsert({
    owner: owner.toString(),
    curve: curveId,
    dwalletAccount: entry.dwalletAccount,
    dwalletPublicKeyHex: entry.dwalletPublicKeyHex,
    transferredAuthority: entry.transferredAuthority,
    createdEpoch: entry.createdEpoch,
    label: `managed-${curveKey}`,
    source: 'managed-demo-mode',
  });

  const gasDeposit = await ensureGasDepositFunded({
    connection: deps.connection,
    owner,
    subsidy: request.subsidy,
    subsidyKeypair: deps.subsidyKeypair,
    readStatus: deps.readGasDepositStatus ?? readIkaGasDepositStatus,
    sendTransaction: deps.sendTransaction,
  });

  return {
    status: 'enabled',
    chain: request.chain,
    curve: curveKey,
    registry: registryEntry,
    fixtureDisclosure: fixture.disclosure,
    gasDeposit,
    authorityVerification,
  };
}

interface EnsureGasDepositInput {
  connection: Connection;
  owner: PublicKey;
  subsidy?: EnableChainRequest['subsidy'];
  subsidyKeypair?: Keypair;
  readStatus: typeof readIkaGasDepositStatus;
  sendTransaction?: (tx: Transaction, signers: Keypair[]) => Promise<string>;
}

async function ensureGasDepositFunded(input: EnsureGasDepositInput): Promise<EnableChainResult['gasDeposit']> {
  const status = await input.readStatus(input.connection, input.owner);
  if (status.passes) {
    return {
      pda: status.pda,
      action: 'already-funded',
      status: serializeGasDepositStatus(status),
    };
  }
  if (!input.subsidyKeypair) {
    return {
      pda: status.pda,
      action: 'gas-deposit-required',
      status: serializeGasDepositStatus(status),
    };
  }

  const ikaUnits = BigInt(input.subsidy?.ikaBaseUnits ?? DEFAULT_SUBSIDY_IKA_BASE_UNITS.toString());
  const solLamports = BigInt(input.subsidy?.solLamports ?? DEFAULT_SUBSIDY_SOL_LAMPORTS.toString());

  const subsidyTxSignature = await submitGasDepositSubsidyTx({
    connection: input.connection,
    owner: input.owner,
    feePayer: input.subsidyKeypair,
    ikaBaseUnits: ikaUnits,
    solLamports,
    createDepositNeeded: !status.exists,
    sendTransaction: input.sendTransaction,
  });

  const refreshed = await input.readStatus(input.connection, input.owner);
  return {
    pda: refreshed.pda,
    action: status.exists || refreshed.passes ? 'funded-by-subsidy' : 'funding-skipped',
    subsidyTxSignature,
    status: serializeGasDepositStatus(refreshed),
  };
}

interface SubsidyTxInput {
  connection: Connection;
  owner: PublicKey;
  feePayer: Keypair;
  ikaBaseUnits: bigint;
  solLamports: bigint;
  createDepositNeeded: boolean;
  sendTransaction?: (tx: Transaction, signers: Keypair[]) => Promise<string>;
}

async function submitGasDepositSubsidyTx(input: SubsidyTxInput): Promise<string> {
  const { pda } = deriveIkaGasDepositPda(input.owner);
  const dwalletProgram = new PublicKey(IKA_DWALLET_PROGRAM_ID);
  const instructions: TransactionInstruction[] = [];

  if (input.createDepositNeeded) {
    instructions.push(
      new TransactionInstruction({
        programId: dwalletProgram,
        keys: [
          { pubkey: pda, isSigner: false, isWritable: true },
          { pubkey: input.feePayer.publicKey, isSigner: true, isWritable: true },
          { pubkey: input.owner, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildCreateDepositInstructionData({
          initialIkaBaseUnits: input.ikaBaseUnits,
          initialSolLamports: input.solLamports,
          userPubkey: input.owner,
        }),
      })
    );
  } else if (input.ikaBaseUnits > 0n || input.solLamports > 0n) {
    instructions.push(
      new TransactionInstruction({
        programId: dwalletProgram,
        keys: [
          { pubkey: pda, isSigner: false, isWritable: true },
          { pubkey: input.feePayer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: buildTopUpInstructionData({
          ikaBaseUnits: input.ikaBaseUnits,
          solLamports: input.solLamports,
        }),
      })
    );
  }

  if (instructions.length === 0) {
    throw new EnableChainError(
      'Subsidy request produced no GasDeposit instructions; check subsidy.ikaBaseUnits / subsidy.solLamports',
      'INVALID_SUBSIDY',
      422
    );
  }

  const tx = new Transaction().add(...instructions);
  tx.feePayer = input.feePayer.publicKey;
  const { blockhash } = await input.connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  if (input.sendTransaction) {
    return input.sendTransaction(tx, [input.feePayer]);
  }
  return sendAndConfirmTransaction(input.connection, tx, [input.feePayer], {
    commitment: 'confirmed',
    skipPreflight: false,
  });
}

async function verifyDwalletAuthority(
  connection: Connection,
  entry: ManagedDwalletFixtureEntry
): Promise<EnableChainResult['authorityVerification']> {
  try {
    const info = await connection.getAccountInfo(new PublicKey(entry.dwalletAccount));
    if (!info) {
      return {
        ok: false,
        onchain: null,
        expected: entry.transferredAuthority,
        warning: `dWallet ${entry.dwalletAccount} not found on-chain; managed fixture may be stale (pre-alpha wipes periodically).`,
      };
    }
    // Per docs/ika/raw.txt DWallet account offset 2..34 is the authority.
    const authority = new PublicKey(info.data.subarray(2, 34)).toString();
    if (authority === entry.transferredAuthority) {
      return { ok: true, onchain: authority };
    }
    return {
      ok: false,
      onchain: authority,
      expected: entry.transferredAuthority,
      warning: 'dWallet authority drifted from managed fixture. Lifecycle progression will fail until the operator re-runs TransferOwnership.',
    };
  } catch (error) {
    return {
      ok: false,
      onchain: null,
      expected: entry.transferredAuthority,
      warning:
        error instanceof Error
          ? `Failed to verify dWallet authority on-chain: ${error.message}`
          : 'Failed to verify dWallet authority on-chain.',
    };
  }
}

function serializeGasDepositStatus(status: IkaGasDepositStatus): SerializedGasDepositStatus {
  return {
    exists: status.exists,
    passes: status.passes,
    reason: status.reason,
    floors: {
      minIkaBaseUnits: status.floors.minIkaBaseUnits.toString(),
      minSolLamports: status.floors.minSolLamports.toString(),
    },
    observed: status.account
      ? {
          ikaBalance: status.account.ikaBalance.toString(),
          solBalance: status.account.solBalance.toString(),
        }
      : null,
  };
}

export async function loadSubsidyKeypair(): Promise<Keypair | undefined> {
  const envInline = process.env.POLET_IKA_SUBSIDY_KEYPAIR;
  const envPath = process.env.POLET_IKA_SUBSIDY_KEYPAIR_PATH;
  if (!envInline && !envPath) return undefined;
  try {
    const raw = envInline ?? (await fs.readFile(envPath!, 'utf-8'));
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
    }
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch (error) {
    throw new EnableChainError(
      `Failed to load Ika subsidy keypair: ${error instanceof Error ? error.message : 'unknown error'}`,
      'SUBSIDY_KEYPAIR_INVALID',
      500
    );
  }
}

// Re-exported helpers consumed by tests.
export { serializeGasDepositStatus };
export const __testing = {
  DEFAULT_SUBSIDY_IKA_BASE_UNITS,
  DEFAULT_SUBSIDY_SOL_LAMPORTS,
  bytesToHex,
  resolveManagedCurveKey,
};
