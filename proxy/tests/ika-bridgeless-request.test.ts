import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  buildConfidentialNumericPolicySetup,
  currentDayIndex,
} from '../src/lib/confidential-numeric-policy';
import { deriveWalletPda } from '../src/lib/confidential-dca-execution';
import { createIkaBridgelessExecutionRequest } from '../src/lib/ika-bridgeless-request';
import { hashCanonicalBridgelessOrder } from '../src/lib/bridgeless-order';
import {
  IKA_PREALPHA_CLUSTER,
  deriveIkaMessageDigest,
  deriveIkaPreAlphaApprovalAccounts,
} from '../src/lib/ika-prealpha-signing';
import type { WalletData } from '../src/lib/wallet-store';
import type { Intent } from '../src/types/intent';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('Ika bridgeless execution request', () => {
  test('creates an ika-bridgeless request only after confidential guardrail approval', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.code).toBe('IKA_PREALPHA_MESSAGE_APPROVED');
      expect(result.status).toBe('message-approved');
      expect(result.ikaRequest.executionRail).toBe('ika-bridgeless');
      expect(result.ikaRequest.settlement).toBe('not-executed');
      expect(result.ikaRequest.source).toEqual({ chain: 'solana', asset: 'USDC' });
      expect(result.ikaRequest.target).toEqual({ chain: 'sui', asset: 'SUI' });
      expect(result.ikaRequest.amount).toBe('5');
      expect(result.ikaRequest.amountBaseUnits).toBe('5000000');
      expect(result.ikaRequest.sessionContext.owner).toBe(fixture.owner);
      expect(result.ikaRequest.sessionContext.sessionKey).toBe(fixture.sessionKey);
      expect(result.ikaRequest.sessionContext.smartWalletAuthority).toBe(fixture.wallet.walletPda);
      expect(result.ikaRequest.sessionContext.policySequence).toBe(7);
      expect(result.ikaRequest.policyAttestation.status).toBe('approved');
      expect(result.ikaRequest.policyAttestation.policySequence).toBe(7);
      expect(result.ikaRequest.canonicalOrder.schema).toBe('polet.bridgeless.order.v1');
      expect(result.ikaRequest.canonicalOrder.intentId).toBe(intent.id);
      expect(result.ikaRequest.canonicalOrder.source).toEqual({ chain: 'solana', asset: 'USDC' });
      expect(result.ikaRequest.canonicalOrder.target).toEqual({ chain: 'sui', asset: 'SUI' });
      expect(result.ikaRequest.canonicalOrder.amount.policyBaseUnits).toBe('5000000');
      expect(result.ikaRequest.canonicalOrder.nonce).toBe(intent.id);
      expect(result.ikaRequest.canonicalOrderHash).toBe(
        await hashCanonicalBridgelessOrder(result.ikaRequest.canonicalOrder)
      );
      expect(result.ikaRequest.executionBoundary.status).toBe('message-approved');
      expect(result.ikaRequest.executionBoundary.note).toMatch(/pre-alpha/i);
      expect(result.ikaRequest.preAlphaSigning?.status).toBe('message-approved');
      expect(result.ikaRequest.preAlphaSigning?.settlement).toBe('not-executed');
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.cluster).toBe(IKA_PREALPHA_CLUSTER);
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.mockSigner).toBe(true);
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.productionMpc).toBe(false);
      expect(result.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
      expect(result.ikaRequest.poletApprovalTransaction?.signers).toEqual([fixture.sessionKey]);
    }
  });

  test('derives deterministic Ika Pre-Alpha approval accounts after policy approval', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      const signing = result.ikaRequest.preAlphaSigning;
      expect(signing).toBeDefined();
      const expected = deriveIkaPreAlphaApprovalAccounts({
        dwalletAccount: signing!.dwalletAccount,
        smartWalletAuthority: fixture.wallet.walletPda,
        messageDigest: deriveIkaMessageDigest(result.ikaRequest),
      });

      expect(signing!.messageDigest).toBe(deriveIkaMessageDigest(result.ikaRequest));
      expect(signing!.messageApprovalPda).toBe(expected.messageApprovalPda);
      expect(signing!.messageApprovalBump).toBe(expected.messageApprovalBump);
      expect(signing!.cpiAuthorityPda).toBe(expected.cpiAuthorityPda);
      expect(signing!.cpiAuthorityBump).toBe(expected.cpiAuthorityBump);
      expect(signing!.approveMessage).toMatchObject({
        instruction: 'approve_message',
        authority: expected.cpiAuthorityPda,
        accounts: {
          messageApproval: expected.messageApprovalPda,
          cpiAuthority: expected.cpiAuthorityPda,
          userPublicKey: fixture.owner,
        },
      });
    }
  });

  test('suppresses the Ika request when confidential policy blocks the amount', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '25');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect('ikaRequest' in result).toBe(false);
      expect('preAlphaSigning' in result).toBe(false);
      expect(result.reason).not.toContain('10');
      expect(result.reason).not.toContain('20');
      expect(JSON.stringify(result)).not.toContain('10000000');
      expect(JSON.stringify(result)).not.toContain('20000000');
    }
  });

  test('rejects stale sessions before preparing a bridgeless request', async () => {
    const fixture = createFixture({
      sessionGrantedSlot: 4,
      lastRevokedSlot: 5,
    });
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('SESSION_STALE');
      expect('ikaRequest' in result).toBe(false);
    }
  });

  test('keeps witness and private thresholds out of the allowed response', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    const serialized = JSON.stringify(result);

    expect(result.allowed).toBe(true);
    expect(serialized).not.toContain(fixture.witness.join(','));
    expect(serialized).not.toContain('10000000');
    expect(serialized).not.toContain('20000000');
    expect(serialized).not.toContain('maxPerRun');
    expect(serialized).not.toContain('dailyCap');
    expect(serialized).not.toContain(fixture.witness.join(','));
  });

  test('passes official Ika accounts and canonical order hash into the Polet transaction builder', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    const transactionRequests: unknown[] = [];

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async (request) => {
        transactionRequests.push(request);
        return fixture.approvalTransaction;
      },
    });

    expect(result.allowed).toBe(true);
    expect(transactionRequests).toHaveLength(1);
    if (result.allowed) {
      expect(transactionRequests[0]).toMatchObject({
        wallet: fixture.wallet.walletPda,
        sessionKey: fixture.sessionKey,
        canonicalOrderHash: result.ikaRequest.canonicalOrderHash,
        sourceAmount: 5_000_000n,
        orderExpiresAt: result.ikaRequest.canonicalOrder.expiresAtUnix,
        attestationSlot: BigInt(fixture.wallet.lastRevokedSlot) + 1n,
        attestationPolicySeq: fixture.wallet.policySeq,
        encryptionWitness: Array.from(fixture.witness),
        userPubkey: fixture.owner,
      });
      expect((transactionRequests[0] as { ikaProgram: string }).ikaProgram).toBe('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
    }
  });
});

function createIkaIntent(fixture: ReturnType<typeof createFixture>, amount: string): Intent {
  return {
    id: `ika-${amount}`,
    owner: fixture.owner,
    sessionKey: fixture.sessionKey,
    action: 'multichain-strategy',
    params: {
      sourceChain: 'solana',
      sourceAsset: 'USDC',
      targetChain: 'sui',
      targetAsset: 'SUI',
      amount,
      executionRail: 'ika',
      strategy: 'dca',
      slippageBps: 100,
      encryptionWitness: Array.from(fixture.witness),
    },
    timestamp: 1700000000,
  };
}

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
    encryptionWitness: witness,
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

  const approvalTransaction = {
    transaction: 'base64-polet-ika-approval',
    blockHash: 'mock-blockhash',
    slot: 456,
    signers: [sessionKey],
  };

  return { owner, sessionKey, wallet, witness, approvalTransaction };
}
