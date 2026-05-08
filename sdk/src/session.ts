import { PublicKey } from '@solana/web3.js';

/**
 * Session Key Management helpers for the Polet AI SDK
 *
 * These utilities help AI agents manage session keys and understand
 * their relationship with the wallet PDA.
 */

/**
 * PDA derivation seed for wallet accounts
 * The wallet PDA is derived from [WALLET_SEED, owner]
 */
export const WALLET_SEED = 'polet_wallet';
export const PROGRAM_ID = '33ubr2bpviBt5iLQgb2C6eyczFuka7uhSoxDxBnQktKY';

/**
 * Derive a wallet PDA address from an owner public key
 * Wallets on Polet AI are PDAs with seeds [WALLET_SEED, owner]
 */
export async function deriveWalletPDA(owner: string | PublicKey): Promise<PublicKey> {
  const ownerPubkey = typeof owner === 'string' ? new PublicKey(owner) : owner;

  return PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), ownerPubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  )[0];
}

/**
 * Validate a public key string
 */
export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a public key for display (truncate middle)
 */
export function formatPublicKey(key: string, chars: number = 4): string {
  if (key.length <= chars * 2 + 3) {
    return key;
  }
  return `${key.slice(0, chars)}...${key.slice(-chars)}`;
}

/**
 * Check if two public keys are equal
 */
export function publicKeysEqual(a: string | PublicKey, b: string | PublicKey): boolean {
  const aKey = typeof a === 'string' ? new PublicKey(a) : a;
  const bKey = typeof b === 'string' ? new PublicKey(b) : b;
  return aKey.equals(bKey);
}

/**
 * Parse intent parameters based on action type
 */
export interface ParsedTransferParams {
  destination: string;
  amount: number;
  mint?: string;
}

export interface ParsedSwapParams {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  minOutputAmount: number;
}

export interface ParsedStakeParams {
  validator: string;
  amount: number;
}

export interface ParsedCustomParams {
  programId: string;
  instructionData: string;
  accounts: string[];
}

export type ParsedParams = ParsedTransferParams | ParsedSwapParams | ParsedStakeParams | ParsedCustomParams;

/**
 * Parse intent params safely based on action type
 */
export function parseIntentParams<T extends ParsedParams>(
  action: string,
  params: unknown
): T {
  if (!params || typeof params !== 'object') {
    throw new Error('Params must be an object');
  }

  const p = params as Record<string, unknown>;

  switch (action) {
    case 'transfer':
      if (!p.destination || typeof p.destination !== 'string') {
        throw new Error('Transfer params must have destination string');
      }
      if (typeof p.amount !== 'number' || p.amount <= 0) {
        throw new Error('Transfer params must have positive amount');
      }
      return {
        destination: p.destination,
        amount: p.amount,
        ...(p.mint && typeof p.mint === 'string' ? { mint: p.mint } : {}),
      } as T;

    case 'swap':
      if (!p.inputMint || typeof p.inputMint !== 'string') {
        throw new Error('Swap params must have inputMint');
      }
      if (!p.outputMint || typeof p.outputMint !== 'string') {
        throw new Error('Swap params must have outputMint');
      }
      if (typeof p.inputAmount !== 'number' || p.inputAmount <= 0) {
        throw new Error('Swap params must have positive inputAmount');
      }
      if (typeof p.minOutputAmount !== 'number' || p.minOutputAmount <= 0) {
        throw new Error('Swap params must have positive minOutputAmount');
      }
      return {
        inputMint: p.inputMint,
        outputMint: p.outputMint,
        inputAmount: p.inputAmount,
        minOutputAmount: p.minOutputAmount,
      } as T;

    case 'stake':
    case 'unstake':
      if (!p.validator || typeof p.validator !== 'string') {
        throw new Error('Stake params must have validator string');
      }
      if (typeof p.amount !== 'number' || p.amount <= 0) {
        throw new Error('Stake params must have positive amount');
      }
      return {
        validator: p.validator,
        amount: p.amount,
      } as T;

    case 'custom':
      if (!p.programId || typeof p.programId !== 'string') {
        throw new Error('Custom params must have programId');
      }
      if (!p.instructionData || typeof p.instructionData !== 'string') {
        throw new Error('Custom params must have instructionData string');
      }
      if (!Array.isArray(p.accounts)) {
        throw new Error('Custom params must have accounts array');
      }
      return {
        programId: p.programId,
        instructionData: p.instructionData,
        accounts: p.accounts as string[],
      } as T;

    default:
      throw new Error(`Unknown action type: ${action}`);
  }
}

/**
 * Estimate transaction fee in lamports
 * For Solana, fees are typically 5000 lamports base + 500 per signature
 */
export function estimateFee(numSigners: number = 1): number {
  return 5000 + (numSigners * 500);
}

/**
 * Format lamports to SOL for display
 */
export function lamportsToSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9);
}

/**
 * Parse SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
