import { createHash } from 'crypto';
import type { WalletData } from './wallet-store';

export const USDC_DECIMALS = 6;
const POLICY_COMMITMENT_DOMAIN = 'polet-confidential-dca-policy-v1';

export type ConfidentialNumericPolicyBlockedCode =
  | 'POLICY_NOT_CONFIGURED'
  | 'INVALID_POLICY_WITNESS'
  | 'CONFIDENTIAL_POLICY_BLOCKED';

export interface ConfidentialNumericPolicySetup {
  policyCommitment: number[];
  encryptionWitnessHash: number[];
  encryptedMaxPerRun: bigint;
  encryptedDailyCap: bigint;
  encryptedDailySpent: bigint;
  spentDayIndex: bigint;
}

export interface ConfidentialNumericPolicyEvaluationOptions {
  blockedReason: string;
}

export type ConfidentialNumericPolicyEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      code: ConfidentialNumericPolicyBlockedCode;
      reason: string;
    };

export function buildConfidentialNumericPolicySetup(input: {
  maxPerRunUsdc: unknown;
  dailyCapUsdc: unknown;
  maskedWitnessDevFixture: number[] | Uint8Array;
  spentDayIndex?: bigint | number;
}): ConfidentialNumericPolicySetup {
  const witness = normalizeWitness(input.maskedWitnessDevFixture);
  const witnessHash = hashWitness(witness);
  const encryptedMaxPerRun = encryptAmount(parseUsdcAmount(input.maxPerRunUsdc), witness);
  const encryptedDailyCap = encryptAmount(parseUsdcAmount(input.dailyCapUsdc), witness);
  const encryptedDailySpent = encryptAmount(0n, witness);
  const spentDayIndex = BigInt(input.spentDayIndex ?? currentDayIndex());
  const commitmentBytes = Buffer.concat([
    Buffer.from(POLICY_COMMITMENT_DOMAIN),
    Buffer.from(witnessHash),
    Buffer.from(encryptedMaxPerRun.toString()),
    Buffer.from(encryptedDailyCap.toString()),
    Buffer.from(spentDayIndex.toString()),
  ]);

  return {
    policyCommitment: Array.from(createHash('sha256').update(commitmentBytes).digest()),
    encryptionWitnessHash: witnessHash,
    encryptedMaxPerRun,
    encryptedDailyCap,
    encryptedDailySpent,
    spentDayIndex,
  };
}

export function evaluateConfidentialNumericPolicy(
  wallet: Pick<WalletData, 'confidentialPolicy'>,
  amountBaseUnits: bigint,
  maskedWitnessDevFixture: number[] | Uint8Array,
  today: number = currentDayIndex(),
  options: ConfidentialNumericPolicyEvaluationOptions = {
    blockedReason: 'Confidential policy blocked this action.',
  }
): ConfidentialNumericPolicyEvaluation {
  const policy = wallet.confidentialPolicy;
  if (!policy.enabled) {
    return {
      allowed: false,
      code: 'POLICY_NOT_CONFIGURED',
      reason: 'Confidential policy is not configured.',
    };
  }

  const witness = normalizeWitness(maskedWitnessDevFixture);
  if (!byteArraysEqual(hashWitness(witness), policy.encryptionWitnessHash)) {
    return {
      allowed: false,
      code: 'INVALID_POLICY_WITNESS',
      reason: 'Confidential policy witness was rejected.',
    };
  }

  const maxPerRun = decryptAmount(policy.encryptedMaxPerRun, witness);
  const dailyCap = decryptAmount(policy.encryptedDailyCap, witness);
  const dailySpent = policy.spentDayIndex === today
    ? decryptAmount(policy.encryptedDailySpent, witness)
    : 0n;

  if (amountBaseUnits > maxPerRun || dailySpent + amountBaseUnits > dailyCap) {
    return {
      allowed: false,
      code: 'CONFIDENTIAL_POLICY_BLOCKED',
      reason: options.blockedReason,
    };
  }

  return { allowed: true };
}

export function parseUsdcAmount(value: unknown): bigint {
  const raw = String(value ?? '');
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new Error('USDC amount must be positive with at most 6 decimals');
  }
  const [whole, fraction = ''] = raw.split('.');
  const baseUnits = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(USDC_DECIMALS, '0'));
  if (baseUnits <= 0n) throw new Error('USDC amount must be positive');
  return baseUnits;
}

export function encodeConfidentialAmount(amountBaseUnits: bigint, maskedWitnessDevFixture: number[] | Uint8Array): bigint {
  return encryptAmount(amountBaseUnits, normalizeWitness(maskedWitnessDevFixture));
}

export function currentDayIndex(): number {
  return Math.floor(Math.floor(Date.now() / 1000) / 86_400);
}

function normalizeWitness(maskedWitnessDevFixture: number[] | Uint8Array): Uint8Array {
  const witness = maskedWitnessDevFixture instanceof Uint8Array
    ? maskedWitnessDevFixture
    : Uint8Array.from(maskedWitnessDevFixture);
  if (witness.length !== 32) {
    throw new Error('maskedWitnessDevFixture must contain 32 bytes');
  }
  return witness;
}

function hashWitness(witness: Uint8Array): number[] {
  return Array.from(createHash('sha256').update(witness).digest());
}

function encryptAmount(amount: bigint, witness: Uint8Array): bigint {
  return amount ^ witnessMask(witness);
}

function decryptAmount(encrypted: bigint | string | number, witness: Uint8Array): bigint {
  return BigInt(encrypted) ^ witnessMask(witness);
}

function witnessMask(witness: Uint8Array): bigint {
  let value = 0n;
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(witness[index]);
  }
  return value;
}

function byteArraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
