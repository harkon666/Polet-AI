import { describe, expect, test } from 'bun:test';
import {
  buildConfidentialNumericPolicySetup,
  encodeConfidentialAmount,
  evaluateConfidentialNumericPolicy,
  parseUsdcAmount,
} from '../src/lib/confidential-numeric-policy';
import type { WalletData } from '../src/lib/wallet-store';

describe('Confidential numeric policy module', () => {
  test('encodes setup values and evaluates an allowed amount through the module interface', () => {
    const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
    const setup = buildConfidentialNumericPolicySetup({
      maxPerRunUsdc: '10',
      dailyCapUsdc: '20',
      encryptionWitness: witness,
      spentDayIndex: 123,
    });
    const wallet = walletWithPolicy(setup, 123);

    const result = evaluateConfidentialNumericPolicy(
      wallet,
      parseUsdcAmount('5'),
      witness,
      123,
      { blockedReason: 'safe blocked reason' }
    );

    expect(result.allowed).toBe(true);
    expect(setup.policyCommitment).toHaveLength(32);
    expect(setup.encryptionWitnessHash).toHaveLength(32);
    expect(setup.encryptedDailySpent).toBe(encodeConfidentialAmount(0n, witness));
  });

  test('returns non-leaking block and witness errors', () => {
    const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
    const setup = buildConfidentialNumericPolicySetup({
      maxPerRunUsdc: '10',
      dailyCapUsdc: '20',
      encryptionWitness: witness,
      spentDayIndex: 123,
    });
    const wallet = walletWithPolicy(setup, 123);

    const blocked = evaluateConfidentialNumericPolicy(
      wallet,
      parseUsdcAmount('25'),
      witness,
      123,
      { blockedReason: 'Confidential policy blocked this DCA run.' }
    );
    const badWitness = Uint8Array.from(witness);
    badWitness[0] ^= 255;
    const invalidWitness = evaluateConfidentialNumericPolicy(wallet, parseUsdcAmount('5'), badWitness, 123);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect(blocked.reason).not.toContain('10');
      expect(blocked.reason).not.toContain('20');
    }
    expect(invalidWitness.allowed).toBe(false);
    if (!invalidWitness.allowed) expect(invalidWitness.code).toBe('INVALID_POLICY_WITNESS');
  });
});

function walletWithPolicy(
  setup: ReturnType<typeof buildConfidentialNumericPolicySetup>,
  spentDayIndex: number
): Pick<WalletData, 'confidentialPolicy'> {
  return {
    confidentialPolicy: {
      policyCommitment: setup.policyCommitment,
      encryptionWitnessHash: setup.encryptionWitnessHash,
      encryptedMaxPerRun: setup.encryptedMaxPerRun,
      encryptedDailyCap: setup.encryptedDailyCap,
      encryptedDailySpent: setup.encryptedDailySpent,
      spentDayIndex,
      enabled: true,
    },
  };
}
