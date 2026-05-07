import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  buildConfidentialNumericPolicySetup,
  currentDayIndex,
} from '../src/lib/confidential-numeric-policy';
import { deriveWalletPda } from '../src/lib/confidential-dca-execution';
import { executeGuardedStrategy } from '../src/lib/strategy-execution';
import type { WalletData } from '../src/lib/wallet-store';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('strategy execution interface', () => {
  test('runs prepare, confidential policy decision, then allowed payload construction', async () => {
    const fixture = createFixture();
    const calls: string[] = [];

    const result = await executeGuardedStrategy<string, { code: 'READY'; prepared: string }>(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountBaseUnits: 5_000_000n,
        maskedWitnessDevFixture: Array.from(fixture.witness),
        blockedReason: 'Confidential policy blocked this strategy.',
        prepare: async ({ wallet, amountBaseUnits }) => {
          calls.push(`prepare:${wallet.walletPda}:${amountBaseUnits}`);
          return 'route-preview';
        },
        buildAllowed: async ({ prepared }) => {
          calls.push(`build:${prepared}`);
          return { code: 'READY', prepared };
        },
      },
      {
        getWalletData: async () => fixture.wallet,
      }
    );

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.payload).toEqual({ code: 'READY', prepared: 'route-preview' });
    }
    expect(calls).toEqual([`prepare:${fixture.wallet.walletPda}:5000000`, 'build:route-preview']);
  });

  test('returns prepared route data on block without building an execution payload', async () => {
    const fixture = createFixture();
    const calls: string[] = [];

    const result = await executeGuardedStrategy<string, { code: 'READY' }>(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountBaseUnits: 25_000_000n,
        maskedWitnessDevFixture: Array.from(fixture.witness),
        blockedReason: 'Confidential policy blocked this strategy.',
        prepare: async () => {
          calls.push('prepare');
          return 'route-preview';
        },
        buildAllowed: async () => {
          calls.push('build');
          return { code: 'READY' };
        },
      },
      {
        getWalletData: async () => fixture.wallet,
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect(result.reason).toBe('Confidential policy blocked this strategy.');
      expect(result.prepared).toBe('route-preview');
      expect(JSON.stringify(result)).not.toContain('10000000');
      expect(JSON.stringify(result)).not.toContain('20000000');
    }
    expect(calls).toEqual(['prepare']);
  });

  test('blocks before prepare when the session is stale', async () => {
    const fixture = createFixture({
      sessionGrantedSlot: 4,
      lastRevokedSlot: 5,
    });
    const calls: string[] = [];

    const result = await executeGuardedStrategy<string, { code: 'READY' }>(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountBaseUnits: 5_000_000n,
        maskedWitnessDevFixture: Array.from(fixture.witness),
        blockedReason: 'Confidential policy blocked this strategy.',
        prepare: async () => {
          calls.push('prepare');
          return 'route-preview';
        },
        buildAllowed: async () => {
          calls.push('build');
          return { code: 'READY' };
        },
      },
      {
        getWalletData: async () => fixture.wallet,
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.code).toBe('SESSION_STALE');
    expect(calls).toEqual([]);
  });
});

function createFixture(options: {
  sessionAuthorized?: boolean;
  sessionGrantedSlot?: number;
  lastRevokedSlot?: number;
} = {}) {
  const owner = Keypair.generate().publicKey.toString();
  const sessionKey = Keypair.generate().publicKey.toString();
  const walletPda = deriveWalletPda(owner);
  const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
  const policySetup = buildConfidentialNumericPolicySetup({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
    maskedWitnessDevFixture: witness,
  });
  const wallet: WalletData = {
    walletPda,
    owner,
    proxyPk: PublicKey.default.toString(),
    policyCommitment: Array.from({ length: 32 }, () => 7),
    merkleRoot: Array.from({ length: 32 }, () => 0),
    policySeq: 7,
    lastRevokedSlot: options.lastRevokedSlot ?? 2,
    confidentialPolicy: {
      policyCommitment: policySetup.policyCommitment,
      encryptionWitnessHash: policySetup.encryptionWitnessHash,
      encryptedMaxPerRun: policySetup.encryptedMaxPerRun,
      encryptedDailyCap: policySetup.encryptedDailyCap,
      encryptedDailySpent: policySetup.encryptedDailySpent,
      spentDayIndex: currentDayIndex(),
      enabled: true,
    },
    demoCustody: {
      usdcMint: PublicKey.default.toString(),
      usdcTokenAccount: Keypair.generate().publicKey.toString(),
      solMint: PublicKey.default.toString(),
      solTokenAccount: Keypair.generate().publicKey.toString(),
      tokenProgram: TOKEN_PROGRAM,
      configured: true,
    },
    sessions: [
      {
        key: sessionKey,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        grantedSlot: options.sessionGrantedSlot ?? 2,
        authorized: options.sessionAuthorized ?? true,
      },
    ],
    temporalKeys: [],
  };
  wallet.temporalKeys = wallet.sessions;

  return { owner, sessionKey, wallet, witness };
}
