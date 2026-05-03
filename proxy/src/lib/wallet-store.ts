import type { Policy } from '../types/intent.js';

/**
 * Mock wallet store for demo purposes
 * In production, this would fetch from on-chain data or an indexer
 */

interface WalletData {
  owner: string;
  policyHash: string;
  policyData: Uint8Array;
  dailyLimit: number;
  temporalKeys: Array<{
    key: string;
    expiresAt: number;
    authorized: boolean;
    dailyLimit: number;
  }>;
}

/**
 * Get wallet data for a given owner
 * Returns mock data for demo
 */
export function getWalletData(owner: string): WalletData | null {
  // In production, this would:
  // 1. Derive the PDA address from owner
  // 2. Fetch the wallet account from Solana
  // 3. Deserialize the wallet data

  // For demo, return mock data for any non-empty owner
  if (owner && owner.length > 0) {
    return {
      owner,
      policyHash: [0xab, 0xcd, 0xef, ...Array(29).fill(0)],
      policyData: new Uint8Array(),
      dailyLimit: 50_000_000,
      temporalKeys: [],
    };
  }

  return null;
}

/**
 * Get policy data for a wallet
 */
export function getWalletPolicy(owner: string): Policy | null {
  // In production, this would deserialize the policy from wallet.policyData
  // For demo, return a permissive policy
  return {
    allowlist: [],
    blocklist: [],
    maxAmount: 10_000_000_000, // 10 SOL in lamports
    dailyLimit: 100_000_000_000, // 100 SOL in lamports
  };
}

/**
 * Validate that a session key is authorized for a wallet
 */
export function isSessionAuthorized(owner: string, sessionKey: string): boolean {
  const wallet = getWalletData(owner);
  if (!wallet) return false;

  // If no temporal keys registered, allow any session key for demo
  if (wallet.temporalKeys.length === 0) return true;

  const currentTime = Math.floor(Date.now() / 1000);

  for (const tk of wallet.temporalKeys) {
    if (tk.key === sessionKey) {
      return tk.authorized && tk.expiresAt > currentTime;
    }
  }

  return false;
}