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
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : body?.error?.message || body?.message || `HTTP ${res.status}`
    );
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
    `${PROXY_URL}/legacy/intent/evaluate`,
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
  const intentPayload = {
    id: `frontend-transfer-${Date.now()}`,
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'transfer',
    params: {
      destination: input.destination,
      amount: input.amount,
    },
    timestamp: Math.floor(Date.now() / 1000),
  };

  const data = await fetchJson<{ success: boolean; data: BuildTransactionResult }>(
    `${PROXY_URL}/legacy/intent/execute`,
    {
      method: 'POST',
      body: JSON.stringify(intentPayload),
    }
  );

  return data.data;
}

export async function getPolicyTemplates() {
  const data = await fetchJson<{
    success: boolean;
    data: { templates: Array<{ id: string; name: string; description: string; useCase: string }> };
  }>(`${PROXY_URL}/legacy/template/list`);

  return data.data.templates;
}

export async function getTemplate(id: TemplateId) {
  const data = await fetchJson<{
    success: boolean;
    data: { template: { id: string; name: string; description: string; policy: Policy } };
  }>(`${PROXY_URL}/legacy/template/${id}`);

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
  }>(`${PROXY_URL}/legacy/template/apply`, {
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

export interface InitializeWalletResult {
  transaction: string;
  wallet: string;
}

export async function initializeWallet(owner: string): Promise<InitializeWalletResult> {
  const data = await fetchJson<{ success: boolean; data: InitializeWalletResult }>(
    `${PROXY_URL}/wallet/initialize`,
    {
      method: 'POST',
      body: JSON.stringify({ owner }),
    }
  );
  return data.data;
}

export interface GrantKeyInput {
  owner: string;
  sessionKey: string;
  expiresAt: number;
  dailyLimit: number;
}

export interface GrantKeyResult {
  transaction: string;
}

export async function grantKey(input: GrantKeyInput): Promise<GrantKeyResult> {
  const data = await fetchJson<{ success: boolean; data: GrantKeyResult }>(
    `${PROXY_URL}/wallet/grant-key`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return data.data;
}

export interface RegisterAgentInput {
  owner: string;
  expiresAt: number;
  dailyLimit: number;
}

export interface RegisterAgentResult {
  transaction: string;
  sessionKey: string;
}

export async function registerAgent(input: RegisterAgentInput): Promise<RegisterAgentResult> {
  const data = await fetchJson<{ success: boolean; data: RegisterAgentResult }>(
    `${PROXY_URL}/agent/register`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return data.data;
}

export interface RevokeSessionInput {
  owner: string;
  sessionKey: string;
}

export interface RevokeSessionResult extends WalletTransactionResult {
  sessionKey: string;
}

export async function revokeSession(input: RevokeSessionInput): Promise<RevokeSessionResult> {
  const data = await fetchJson<{ success: boolean; data: RevokeSessionResult }>(
    `${PROXY_URL}/wallet/revoke-session`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return data.data;
}

export interface SetConfidentialPolicyInput {
  owner: string;
  maxPerRunUsdc?: string;
  dailyCapUsdc?: string;
  maxPerRunBaseUnits?: string;
  dailyCapBaseUnits?: string;
  maskedWitnessDevFixture: number[];
  policyScope?: 'sol-transfer' | 'usdc-dca';
}

export interface SetOfficialEncryptCiphertextPolicyInput {
  owner: string;
  wallet?: string;
  maxPerRunCiphertext: string;
  dailyCapCiphertext: string;
  dailySpentCiphertext: string;
  policyCommitment: number[];
  encrypt: {
    encryptProgram?: string;
    config: string;
    deposit: string;
    networkEncryptionKey: string;
    eventAuthority: string;
    payer?: string;
  };
}

export interface SetupDemoCustodyInput {
  owner: string;
  usdcMint?: string;
  usdcTokenAccount?: string;
  solMint?: string;
  solTokenAccount?: string;
  tokenProgram?: string;
}

export interface DepositCustodyInput {
  owner: string;
  asset: 'USDC' | 'SOL';
  amount: string;
  usdcMint?: string;
  sourceTokenAccount?: string;
  custodyTokenAccount?: string;
  tokenProgram?: string;
}

export interface WithdrawCustodyInput {
  owner: string;
  asset: 'USDC' | 'SOL';
  amount: string;
  usdcMint?: string;
  custodyTokenAccount?: string;
  destinationTokenAccount?: string;
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

export interface DepositCustodyResult extends WalletTransactionResult {
  asset: 'USDC' | 'SOL';
  amount: string;
  amountBaseUnits: string;
  source: string;
  destination: string;
  createdCustodyAccount: boolean;
  custodyAddress: string;
  boundary: 'owner-signed-smart-wallet-custody-deposit';
}

export interface WithdrawCustodyResult extends WalletTransactionResult {
  asset: 'USDC' | 'SOL';
  amount: string;
  amountBaseUnits: string;
  source: string;
  destination: string;
  boundary: 'owner-signed-smart-wallet-custody-withdraw';
}

export interface SetOfficialEncryptCiphertextPolicyResult extends WalletTransactionResult {
  encryptProgram: string;
  grpcEndpoint: string;
  ciphertexts: {
    maxPerRun: string;
    dailyCap: string;
    dailySpent: string;
  };
  graph: 'polet_policy_guardrail_graph';
  boundary: 'unsigned-official-encrypt-policy-registration';
}

export interface SharedIkaApproverConfigInput {
  owner: string;
  threshold: number;
  approvers: string[];
}

export interface SharedIkaApproverConfigResult extends WalletTransactionResult {
  threshold: number;
  approvers: string[];
}

export interface RevokeSharedIkaApproverInput {
  owner: string;
  approver: string;
}

export interface RevokeSharedIkaApproverResult extends WalletTransactionResult {
  approver: string;
}

export interface SetRecoveryAuthorityInput {
  owner: string;
  recoveryAuthority: string;
}

export interface SetRecoveryAuthorityResult extends WalletTransactionResult {
  recoveryAuthority: string;
  activity: {
    type: string;
    status: string;
    privacy: string;
  };
}

export interface RecoverAccessInput {
  owner: string;
  authority: string;
  compromisedSessions: string[];
  sharedIkaThreshold: number;
  sharedIkaApprovers: string[];
  pendingDwalletController: string;
}

export interface RecoverAccessResult extends WalletTransactionResult {
  authority: string;
  compromisedSessions: string[];
  sharedIkaThreshold: number;
  sharedIkaApprovers: string[];
  pendingDwalletController: string;
  activity: {
    type: string;
    status: string;
    states: string[];
    privacy: string;
    boundary: string;
  };
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

export interface ExecuteConfidentialTransferInput {
  owner: string;
  sessionKey: string;
  destination: string;
  amountLamports: string;
}

export interface ExecuteConfidentialTransferResult {
  allowed: boolean;
  transaction?: string;
  wallet?: string;
  blockHash?: string;
  slot?: number;
  signers?: string[];
  code?: string;
  reason?: string;
  destination?: string;
  amountLamports?: string;
  amountUi?: string;
  policySeq?: number;
  attestationSlot?: number;
  boundary?: 'session-signed-confidential-native-sol-transfer';
}

export async function executeConfidentialTransfer(
  input: ExecuteConfidentialTransferInput
): Promise<ExecuteConfidentialTransferResult> {
  const data = await fetchJson<{ success: boolean; data: ExecuteConfidentialTransferResult }>(
    `${PROXY_URL}/wallet/execute-confidential-transfer`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function setOfficialEncryptCiphertextPolicy(
  input: SetOfficialEncryptCiphertextPolicyInput
): Promise<SetOfficialEncryptCiphertextPolicyResult> {
  const data = await fetchJson<{ success: boolean; data: SetOfficialEncryptCiphertextPolicyResult }>(
    `${PROXY_URL}/wallet/set-official-encrypt-ciphertext-policy`,
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

export async function depositCustody(input: DepositCustodyInput): Promise<DepositCustodyResult> {
  const data = await fetchJson<{ success: boolean; data: DepositCustodyResult }>(
    `${PROXY_URL}/wallet/deposit-custody`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function withdrawCustody(input: WithdrawCustodyInput): Promise<WithdrawCustodyResult> {
  const data = await fetchJson<{ success: boolean; data: WithdrawCustodyResult }>(
    `${PROXY_URL}/wallet/withdraw-custody`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface FundAgentGasInput {
  owner: string;
  agentWallet: string;
  amount: string;
}

export interface FundAgentGasResult {
  transaction: string;
  source: string;
  destination: string;
  amountLamports: string;
  amountUi: string;
  boundary: 'owner-signed-agent-gas-funding';
}

export async function fundAgentGas(input: FundAgentGasInput): Promise<FundAgentGasResult> {
  const data = await fetchJson<{ success: boolean; data: FundAgentGasResult }>(
    `${PROXY_URL}/wallet/fund-agent-gas`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function configureSharedIkaApprovers(input: SharedIkaApproverConfigInput): Promise<SharedIkaApproverConfigResult> {
  const data = await fetchJson<{ success: boolean; data: SharedIkaApproverConfigResult }>(
    `${PROXY_URL}/wallet/shared-ika-approvers`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function revokeSharedIkaApprover(input: RevokeSharedIkaApproverInput): Promise<RevokeSharedIkaApproverResult> {
  const data = await fetchJson<{ success: boolean; data: RevokeSharedIkaApproverResult }>(
    `${PROXY_URL}/wallet/shared-ika-approvers/revoke`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function setRecoveryAuthority(input: SetRecoveryAuthorityInput): Promise<SetRecoveryAuthorityResult> {
  const data = await fetchJson<{ success: boolean; data: SetRecoveryAuthorityResult }>(
    `${PROXY_URL}/wallet/recovery-authority`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function recoverAccess(input: RecoverAccessInput): Promise<RecoverAccessResult> {
  const data = await fetchJson<{ success: boolean; data: RecoverAccessResult }>(
    `${PROXY_URL}/wallet/recover-access`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface CreateEncryptDepositResult {
  transaction: string | null;
  signers: string[];
  deposit: string;
  config: string;
  eventAuthority: string;
  status: 'existing-deposit' | 'pending-deposit-creation' | 'encrypt-infra-blocked' | string;
  blockers?: string[];
}

export async function createEncryptDeposit(owner: string, feePayerOwner?: string): Promise<CreateEncryptDepositResult> {
  const data = await fetchJson<{ success: boolean; data: CreateEncryptDepositResult }>(
    `${PROXY_URL}/wallet/create-encrypt-deposit`,
    {
      method: 'POST',
      body: JSON.stringify({ owner, ...(feePayerOwner && { feePayerOwner }) }),
    }
  );

  return data.data;
}

export interface ExecuteEncryptPolicyGraphInput {
  owner?: string;
  wallet: string;
  sessionKey: string;
  sourceAmountCiphertext: string;
  maxPerRunCiphertext: string;
  dailySpentCiphertext: string;
  dailyCapCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  attestationSlot: number;
  attestationPolicySeq: number;
  encrypt: {
    encryptProgram?: string;
    config: string;
    deposit: string;
    networkEncryptionKey: string;
    eventAuthority: string;
    payer?: string;
  };
}

export interface ExecuteEncryptPolicyGraphResult extends WalletTransactionResult {
  status: 'pending-encrypt-execution';
  encryptProgram: string;
  grpcEndpoint: string;
  graph: 'polet_policy_guardrail_graph';
  inputCiphertexts: {
    sourceAmount: string;
    maxPerRun: string;
    dailySpent: string;
    dailyCap: string;
  };
  pendingOutputCiphertexts: {
    allowedOutput: string;
    dailySpentOutput: string;
  };
  suppressedUntilVerified: string[];
}

export interface EncryptCiphertextStatus {
  address: string;
  exists: boolean;
  owner: string;
  dataLength: number;
  status: 'pending' | 'verified' | 'unknown';
  statusByte: number;
  fheType: number;
  digest: string;
  authorized: string;
}

export async function getEncryptCiphertextStatus(
  ciphertext: string,
  encryptProgram?: string
): Promise<EncryptCiphertextStatus> {
  const params = encryptProgram ? `?encryptProgram=${encodeURIComponent(encryptProgram)}` : '';
  const data = await fetchJson<{ success: boolean; data: EncryptCiphertextStatus }>(
    `${PROXY_URL}/wallet/encrypt-ciphertext/${encodeURIComponent(ciphertext)}${params}`
  );

  return data.data;
}

export type PolicyRevealKind = 'max-per-run' | 'daily-cap' | 'daily-spent';

export interface RequestPolicyValueDecryptionInput {
  owner: string;
  wallet: string;
  request: string;
  kind: PolicyRevealKind;
  ciphertext: string;
  encrypt: {
    encryptProgram?: string;
    config: string;
    deposit: string;
    networkEncryptionKey: string;
    eventAuthority: string;
    payer?: string;
  };
}

export interface RequestPolicyValueDecryptionResult extends WalletTransactionResult {
  request: string;
  kind: PolicyRevealKind;
  ciphertext: string;
  status: 'policy-reveal-requested';
  encryptProgram: string;
  grpcEndpoint: string;
  boundary: 'owner-signed-public-decryption-request';
  warning: string;
}

export async function executeEncryptPolicyGraph(
  input: ExecuteEncryptPolicyGraphInput
): Promise<ExecuteEncryptPolicyGraphResult> {
  const data = await fetchJson<{ success: boolean; data: ExecuteEncryptPolicyGraphResult }>(
    `${PROXY_URL}/wallet/execute-encrypt-policy-graph`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function requestPolicyValueDecryption(
  input: RequestPolicyValueDecryptionInput
): Promise<RequestPolicyValueDecryptionResult> {
  const data = await fetchJson<{ success: boolean; data: RequestPolicyValueDecryptionResult }>(
    `${PROXY_URL}/wallet/request-policy-value-decryption`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface RequestPendingAllowedOutputDecryptionInput {
  owner: string;
  wallet?: string;
  request: string;
  encrypt: RequestPolicyValueDecryptionInput['encrypt'];
}

export interface RequestPendingAllowedOutputDecryptionResult extends WalletTransactionResult {
  request: string;
  status: 'allowed-output-decryption-requested';
  graph: 'polet_policy_guardrail_graph';
  policySequence: number;
  allowedOutputCiphertext: string;
  allowedOutputDigest: string;
  encryptProgram: string;
  grpcEndpoint: string;
  boundary: 'owner-signed-public-decryption-request';
  warning: string;
}

export async function requestPendingAllowedOutputDecryption(
  input: RequestPendingAllowedOutputDecryptionInput
): Promise<RequestPendingAllowedOutputDecryptionResult> {
  const data = await fetchJson<{ success: boolean; data: RequestPendingAllowedOutputDecryptionResult }>(
    `${PROXY_URL}/wallet/request-pending-allowed-output-decryption`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface ResolveEncryptPolicyDecisionInput {
  owner: string;
  allowedDecryptionRequest: string;
  expectedPolicySeq?: number;
}

export async function resolveEncryptPolicyDecision(
  input: ResolveEncryptPolicyDecisionInput
): Promise<OfficialEncryptPolicyPreview> {
  const data = await fetchJson<{ success: boolean; data: OfficialEncryptPolicyPreview }>(
    `${PROXY_URL}/wallet/resolve-encrypt-policy-decision`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export interface PasskeyCoapprovalChallengeInput {
  owner: string;
  sessionKey: string;
  sharedApprovalChallenge: string;
  credentialId: string;
  rpId: string;
  expiresAtUnix: number;
}

export interface PasskeyCoapprovalChallengeResult {
  challenge: number[];
  publicKeyCredentialRequestOptions: {
    challenge: number[];
    rpId: string;
    allowCredentials: Array<{ type: string; id: string }>;
    userVerification: string;
  };
  boundary: string;
}

export interface PasskeyVerificationInput {
  expectedChallenge: number[];
  expectedOrigin: string;
  expectedRpId: string;
  expectedCredentialId: string;
  credentialPublicKeyJwk: Record<string, unknown>;
  assertion: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
    userHandle?: string;
  };
  requireUserVerification: boolean;
}

export interface PasskeyVerificationResult {
  valid: boolean;
  approverPublicKey: string;
  challengeUsed: string;
  boundary: string;
}

export async function requestPasskeyChallenge(input: PasskeyCoapprovalChallengeInput): Promise<PasskeyCoapprovalChallengeResult> {
  const data = await fetchJson<{ success: boolean; data: PasskeyCoapprovalChallengeResult }>(
    `${PROXY_URL}/passkey/coapproval/challenge`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export async function verifyPasskeyAssertion(input: PasskeyVerificationInput): Promise<PasskeyVerificationResult> {
  const data = await fetchJson<{ success: boolean; data: PasskeyVerificationResult }>(
    `${PROXY_URL}/passkey/coapproval/verify`,
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
  maskedWitnessDevFixture?: number[];
  officialEncrypt?: OfficialEncryptExecutionRefs;
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
}

export interface OfficialEncryptExecutionRefs {
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  allowedDecryptionRequest?: string;
}

export interface JupiterPlanPreview {
  inputToken?: {
    symbol?: string;
    decimals?: number;
    isVerified?: boolean;
    organicScoreLabel?: string;
  };
  outputToken?: {
    symbol?: string;
    decimals?: number;
    isVerified?: boolean;
    organicScoreLabel?: string;
  };
  quoteMetadata?: {
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    expectedOutput: string;
    minimumOutput: string;
    slippageBps: number;
    priceImpactPct?: string;
    routeLabel?: string;
    freshness: {
      timestamp: string;
      slot?: number;
      blockHeight?: number;
    };
  };
  build?: {
    inAmount?: string;
    outAmount?: string;
    otherAmountThreshold?: string;
    slippageBps?: number;
    priceImpactPct?: string;
    routePlan?: Array<{
      percent?: number;
      bps?: number;
      swapInfo?: {
        label?: string;
        inAmount?: string;
        outAmount?: string;
      };
    }>;
  };
}

export type OfficialEncryptLifecycleStatus =
  | 'pending-encrypt-execution'
  | 'encrypt-verified-allowed'
  | 'encrypt-verified-blocked';

export interface OfficialEncryptPolicyPreview {
  status: OfficialEncryptLifecycleStatus;
  policySequence: number;
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  pendingSlot?: number;
  verifiedSlot?: number;
  allowedDecryptionRequest?: string;
  allowedDecryptionResult?: string;
  graph: 'polet_policy_guardrail_graph';
  encryptProgram?: string;
  grpcEndpoint?: string;
  inputCiphertexts?: {
    sourceAmount?: string;
    maxPerRun?: string;
    dailySpent?: string;
    dailyCap?: string;
  };
  pendingOutputCiphertexts?: {
    allowedOutput?: string;
    dailySpentOutput?: string;
  };
  suppressedUntilVerified?: string[];
}

export type RunConfidentialDcaResult = {
  allowed: boolean;
  code: string;
  status?: OfficialEncryptLifecycleStatus | string;
  reason?: string;
  amount?: string;
  amountBaseUnits?: string;
  usdcEquivalent?: string;
  usdcEquivalentBaseUnits?: string;
  quoteBasedValuation?: true;
  executionPath?: 'recurring' | 'swap-build-fallback';
  smartWalletAuthority?: string;
  jupiterPlan?: JupiterPlanPreview;
  transaction?: {
    transaction: string;
    blockHash: string;
    slot: number;
    signers: string[];
  };
  encryptPolicy?: OfficialEncryptPolicyPreview;
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

export interface IkaDestinationBroadcastInput {
  ikaRequest: IkaRequestPreview;
  producedSignature: {
    status: 'signature-produced-prealpha';
    signature: string;
    publicKey: string;
    messageDigest: string;
    signatureScheme: string;
  };
  demoConfig?: {
    enabled?: boolean;
    feePayerSecretKey?: string;
    rpcUrl?: string;
    commitment?: 'processed' | 'confirmed' | 'finalized';
    confirm?: boolean;
  };
}

export interface IkaDestinationBroadcastResult {
  ok: boolean;
  status: 'broadcast-disabled' | 'broadcast-submitted' | 'broadcast-confirmed' | 'broadcast-failed';
  code?: string;
  reason?: string;
  demoPath?: {
    chain: string;
    cluster: string;
    action: string;
    asset: string;
    faucetRequirement: string;
    receiptVerification: string;
    productionSettlement: false;
  };
  transaction?: {
    base64: string;
    feePayer?: string;
    recentBlockhash?: string;
  };
  receipt?: {
    chain: string;
    cluster: string;
    action: string;
    transactionId: string;
    explorerUrl: string;
    slot?: number;
    confirmationStatus?: string;
  };
}

export interface RunMultichainIntentInput {
  id?: string;
  owner: string;
  sessionKey: string;
  sourceChain: 'solana' | 'sui' | 'ethereum' | 'base';
  sourceAsset: string;
  sourceMint?: string;
  targetChain: 'solana' | 'sui' | 'ethereum' | 'base';
  targetAsset: string;
  targetMint?: string;
  amount: string;
  executionRail: 'jupiter' | 'ika';
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  routeRisk?: {
    priceImpactBps?: number;
    liquidityScore?: 'low' | 'medium' | 'high';
    verifiedRoute?: boolean;
    provider?: string;
  };
  riskGuardrails?: {
    mode: 'bridgeless-route-risk';
    maxSlippageBps: number;
    maxPriceImpactBps?: number;
    minLiquidityScore?: 'low' | 'medium' | 'high';
    requireVerifiedRoute?: boolean;
  };
  sharedAccess?: {
    policy?: {
      mode: 'ika-approval-quorum';
      threshold: number;
      approvers: string[];
      requireFor?: 'all-ika' | 'ethereum-only';
    };
    approvals?: Array<{
      approver: string;
      signature: string;
      encoding?: 'base64';
    }>;
  };
  maskedWitnessDevFixture?: number[];
  officialEncrypt?: OfficialEncryptExecutionRefs;
  routeGuardrails?: {
    mode: 'chain-asset-allowlist';
    allowedSourceChains: Array<'solana' | 'sui' | 'ethereum' | 'base'>;
    allowedTargetChains: Array<'solana' | 'sui' | 'ethereum' | 'base'>;
    allowedSourceAssets: string[];
    allowedTargetAssets: string[];
  };
}

export interface IkaRequestPreview {
  executionRail: 'ika-bridgeless';
  settlement: 'not-executed';
  requestId: string;
  canonicalOrderHash?: string;
  ikaMessageHash?: string;
  destinationSigningDigest?: unknown;
  routeRisk?: {
    priceImpactBps?: number;
    liquidityScore?: 'low' | 'medium' | 'high';
    verifiedRoute?: boolean;
    provider?: string;
  };
  suiTransactionDigest?: {
    digestHex?: string;
    digestBase58?: string;
    action?: string;
    chain?: string;
    network?: string;
    broadcastable?: boolean;
    productionSettlement?: boolean;
  };
  ethereumMessageDigest?: {
    digestHex?: string;
    action?: string;
    chain?: string;
    network?: string;
    chainId?: number;
    broadcastable?: boolean;
    productionSettlement?: boolean;
  };
  source: {
    chain: string;
    asset: string;
  };
  target: {
    chain: string;
    asset: string;
  };
  amount: string;
  sessionContext: {
    owner: string;
    sessionKey: string;
    smartWalletAuthority: string;
    policySequence: number;
  };
  policyAttestation: {
    status: 'approved' | 'encrypt-verified-allowed';
    policySequence: number;
    attestationHash: string;
    encryptPolicy?: {
      status: 'encrypt-verified-allowed';
    } & Omit<OfficialEncryptPolicyPreview, 'status'>;
  };
  executionBoundary: {
    status: 'request-prepared' | 'approval-transaction-prepared' | 'approval-submitted' | 'signature-pending' | 'signature-produced-prealpha';
    note: string;
  };
  preAlphaSigning?: {
    status?: 'request-prepared' | 'approval-transaction-prepared' | 'approval-submitted' | 'signature-pending' | 'signature-produced-prealpha';
    dwalletAccount?: string;
    ikaMessageHash?: string;
    messageDigest?: string;
    destinationSigningDigest?: unknown;
    messageApprovalPda?: string;
    cpiAuthorityPda?: string;
    signatureScheme?: string;
  };
  poletApprovalTransaction?: {
    transaction?: string;
    blockHash?: string;
    slot?: number;
    signers?: string[];
  };
}

export type RunMultichainIntentResult = {
  allowed: boolean;
  code: string;
  status?: 'needs-approval' | OfficialEncryptLifecycleStatus | string;
  reason?: string;
  encryptPolicy?: OfficialEncryptPolicyPreview;
  approval?: {
    status: 'not-required' | 'needs-approval' | 'ready';
    required: number;
    received: number;
    threshold: number;
    totalApprovers: number;
    approvedApprovers: string[];
    missingApprovals: number;
    challenge: string;
  };
  ikaRequest?: IkaRequestPreview;
};

export async function runMultichainIntent(input: RunMultichainIntentInput): Promise<RunMultichainIntentResult> {
  const data = await fetchJson<{ success: boolean; data: RunMultichainIntentResult }>(
    `${PROXY_URL}/intent/multichain/run`,
    {
      method: 'POST',
      body: JSON.stringify({
        id: input.id ?? `frontend-multichain-${Date.now()}`,
        owner: input.owner,
        sessionKey: input.sessionKey,
        action: 'multichain-strategy',
        params: {
          sourceChain: input.sourceChain,
          sourceAsset: input.sourceAsset,
          ...(input.sourceMint && { sourceMint: input.sourceMint }),
          targetChain: input.targetChain,
          targetAsset: input.targetAsset,
          ...(input.targetMint && { targetMint: input.targetMint }),
          amount: input.amount,
          executionRail: input.executionRail,
          strategy: input.strategy ?? 'dca',
          ...(input.slippageBps !== undefined && { slippageBps: input.slippageBps }),
          ...(input.routeRisk && { routeRisk: input.routeRisk }),
          ...(input.riskGuardrails && { riskGuardrails: input.riskGuardrails }),
          ...(input.sharedAccess && { sharedAccess: input.sharedAccess }),
          ...(input.maskedWitnessDevFixture && { maskedWitnessDevFixture: input.maskedWitnessDevFixture }),
          ...(input.officialEncrypt && { officialEncrypt: input.officialEncrypt }),
          ...(input.routeGuardrails && { routeGuardrails: input.routeGuardrails }),
        },
        timestamp: Math.floor(Date.now() / 1000),
      }),
    }
  );

  return data.data;
}

export async function broadcastIkaDestination(
  input: IkaDestinationBroadcastInput
): Promise<IkaDestinationBroadcastResult> {
  const data = await fetchJson<{ success: boolean; data: IkaDestinationBroadcastResult }>(
    `${PROXY_URL}/intent/ika/destination-broadcast`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );

  return data.data;
}

export { PROXY_URL };
