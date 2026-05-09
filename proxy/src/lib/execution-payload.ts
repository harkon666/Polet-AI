import {
  PublicKey,
  SystemProgram,
  type AccountMeta,
} from '@solana/web3.js';

export const TRANSFER_INTENT_INSTRUCTION = 0;
export const TRANSFER_INTENT_DESTINATION_OFFSET = 1;
export const TRANSFER_INTENT_AMOUNT_OFFSET = 33;
export const TRANSFER_INTENT_LENGTH = 41;
export const EXECUTE_CONFIDENTIAL_TRANSFER_AS_SESSION_DISCRIMINATOR = Buffer.from([
  142, 74, 175, 147, 39, 73, 10, 41,
]);
export const EXECUTE_CONFIDENTIAL_TRANSFER_WITNESS_LENGTH = 32;
export const U64_MAX = 18_446_744_073_709_551_615n;

export interface ConfidentialTransferPayloadRequest {
  destination: string;
  amount: number | bigint;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
  maskedWitnessDevFixture: Uint8Array | number[];
}

export interface ConfidentialTransferAccountRequest {
  wallet: string;
  sessionKey: string;
  destination: string;
}

export function buildTransferIntentPayload(destination: string | PublicKey, amount: number | bigint): Buffer {
  const destinationPubkey = destination instanceof PublicKey ? destination : new PublicKey(destination);
  const data = Buffer.alloc(TRANSFER_INTENT_LENGTH);
  data[0] = TRANSFER_INTENT_INSTRUCTION;
  Buffer.from(destinationPubkey.toBytes()).copy(data, TRANSFER_INTENT_DESTINATION_OFFSET);
  encodeU64Le(amount).copy(data, TRANSFER_INTENT_AMOUNT_OFFSET);
  return data;
}

export function buildExecuteConfidentialTransferPayload(
  request: ConfidentialTransferPayloadRequest
): Buffer {
  const intentData = buildTransferIntentPayload(request.destination, request.amount);
  const witness = Buffer.from(request.maskedWitnessDevFixture);

  if (witness.length !== EXECUTE_CONFIDENTIAL_TRANSFER_WITNESS_LENGTH) {
    throw new Error('maskedWitnessDevFixture must contain exactly 32 bytes');
  }

  return Buffer.concat([
    EXECUTE_CONFIDENTIAL_TRANSFER_AS_SESSION_DISCRIMINATOR,
    encodeU32Le(intentData.length),
    intentData,
    encodeU64Le(request.attestationSlot),
    encodeU64Le(request.attestationPolicySeq),
    witness,
  ]);
}

export function buildExecuteConfidentialTransferAccounts(
  request: ConfidentialTransferAccountRequest
): AccountMeta[] {
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.destination), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

export function encodeU64Le(value: number | bigint): Buffer {
  const normalized = BigInt(value);
  if (normalized < 0n || normalized > U64_MAX) {
    throw new Error('u64 value out of range');
  }

  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(normalized);
  return buffer;
}

export function encodeU32Le(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error('u32 value out of range');
  }

  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

export const EXECUTE_CONFIDENTIAL_USDC_TRANSFER_AS_SESSION_DISCRIMINATOR = Buffer.from([
  200, 14, 66, 170, 206, 20, 88, 24,
]);

export interface ConfidentialUsdcTransferPayloadRequest {
  amount: number | bigint;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
}

export interface ConfidentialUsdcTransferAccountRequest {
  wallet: string;
  sessionKey: string;
  usdcCustodyAccount: string;
  destinationUsdcAccount: string;
  usdcMint: string;
  tokenProgram: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  allowedDecryptionRequest: string;
}

export function buildExecuteConfidentialUsdcTransferPayload(
  request: ConfidentialUsdcTransferPayloadRequest
): Buffer {
  return Buffer.concat([
    EXECUTE_CONFIDENTIAL_USDC_TRANSFER_AS_SESSION_DISCRIMINATOR,
    encodeU64Le(request.amount),
    encodeU64Le(request.attestationSlot),
    encodeU64Le(request.attestationPolicySeq),
  ]);
}

export function buildExecuteConfidentialUsdcTransferAccounts(
  request: ConfidentialUsdcTransferAccountRequest
): AccountMeta[] {
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.usdcCustodyAccount), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.destinationUsdcAccount), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.usdcMint), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.tokenProgram), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.allowedOutputCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.dailySpentOutputCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.allowedDecryptionRequest), isSigner: false, isWritable: false },
  ];
}
