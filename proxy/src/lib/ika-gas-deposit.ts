/**
 * Ika `GasDeposit` helpers: PDA derivation, account decoding, and a
 * configurable minimum-balance floor guard used before Presign / Sign
 * requests.
 *
 * Docs reference: docs/ika/raw.txt "Gas Deposits" section. The account
 * layout, PDA seed, and instruction discriminators below match the
 * pre-alpha spec.
 *
 * Floor thresholds live in env vars so operators can tune per-cluster:
 *   POLET_IKA_GAS_MIN_IKA_BASE_UNITS (default 1_000_000_000)
 *   POLET_IKA_GAS_MIN_SOL_LAMPORTS   (default 20_000_000)
 * If either balance is below the floor the guard rejects without leaking
 * private policy values (the error message names gas thresholds only).
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  CREATE_DEPOSIT_DISCRIMINATOR,
  GAS_DEPOSIT_LAYOUT,
  IKA_DWALLET_PROGRAM_ID,
  TOP_UP_DISCRIMINATOR,
} from './ika-grpc-schema';

const GAS_DEPOSIT_SEED = 'gas_deposit';

export const DEFAULT_MIN_IKA_BALANCE_BASE_UNITS = 1_000_000_000n; // 1 IKA (assuming 9 decimals)
export const DEFAULT_MIN_SOL_BALANCE_LAMPORTS = 20_000_000n; // 0.02 SOL

export function getMinIkaBalanceFloor(): bigint {
  const raw = process.env.POLET_IKA_GAS_MIN_IKA_BASE_UNITS;
  return parseBigint(raw, DEFAULT_MIN_IKA_BALANCE_BASE_UNITS, 'POLET_IKA_GAS_MIN_IKA_BASE_UNITS');
}

export function getMinSolBalanceFloor(): bigint {
  const raw = process.env.POLET_IKA_GAS_MIN_SOL_LAMPORTS;
  return parseBigint(raw, DEFAULT_MIN_SOL_BALANCE_LAMPORTS, 'POLET_IKA_GAS_MIN_SOL_LAMPORTS');
}

function parseBigint(raw: string | undefined, fallback: bigint, envName: string): bigint {
  if (!raw) return fallback;
  try {
    const value = BigInt(raw);
    if (value < 0n) throw new Error('negative');
    return value;
  } catch {
    throw new Error(`${envName} must be a non-negative integer; got ${raw}`);
  }
}

export interface IkaGasDepositPdaDerivation {
  pda: PublicKey;
  bump: number;
  programId: PublicKey;
}

export function deriveIkaGasDepositPda(
  userPubkey: PublicKey | string,
  programId: PublicKey | string = IKA_DWALLET_PROGRAM_ID
): IkaGasDepositPdaDerivation {
  const owner = userPubkey instanceof PublicKey ? userPubkey : new PublicKey(userPubkey);
  const dwalletProgram = programId instanceof PublicKey ? programId : new PublicKey(programId);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(GAS_DEPOSIT_SEED), owner.toBuffer()],
    dwalletProgram
  );
  return { pda, bump, programId: dwalletProgram };
}

export interface IkaGasDepositAccount {
  discriminator: number;
  version: number;
  userPubkey: string;
  ikaBalance: bigint;
  solBalance: bigint;
  totalIkaDeposited: bigint;
  totalIkaConsumed: bigint;
  totalSolDeposited: bigint;
  totalSolConsumed: bigint;
  pendingIkaWithdrawal: bigint;
  pendingSolWithdrawal: bigint;
  withdrawalEpoch: bigint;
  lastSettlementEpoch: bigint;
  createdAtEpoch: bigint;
  bump: number;
}

export function decodeIkaGasDepositAccount(data: Buffer | Uint8Array): IkaGasDepositAccount {
  const buf = Buffer.from(data);
  if (buf.length < GAS_DEPOSIT_LAYOUT.totalSize) {
    throw new Error(`GasDeposit account length ${buf.length} < expected ${GAS_DEPOSIT_LAYOUT.totalSize}`);
  }
  const discriminator = buf.readUInt8(GAS_DEPOSIT_LAYOUT.discriminator);
  if (discriminator !== GAS_DEPOSIT_LAYOUT.discriminatorValue) {
    throw new Error(`Unexpected GasDeposit discriminator ${discriminator}`);
  }
  const userPubkey = new PublicKey(
    buf.subarray(GAS_DEPOSIT_LAYOUT.userPubkey, GAS_DEPOSIT_LAYOUT.userPubkey + 32)
  ).toString();
  return {
    discriminator,
    version: buf.readUInt8(GAS_DEPOSIT_LAYOUT.version),
    userPubkey,
    ikaBalance: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.ikaBalance),
    solBalance: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.solBalance),
    totalIkaDeposited: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.totalIkaDeposited),
    totalIkaConsumed: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.totalIkaConsumed),
    totalSolDeposited: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.totalSolDeposited),
    totalSolConsumed: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.totalSolConsumed),
    pendingIkaWithdrawal: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.pendingIkaWithdrawal),
    pendingSolWithdrawal: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.pendingSolWithdrawal),
    withdrawalEpoch: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.withdrawalEpoch),
    lastSettlementEpoch: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.lastSettlementEpoch),
    createdAtEpoch: buf.readBigUInt64LE(GAS_DEPOSIT_LAYOUT.createdAtEpoch),
    bump: buf.readUInt8(GAS_DEPOSIT_LAYOUT.bump),
  };
}

export interface IkaGasDepositStatus {
  exists: boolean;
  pda: string;
  account?: IkaGasDepositAccount;
  floors: { minIkaBaseUnits: bigint; minSolLamports: bigint };
  passes: boolean;
  reason?: string;
}

export async function readIkaGasDepositStatus(
  connection: Connection,
  userPubkey: PublicKey | string,
  options: { minIkaBaseUnits?: bigint; minSolLamports?: bigint; programId?: PublicKey | string } = {}
): Promise<IkaGasDepositStatus> {
  const { pda } = deriveIkaGasDepositPda(userPubkey, options.programId);
  const info = await connection.getAccountInfo(pda);
  const floors = {
    minIkaBaseUnits: options.minIkaBaseUnits ?? getMinIkaBalanceFloor(),
    minSolLamports: options.minSolLamports ?? getMinSolBalanceFloor(),
  };
  if (!info) {
    // Demo bypass: when both floors are explicitly set to 0 (see
    // POLET_IKA_GAS_MIN_IKA_BASE_UNITS / POLET_IKA_GAS_MIN_SOL_LAMPORTS),
    // the operator has opted out of the gas guard. Pre-alpha's mock signer
    // does not actually consume IKA/SOL, so letting the lifecycle proceed
    // without a funded deposit is acceptable for demo / hackathon flows.
    const bypass = floors.minIkaBaseUnits === 0n && floors.minSolLamports === 0n;
    return {
      exists: false,
      pda: pda.toString(),
      floors,
      passes: bypass,
      reason: bypass
        ? undefined
        : 'GasDeposit account has not been created. Call CreateDeposit and fund it with IKA and SOL.',
    };
  }
  try {
    const account = decodeIkaGasDepositAccount(info.data);
    const passesIka = account.ikaBalance >= floors.minIkaBaseUnits;
    const passesSol = account.solBalance >= floors.minSolLamports;
    return {
      exists: true,
      pda: pda.toString(),
      account,
      floors,
      passes: passesIka && passesSol,
      reason: buildGasFloorReason({ account, floors, passesIka, passesSol }),
    };
  } catch (error) {
    return {
      exists: false,
      pda: pda.toString(),
      floors,
      passes: false,
      reason: error instanceof Error ? error.message : 'Failed to decode GasDeposit account',
    };
  }
}

function buildGasFloorReason(input: {
  account: IkaGasDepositAccount;
  floors: { minIkaBaseUnits: bigint; minSolLamports: bigint };
  passesIka: boolean;
  passesSol: boolean;
}): string | undefined {
  if (input.passesIka && input.passesSol) return undefined;
  const parts: string[] = [];
  if (!input.passesIka) {
    parts.push(
      `IKA balance ${input.account.ikaBalance} is below the configured floor ${input.floors.minIkaBaseUnits}`
    );
  }
  if (!input.passesSol) {
    parts.push(
      `SOL balance ${input.account.solBalance} lamports is below the configured floor ${input.floors.minSolLamports}`
    );
  }
  return `GasDeposit underfunded: ${parts.join('; ')}. Top up via Ika TopUp before Presign / Sign.`;
}

export class IkaGasFloorError extends Error {
  constructor(public readonly status: IkaGasDepositStatus) {
    super(status.reason ?? 'GasDeposit floor guard rejected the request');
    this.name = 'IkaGasFloorError';
  }
}

export function enforceGasDepositFloor(status: IkaGasDepositStatus): void {
  if (!status.passes) throw new IkaGasFloorError(status);
}

// ---------- Instruction builders (data only; account assembly is caller's job) ----------

export function buildCreateDepositInstructionData(input: {
  initialIkaBaseUnits: bigint;
  initialSolLamports: bigint;
  userPubkey: PublicKey;
}): Buffer {
  const data = Buffer.alloc(1 + 32 + 8 + 8);
  data.writeUInt8(CREATE_DEPOSIT_DISCRIMINATOR, 0);
  input.userPubkey.toBuffer().copy(data, 1);
  data.writeBigUInt64LE(input.initialIkaBaseUnits, 33);
  data.writeBigUInt64LE(input.initialSolLamports, 41);
  return data;
}

export function buildTopUpInstructionData(input: {
  ikaBaseUnits: bigint;
  solLamports: bigint;
}): Buffer {
  const data = Buffer.alloc(1 + 8 + 8);
  data.writeUInt8(TOP_UP_DISCRIMINATOR, 0);
  data.writeBigUInt64LE(input.ikaBaseUnits, 1);
  data.writeBigUInt64LE(input.solLamports, 9);
  return data;
}
