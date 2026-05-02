/**
 * API client for Polet AI Proxy
 */

import type { Intent, IntentEvaluationResult, Policy, TemplateId } from '../types';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3000';

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

export async function evaluateIntent(intent: Intent): Promise<IntentEvaluationResult> {
  const data = await fetchJson<{ success: boolean; data: IntentEvaluationResult }>(
    `${PROXY_URL}/intent/evaluate`,
    {
      method: 'POST',
      body: JSON.stringify(intent),
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

export { PROXY_URL };
