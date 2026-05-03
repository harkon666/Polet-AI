/**
 * E2E Test Setup Utilities
 *
 * This module provides mock utilities for end-to-end testing of the Polet AI
 * policy enforcement system. These mocks simulate the on-chain state and
 * attestation generation that would occur in production.
 */

// Re-export policy types for convenience
export interface TestIntent {
  id: string;
  owner: string;
  sessionKey: string;
  action: 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';
  params: Record<string, unknown>;
  timestamp: number;
  policyHash?: string;
}

export interface TestPolicy {
  allowlist: string[];
  blocklist: string[];
  maxAmount?: number;
  dailyLimit?: number;
  allowedActions?: string[];
}

export interface TestWallet {
  owner: string;
  policyHash: string;
  temporalKeys: TestTemporalKey[];
  dailySpent: number;
  lastReset: number;
}

export interface TestTemporalKey {
  key: string;
  expiresAt: number;
  authorized: boolean;
  dailyLimit: number;
  dailySpent: number;
  lastReset: number;
}

export interface TestAttestation {
  owner: string;
  sessionKey: string;
  policyHash: string;
  intentHash: string;
  blockHash: string;
  slot: number;
  timestamp: number;
}

/**
 * Mock wallet store for testing
 */
export class MockWalletStore {
  private wallets: Map<string, TestWallet> = new Map();

  createWallet(owner: string, policyHash: string): TestWallet {
    const wallet: TestWallet = {
      owner,
      policyHash,
      temporalKeys: [],
      dailySpent: 0,
      lastReset: Date.now(),
    };
    this.wallets.set(owner, wallet);
    return wallet;
  }

  getWallet(owner: string): TestWallet | undefined {
    return this.wallets.get(owner);
  }

  addTemporalKey(owner: string, temporalKey: TestTemporalKey): void {
    const wallet = this.wallets.get(owner);
    if (wallet) {
      wallet.temporalKeys.push(temporalKey);
    }
  }

  revokeTemporalKey(owner: string, keyToRevoke: string): void {
    const wallet = this.wallets.get(owner);
    if (wallet) {
      const key = wallet.temporalKeys.find(k => k.key === keyToRevoke);
      if (key) {
        key.authorized = false;
      }
    }
  }

  updateDailySpent(owner: string, amount: number): void {
    const wallet = this.wallets.get(owner);
    if (wallet) {
      wallet.dailySpent += amount;
    }
  }
}

/**
 * Create a mock wallet store with pre-populated data
 */
export function createMockWalletStore(): MockWalletStore {
  const store = new MockWalletStore();

  // Create a demo wallet with a daily limit policy
  store.createWallet('DemoOwner123', 'policy-hash-abc');

  return store;
}

/**
 * Generate a mock attestation for testing
 */
export function mockAttestation(
  intent: TestIntent,
  policyHash: string,
  blockHash: string = 'mock-block-hash',
  slot: number = 123456
): TestAttestation {
  const intentData = JSON.stringify({
    id: intent.id,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    action: intent.action,
    params: intent.params,
    timestamp: intent.timestamp,
  });

  // Simple hash for demo
  const intentHash = simpleHash(intentData);

  return {
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policyHash,
    intentHash,
    blockHash,
    slot,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Simple string hash for demo/testing purposes
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(64, '0');
}

/**
 * Create a demo policy with daily limit
 */
export function createDailyLimitPolicy(dailyLimitLamports: number): TestPolicy {
  return {
    allowlist: [],
    blocklist: [],
    maxAmount: dailyLimitLamports,
    dailyLimit: dailyLimitLamports,
  };
}

/**
 * Create a demo whitelist-only policy
 */
export function createWhitelistPolicy(allowedDestinations: string[]): TestPolicy {
  return {
    allowlist: allowedDestinations,
    blocklist: [],
  };
}

/**
 * Create a demo blocklist policy
 */
export function createBlocklistPolicy(blockedDestinations: string[]): TestPolicy {
  return {
    allowlist: [],
    blocklist: blockedDestinations,
  };
}