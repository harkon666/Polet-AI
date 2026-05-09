import { PublicKey } from '@solana/web3.js';
import { getConnection } from './transaction-builder';
import { readBoolDecryptionRequest, readCiphertextStatus } from './encrypt-ciphertext-poller';
import type { WalletData } from './wallet-store';

export type OfficialEncryptPolicyStatus =
  | 'pending-encrypt-execution'
  | 'encrypt-verified-allowed'
  | 'encrypt-verified-blocked';

export interface EncryptPolicyCiphertextState {
  maxPerRun: string;
  dailyCap: string;
  dailySpent: string;
  lastRevealRequest?: string;
  lastRevealCiphertext?: string;
  lastRevealDigest?: number[];
  lastRevealKind?: number;
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
  officialEncrypt?: OfficialEncryptPolicyExecutionReference;
}

export interface OfficialEncryptPolicyExecutionReference {
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  allowedDecryptionRequest?: string;
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

export function resolveOfficialEncryptDecisionFromAllowedOutput(
  wallet: WalletData,
  input: {
    allowedDecryptionRequest: string;
    allowedOutputCiphertext: string;
    allowedOutputDigest: string;
    allowed: boolean;
    verifiedSlot?: number;
  }
): OfficialEncryptPolicyVerifiedAllowed | OfficialEncryptPolicyVerifiedBlocked {
  const state = wallet.confidentialPolicy.encryptCiphertexts;
  if (!state || !hasPendingOfficialEncryptPolicyOutputs(wallet)) {
    throw new Error('Official Encrypt policy graph has no pending output ciphertexts for this wallet');
  }
  if (input.allowedOutputCiphertext !== state.pendingAllowedOutput) {
    throw new Error('Allowed-output decryption request does not match wallet pending graph state');
  }
  return {
    status: input.allowed ? 'encrypt-verified-allowed' : 'encrypt-verified-blocked',
    policySequence: state.pendingPolicySeq || wallet.policySeq,
    sourceAmountCiphertext: state.pendingSourceAmount,
    allowedOutputCiphertext: state.pendingAllowedOutput,
    dailySpentOutputCiphertext: state.pendingDailySpentOutput,
    ...(input.verifiedSlot !== undefined && { verifiedSlot: input.verifiedSlot }),
    allowedDecryptionRequest: input.allowedDecryptionRequest,
    allowedDecryptionResult: input.allowed ? 'true' : 'false',
    graph: GRAPH_NAME,
  };
}

export async function evaluateOfficialEncryptPolicyLifecycle(
  request: OfficialEncryptPolicyExecutionRequest,
  resolver?: OfficialEncryptPolicyResolver
): Promise<OfficialEncryptPolicyExecution> {
  const resolved = await resolver?.(request);
  if (resolved) return assertSafeExecution(request.wallet, resolved);

  const verifiedFromReference = await resolveVerifiedReference(request);
  if (verifiedFromReference) return assertSafeExecution(request.wallet, verifiedFromReference);

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

async function resolveVerifiedReference(
  request: OfficialEncryptPolicyExecutionRequest
): Promise<OfficialEncryptPolicyExecution | null> {
  const decryptionRequest = request.officialEncrypt?.allowedDecryptionRequest;
  if (!decryptionRequest) return null;

  const connection = getConnection();
  const [requestInfo, ciphertextStatus, slot] = await Promise.all([
    readBoolDecryptionRequest(connection, new PublicKey(decryptionRequest)),
    readCiphertextStatus(connection, new PublicKey(request.officialEncrypt!.allowedOutputCiphertext)),
    connection.getSlot(),
  ]);
  if (!requestInfo.exists || requestInfo.status === 'invalid') {
    throw new Error('Allowed-output decryption request account is invalid or missing');
  }
  if (requestInfo.ciphertext !== request.officialEncrypt.allowedOutputCiphertext) {
    throw new Error('Allowed-output decryption request does not match requested Official Encrypt refs');
  }
  if (ciphertextStatus.digest && requestInfo.digest !== ciphertextStatus.digest) {
    throw new Error('Allowed-output decryption digest does not match current ciphertext digest');
  }
  if (requestInfo.status === 'pending') return null;

  return resolveOfficialEncryptDecisionFromAllowedOutput(request.wallet, {
    allowedDecryptionRequest: decryptionRequest,
    allowedOutputCiphertext: requestInfo.ciphertext,
    allowedOutputDigest: requestInfo.digest,
    allowed: requestInfo.boolValue === true,
    verifiedSlot: slot,
  });
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
