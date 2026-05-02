import type { Attestation } from '../types/intent.js';

/**
 * Transaction builder for constructing Solana transactions
 * This builds the instruction data that matches the on-chain program format
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

/**
 * Build an execute_intent instruction for the session key flow
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

/**
 * Convert a bigint to little-endian bytes
 */
function to_LE_Bytes(num: bigint): Uint8Array {
  const arr = new Uint8Array(8);
  let n = num;
  for (let i = 0; i < 8; i++) {
    arr[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return arr;
}

/**
 * Build a Solana transaction for the intent
 * This is a simplified version - production would use @solana/kit
 */
export async function buildTransaction(
  request: TransactionRequest,
  programId: string,
  walletAddress: string
): Promise<BuiltTransaction> {
  // Mock values for demo - in production fetch from RPC
  const blockHash = '5UxJ1qG7fBrizK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V4W6X8Y0Z';
  const slot = 123456789;

  // Parse destination pubkey
  const destinationBytes = base58ToBytes(request.destination);
  if (destinationBytes.length !== 32) {
    throw new Error('Invalid destination pubkey');
  }

  // Build instruction data
  const intentData = buildExecuteIntentData(
    request.instruction,
    destinationBytes,
    BigInt(request.amount)
  );

  // In production, this would:
  // 1. Create the instruction using @solana/kit
  // 2. Build a VersionedTransaction
  // 3. Return the serialized transaction

  return {
    transaction: Buffer.from(intentData).toString('base64'),
    blockHash,
    slot,
    signers: [request.sessionKey],
  };
}

/**
 * Convert base58 string to bytes
 */
function base58ToBytes(base58: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes: number[] = [];

  for (let i = 0; i < base58.length; i++) {
    let carry = alphabet.indexOf(base58[i]);
    if (carry === -1) {
      throw new Error(`Invalid base58 character: ${base58[i]}`);
    }
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    while (carry > 0) {
      bytes.push(carry % 256);
      carry = Math.floor(carry / 256);
    }
  }

  // Handle leading zeros
  for (let i = 0; i < base58.length && base58[i] === '1'; i++) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}