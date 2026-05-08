import { describe, expect, test } from 'bun:test';
import { Keypair } from '@solana/web3.js';
import { resolveOfficialEncryptDecisionFromAllowedOutput } from '../src/lib/official-encrypt-policy.js';
import type { WalletData } from '../src/lib/wallet-store.js';

describe('official Encrypt decision resolver', () => {
  test('maps completed allowed-output bool to verified allowed', () => {
    const wallet = createWallet();
    const result = resolveOfficialEncryptDecisionFromAllowedOutput(wallet, {
      allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
      allowedOutputCiphertext: wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
      allowedOutputDigest: '11'.repeat(32),
      allowed: true,
      verifiedSlot: 99,
    });

    expect(result.status).toBe('encrypt-verified-allowed');
    expect(result.allowedDecryptionResult).toBe('true');
    expect(result.policySequence).toBe(wallet.policySeq);
  });

  test('maps completed allowed-output bool to verified blocked without payload fields', () => {
    const wallet = createWallet();
    const result = resolveOfficialEncryptDecisionFromAllowedOutput(wallet, {
      allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
      allowedOutputCiphertext: wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
      allowedOutputDigest: '22'.repeat(32),
      allowed: false,
    });

    expect(result.status).toBe('encrypt-verified-blocked');
    expect(JSON.stringify(result)).not.toContain('jupiter');
    expect(JSON.stringify(result)).not.toContain('dwallet');
    expect(JSON.stringify(result)).not.toContain('MessageApproval');
  });

  test('rejects mismatched pending allowed-output ciphertext', () => {
    const wallet = createWallet();
    expect(() => resolveOfficialEncryptDecisionFromAllowedOutput(wallet, {
      allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
      allowedOutputCiphertext: Keypair.generate().publicKey.toString(),
      allowedOutputDigest: '33'.repeat(32),
      allowed: true,
    })).toThrow('does not match wallet pending graph state');
  });
});

function createWallet(): WalletData {
  const owner = Keypair.generate().publicKey.toString();
  return {
    walletPda: Keypair.generate().publicKey.toString(),
    owner,
    recoveryAuthority: Keypair.generate().publicKey.toString(),
    proxyPk: Keypair.generate().publicKey.toString(),
    policyCommitment: Array(32).fill(1),
    merkleRoot: Array(32).fill(2),
    policySeq: 7,
    lastRevokedSlot: 1,
    confidentialPolicy: {
      policyCommitment: Array(32).fill(1),
      encryptionWitnessHash: Array(32).fill(0),
      encryptedMaxPerRun: 0n,
      encryptedDailyCap: 0n,
      encryptedDailySpent: 0n,
      spentDayIndex: 0,
      enabled: true,
      encryptCiphertexts: {
        maxPerRun: Keypair.generate().publicKey.toString(),
        dailyCap: Keypair.generate().publicKey.toString(),
        dailySpent: Keypair.generate().publicKey.toString(),
        pendingSourceAmount: Keypair.generate().publicKey.toString(),
        pendingAllowedOutput: Keypair.generate().publicKey.toString(),
        pendingDailySpentOutput: Keypair.generate().publicKey.toString(),
        pendingSlot: 55,
        pendingPolicySeq: 7,
        pending: true,
        configured: true,
      },
    },
    demoCustody: {
      usdcMint: Keypair.generate().publicKey.toString(),
      usdcTokenAccount: Keypair.generate().publicKey.toString(),
      solMint: Keypair.generate().publicKey.toString(),
      solTokenAccount: Keypair.generate().publicKey.toString(),
      tokenProgram: Keypair.generate().publicKey.toString(),
      configured: true,
    },
    sharedIkaApprovals: { threshold: 0, enabled: false, approvers: [] },
    dwalletController: {
      currentController: Keypair.generate().publicKey.toString(),
      pendingController: Keypair.generate().publicKey.toString(),
      rotationSeq: 0,
      lastRotatedSlot: 0,
      migrationPending: false,
    },
    sessions: [],
    temporalKeys: [],
  };
}
