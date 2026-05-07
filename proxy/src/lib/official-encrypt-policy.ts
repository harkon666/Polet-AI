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
  allowedDecryptionRequest?: string;
  dailySpentDecryptionRequest?: string;
  allowedDecryptionResult?: string;
  dailySpentDecryptionResult?: string;
  graph: 'polet_policy_guardrail_graph';
}

export interface OfficialEncryptPolicyVerifiedBlocked {
  status: 'encrypt-verified-blocked';
  policySequence: number;
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  verifiedSlot?: number;
  allowedDecryptionRequest?: string;
  dailySpentDecryptionRequest?: string;
  allowedDecryptionResult?: string;
  dailySpentDecryptionResult?: string;
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

export interface OfficialEncryptPolicyExecutionReference {
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
}

export type OfficialEncryptPolicyResolver = (
  request: OfficialEncryptPolicyExecutionRequest
) => Promise<OfficialEncryptPolicyExecution | null> | OfficialEncryptPolicyExecution | null;

const GRAPH_NAME = 'polet_policy_guardrail_graph';

export function hasOfficialEncryptPolicy(wallet: Pick<WalletData, 'confidentialPolicy'>): boolean {
  return wallet.confidentialPolicy.encryptCiphertexts?.configured === true;
}

export function hasPendingOfficialEncryptPolicyOutputs(wallet: Pick<WalletData, 'confidentialPolicy'>): boolean {
  const state = wallet.confidentialPolicy.encryptCiphertexts;
  return state?.configured === true
    && state.pending === true
    && isRealCiphertextId(state.pendingSourceAmount)
    && isRealCiphertextId(state.pendingAllowedOutput)
    && isRealCiphertextId(state.pendingDailySpentOutput);
}

export function assertOfficialEncryptExecutionReference(
  wallet: Pick<WalletData, 'confidentialPolicy'>,
  reference: OfficialEncryptPolicyExecutionReference | undefined
): void {
  if (!reference) return;
  const state = wallet.confidentialPolicy.encryptCiphertexts;
  if (!hasPendingOfficialEncryptPolicyOutputs(wallet) || !state) {
    throw new Error('Official Encrypt policy graph has no pending output ciphertexts for this wallet');
  }
  if (
    reference.sourceAmountCiphertext !== state.pendingSourceAmount
    || reference.allowedOutputCiphertext !== state.pendingAllowedOutput
    || reference.dailySpentOutputCiphertext !== state.pendingDailySpentOutput
  ) {
    throw new Error('Requested Official Encrypt ciphertext refs do not match wallet pending graph state');
  }
}

export async function evaluateOfficialEncryptPolicyLifecycle(
  request: OfficialEncryptPolicyExecutionRequest,
  resolver?: OfficialEncryptPolicyResolver
): Promise<OfficialEncryptPolicyExecution> {
  const resolved = await resolver?.(request);
  if (resolved) return assertSafeExecution(request.wallet, resolved);

  const state = request.wallet.confidentialPolicy.encryptCiphertexts;
  if (state?.pending && hasPendingOfficialEncryptPolicyOutputs(request.wallet)) {
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

  throw new Error('Official Encrypt policy graph has no pending output ciphertexts for this wallet');
}

function assertSafeExecution(
  wallet: WalletData,
  execution: OfficialEncryptPolicyExecution
): OfficialEncryptPolicyExecution {
  const state = wallet.confidentialPolicy.encryptCiphertexts;
  if (!hasPendingOfficialEncryptPolicyOutputs(wallet)) {
    throw new Error('Official Encrypt policy graph has no pending output ciphertexts for this wallet');
  }
  if (state?.pending && execution.policySequence !== state.pendingPolicySeq) {
    throw new Error('Encrypt policy execution policy sequence does not match wallet pending state');
  }
  if (
    state
    && (
      execution.sourceAmountCiphertext !== state.pendingSourceAmount
      || execution.allowedOutputCiphertext !== state.pendingAllowedOutput
      || execution.dailySpentOutputCiphertext !== state.pendingDailySpentOutput
    )
  ) {
    throw new Error('Encrypt policy execution ciphertexts do not match wallet pending state');
  }
  return execution;
}

function isRealCiphertextId(value: string | undefined): boolean {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('encrypt-pending:')
    && value !== PublicKeyDefault;
}

const PublicKeyDefault = '11111111111111111111111111111111';
