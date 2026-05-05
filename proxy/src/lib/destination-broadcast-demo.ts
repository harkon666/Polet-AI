import { createHash } from 'crypto';
import bs58 from 'bs58';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import type { IkaBridgelessExecutionRequest } from './ika-bridgeless-request';
import type { IkaPreAlphaSigningRequest } from './ika-prealpha-signing';

export const DESTINATION_BROADCAST_DEMO_CHAIN = 'solana';
export const DESTINATION_BROADCAST_DEMO_CLUSTER = 'devnet';
export const DESTINATION_BROADCAST_DEMO_RPC_URL = 'https://api.devnet.solana.com';
export const DESTINATION_BROADCAST_DEMO_EXPLORER_BASE = 'https://explorer.solana.com/tx';
export const DESTINATION_BROADCAST_DEMO_MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);
export const DESTINATION_BROADCAST_DEMO_MIN_BALANCE_LAMPORTS = 5_000;

export type DestinationBroadcastStatus =
  | 'broadcast-disabled'
  | 'broadcast-submitted'
  | 'broadcast-confirmed'
  | 'broadcast-failed';

export type DestinationBroadcastFailureCode =
  | 'UNSUPPORTED_DESTINATION_CHAIN'
  | 'BROADCAST_DISABLED'
  | 'MISSING_FAUCET_FUNDS'
  | 'INVALID_PREALPHA_SIGNATURE'
  | 'RPC_FAILURE'
  | 'BROADCAST_TIMEOUT';

export interface IkaPreAlphaProducedSignature {
  status: 'signature-produced-prealpha';
  signature: string;
  publicKey: string;
  messageDigest: string;
  signatureScheme: IkaPreAlphaSigningRequest['signatureScheme'];
}

export interface DestinationBroadcastInput {
  ikaRequest: IkaBridgelessExecutionRequest;
  producedSignature: IkaPreAlphaProducedSignature;
  demoConfig?: {
    enabled?: boolean;
    feePayerSecretKey?: string;
    rpcUrl?: string;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    confirm?: boolean;
  };
}

export interface DestinationBroadcastReceipt {
  chain: typeof DESTINATION_BROADCAST_DEMO_CHAIN;
  cluster: typeof DESTINATION_BROADCAST_DEMO_CLUSTER;
  action: 'memo-proof';
  transactionId: string;
  explorerUrl: string;
  slot?: number;
  confirmationStatus?: string;
}

export interface DestinationBroadcastSubmitted {
  ok: true;
  status: 'broadcast-submitted' | 'broadcast-confirmed';
  demoPath: DestinationBroadcastDemoPath;
  transaction: {
    base64: string;
    feePayer: string;
    recentBlockhash: string;
  };
  receipt: DestinationBroadcastReceipt;
}

export interface DestinationBroadcastFailure {
  ok: false;
  status: 'broadcast-disabled' | 'broadcast-failed';
  code: DestinationBroadcastFailureCode;
  reason: string;
  demoPath: DestinationBroadcastDemoPath;
  transaction?: {
    base64: string;
    feePayer?: string;
    recentBlockhash?: string;
  };
}

export type DestinationBroadcastResult = DestinationBroadcastSubmitted | DestinationBroadcastFailure;

export interface DestinationBroadcastDemoPath {
  chain: typeof DESTINATION_BROADCAST_DEMO_CHAIN;
  cluster: typeof DESTINATION_BROADCAST_DEMO_CLUSTER;
  action: 'memo-proof';
  asset: 'none';
  faucetRequirement: 'fee payer needs devnet SOL only; no user asset is moved';
  receiptVerification: 'Solana devnet transaction signature and explorer URL';
  productionSettlement: false;
}

export const DESTINATION_BROADCAST_DEMO_PATH: DestinationBroadcastDemoPath = {
  chain: DESTINATION_BROADCAST_DEMO_CHAIN,
  cluster: DESTINATION_BROADCAST_DEMO_CLUSTER,
  action: 'memo-proof',
  asset: 'none',
  faucetRequirement: 'fee payer needs devnet SOL only; no user asset is moved',
  receiptVerification: 'Solana devnet transaction signature and explorer URL',
  productionSettlement: false,
};

export interface DestinationBroadcastRpc {
  getLatestBlockhash(commitment?: 'processed' | 'confirmed' | 'finalized'): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>;
  getBalance(publicKey: PublicKey): Promise<number>;
  sendRawTransaction(rawTransaction: Buffer | Uint8Array): Promise<string>;
  confirmTransaction(input: {
    signature: string;
    blockhash: string;
    lastValidBlockHeight: number;
  }, commitment?: 'processed' | 'confirmed' | 'finalized'): Promise<{
    value: {
      err: unknown;
    };
  }>;
  getSignatureStatuses(signatures: string[]): Promise<{
    value: Array<{
      slot?: number;
      confirmationStatus?: string | null;
    } | null>;
  }>;
}

export class DestinationBroadcastDemoError extends Error {
  constructor(
    message: string,
    public readonly code: DestinationBroadcastFailureCode,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'DestinationBroadcastDemoError';
  }
}

export async function runDestinationBroadcastDemo(
  input: DestinationBroadcastInput,
  rpc: DestinationBroadcastRpc = new Connection(
    input.demoConfig?.rpcUrl ?? DESTINATION_BROADCAST_DEMO_RPC_URL,
    input.demoConfig?.commitment ?? 'confirmed'
  )
): Promise<DestinationBroadcastResult> {
  const validation = validateDestinationBroadcastInput(input);
  if (!validation.ok) return validation;

  const unsigned = buildDestinationMemoProofTransaction(input);
  if (!input.demoConfig?.enabled) {
    unsigned.feePayer = PublicKey.default;
    unsigned.recentBlockhash = PublicKey.default.toString();
    return {
      ok: false,
      status: 'broadcast-disabled',
      code: 'BROADCAST_DISABLED',
      reason: 'Destination broadcast demo is disabled. Set POLET_DESTINATION_BROADCAST_DEMO=enabled for this narrow devnet proof path.',
      demoPath: DESTINATION_BROADCAST_DEMO_PATH,
      transaction: {
        base64: unsigned.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
      },
    };
  }

  const feePayer = parseDemoFeePayer(input.demoConfig.feePayerSecretKey);
  const commitment = input.demoConfig.commitment ?? 'confirmed';

  try {
    const balance = await rpc.getBalance(feePayer.publicKey);
    if (balance < DESTINATION_BROADCAST_DEMO_MIN_BALANCE_LAMPORTS) {
      return failed('MISSING_FAUCET_FUNDS', 'Fee payer needs devnet SOL for the memo proof transaction.', 402);
    }

    const blockhash = await rpc.getLatestBlockhash(commitment);
    unsigned.feePayer = feePayer.publicKey;
    unsigned.recentBlockhash = blockhash.blockhash;
    unsigned.sign(feePayer);

    const signature = await rpc.sendRawTransaction(unsigned.serialize());
    const receipt = await normalizeDestinationReceipt(signature, rpc);

    if (input.demoConfig.confirm) {
      const confirmation = await rpc.confirmTransaction({
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      }, commitment);
      if (confirmation.value.err) {
        return failed('RPC_FAILURE', 'Destination transaction was submitted but confirmation returned an error.', 502);
      }

      return submitted('broadcast-confirmed', unsigned, receipt);
    }

    return submitted('broadcast-submitted', unsigned, receipt);
  } catch (error) {
    if (error instanceof DestinationBroadcastDemoError) {
      return failed(error.code, error.message, error.status);
    }
    const message = error instanceof Error ? error.message : 'Destination RPC failed';
    const code = /timeout/i.test(message) ? 'BROADCAST_TIMEOUT' : 'RPC_FAILURE';
    return failed(code, message, code === 'BROADCAST_TIMEOUT' ? 504 : 502);
  }
}

export function buildDestinationMemoProofTransaction(input: DestinationBroadcastInput): Transaction {
  const instruction = buildDestinationMemoProofInstruction(input);
  return new Transaction().add(instruction);
}

export function buildDestinationMemoProofInstruction(input: DestinationBroadcastInput): TransactionInstruction {
  const validation = validateDestinationBroadcastInput(input);
  if (!validation.ok) {
    throw new DestinationBroadcastDemoError(validation.reason, validation.code, validation.code === 'UNSUPPORTED_DESTINATION_CHAIN' ? 400 : 422);
  }

  const memo = {
    polet: 'ika-prealpha-destination-broadcast-demo',
    requestId: input.ikaRequest.requestId,
    source: input.ikaRequest.source,
    target: input.ikaRequest.target,
    amountBaseUnits: input.ikaRequest.amountBaseUnits,
    messageDigest: input.producedSignature.messageDigest,
    signatureScheme: input.producedSignature.signatureScheme,
    signatureHash: hashString(input.producedSignature.signature),
    productionSettlement: false,
  };

  return new TransactionInstruction({
    programId: DESTINATION_BROADCAST_DEMO_MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(JSON.stringify(memo), 'utf8'),
  });
}

export function validateDestinationBroadcastInput(input: DestinationBroadcastInput): DestinationBroadcastFailure | { ok: true } {
  if (input.ikaRequest.target.chain !== DESTINATION_BROADCAST_DEMO_CHAIN) {
    return failed(
      'UNSUPPORTED_DESTINATION_CHAIN',
      'Issue 020 demo supports only Solana devnet memo-proof destination broadcast.',
      400
    );
  }

  if (
    input.producedSignature.status !== 'signature-produced-prealpha'
    || input.producedSignature.messageDigest !== input.ikaRequest.preAlphaSigning?.messageDigest
    || input.producedSignature.signatureScheme !== input.ikaRequest.preAlphaSigning.signatureScheme
    || !isEncodedSignature(input.producedSignature.signature)
  ) {
    return failed(
      'INVALID_PREALPHA_SIGNATURE',
      'A valid signature-produced-prealpha result matching the Ika message digest is required.',
      422
    );
  }

  try {
    new PublicKey(input.producedSignature.publicKey);
  } catch {
    return failed('INVALID_PREALPHA_SIGNATURE', 'Produced signature public key must be a valid Solana public key.', 422);
  }

  return { ok: true };
}

export async function normalizeDestinationReceipt(
  transactionId: string,
  rpc?: Pick<DestinationBroadcastRpc, 'getSignatureStatuses'>
): Promise<DestinationBroadcastReceipt> {
  const status = rpc ? (await rpc.getSignatureStatuses([transactionId])).value[0] : undefined;

  return {
    chain: DESTINATION_BROADCAST_DEMO_CHAIN,
    cluster: DESTINATION_BROADCAST_DEMO_CLUSTER,
    action: 'memo-proof',
    transactionId,
    explorerUrl: `${DESTINATION_BROADCAST_DEMO_EXPLORER_BASE}/${transactionId}?cluster=devnet`,
    ...(status?.slot !== undefined && { slot: status.slot }),
    ...(status?.confirmationStatus && { confirmationStatus: status.confirmationStatus }),
  };
}

export function createDemoProducedSignature(signing: IkaPreAlphaSigningRequest): IkaPreAlphaProducedSignature {
  return {
    status: 'signature-produced-prealpha',
    signature: hashString(JSON.stringify({
      dwalletAccount: signing.dwalletAccount,
      messageDigest: signing.messageDigest,
      messageApprovalPda: signing.messageApprovalPda,
      mockSigner: signing.preAlphaEnvironment.mockSigner,
    })),
    publicKey: signing.userPublicKey,
    messageDigest: signing.messageDigest,
    signatureScheme: signing.signatureScheme,
  };
}

function parseDemoFeePayer(secretKey: string | undefined): Keypair {
  if (!secretKey) {
    throw new DestinationBroadcastDemoError('POLET_DESTINATION_BROADCAST_FEE_PAYER is required when destination broadcast is enabled.', 'MISSING_FAUCET_FUNDS', 402);
  }

  try {
    const parsed = secretKey.trim().startsWith('[')
      ? Uint8Array.from(JSON.parse(secretKey))
      : bs58.decode(secretKey.trim());
    return Keypair.fromSecretKey(parsed);
  } catch {
    throw new DestinationBroadcastDemoError('Destination broadcast fee payer secret key must be a Solana keypair JSON array or base58 secret key.', 'MISSING_FAUCET_FUNDS', 402);
  }
}

function isEncodedSignature(value: string): boolean {
  if (/^[0-9a-f]{64,128}$/i.test(value)) return true;
  try {
    const decoded = bs58.decode(value);
    return decoded.length >= 32 && decoded.length <= 96;
  } catch {
    return false;
  }
}

function submitted(
  status: 'broadcast-submitted' | 'broadcast-confirmed',
  transaction: Transaction,
  receipt: DestinationBroadcastReceipt
): DestinationBroadcastSubmitted {
  return {
    ok: true,
    status,
    demoPath: DESTINATION_BROADCAST_DEMO_PATH,
    transaction: {
      base64: transaction.serialize().toString('base64'),
      feePayer: transaction.feePayer!.toString(),
      recentBlockhash: transaction.recentBlockhash!,
    },
    receipt,
  };
}

function failed(
  code: DestinationBroadcastFailureCode,
  reason: string,
  _status = 400
): DestinationBroadcastFailure {
  return {
    ok: false,
    status: code === 'BROADCAST_DISABLED' ? 'broadcast-disabled' : 'broadcast-failed',
    code,
    reason,
    demoPath: DESTINATION_BROADCAST_DEMO_PATH,
  };
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
