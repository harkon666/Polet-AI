/**
 * API client for Polet AI Proxy
 */

import type { Intent, IntentEvaluationResult, Policy, TemplateId } from '../types';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface EvaluateIntentInput {
  owner: string;
  sessionKey: string;
  destination: string;
  amount: number;
  mint?: string;
  action?: 'transfer';
}

export async function evaluateIntent(
  intent: Intent,
  policy?: Intent['policy']
): Promise<IntentEvaluationResult> {
  const body = policy ? { ...intent, policy } : intent;
  const data = await fetchJson<{ success: boolean; data: IntentEvaluationResult }>(
    `${PROXY_URL}/intent/evaluate`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  return data.data;
}

export interface BuildTransactionInput {
  owner: string;
  sessionKey: string;
  instruction: number;
  destination: string;
  amount: number;
  attestation: string;
}

export interface BuildTransactionResult {
  allowed: boolean;
  transaction?: string;
  blockHash?: string;
  slot?: number;
  signers?: string[];
}

export async function buildTransaction(input: BuildTransactionInput): Promise<BuildTransactionResult> {
  const data = await fetchJson<{ success: boolean; data: BuildTransactionResult }>(
    `${PROXY_URL}/intent/execute`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function getPolicyTemplates() {
  const data = await fetchJson<{
    success: boolean;
    data: { templates: Array<{ id: string; name: string; description: string; useCase: string }> };
  }>(`${PROXY_URL}/template/list`);

  return data.data.templates;
}

export async function getTemplate(id: TemplateId) {
  const data = await fetchJson<{
    success: boolean;
    data: { template: { id: string; name: string; description: string; policy: Policy } };
  }>(`${PROXY_URL}/template/${id}`);

  return data.data.template;
}

export async function applyTemplate(templateId: TemplateId, options?: {
  customAllowlist?: string[];
  customBlocklist?: string[];
  dailyLimitAmount?: number;
  maxTransactionAmount?: number;
}) {
  const data = await fetchJson<{
    success: boolean;
    data: { policy: Policy };
  }>(`${PROXY_URL}/template/apply`, {
    method: 'POST',
    body: JSON.stringify({ templateId, ...options }),
  });

  return data.data.policy;
}

export async function getWalletData(owner: string) {
  const data = await fetchJson<{
    success: boolean;
    data: any;
  }>(`${PROXY_URL}/wallet/${owner}`);

  return data.data;
}

export interface SetConfidentialPolicyInput {
  owner: string;
  maxPerRunUsdc: string;
  dailyCapUsdc: string;
  encryptionWitness: number[];
}

export interface SetupDemoCustodyInput {
  owner: string;
  usdcMint?: string;
  usdcTokenAccount?: string;
  solMint?: string;
  solTokenAccount?: string;
  tokenProgram?: string;
}

export interface WalletTransactionResult {
  transaction: string;
  wallet: string;
  usdcTokenAccount?: string;
  solTokenAccount?: string;
  policyCommitment?: number[];
  encryptionWitnessHash?: number[];
}

export async function setConfidentialPolicy(input: SetConfidentialPolicyInput): Promise<WalletTransactionResult> {
  const data = await fetchJson<{ success: boolean; data: WalletTransactionResult }>(
    `${PROXY_URL}/wallet/set-confidential-policy`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function setupDemoCustody(input: SetupDemoCustodyInput): Promise<WalletTransactionResult> {
  const data = await fetchJson<{ success: boolean; data: WalletTransactionResult }>(
    `${PROXY_URL}/wallet/setup-demo-custody`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface RunConfidentialDcaInput {
  owner: string;
  sessionKey: string;
  amountUsdc: string;
  encryptionWitness: number[];
  slippageBps?: number;
}

export type RunConfidentialDcaResult = {
  allowed: boolean;
  code: string;
  reason?: string;
  amount?: string;
  amountBaseUnits?: string;
  executionPath?: 'recurring' | 'swap-build-fallback';
  smartWalletAuthority?: string;
  transaction?: {
    transaction: string;
    blockHash: string;
    slot: number;
    signers: string[];
  };
};

export async function runConfidentialDca(input: RunConfidentialDcaInput): Promise<RunConfidentialDcaResult> {
  const data = await fetchJson<{ success: boolean; data: RunConfidentialDcaResult }>(
    `${PROXY_URL}/intent/dca/run`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export { PROXY_URL };
