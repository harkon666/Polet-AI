import { createHash } from 'crypto';
import type { WalletData } from './wallet-store';

export type OfficialEncryptPolicyStatus =
  | 'pending-encrypt-execution'
  | 'encrypt-verified-allowed'
  | 'encrypt-verified-blocked';

export interface EncryptPolicyCiphertextState {
  maxPerRun: string;
  dailyCap: string;
  dailySpent: string;
  pendingAllowedOutput: string;
  pendingDailySpentOutput: string;
  pendingSourceAmount: string;
  pendingSlot: number;
  pendingPolicySeq: number;
  pending: boolean;
  configured: boolean;
}

export interface OfficialEncryptPolicyPending {
  status: 'pending-encrypt-execution';
  policySequence: number;
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  pendingSlot: number;
  graph: 'polet_policy_guardrail_graph';
}

export interface OfficialEncryptPolicyVerifiedAllowed {
  status: 'encrypt-verified-allowed';
  policySequence: number;
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  verifiedSlot?: number;
  graph: 'polet_policy_guardrail_graph';
}

export interface OfficialEncryptPolicyVerifiedBlocked {
  status: 'encrypt-verified-blocked';
  policySequence: number;
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  verifiedSlot?: number;
  graph: 'polet_policy_guardrail_graph';
}

export type OfficialEncryptPolicyExecution =
  | OfficialEncryptPolicyPending
  | OfficialEncryptPolicyVerifiedAllowed
  | OfficialEncryptPolicyVerifiedBlocked;

export interface OfficialEncryptPolicyExecutionRequest {
  wallet: WalletData;
  owner: string;
  sessionKey: string;
  amountBaseUnits: bigint;
}

export type OfficialEncryptPolicyResolver = (
  request: OfficialEncryptPolicyExecutionRequest
) => Promise<OfficialEncryptPolicyExecution | null> | OfficialEncryptPolicyExecution | null;

const GRAPH_NAME = 'polet_policy_guardrail_graph';
const PLACEHOLDER_PREFIX = 'encrypt-pending';

export function hasOfficialEncryptPolicy(wallet: Pick<WalletData, 'confidentialPolicy'>): boolean {
  return wallet.confidentialPolicy.encryptCiphertexts?.configured === true;
}

export async function evaluateOfficialEncryptPolicyLifecycle(
  request: OfficialEncryptPolicyExecutionRequest,
  resolver?: OfficialEncryptPolicyResolver
): Promise<OfficialEncryptPolicyExecution> {
  const resolved = await resolver?.(request);
  if (resolved) return assertSafeExecution(request.wallet, resolved);

  const state = request.wallet.confidentialPolicy.encryptCiphertexts;
  if (state?.pending) {
    return {
      status: 'pending-encrypt-execution',
      policySequence: state.pendingPolicySeq || request.wallet.policySeq,
      sourceAmountCiphertext: state.pendingSourceAmount,
      allowedOutputCiphertext: state.pendingAllowedOutput,
      dailySpentOutputCiphertext: state.pendingDailySpentOutput,
      pendingSlot: state.pendingSlot,
      graph: GRAPH_NAME,
    };
  }

  return {
    status: 'pending-encrypt-execution',
    policySequence: request.wallet.policySeq,
    sourceAmountCiphertext: deterministicPendingCiphertext(request, 'source-amount'),
    allowedOutputCiphertext: deterministicPendingCiphertext(request, 'allowed-output'),
    dailySpentOutputCiphertext: deterministicPendingCiphertext(request, 'daily-spent-output'),
    pendingSlot: 0,
    graph: GRAPH_NAME,
  };
}

function assertSafeExecution(
  wallet: WalletData,
  execution: OfficialEncryptPolicyExecution
): OfficialEncryptPolicyExecution {
  const state = wallet.confidentialPolicy.encryptCiphertexts;
  if (state?.pending && execution.policySequence !== state.pendingPolicySeq) {
    throw new Error('Encrypt policy execution policy sequence does not match wallet pending state');
  }
  return execution;
}

function deterministicPendingCiphertext(
  request: OfficialEncryptPolicyExecutionRequest,
  label: string
): string {
  return `${PLACEHOLDER_PREFIX}:${createHash('sha256')
    .update(label)
    .update(request.wallet.walletPda)
    .update(request.sessionKey)
    .update(request.amountBaseUnits.toString())
    .update(request.wallet.policySeq.toString())
    .digest('hex')
    .slice(0, 32)}`;
}
