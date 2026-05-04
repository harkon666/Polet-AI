import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  Connection,
  type Signer,
} from '@solana/web3.js';
import type { Attestation, Intent } from '../types/intent';

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

/**
 * Build instruction data matching the Solana program's execute_intent format
 * Format: [instruction(1) + destination(32) + amount(8)]
 */
export function buildExecuteIntentData(
  instruction: number,
  destination: Uint8Array,
  amount: bigint
): Uint8Array {
  const data = new Uint8Array(41); // 1 + 32 + 8
  data[0] = instruction;
  data.set(destination, 1);
  data.set(to_LE_Bytes(amount), 33);
  return data;
}

export function buildExecuteConfidentialTransferInstructionData(
  request: ConfidentialTransferTransactionRequest
): Buffer {
  const discriminator = Buffer.from([142, 74, 175, 147, 39, 73, 10, 41]);
  const destination = new PublicKey(request.destination);
  const intentData = buildExecuteIntentData(0, destination.toBytes(), BigInt(request.amount));
  const witness = Uint8Array.from(request.encryptionWitness);

  if (witness.length !== 32) {
    throw new Error('encryptionWitness must contain exactly 32 bytes');
  }

  return Buffer.concat([
    discriminator,
    toU32Le(intentData.length),
    Buffer.from(intentData),
    Buffer.from(to_LE_Bytes(BigInt(request.attestationSlot))),
    Buffer.from(to_LE_Bytes(BigInt(request.attestationPolicySeq))),
    Buffer.from(witness),
  ]);
}

/**
 * Convert a bigint to little-endian bytes
 */
export function to_LE_Bytes(num: bigint): Uint8Array {
  const arr = new Uint8Array(8);
  let n = num;
  for (let i = 0; i < 8; i++) {
    arr[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return arr;
}

function toU32Le(num: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(num, 0);
  return buffer;
}

export async function buildConfidentialTransferSessionTransaction(
  request: ConfidentialTransferTransactionRequest,
  programId: string
): Promise<BuiltTransaction> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  const recentSlot = await connection.getSlot();

  const walletPubkey = new PublicKey(request.wallet);
  const sessionKeyPubkey = new PublicKey(request.sessionKey);
  const destinationPubkey = new PublicKey(request.destination);
  const programIdPubkey = new PublicKey(programId);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: false, isWritable: true },
      { pubkey: sessionKeyPubkey, isSigner: true, isWritable: false },
      { pubkey: destinationPubkey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
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
