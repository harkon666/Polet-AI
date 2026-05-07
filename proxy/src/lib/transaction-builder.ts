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
  maskedWitnessDevFixture: Uint8Array | number[];
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
  maskedWitnessDevFixture: Uint8Array | number[];
  userPubkey: string | Uint8Array | number[];
  signatureScheme: number;
  messageApprovalBump: number;
  sharedApprovers?: string[];
}

export interface OfficialEncryptContextAccounts {
  encryptProgram?: string;
  config: string;
  deposit: string;
  networkEncryptionKey: string;
  eventAuthority: string;
  payer: string;
}

export interface SetOfficialEncryptCiphertextPolicyTransactionRequest {
  wallet: string;
  owner: string;
  maxPerRunCiphertext: string;
  dailyCapCiphertext: string;
  dailySpentCiphertext: string;
  policyCommitment: string | Uint8Array | number[];
  encrypt: OfficialEncryptContextAccounts;
}

export interface ExecuteEncryptPolicyGraphTransactionRequest {
  wallet: string;
  sessionKey: string;
  sourceAmountCiphertext: string;
  maxPerRunCiphertext: string;
  dailySpentCiphertext: string;
  dailyCapCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
  encrypt: OfficialEncryptContextAccounts;
}

export interface ApproveIkaMessageWithVerifiedEncryptTransactionRequest {
  wallet: string;
  sessionKey: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  allowedDecryptionRequest: string;
  coordinator: string;
  dwallet: string;
  messageApproval: string;
  cpiAuthority: string;
  callerProgram: string;
  ikaProgram: string;
  ikaMessageHash: string | Uint8Array | number[];
  orderExpiresAt: number | bigint;
  attestationSlot: number | bigint;
  attestationPolicySeq: number | bigint;
  userPubkey: string | Uint8Array | number[];
  signatureScheme: number;
  messageApprovalBump: number;
  sharedApprovers?: string[];
}

export const APPROVE_IKA_MESSAGE_AS_SESSION_DISCRIMINATOR = Buffer.from([
  133, 198, 111, 169, 240, 8, 18, 170,
]);
export const SET_OFFICIAL_ENCRYPT_CIPHERTEXT_POLICY_DISCRIMINATOR = Buffer.from([
  46, 133, 123, 44, 247, 184, 6, 250,
]);
export const EXECUTE_ENCRYPT_POLICY_GRAPH_AS_SESSION_DISCRIMINATOR = Buffer.from([
  37, 34, 20, 39, 19, 43, 189, 171,
]);
export const APPROVE_IKA_MESSAGE_WITH_VERIFIED_ENCRYPT_AS_SESSION_DISCRIMINATOR = Buffer.from([
  90, 155, 234, 78, 137, 233, 226, 101,
]);
export const ENCRYPT_PREALPHA_PROGRAM_ID_STRING = '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8';
export const ENCRYPT_PREALPHA_GRPC_URL = 'https://pre-alpha-dev-1.encrypt.ika-network.net:443';
export const ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';

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
  Buffer.from(normalizeBytes32(request.maskedWitnessDevFixture, 'maskedWitnessDevFixture')).copy(data, offset);
  offset += 32;
  Buffer.from(normalizeUserPubkey(request.userPubkey)).copy(data, offset);
  offset += 32;
  data.writeUInt16LE(toU16(request.signatureScheme), offset);
  offset += 2;
  data.writeUInt8(toU8(request.messageApprovalBump, 'messageApprovalBump'), offset);

  return data;
}

export function buildSetOfficialEncryptCiphertextPolicyInstructionData(
  request: SetOfficialEncryptCiphertextPolicyTransactionRequest
): Buffer {
  const data = Buffer.alloc(8 + 32);
  SET_OFFICIAL_ENCRYPT_CIPHERTEXT_POLICY_DISCRIMINATOR.copy(data, 0);
  Buffer.from(normalizeBytes32(request.policyCommitment, 'policyCommitment')).copy(data, 8);
  return data;
}

export function buildExecuteEncryptPolicyGraphAsSessionInstructionData(
  request: ExecuteEncryptPolicyGraphTransactionRequest,
  programId = PROGRAM_ID_STRING
): Buffer {
  const cpiAuthorityBump = deriveEncryptCpiAuthority(programId)[1];
  const data = Buffer.alloc(8 + 8 + 8 + 1);
  EXECUTE_ENCRYPT_POLICY_GRAPH_AS_SESSION_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(toU64(request.attestationSlot), 8);
  data.writeBigUInt64LE(toU64(request.attestationPolicySeq), 16);
  data.writeUInt8(cpiAuthorityBump, 24);
  return data;
}

export function buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData(
  request: ApproveIkaMessageWithVerifiedEncryptTransactionRequest
): Buffer {
  const data = Buffer.alloc(8 + 32 + 8 + 8 + 8 + 32 + 2 + 1);
  let offset = 0;

  APPROVE_IKA_MESSAGE_WITH_VERIFIED_ENCRYPT_AS_SESSION_DISCRIMINATOR.copy(data, offset);
  offset += 8;
  Buffer.from(normalizeBytes32(request.ikaMessageHash, 'ikaMessageHash')).copy(data, offset);
  offset += 32;
  data.writeBigInt64LE(toI64(request.orderExpiresAt), offset);
  offset += 8;
  data.writeBigUInt64LE(toU64(request.attestationSlot), offset);
  offset += 8;
  data.writeBigUInt64LE(toU64(request.attestationPolicySeq), offset);
  offset += 8;
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

export async function buildSetOfficialEncryptCiphertextPolicyTransaction(
  request: SetOfficialEncryptCiphertextPolicyTransactionRequest,
  programId = PROGRAM_ID_STRING
): Promise<BuiltTransaction> {
  const ownerPubkey = new PublicKey(request.owner);
  const transaction = new Transaction().add(new TransactionInstruction({
    keys: buildSetOfficialEncryptCiphertextPolicyAccounts(request, programId),
    programId: new PublicKey(programId),
    data: buildSetOfficialEncryptCiphertextPolicyInstructionData(request),
  }));
  const signerSet = new Set([request.owner, request.encrypt.payer]);
  return serializeBuiltTransaction(transaction, ownerPubkey, Array.from(signerSet));
}

export async function buildExecuteEncryptPolicyGraphSessionTransaction(
  request: ExecuteEncryptPolicyGraphTransactionRequest,
  programId = PROGRAM_ID_STRING
): Promise<BuiltTransaction> {
  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const transaction = new Transaction().add(new TransactionInstruction({
    keys: buildExecuteEncryptPolicyGraphAsSessionAccounts(request, programId),
    programId: new PublicKey(programId),
    data: buildExecuteEncryptPolicyGraphAsSessionInstructionData(request, programId),
  }));
  const signerSet = new Set([request.sessionKey, request.encrypt.payer]);
  return serializeBuiltTransaction(transaction, sessionKeyPubkey, Array.from(signerSet));
}

export async function buildApproveIkaMessageWithVerifiedEncryptSessionTransaction(
  request: ApproveIkaMessageWithVerifiedEncryptTransactionRequest,
  programId = PROGRAM_ID_STRING
): Promise<BuiltTransaction> {
  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const transaction = new Transaction().add(new TransactionInstruction({
    keys: buildApproveIkaMessageWithVerifiedEncryptAsSessionAccounts(request),
    programId: new PublicKey(programId),
    data: buildApproveIkaMessageWithVerifiedEncryptAsSessionInstructionData(request),
  }));
  return serializeBuiltTransaction(
    transaction,
    sessionKeyPubkey,
    [request.sessionKey, ...(request.sharedApprovers ?? [])]
  );
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

export function buildSetOfficialEncryptCiphertextPolicyAccounts(
  request: Pick<
    SetOfficialEncryptCiphertextPolicyTransactionRequest,
    'wallet' | 'owner' | 'maxPerRunCiphertext' | 'dailyCapCiphertext' | 'dailySpentCiphertext' | 'encrypt'
  >,
  programId = PROGRAM_ID_STRING
) {
  const [cpiAuthority] = deriveEncryptCpiAuthority(programId);
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.owner), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.maxPerRunCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.dailyCapCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.dailySpentCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.config), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.deposit), isSigner: false, isWritable: true },
    { pubkey: cpiAuthority, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(programId), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.networkEncryptionKey), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.payer), isSigner: true, isWritable: true },
    { pubkey: new PublicKey(request.encrypt.eventAuthority), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

export function buildExecuteEncryptPolicyGraphAsSessionAccounts(
  request: Pick<
    ExecuteEncryptPolicyGraphTransactionRequest,
    | 'wallet'
    | 'sessionKey'
    | 'sourceAmountCiphertext'
    | 'maxPerRunCiphertext'
    | 'dailySpentCiphertext'
    | 'dailyCapCiphertext'
    | 'allowedOutputCiphertext'
    | 'dailySpentOutputCiphertext'
    | 'encrypt'
  >,
  programId = PROGRAM_ID_STRING
) {
  const [cpiAuthority] = deriveEncryptCpiAuthority(programId);
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.sourceAmountCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.maxPerRunCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.dailySpentCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.dailyCapCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.allowedOutputCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.dailySpentOutputCiphertext), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.encrypt.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.config), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.encrypt.deposit), isSigner: false, isWritable: true },
    { pubkey: cpiAuthority, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(programId), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.networkEncryptionKey), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.encrypt.payer), isSigner: true, isWritable: true },
    { pubkey: new PublicKey(request.encrypt.eventAuthority), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
}

export function buildApproveIkaMessageWithVerifiedEncryptAsSessionAccounts(
  request: Pick<
    ApproveIkaMessageWithVerifiedEncryptTransactionRequest,
    | 'wallet'
    | 'sessionKey'
    | 'allowedOutputCiphertext'
    | 'dailySpentOutputCiphertext'
    | 'allowedDecryptionRequest'
    | 'coordinator'
    | 'dwallet'
    | 'messageApproval'
    | 'cpiAuthority'
    | 'callerProgram'
    | 'ikaProgram'
    | 'sharedApprovers'
  >
) {
  return [
    { pubkey: new PublicKey(request.wallet), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(request.sessionKey), isSigner: true, isWritable: false },
    { pubkey: new PublicKey(request.allowedOutputCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.dailySpentOutputCiphertext), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(request.allowedDecryptionRequest), isSigner: false, isWritable: false },
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

export function deriveEncryptCpiAuthority(programId = PROGRAM_ID_STRING): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_CPI_AUTHORITY_SEED)],
    new PublicKey(programId)
  );
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

async function serializeBuiltTransaction(
  transaction: Transaction,
  feePayer: PublicKey,
  signers: string[]
): Promise<BuiltTransaction> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  return {
    transaction: transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64'),
    blockHash: blockhash,
    slot: recentSlot,
    signers,
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
