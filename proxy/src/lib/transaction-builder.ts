import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  Connection,
  type Signer,
} from '@solana/web3.js';
import type { Attestation, Intent } from '../types/intent';
import {
  buildExecuteConfidentialTransferAccounts,
  buildExecuteConfidentialTransferPayload,
  encodeU64Le,
  TRANSFER_INTENT_LENGTH,
} from './execution-payload';
import { PROGRAM_ID_STRING } from './program-identity';

/**
 * Transaction builder for constructing Solana transactions
 * Matches the on-chain program format for execute_intent instructions
 */

export interface TransactionRequest {
  owner: string;
  sessionKey: string;
  instruction: number; // 0 = transfer
  destination: string;
  amount: number;
  attestation: Attestation;
}

export interface BuiltTransaction {
  /** Serialized transaction as base64 string */
  transaction: string;
  /** Block hash used */
  blockHash: string;
  /** Slot */
  slot: number;
  /** Signers needed */
  signers: string[];
}

export interface ConfidentialTransferTransactionRequest {
  wallet: string;
  sessionKey: string;
  destination: string;
  amount: number | bigint;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
  encryptionWitness: Uint8Array | number[];
}

export interface ApproveIkaMessageTransactionRequest {
  wallet: string;
  sessionKey: string;
  coordinator: string;
  dwallet: string;
  messageApproval: string;
  cpiAuthority: string;
  callerProgram: string;
  ikaProgram: string;
  ikaMessageHash: string | Uint8Array | number[];
  sourceAmount: number | bigint;
  orderExpiresAt: number | bigint;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
  encryptionWitness: Uint8Array | number[];
  userPubkey: string | Uint8Array | number[];
  signatureScheme: number;
  messageApprovalBump: number;
  sharedApprovers?: string[];
}

export const APPROVE_IKA_MESSAGE_AS_SESSION_DISCRIMINATOR = Buffer.from([
  133, 198, 111, 169, 240, 8, 18, 170,
]);

/**
 * Build instruction data matching the Solana program's execute_intent format
 * Format: [instruction(1) + destination(32) + amount(8)]
 */
export function buildExecuteIntentData(
  instruction: number,
  destination: Uint8Array,
  amount: bigint
): Uint8Array {
  const data = new Uint8Array(TRANSFER_INTENT_LENGTH); // 1 + 32 + 8
  data[0] = instruction;
  data.set(destination, 1);
  data.set(to_LE_Bytes(amount), 33);
  return data;
}

export function buildExecuteConfidentialTransferInstructionData(
  request: ConfidentialTransferTransactionRequest
): Buffer {
  return buildExecuteConfidentialTransferPayload(request);
}

export function buildApproveIkaMessageAsSessionInstructionData(
  request: ApproveIkaMessageTransactionRequest
): Buffer {
  const data = Buffer.alloc(8 + 32 + 8 + 8 + 8 + 8 + 32 + 32 + 2 + 1);
  let offset = 0;

  APPROVE_IKA_MESSAGE_AS_SESSION_DISCRIMINATOR.copy(data, offset);
  offset += 8;
  Buffer.from(normalizeBytes32(request.ikaMessageHash, 'ikaMessageHash')).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(toU64(request.sourceAmount), offset);
  offset += 8;
  data.writeBigInt64LE(toI64(request.orderExpiresAt), offset);
  offset += 8;
  data.writeBigUInt64LE(toU64(request.attestationSlot), offset);
  offset += 8;
  data.writeBigUInt64LE(toU64(request.attestationPolicySeq), offset);
  offset += 8;
  Buffer.from(normalizeBytes32(request.encryptionWitness, 'encryptionWitness')).copy(data, offset);
  offset += 32;
  Buffer.from(normalizeUserPubkey(request.userPubkey)).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(toU16(request.signatureScheme), offset);
  offset += 2;
  data.writeUInt8(toU8(request.messageApprovalBump, 'messageApprovalBump'), offset);

  return data;
}

/**
 * Convert a bigint to little-endian bytes
 */
export function to_LE_Bytes(num: bigint): Uint8Array {
  return Uint8Array.from(encodeU64Le(num));
}

export async function buildConfidentialTransferSessionTransaction(
  request: ConfidentialTransferTransactionRequest,
  programId: string
): Promise<BuiltTransaction> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const programIdPubkey = new PublicKey(programId);

  const instruction = new TransactionInstruction({
    keys: buildExecuteConfidentialTransferAccounts(request),
    programId: programIdPubkey,
    data: buildExecuteConfidentialTransferInstructionData(request),
  });

  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sessionKeyPubkey;

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers: [request.sessionKey],
  };
}

export async function buildApproveIkaMessageSessionTransaction(
  request: ApproveIkaMessageTransactionRequest,
  programId = PROGRAM_ID_STRING
): Promise<BuiltTransaction> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const instruction = new TransactionInstruction({
    keys: buildApproveIkaMessageAsSessionAccounts(request),
    programId: new PublicKey(programId),
    data: buildApproveIkaMessageAsSessionInstructionData(request),
  });

  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sessionKeyPubkey;

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers: [request.sessionKey, ...(request.sharedApprovers ?? [])],
  };
}

export function buildApproveIkaMessageAsSessionAccounts(
  request: Pick<
    ApproveIkaMessageTransactionRequest,
    'wallet' | 'sessionKey' | 'coordinator' | 'dwallet' | 'messageApproval' | 'cpiAuthority' | 'callerProgram' | 'ikaProgram' | 'sharedApprovers'
  >
) {
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.coordinator), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.dwallet), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.messageApproval), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.cpiAuthority), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.callerProgram), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.ikaProgram), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ...(request.sharedApprovers ?? []).map((approver) => ({
      pubkey: new PublicKey(approver),
      isSigner: true,
      isWritable: false,
    })),
  ];
}

/**
 * Build a Solana transaction for the intent
 * Uses @solana/web3.js for proper transaction construction
 */
export async function buildTransaction(
  request: TransactionRequest,
  programId: string,
  walletAddress: string
): Promise<BuiltTransaction> {
  const connection = getConnection();

  // Get recent blockhash and slot
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  // Parse pubkeys
  const destinationPubkey = new PublicKey(request.destination);
  const programIdPubkey = new PublicKey(programId);
  const walletPubkey = new PublicKey(walletAddress);

  // Build instruction data: [instruction(1) + destination(32) + amount(8)]
  const instructionData = buildExecuteIntentData(
    request.instruction,
    destinationPubkey.toBytes(),
    BigInt(request.amount)
  );

  // Create the execute_intent instruction
  // The instruction account layout for execute_intent:
  // - wallet (mutable, signer)
  // - destination (mutable)
  // - system_program
  const keys = [
    { pubkey: walletPubkey, isSigner: true, isWritable: true },
    { pubkey: destinationPubkey, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: programIdPubkey,
    data: Buffer.from(instructionData),
  });

  // Build the transaction
  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = walletPubkey;

  // Serialize the transaction
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers: [request.sessionKey],
  };
}

/**
 * Build a transaction for session key execution (execute_intent_as_session)
 * This is for when the session key itself signs the transaction
 */
export async function buildSessionTransaction(
  request: TransactionRequest,
  programId: string,
  walletAddress: string
): Promise<BuiltTransaction> {
  const connection = getConnection();

  // Get recent blockhash and slot
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  // Parse pubkeys
  const destinationPubkey = new PublicKey(request.destination);
  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const programIdPubkey = new PublicKey(programId);
  // Wallet address for the PDA seed
  const walletPubkey = new PublicKey(walletAddress);

  // Build instruction data matching execute_intent_as_session format
  const instructionData = buildExecuteIntentData(
    request.instruction,
    destinationPubkey.toBytes(),
    BigInt(request.amount)
  );

  // Create the execute_intent_as_session instruction
  // Account layout:
  // - wallet (mutable, PDA)
  // - session_key (signer, but NOT a signer on the instruction itself - the tx is signed by session key)
  // - destination (mutable)
  // - system_program
  const keys = [
    { pubkey: walletPubkey, isSigner: false, isWritable: true },
    { pubkey: sessionKeyPubkey, isSigner: true, isWritable: false },
    { pubkey: destinationPubkey, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: programIdPubkey,
    data: Buffer.from(instructionData),
  });

  // Build the transaction
  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  // Fee payer is the session key (not the wallet, since session key pays for its own tx)
  transaction.feePayer = sessionKeyPubkey;

  // Serialize the transaction
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers: [request.sessionKey],
  };
}

/**
 * Build an intent from an Intent object
 */
export async function buildIntentTransaction(
  intent: Intent,
  programId: string,
  walletAddress: string
): Promise<BuiltTransaction> {
  const connection = getConnection();

  // Get recent blockhash and slot
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  // Get destination based on action type
  let destination: string;
  let amount: number;

  switch (intent.action) {
    case 'transfer':
      destination = (intent.params as { destination: string }).destination;
      amount = (intent.params as { amount: number }).amount;
      break;
    case 'swap':
      // For swap, destination is the output mint
      destination = (intent.params as { outputMint: string }).outputMint;
      amount = (intent.params as { minOutputAmount: number }).minOutputAmount;
      break;
    case 'stake':
      destination = (intent.params as { validator: string }).validator;
      amount = (intent.params as { amount: number }).amount;
      break;
    default:
      throw new Error(`Unsupported action type: ${intent.action}`);
  }

  const destinationPubkey = new PublicKey(destination);
  const programIdPubkey = new PublicKey(programId);
  const walletPubkey = new PublicKey(walletAddress);
  const sessionKeyPubkey = new PublicKey(intent.sessionKey);

  // Build instruction data
  const instructionData = buildExecuteIntentData(
    0, // instruction 0 = transfer
    destinationPubkey.toBytes(),
    BigInt(amount)
  );

  // Create instruction for execute_intent_as_session
  const keys = [
    { pubkey: walletPubkey, isSigner: false, isWritable: true },
    { pubkey: sessionKeyPubkey, isSigner: true, isWritable: false },
    { pubkey: destinationPubkey, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: programIdPubkey,
    data: Buffer.from(instructionData),
  });

  // Build the transaction
  const transaction = new Transaction();
  transaction.add(instruction);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sessionKeyPubkey;

  // Serialize
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers: [intent.sessionKey],
  };
}

// Singleton connection for efficiency
let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    // Default to devnet for hackathon
    // In production, this would be configured via environment
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    _connection = new Connection(rpcUrl, 'confirmed');
  }
  return _connection;
}

/**
 * Set a custom connection (useful for testing)
 */
export function setConnection(connection: Connection): void {
  _connection = connection;
}

function normalizeUserPubkey(value: string | Uint8Array | number[]): Uint8Array {
  if (typeof value === 'string') return new PublicKey(value).toBytes();
  return normalizeBytes32(value, 'userPubkey');
}

function normalizeBytes32(value: string | Uint8Array | number[], label: string): Uint8Array {
  if (typeof value === 'string') {
    if (!/^[0-9a-f]{64}$/i.test(value)) {
      throw new Error(`${label} must be a 32-byte hex string`);
    }
    return Uint8Array.from(Buffer.from(value, 'hex'));
  }
  if (value.length !== 32) {
    throw new Error(`${label} must contain exactly 32 bytes`);
  }
  return Uint8Array.from(value);
}

function toU64(value: number | bigint): bigint {
  const bigintValue = BigInt(value);
  if (bigintValue < 0n || bigintValue > 18446744073709551615n) {
    throw new Error('u64 value out of range');
  }
  return bigintValue;
}

function toI64(value: number | bigint): bigint {
  const bigintValue = BigInt(value);
  if (bigintValue < -9223372036854775808n || bigintValue > 9223372036854775807n) {
    throw new Error('i64 value out of range');
  }
  return bigintValue;
}

function toU16(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error('signatureScheme must be a u16');
  }
  return value;
}

function toU8(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${label} must be a u8`);
  }
  return value;
}
