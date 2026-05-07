/**
 * Polet AI SDK - Intent JSON Builder
 *
 * This SDK provides a simple interface for AI agents to create intent payloads
 * that are submitted to the Polet AI proxy.
 *
 * Usage:
 * ```typescript
 * import { createTransferIntent, isValidIntent } from '@polet-ai/sdk';
 *
 * const intent = createTransferIntent({
 *   owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
 *   sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
 *   destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
 *   amount: 1000000,
 * });
 *
 * // Current confidential strategy intents should use submitIntent().
 * // Legacy transfer policy evaluation is isolated under /legacy/intent/evaluate.
 * const response = await fetch('https://proxy.polet.ai/legacy/intent/evaluate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(intent),
 * });
 * ```
 */

import type {
  BridgelessRouteRisk,
  BridgelessRouteRiskLevel,
} from './bridgeless-order.js';
import {
  Connection,
  Transaction,
  VersionedTransaction,
  type Commitment,
  type RpcResponseAndContext,
  type Signer,
  type SimulatedTransactionResponse,
} from '@solana/web3.js';
import {
  PROGRAM_ID as POLET_PROGRAM_ID,
  deriveWalletPDA,
  isValidPublicKey,
} from './session.js';

export const JUPITER_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const JUPITER_SOL_MINT = 'So11111111111111111111111111111111111111112';

export {
  PROGRAM_ID,
  WALLET_SEED,
  deriveWalletPDA,
  isValidPublicKey,
  formatPublicKey,
  publicKeysEqual,
  estimateFee,
  lamportsToSol,
  solToLamports,
} from './session.js';

export {
  CANONICAL_BRIDGELESS_ORDER_SCHEMA,
  assertCanonicalBridgelessOrderActive,
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
  serializeCanonicalBridgelessOrder,
  validateCanonicalBridgelessOrder,
  verifyCanonicalBridgelessOrderHash,
  type BuildCanonicalBridgelessOrderInput,
  type BridgelessRouteRisk,
  type BridgelessRouteRiskLevel,
  type CanonicalBridgelessOrder,
  type CanonicalBridgelessOrderAsset,
  type CanonicalBridgelessSourceChain,
  type CanonicalBridgelessTargetChain,
} from './bridgeless-order.js';

// Intent action types
export type IntentAction = 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';
export type StrategyIntentAction = 'dca' | 'multichain-strategy';
export type PoletChain = 'solana' | 'sui' | 'ethereum' | 'base';
export type PoletExecutionRail = 'jupiter' | 'ika';

// Intent interface
export interface Intent {
  id: string;
  owner: string;
  sessionKey: string;
  action: IntentAction;
  params: TransferParams | SwapParams | StakeParams | UnstakeParams | DelegateParams | UndelegateParams | CustomParams;
  timestamp: number;
  policyHash?: string;
}

export interface DcaIntent {
  id: string;
  owner: string;
  sessionKey: string;
  action: StrategyIntentAction;
  params: DcaParams;
  timestamp: number;
  policyHash?: string;
}

export interface MultichainStrategyIntent {
  id: string;
  owner: string;
  sessionKey: string;
  action: 'multichain-strategy';
  params: MultichainStrategyParams;
  timestamp: number;
  policyHash?: string;
}

export type PoletIntent = Intent | DcaIntent | MultichainStrategyIntent;

// Transfer params
export interface TransferParams {
  destination: string;
  amount: number;
  mint?: string;
}

// Swap params
export interface SwapParams {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  minOutputAmount: number;
  risk?: SwapRiskGate;
  strategy?: 'risk-gated-swap';
}

export interface SwapRiskGate {
  maxSlippageBps?: number;
  maxPriceImpactBps?: number;
  requireVerifiedTokens?: boolean;
}

export interface DcaParams {
  amountUsdc: number | string;
  inputMint: string;
  outputMint: string;
  slippageBps?: number;
  encryptionWitness?: number[];
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export interface ChainAsset {
  chain: PoletChain;
  asset: string;
  mint?: string;
}

export interface MultichainStrategyParams {
  sourceChain: PoletChain;
  sourceAsset: string;
  sourceMint?: string;
  targetChain: PoletChain;
  targetAsset: string;
  targetMint?: string;
  amount: number | string;
  executionRail: PoletExecutionRail;
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  encryptionWitness?: number[];
  ikaPreAlpha?: IkaPreAlphaSigningInput;
  sharedAccess?: SharedIkaApprovalInput;
  routeGuardrails?: ChainAssetAllowlistPolicy;
  routeRisk?: BridgelessRouteRisk;
  riskGuardrails?: BridgelessRiskGuardrailPolicy;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export interface ChainAssetAllowlistPolicy {
  mode: 'chain-asset-allowlist';
  allowedSourceChains: PoletChain[];
  allowedTargetChains: PoletChain[];
  allowedSourceAssets: string[];
  allowedTargetAssets: string[];
}

export interface BridgelessRiskGuardrailPolicy {
  mode: 'bridgeless-route-risk';
  maxSlippageBps: number;
  maxPriceImpactBps?: number;
  minLiquidityScore?: BridgelessRouteRiskLevel;
  requireVerifiedRoute?: boolean;
}

export type IkaPreAlphaSignatureScheme = 'ecdsa-secp256k1-sha256' | 'ed25519-prealpha';

export interface IkaPreAlphaSigningInput {
  dwalletAccount?: string;
  dwalletCurve?: number;
  dwalletPublicKey?: number[] | string;
  userPublicKey?: string;
  signatureScheme?: IkaPreAlphaSignatureScheme;
}

export interface SharedIkaApprovalInput {
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
}

export interface SharedIkaApprovalProgress {
  status: 'not-required' | 'needs-approval' | 'ready';
  required: number;
  received: number;
  threshold: number;
  totalApprovers: number;
  approvedApprovers: string[];
  missingApprovals: number;
  challenge: string;
}

export interface IkaPreAlphaProducedSignature {
  status: 'signature-produced-prealpha';
  signature: string;
  publicKey: string;
  messageDigest: string;
  signatureScheme: IkaPreAlphaSignatureScheme;
}

export interface IkaDestinationBroadcastInput {
  ikaRequest: unknown;
  producedSignature: IkaPreAlphaProducedSignature;
}

export interface IkaDestinationBroadcastResult {
  ok: boolean;
  status: 'broadcast-disabled' | 'broadcast-submitted' | 'broadcast-confirmed' | 'broadcast-failed';
  code?: string;
  reason?: string;
  receipt?: {
    chain: 'solana';
    cluster: 'devnet';
    action: 'memo-proof';
    transactionId: string;
    explorerUrl: string;
    slot?: number;
    confirmationStatus?: string;
  };
  demoPath?: {
    chain: 'solana';
    cluster: 'devnet';
    action: 'memo-proof';
    asset: 'none';
    productionSettlement: false;
  };
  transaction?: unknown;
}

export interface PoletUnsignedTransactionLike {
  transaction?: string;
  unsignedTransaction?: string;
  base64?: string;
  signers?: string[];
}

export interface PoletSimulationConnection {
  simulateTransaction(
    transaction: Transaction | VersionedTransaction,
    config?: {
      sigVerify?: boolean;
      replaceRecentBlockhash?: boolean;
      commitment?: Commitment;
    }
  ): Promise<RpcResponseAndContext<SimulatedTransactionResponse>>;
}

export interface SimulatePoletTransactionInput {
  transaction: string | PoletUnsignedTransactionLike;
  rpcUrl?: string;
  connection?: PoletSimulationConnection;
  signers?: Signer[];
  sigVerify?: boolean;
  replaceRecentBlockhash?: boolean;
  commitment?: Commitment;
}

export interface SimulatePoletTransactionResult {
  ok: boolean;
  transactionType: 'legacy' | 'versioned';
  signerPubkeys: string[];
  err: SimulatedTransactionResponse['err'];
  logs: string[];
  unitsConsumed?: number;
  returnData?: SimulatedTransactionResponse['returnData'];
  raw: RpcResponseAndContext<SimulatedTransactionResponse>;
}

// Stake params
export interface StakeParams {
  validator: string;
  amount: number;
}

// Unstake params
export interface UnstakeParams {
  validator: string;
  amount: number;
}

// Delegate params
export interface DelegateParams {
  target: string;
  amount: number;
}

// Undelegate params
export interface UndelegateParams {
  target: string;
  amount: number;
}

// Custom params for arbitrary program interaction
export interface CustomParams {
  programId: string;
  instructionData: string;
  accounts: string[];
}

// Input types for intent creation
export interface TransferIntentInput {
  owner: string;
  sessionKey: string;
  destination: string;
  amount: number;
  mint?: string;
  policyHash?: string;
  intentId?: string;
}

export interface SwapIntentInput {
  owner: string;
  sessionKey: string;
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  minOutputAmount: number;
  policyHash?: string;
  intentId?: string;
}

export interface DcaIntentInput {
  owner: string;
  sessionKey: string;
  amountUsdc: number | string;
  encryptionWitness?: number[];
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
  policyHash?: string;
  intentId?: string;
}

export interface MultichainStrategyIntentInput {
  owner: string;
  sessionKey: string;
  sourceChain: PoletChain;
  sourceAsset: string;
  targetChain: PoletChain;
  targetAsset: string;
  amount: number | string;
  executionRail: PoletExecutionRail;
  encryptionWitness?: number[];
  sourceMint?: string;
  targetMint?: string;
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  ikaPreAlpha?: IkaPreAlphaSigningInput;
  sharedAccess?: SharedIkaApprovalInput;
  routeGuardrails?: ChainAssetAllowlistPolicy;
  routeRisk?: BridgelessRouteRisk;
  riskGuardrails?: BridgelessRiskGuardrailPolicy;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
  policyHash?: string;
  intentId?: string;
}

export interface RiskGatedSwapIntentInput extends SwapIntentInput {
  risk?: SwapRiskGate;
  slippageBps?: number;
}

export interface StakeIntentInput {
  owner: string;
  sessionKey: string;
  validator: string;
  amount: number;
  policyHash?: string;
  intentId?: string;
}

export interface UnstakeIntentInput {
  owner: string;
  sessionKey: string;
  validator: string;
  amount: number;
  policyHash?: string;
  intentId?: string;
}

export interface DelegateIntentInput {
  owner: string;
  sessionKey: string;
  target: string;
  amount: number;
  policyHash?: string;
  intentId?: string;
}

export interface UndelegateIntentInput {
  owner: string;
  sessionKey: string;
  target: string;
  amount: number;
  policyHash?: string;
  intentId?: string;
}

export interface CustomIntentInput {
  owner: string;
  sessionKey: string;
  programId: string;
  instructionData: string;
  accounts: string[];
  policyHash?: string;
  intentId?: string;
}

// Valid action types
const VALID_ACTIONS: IntentAction[] = ['transfer', 'swap', 'stake', 'unstake', 'delegate', 'undelegate', 'custom'];

/**
 * Generate a unique intent ID
 * Uses crypto-safe random bytes converted to hex
 */
export function generateIntentId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a transfer intent
 */
export function createTransferIntent(input: TransferIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'transfer',
    params: {
      destination: input.destination,
      amount: input.amount,
      ...(input.mint && { mint: input.mint }),
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a swap intent (e.g., for Jupiter or Raydium)
 */
export function createSwapIntent(input: SwapIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'swap',
    params: {
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      inputAmount: input.inputAmount,
      minOutputAmount: input.minOutputAmount,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a USDC -> SOL confidential DCA strategy intent.
 */
export function createDcaIntent(input: DcaIntentInput): DcaIntent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'dca',
    params: {
      amountUsdc: input.amountUsdc,
      inputMint: input.inputMint ?? JUPITER_USDC_MINT,
      outputMint: input.outputMint ?? JUPITER_SOL_MINT,
      ...(input.encryptionWitness && { encryptionWitness: input.encryptionWitness }),
      ...(input.slippageBps !== undefined && { slippageBps: input.slippageBps }),
      ...(input.destinationTokenAccount && { destinationTokenAccount: input.destinationTokenAccount }),
      ...(input.nativeDestinationAccount && { nativeDestinationAccount: input.nativeDestinationAccount }),
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a multichain strategy intent. The current executable slice maps
 * Solana USDC -> SOL on the Jupiter rail to the existing confidential DCA path.
 */
export function createMultichainStrategyIntent(input: MultichainStrategyIntentInput): MultichainStrategyIntent {
  return {
    id: input.intentId ?? generateIntentId(),
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
      ...(input.encryptionWitness && { encryptionWitness: input.encryptionWitness }),
      ...(input.slippageBps !== undefined && { slippageBps: input.slippageBps }),
      ...(input.ikaPreAlpha && { ikaPreAlpha: input.ikaPreAlpha }),
      ...(input.sharedAccess && { sharedAccess: input.sharedAccess }),
      ...(input.routeGuardrails && { routeGuardrails: input.routeGuardrails }),
      ...(input.routeRisk && { routeRisk: input.routeRisk }),
      ...(input.riskGuardrails && { riskGuardrails: input.riskGuardrails }),
      ...(input.destinationTokenAccount && { destinationTokenAccount: input.destinationTokenAccount }),
      ...(input.nativeDestinationAccount && { nativeDestinationAccount: input.nativeDestinationAccount }),
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a swap intent that asks the proxy to apply policy and market-risk gates.
 * The action remains "swap" so existing proxy evaluators keep accepting it.
 */
export function createRiskGatedSwapIntent(input: RiskGatedSwapIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'swap',
    params: {
      inputMint: input.inputMint,
      outputMint: input.outputMint,
      inputAmount: input.inputAmount,
      minOutputAmount: input.minOutputAmount,
      strategy: 'risk-gated-swap',
      risk: {
        ...(input.slippageBps !== undefined && { maxSlippageBps: input.slippageBps }),
        ...input.risk,
      },
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a stake intent (for Marinade or Jito stake)
 */
export function createStakeIntent(input: StakeIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'stake',
    params: {
      validator: input.validator,
      amount: input.amount,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create an unstake intent
 */
export function createUnstakeIntent(input: UnstakeIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'unstake',
    params: {
      validator: input.validator,
      amount: input.amount,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a delegate intent
 */
export function createDelegateIntent(input: DelegateIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'delegate',
    params: {
      target: input.target,
      amount: input.amount,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create an undelegate intent
 */
export function createUndelegateIntent(input: UndelegateIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'undelegate',
    params: {
      target: input.target,
      amount: input.amount,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Create a custom intent for arbitrary program interaction
 */
export function createCustomIntent(input: CustomIntentInput): Intent {
  return {
    id: input.intentId ?? generateIntentId(),
    owner: input.owner,
    sessionKey: input.sessionKey,
    action: 'custom',
    params: {
      programId: input.programId,
      instructionData: input.instructionData,
      accounts: input.accounts,
    },
    timestamp: Math.floor(Date.now() / 1000),
    ...(input.policyHash && { policyHash: input.policyHash }),
  };
}

/**
 * Validate an intent object
 * Returns true if the intent has all required fields and a valid action type
 */
export function isValidIntent(intent: unknown): intent is PoletIntent {
  if (!intent || typeof intent !== 'object') {
    return false;
  }

  const obj = intent as Record<string, unknown>;

  // Check required string fields
  if (!obj.id || typeof obj.id !== 'string') return false;
  if (!obj.owner || typeof obj.owner !== 'string') return false;
  if (!obj.sessionKey || typeof obj.sessionKey !== 'string') return false;
  if (!obj.action || typeof obj.action !== 'string') return false;

  // Check valid action type
  if (obj.action !== 'dca' && obj.action !== 'multichain-strategy' && !VALID_ACTIONS.includes(obj.action as IntentAction)) return false;

  // Check params is an object
  if (!obj.params || typeof obj.params !== 'object') return false;

  // Check timestamp is a number
  if (typeof obj.timestamp !== 'number') return false;

  return true;
}

export interface ProxyClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

export interface SubmitIntentOptions extends ProxyClientOptions {
  mode?: 'evaluate' | 'execute';
}

export type PoletTradeStatus =
  | 'preview-ready'
  | 'request-prepared'
  | 'approval-transaction-prepared'
  | 'approval-submitted'
  | 'signature-pending'
  | 'signature-produced-prealpha'
  | 'devnet-smoke-proof'
  | 'broadcast-submitted'
  | 'broadcast-confirmed'
  | 'pending-encrypt-execution'
  | 'encrypt-verified-allowed'
  | 'encrypt-verified-blocked'
  | 'needs-approval'
  | 'blocked'
  | 'not-supported';
export type PoletSettlementStatus = 'not-executed';

export type PoletTradeAsset = string | ChainAsset;

export interface PoletAgentOptions extends ProxyClientOptions {
  owner: string;
  sessionKey: string;
  encryptionWitness?: number[];
}

export interface SimplePoletTradeInput {
  from: string;
  to: string;
  amount: number | string;
  rail?: PoletExecutionRail;
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  ikaPreAlpha?: IkaPreAlphaSigningInput;
  sharedAccess?: SharedIkaApprovalInput;
  routeGuardrails?: ChainAssetAllowlistPolicy;
  routeRisk?: BridgelessRouteRisk;
  riskGuardrails?: BridgelessRiskGuardrailPolicy;
  encryptionWitness?: number[];
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
  policyHash?: string;
  intentId?: string;
}

export interface ExplicitPoletTradeInput {
  rail?: PoletExecutionRail;
  from: PoletTradeAsset;
  to: PoletTradeAsset;
  amount: number | string;
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  ikaPreAlpha?: IkaPreAlphaSigningInput;
  sharedAccess?: SharedIkaApprovalInput;
  routeGuardrails?: ChainAssetAllowlistPolicy;
  routeRisk?: BridgelessRouteRisk;
  riskGuardrails?: BridgelessRiskGuardrailPolicy;
  encryptionWitness?: number[];
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
  policyHash?: string;
  intentId?: string;
}

export type PoletTradeInput = SimplePoletTradeInput | ExplicitPoletTradeInput;

export interface PoletTradeResult {
  allowed: boolean;
  rail: PoletExecutionRail;
  status: PoletTradeStatus;
  settlement: PoletSettlementStatus;
  policy: {
    allowed: boolean;
    code?: string;
    reason?: string;
  };
  approval?: SharedIkaApprovalProgress;
  execution?: {
    intent?: RedactedPoletIntent;
    path?: string;
    requestId?: string;
    payload?: unknown;
  };
  details?: Record<string, unknown>;
  raw?: unknown;
}

export type RedactedPoletIntent = Omit<PoletIntent, 'params'> & {
  params: Record<string, unknown>;
};

export interface IkaAgentProof {
  dWallet?: string;
  messageHash?: string;
  ikaMessageHash?: string;
  canonicalOrderHash?: string;
  destinationSigningDigest?: unknown;
  messageApprovalAccount?: string;
  cpiAuthority?: string;
  signatureScheme?: string;
  suiTransactionDigest?: unknown;
  ethereumMessageDigest?: unknown;
  destination?: {
    chain?: string;
    asset?: string;
    mint?: string;
  };
  poletApprovalTransaction?: unknown;
  devnetSmokeProof?: unknown;
  settlement: PoletSettlementStatus;
}

export interface PoletAgent {
  trade(input: PoletTradeInput): Promise<PoletTradeResult>;
}

export interface PoletAgentKitOptions extends PoletAgentOptions {
  rpcUrl?: string;
  connection?: PoletAgentKitConnection;
  signers?: Signer[] | (() => Promise<Signer[]> | Signer[]);
}

export interface PoletAgentKitConnection extends PoletSimulationConnection {
  sendRawTransaction?(rawTransaction: Buffer | Uint8Array, options?: { skipPreflight?: boolean }): Promise<string>;
  confirmTransaction?(signature: string, commitment?: Commitment): Promise<unknown>;
}

export interface PoletAgentKitDiagnostic {
  field: string;
  code: string;
  message: string;
}

export interface PoletAgentKitConfigValidation {
  ok: boolean;
  missing: PoletAgentKitDiagnostic[];
  invalid: PoletAgentKitDiagnostic[];
}

export interface PoletAgentKitStatus {
  ok: boolean;
  proxy: {
    ok: boolean;
    status?: string;
    version?: string;
  };
  programId: string;
  owner?: string;
  sessionKey?: string;
  walletPda?: string;
  wallet: {
    exists: boolean;
    policyConfigured: boolean;
    sessionAuthorized: boolean;
    sessionExpiresAt?: number;
    sharedIkaApproval?: unknown;
    recovery?: unknown;
  };
  diagnostics: PoletAgentKitDiagnostic[];
}

export type PoletAgentToolStatus =
  | PoletTradeStatus
  | 'ok'
  | 'submitted'
  | 'failed'
  | 'signer-required';

export interface PoletAgentToolResult {
  status: PoletAgentToolStatus;
  ok: boolean;
  data?: unknown;
  reason?: string;
  requiredSigners?: string[];
}

export interface PoletAgentToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler(input?: unknown): Promise<PoletAgentToolResult>;
}

export interface PoletSignAndSendInput {
  transaction: string | PoletUnsignedTransactionLike;
  skipPreflight?: boolean;
  commitment?: Commitment;
}

export interface PoletSignAndSendResult {
  status: 'submitted' | 'signer-required' | 'failed';
  ok: boolean;
  requiredSigners: string[];
  signature?: string;
  reason?: string;
}

export interface PoletAgentKit {
  validateConfig(): PoletAgentKitConfigValidation;
  status(): Promise<PoletAgentKitStatus>;
  trade(input: PoletTradeInput): Promise<PoletTradeResult>;
  simulateTransaction(input: SimulatePoletTransactionInput): Promise<SimulatePoletTransactionResult>;
  signAndSendTransaction(input: PoletSignAndSendInput): Promise<PoletSignAndSendResult>;
  tools(): PoletAgentToolDescriptor[];
  onboarding: {
    deriveSmartWalletPda(owner?: string): Promise<string | undefined>;
    exportConfig(): {
      POLET_OWNER?: string;
      POLET_SESSION_KEY?: string;
      POLET_PROXY_URL: string;
      POLET_RPC_URL?: string;
      POLET_PROGRAM_ID: string;
    };
    requiredOwnerSetup(): string[];
  };
}

export function createPoletAgentKit(options: PoletAgentKitOptions): PoletAgentKit {
  const agent = createPoletAgent(options);

  return {
    validateConfig: () => validatePoletAgentKitConfig(options),
    status: () => getPoletAgentKitStatus(options),
    trade: (input) => agent.trade(input),
    simulateTransaction: (input) => simulatePoletTransaction({
      ...input,
      rpcUrl: input.rpcUrl ?? options.rpcUrl,
      connection: input.connection ?? options.connection,
    }),
    signAndSendTransaction: (input) => signAndSendPoletTransaction(input, options),
    tools: () => buildPoletAgentKitTools(options, agent),
    onboarding: {
      deriveSmartWalletPda: async (owner = options.owner) => {
        if (!owner || !isValidPublicKey(owner)) return undefined;
        return (await deriveWalletPDA(owner)).toString();
      },
      exportConfig: () => ({
        ...(options.owner && { POLET_OWNER: options.owner }),
        ...(options.sessionKey && { POLET_SESSION_KEY: options.sessionKey }),
        POLET_PROXY_URL: options.baseUrl,
        ...(options.rpcUrl && { POLET_RPC_URL: options.rpcUrl }),
        POLET_PROGRAM_ID,
      }),
      requiredOwnerSetup: () => [
        'Initialize the Polet wallet PDA with owner authority.',
        'Register demo custody accounts.',
        'Configure confidential numeric policy without exposing private thresholds to the agent.',
        'Grant the agent session key and share only runtime-safe config.',
        'Configure shared Ika approvers or recovery authority only through explicit owner-signed flows.',
      ],
    },
  };
}

export class ProxyRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = 'ProxyRequestError';
  }
}

export async function evaluateIntentWithProxy<TResponse = unknown>(
  intent: Intent,
  options: ProxyClientOptions
): Promise<TResponse> {
  return requestProxy<TResponse>('/legacy/intent/evaluate', intent, options);
}

export async function submitIntent<TResponse = unknown>(
  intent: PoletIntent,
  options: SubmitIntentOptions
): Promise<TResponse> {
  if (intent.action === 'dca') {
    return requestProxy<TResponse>('/intent/dca/run', toDcaRunRequest(intent), options);
  }
  if (intent.action === 'multichain-strategy') {
    return requestProxy<TResponse>('/intent/multichain/run', intent, options);
  }

  const mode = options.mode ?? 'execute';
  return requestProxy<TResponse>(mode === 'evaluate' ? '/legacy/intent/evaluate' : '/legacy/intent/execute', intent, options);
}

export async function broadcastIkaDestinationDemo(
  input: IkaDestinationBroadcastInput,
  options: ProxyClientOptions
): Promise<IkaDestinationBroadcastResult> {
  const response = await requestProxy<{
    success?: boolean;
    data?: IkaDestinationBroadcastResult;
  }>('/intent/ika/destination-broadcast', input, options);

  return response.data ?? response as IkaDestinationBroadcastResult;
}

export async function simulatePoletTransaction(
  input: SimulatePoletTransactionInput
): Promise<SimulatePoletTransactionResult> {
  const connection = input.connection ?? (
    input.rpcUrl ? new Connection(input.rpcUrl, input.commitment ?? 'confirmed') : undefined
  );
  if (!connection) {
    throw new Error('simulatePoletTransaction requires an explicit rpcUrl or connection');
  }

  const base64 = extractPoletTransactionBase64(input.transaction);
  const decoded = Buffer.from(base64, 'base64');
  const { transaction, transactionType } = deserializePoletTransaction(decoded);

  if (input.signers && input.signers.length > 0) {
    if (transaction instanceof VersionedTransaction) {
      transaction.sign(input.signers);
    } else {
      transaction.partialSign(...input.signers);
    }
  }

  const raw = await connection.simulateTransaction(transaction, {
    sigVerify: input.sigVerify ?? false,
    replaceRecentBlockhash: input.replaceRecentBlockhash ?? true,
    ...(input.commitment && { commitment: input.commitment }),
  });

  return {
    ok: raw.value.err === null,
    transactionType,
    signerPubkeys: extractPoletSignerPubkeys(transaction),
    err: raw.value.err,
    logs: raw.value.logs ?? [],
    ...(raw.value.unitsConsumed !== undefined && { unitsConsumed: raw.value.unitsConsumed }),
    ...(raw.value.returnData !== null && raw.value.returnData !== undefined && { returnData: raw.value.returnData }),
    raw,
  };
}

export function createPoletAgent(options: PoletAgentOptions): PoletAgent {
  return {
    trade(input: PoletTradeInput): Promise<PoletTradeResult> {
      const rail = input.rail ?? 'jupiter';
      if (rail === 'jupiter') return tradeWithJupiter(input, options);
      if (rail === 'ika') return tradeWithIka(input, options);
      return Promise.resolve(notSupportedTradeResult(rail as PoletExecutionRail, 'Unsupported execution rail.'));
    },
  };
}

function validatePoletAgentKitConfig(options: PoletAgentKitOptions): PoletAgentKitConfigValidation {
  const missing: PoletAgentKitDiagnostic[] = [];
  const invalid: PoletAgentKitDiagnostic[] = [];

  if (!options.baseUrl) missing.push(diagnostic('baseUrl', 'MISSING_BASE_URL', 'Polet proxy baseUrl is required.'));
  else {
    try {
      new URL(normalizeBaseUrl(options.baseUrl));
    } catch {
      invalid.push(diagnostic('baseUrl', 'INVALID_BASE_URL', 'Polet proxy baseUrl must be an absolute URL.'));
    }
  }

  if (!options.owner) missing.push(diagnostic('owner', 'MISSING_OWNER', 'Owner public key is required.'));
  else if (!isValidPublicKey(options.owner)) invalid.push(diagnostic('owner', 'INVALID_OWNER', 'Owner must be a Solana public key.'));

  if (!options.sessionKey) missing.push(diagnostic('sessionKey', 'MISSING_SESSION_KEY', 'Session key public key is required.'));
  else if (!isValidPublicKey(options.sessionKey)) invalid.push(diagnostic('sessionKey', 'INVALID_SESSION_KEY', 'Session key must be a Solana public key.'));

  if (options.encryptionWitness !== undefined && !isEncryptionWitness(options.encryptionWitness)) {
    invalid.push(diagnostic('encryptionWitness', 'INVALID_ENCRYPTION_WITNESS', 'Encryption witness must be 32 bytes when configured.'));
  }

  if (options.rpcUrl !== undefined) {
    try {
      new URL(options.rpcUrl);
    } catch {
      invalid.push(diagnostic('rpcUrl', 'INVALID_RPC_URL', 'RPC URL must be an absolute URL when configured.'));
    }
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

async function getPoletAgentKitStatus(options: PoletAgentKitOptions): Promise<PoletAgentKitStatus> {
  const diagnostics = [
    ...validatePoletAgentKitConfig(options).missing,
    ...validatePoletAgentKitConfig(options).invalid,
  ];
  const walletPda = options.owner && isValidPublicKey(options.owner)
    ? (await deriveWalletPDA(options.owner)).toString()
    : undefined;
  const proxy = await fetchProxyHealth(options).catch((error) => {
    diagnostics.push(diagnostic('baseUrl', 'PROXY_UNREACHABLE', error instanceof Error ? error.message : 'Proxy health check failed.'));
    return { ok: false };
  });
  const walletEnvelope = options.owner && isValidPublicKey(options.owner)
    ? await fetchProxyGet<{ success?: boolean; data?: Record<string, unknown>; error?: unknown }>(`/wallet/${options.owner}`, options).catch((error) => {
      diagnostics.push(diagnostic('wallet', 'WALLET_LOOKUP_FAILED', error instanceof Error ? error.message : 'Wallet lookup failed.'));
      return undefined;
    })
    : undefined;
  const walletData = walletEnvelope?.success === true ? walletEnvelope.data : undefined;
  const session = findWalletSession(walletData, options.sessionKey);
  const policy = walletData?.confidentialPolicy as { enabled?: unknown } | undefined;

  return {
    ok: proxy.ok && Boolean(walletData) && Boolean(session?.authorized),
    proxy,
    programId: POLET_PROGRAM_ID,
    ...(options.owner && { owner: options.owner }),
    ...(options.sessionKey && { sessionKey: options.sessionKey }),
    ...(walletPda && { walletPda }),
    wallet: {
      exists: Boolean(walletData),
      policyConfigured: policy?.enabled === true,
      sessionAuthorized: session?.authorized === true,
      ...(typeof session?.expiresAt === 'number' && { sessionExpiresAt: session.expiresAt }),
      ...(walletData?.sharedIkaApprovals !== undefined && { sharedIkaApproval: walletData.sharedIkaApprovals }),
      ...(walletData?.recovery !== undefined && { recovery: walletData.recovery }),
    },
    diagnostics,
  };
}

function buildPoletAgentKitTools(options: PoletAgentKitOptions, agent: PoletAgent): PoletAgentToolDescriptor[] {
  return [
    tool('polet_status', 'Check proxy, wallet, policy, session, shared Ika approval, and recovery status.', async () => ({
      status: 'ok',
      ok: true,
      data: await getPoletAgentKitStatus(options),
    })),
    tool('polet_trade', 'Submit a normalized Jupiter or Ika Polet trade request.', async (input) => tradeToolResult(await agent.trade(input as PoletTradeInput))),
    tool('polet_ika_request', 'Submit a Sui-primary or Ethereum-optional Ika signed-intent request.', async (input) => tradeToolResult(await agent.trade({
      ...(input as Record<string, unknown>),
      rail: 'ika',
    } as PoletTradeInput))),
    tool('polet_simulate_transaction', 'Simulate an unsigned Polet transaction without signing or broadcasting.', async (input) => ({
      status: 'ok',
      ok: true,
      data: await simulatePoletTransaction({
        ...(input as SimulatePoletTransactionInput),
        rpcUrl: (input as SimulatePoletTransactionInput | undefined)?.rpcUrl ?? options.rpcUrl,
        connection: (input as SimulatePoletTransactionInput | undefined)?.connection ?? options.connection,
      }),
    })),
    tool('polet_sign_and_send_transaction', 'Sign and send only when an explicit session signer is configured.', async (input) => signAndSendToolResult(await signAndSendPoletTransaction(input as PoletSignAndSendInput, options))),
    tool('polet_shared_ika_approval_status', 'Return shared Ika approval status from wallet status.', async () => {
      const status = await getPoletAgentKitStatus(options);
      return {
        status: 'ok',
        ok: true,
        data: status.wallet.sharedIkaApproval ?? { enabled: false },
      };
    }),
  ];
}

function tool(
  name: string,
  description: string,
  handler: (input?: unknown) => Promise<PoletAgentToolResult>
): PoletAgentToolDescriptor {
  return {
    name,
    description,
    inputSchema: { type: 'object' },
    handler: async (input?: unknown) => {
      try {
        return await handler(input);
      } catch (error) {
        return {
          status: 'failed',
          ok: false,
          reason: error instanceof Error ? error.message : 'Polet tool failed.',
        };
      }
    },
  };
}

async function signAndSendPoletTransaction(
  input: PoletSignAndSendInput,
  options: PoletAgentKitOptions
): Promise<PoletSignAndSendResult> {
  const base64 = extractPoletTransactionBase64(input.transaction);
  const { transaction } = deserializePoletTransaction(Buffer.from(base64, 'base64'));
  const requiredSigners = extractPoletSignerPubkeys(transaction);
  const signers = await resolveKitSigners(options);
  const signerPubkeys = signers.map((signer) => signer.publicKey.toBase58());
  const missing = requiredSigners.filter((required) => !signerPubkeys.includes(required));

  if (missing.length > 0) {
    return {
      status: 'signer-required',
      ok: false,
      requiredSigners,
      reason: 'Explicit session signer is required before Polet can sign or broadcast this transaction.',
    };
  }

  const connection = options.connection ?? (options.rpcUrl ? new Connection(options.rpcUrl) : undefined);
  if (!connection?.sendRawTransaction) {
    return {
      status: 'signer-required',
      ok: false,
      requiredSigners,
      reason: 'RPC connection with sendRawTransaction is required to broadcast.',
    };
  }

  if (transaction instanceof VersionedTransaction) transaction.sign(signers);
  else transaction.partialSign(...signers);

  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: input.skipPreflight });
  await connection.confirmTransaction?.(signature, input.commitment);
  return {
    status: 'submitted',
    ok: true,
    requiredSigners,
    signature,
  };
}

async function resolveKitSigners(options: PoletAgentKitOptions): Promise<Signer[]> {
  if (!options.signers) return [];
  return typeof options.signers === 'function' ? await options.signers() : options.signers;
}

function tradeToolResult(result: PoletTradeResult): PoletAgentToolResult {
  return {
    status: normalizeToolTradeStatus(result.status),
    ok: result.allowed,
    data: result,
    ...(!result.allowed && { reason: result.policy.reason }),
  };
}

function signAndSendToolResult(result: PoletSignAndSendResult): PoletAgentToolResult {
  return {
    status: result.status,
    ok: result.ok,
    data: result,
    ...(result.reason && { reason: result.reason }),
    ...(result.requiredSigners.length > 0 && { requiredSigners: result.requiredSigners }),
  };
}

function normalizeToolTradeStatus(status: PoletTradeStatus): PoletAgentToolStatus {
  if (status === 'preview-ready'
    || status === 'approval-transaction-prepared'
    || status === 'pending-encrypt-execution'
    || status === 'needs-approval'
    || status === 'blocked'
    || status === 'not-supported') {
    return status;
  }
  return status;
}

async function fetchProxyHealth(options: ProxyClientOptions): Promise<PoletAgentKitStatus['proxy']> {
  const response = await fetchProxyGet<{ success?: boolean; data?: { status?: string; version?: string } }>('/health', options);
  return {
    ok: response.success === true,
    status: response.data?.status,
    version: response.data?.version,
  };
}

async function fetchProxyGet<TResponse>(path: string, options: ProxyClientOptions): Promise<TResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(new URL(path, normalizeBaseUrl(options.baseUrl)), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return await response.json() as TResponse;
}

function findWalletSession(walletData: Record<string, unknown> | undefined, sessionKey: string): { authorized?: boolean; expiresAt?: number } | undefined {
  const sessions = walletData?.sessions ?? walletData?.temporalKeys;
  if (!Array.isArray(sessions)) return undefined;
  return sessions.find((candidate): candidate is { key: string; authorized?: boolean; expiresAt?: number } => (
    Boolean(candidate)
    && typeof candidate === 'object'
    && (candidate as { key?: unknown }).key === sessionKey
  ));
}

function diagnostic(field: string, code: string, message: string): PoletAgentKitDiagnostic {
  return { field, code, message };
}

function toDcaRunRequest(intent: DcaIntent): Record<string, unknown> {
  return {
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    amountUsdc: intent.params.amountUsdc,
    inputMint: intent.params.inputMint,
    outputMint: intent.params.outputMint,
    encryptionWitness: intent.params.encryptionWitness,
    ...(intent.params.slippageBps !== undefined && { slippageBps: intent.params.slippageBps }),
    ...(intent.params.destinationTokenAccount && { destinationTokenAccount: intent.params.destinationTokenAccount }),
    ...(intent.params.nativeDestinationAccount && { nativeDestinationAccount: intent.params.nativeDestinationAccount }),
  };
}

function extractPoletTransactionBase64(value: string | PoletUnsignedTransactionLike): string {
  const base64 = typeof value === 'string'
    ? value
    : value.transaction ?? value.unsignedTransaction ?? value.base64;

  if (typeof base64 !== 'string' || base64.trim() === '') {
    throw new Error('Polet unsigned transaction must include a base64 transaction');
  }

  return base64;
}

function deserializePoletTransaction(bytes: Uint8Array): {
  transaction: Transaction | VersionedTransaction;
  transactionType: 'legacy' | 'versioned';
} {
  try {
    return {
      transaction: Transaction.from(bytes),
      transactionType: 'legacy',
    };
  } catch {
    return {
      transaction: VersionedTransaction.deserialize(bytes),
      transactionType: 'versioned',
    };
  }
}

function extractPoletSignerPubkeys(transaction: Transaction | VersionedTransaction): string[] {
  if (transaction instanceof VersionedTransaction) {
    return transaction.message.staticAccountKeys
      .filter((_, index) => transaction.message.isAccountSigner(index))
      .map((key) => key.toBase58());
  }

  return transaction.signatures.map((signature) => signature.publicKey.toBase58());
}

async function tradeWithJupiter(input: PoletTradeInput, options: PoletAgentOptions): Promise<PoletTradeResult> {
  const from = normalizeTradeAsset(input.from, 'solana');
  const to = normalizeTradeAsset(input.to, 'solana');
  const strategy = input.strategy ?? 'dca';

  if (!isSupportedJupiterDca(from, to, strategy)) {
    return notSupportedTradeResult('jupiter', 'Only Solana USDC -> SOL DCA is supported on the Jupiter adapter in this MVP slice.');
  }

  const witness = input.encryptionWitness ?? options.encryptionWitness;
  if (witness !== undefined && !isEncryptionWitness(witness)) {
    return notSupportedTradeResult('jupiter', 'maskedWitnessDevFixture must contain 32 bytes when provided.');
  }

  const intent = createDcaIntent({
    owner: options.owner,
    sessionKey: options.sessionKey,
    amountUsdc: input.amount,
    ...(witness ? { encryptionWitness: witness } : {}),
    inputMint: from.mint ?? JUPITER_USDC_MINT,
    outputMint: to.mint ?? JUPITER_SOL_MINT,
    slippageBps: input.slippageBps,
    destinationTokenAccount: input.destinationTokenAccount,
    nativeDestinationAccount: input.nativeDestinationAccount,
    policyHash: input.policyHash,
    intentId: input.intentId,
  });

  try {
    const response = await submitIntent<ProxyEnvelopeLike>(intent, options);
    return normalizeJupiterTradeResponse(response, intent);
  } catch (error) {
    return normalizeTradeError(error, 'jupiter');
  }
}

async function tradeWithIka(input: PoletTradeInput, options: PoletAgentOptions): Promise<PoletTradeResult> {
  const from = normalizeTradeAsset(input.from, 'solana');
  const to = normalizeTradeAsset(input.to, 'sui');

  if (!isSupportedIkaDestination(from, to)) {
    return notSupportedTradeResult('ika', 'Only Solana USDC -> Sui SUI or Ethereum ETH is supported on the Ika adapter in this MVP slice.');
  }

  const witness = input.encryptionWitness ?? options.encryptionWitness;
  if (witness !== undefined && !isEncryptionWitness(witness)) {
    return notSupportedTradeResult('ika', 'maskedWitnessDevFixture must contain 32 bytes when provided.');
  }

  const intent = createMultichainStrategyIntent({
    owner: options.owner,
    sessionKey: options.sessionKey,
    sourceChain: from.chain,
    sourceAsset: from.asset,
    sourceMint: from.mint,
    targetChain: to.chain,
    targetAsset: to.asset,
    targetMint: to.mint,
    amount: input.amount,
    executionRail: 'ika',
    strategy: input.strategy ?? 'dca',
    ...(witness ? { encryptionWitness: witness } : {}),
    slippageBps: input.slippageBps,
    ikaPreAlpha: input.ikaPreAlpha,
    sharedAccess: input.sharedAccess,
    routeGuardrails: input.routeGuardrails,
    routeRisk: input.routeRisk,
    riskGuardrails: input.riskGuardrails,
    destinationTokenAccount: input.destinationTokenAccount,
    nativeDestinationAccount: input.nativeDestinationAccount,
    policyHash: input.policyHash,
    intentId: input.intentId,
  });

  try {
    const response = await submitIntent<ProxyEnvelopeLike>(intent, options);
    return normalizeIkaTradeResponse(response, intent);
  } catch (error) {
    return normalizeTradeError(error, 'ika');
  }
}

interface ProxyEnvelopeLike {
  success?: boolean;
  data?: ProxyTradeDataLike;
  error?: {
    code?: string;
    message?: string;
  };
}

interface ProxyTradeDataLike {
  allowed?: boolean;
  code?: string;
  reason?: string;
  approval?: SharedIkaApprovalProgress;
  status?: PoletTradeStatus;
  encryptPolicy?: unknown;
  devnetSmokeProof?: unknown;
  executionPath?: string;
  transaction?: unknown;
  smartWalletTransaction?: unknown;
  route?: unknown;
  build?: unknown;
  multichain?: unknown;
  ikaRequest?: {
    executionRail?: string;
    intentStrategy?: 'dca' | 'swap';
    requestId?: string;
    settlement?: PoletSettlementStatus;
    executionBoundary?: {
      status?: PoletTradeStatus;
    };
    preAlphaSigning?: {
      status?: PoletTradeStatus;
      dwalletAccount?: string;
      ikaMessageHash?: string;
      messageDigest?: string;
      destinationSigningDigest?: unknown;
      messageApprovalPda?: string;
      cpiAuthorityPda?: string;
      signatureScheme?: string;
      [key: string]: unknown;
    };
    suiTransactionDigest?: {
      digestHex?: string;
      digestBase58?: string;
      action?: string;
      chain?: string;
      network?: string;
      transaction?: unknown;
      broadcastable?: boolean;
      productionSettlement?: boolean;
      [key: string]: unknown;
    };
    ethereumMessageDigest?: {
      digestHex?: string;
      action?: string;
      chain?: string;
      network?: string;
      chainId?: number;
      message?: unknown;
      broadcastable?: boolean;
      productionSettlement?: boolean;
      [key: string]: unknown;
    };
    poletApprovalTransaction?: unknown;
    canonicalOrderHash?: string;
    ikaMessageHash?: string;
    destinationSigningDigest?: unknown;
    target?: {
      chain?: string;
      asset?: string;
      mint?: string;
    };
    devnetSmokeProof?: unknown;
    [key: string]: unknown;
  };
}

function normalizeJupiterTradeResponse(response: ProxyEnvelopeLike, intent: DcaIntent): PoletTradeResult {
  const data = response.data ?? {};
  if (data.allowed === false) return blockedTradeResult('jupiter', data.code, data.reason, response);

  return {
    allowed: true,
    rail: 'jupiter',
    status: 'preview-ready',
    settlement: 'not-executed',
    policy: {
      allowed: true,
      code: data.code,
    },
    execution: {
      intent: redactIntent(intent),
      path: data.executionPath ?? '/intent/dca/run',
      payload: data.smartWalletTransaction ?? data.transaction,
    },
    details: {
      route: data.route,
      build: data.build,
      multichain: data.multichain,
      encryptPolicy: data.encryptPolicy,
    },
    raw: response,
  };
}

function normalizeIkaTradeResponse(response: ProxyEnvelopeLike, intent: MultichainStrategyIntent): PoletTradeResult {
  const data = response.data ?? {};
  if (data.allowed === false && data.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
    return needsApprovalTradeResult('ika', data.approval, data.reason, response);
  }
  if (data.allowed === false) return blockedTradeResult('ika', data.code, data.reason, response);

  return {
    allowed: true,
    rail: 'ika',
    status: normalizeIkaStatus(data.devnetSmokeProof ?? data.ikaRequest?.devnetSmokeProof ?? data.status ?? data.ikaRequest?.preAlphaSigning?.status ?? data.ikaRequest?.executionBoundary?.status),
    settlement: 'not-executed',
    policy: {
      allowed: true,
      code: data.code,
    },
    execution: {
      intent: redactIntent(intent),
      path: '/intent/multichain/run',
      requestId: data.ikaRequest?.requestId,
      payload: data.ikaRequest,
    },
    details: {
      intentStrategy: data.ikaRequest?.intentStrategy ?? intent.params.strategy ?? 'dca',
      executionRail: data.ikaRequest?.executionRail ?? 'ika-bridgeless',
      executionBoundary: data.ikaRequest?.executionBoundary,
      preAlphaSigning: data.ikaRequest?.preAlphaSigning,
      proof: buildIkaAgentProof(data),
    },
    raw: response,
  };
}

function normalizeIkaStatus(value: unknown): PoletTradeStatus {
  if (value && typeof value === 'object') return 'devnet-smoke-proof';
  if (
    value === 'request-prepared'
    || value === 'approval-transaction-prepared'
    || value === 'approval-submitted'
    || value === 'signature-pending'
    || value === 'signature-produced-prealpha'
    || value === 'devnet-smoke-proof'
    || value === 'broadcast-submitted'
    || value === 'broadcast-confirmed'
  ) {
    return value;
  }

  return 'request-prepared';
}

function normalizeTradeError(error: unknown, rail: PoletExecutionRail): PoletTradeResult {
  if (error instanceof ProxyRequestError) {
    const response = error.response as ProxyEnvelopeLike;
    const code = response.error?.code;
    const message = response.error?.message ?? error.message;

    if (isBlockingProxyCode(code)) {
      return blockedTradeResult(rail, code, undefined, response);
    }

    return notSupportedTradeResult(rail, message, response);
  }

  throw error;
}

function blockedTradeResult(
  rail: PoletExecutionRail,
  code?: string,
  reason?: string,
  raw?: unknown
): PoletTradeResult {
  const data = (raw as ProxyEnvelopeLike | undefined)?.data;
  const encryptStatus = data?.status === 'pending-encrypt-execution' || data?.status === 'encrypt-verified-blocked'
    ? data.status
    : 'blocked';
  return {
    allowed: false,
    rail,
    status: encryptStatus,
    settlement: 'not-executed',
    policy: {
      allowed: false,
      code,
      reason: reason ?? 'Polet confidential policy blocked this trade without revealing private thresholds.',
    },
    ...(data?.encryptPolicy !== undefined ? { details: { encryptPolicy: data.encryptPolicy } } : {}),
    raw,
  };
}

function needsApprovalTradeResult(
  rail: PoletExecutionRail,
  approval?: SharedIkaApprovalProgress,
  reason?: string,
  raw?: unknown
): PoletTradeResult {
  return {
    allowed: false,
    rail,
    status: 'needs-approval',
    settlement: 'not-executed',
    policy: {
      allowed: true,
      code: 'IKA_APPROVAL_QUORUM_REQUIRED',
      reason: reason ?? 'Shared access quorum is required before Polet prepares Ika approval data.',
    },
    approval,
    raw,
  };
}

function notSupportedTradeResult(
  rail: PoletExecutionRail,
  reason: string,
  raw?: unknown
): PoletTradeResult {
  return {
    allowed: false,
    rail,
    status: 'not-supported',
    settlement: 'not-executed',
    policy: {
      allowed: false,
      reason,
    },
    raw,
  };
}

function normalizeTradeAsset(asset: PoletTradeAsset, defaultChain: PoletChain): ChainAsset {
  if (typeof asset === 'string') {
    return {
      chain: defaultChain,
      asset: asset.toUpperCase(),
    };
  }

  return {
    chain: asset.chain,
    asset: asset.asset.toUpperCase(),
    ...(asset.mint && { mint: asset.mint }),
  };
}

function isSupportedJupiterDca(from: ChainAsset, to: ChainAsset, strategy: 'dca' | 'swap'): boolean {
  return (
    strategy === 'dca'
    && from.chain === 'solana'
    && to.chain === 'solana'
    && from.asset === 'USDC'
    && to.asset === 'SOL'
    && (from.mint === undefined || from.mint === JUPITER_USDC_MINT)
    && (to.mint === undefined || to.mint === JUPITER_SOL_MINT)
  );
}

function isEncryptionWitness(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length === 32
    && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255);
}

function isBlockingProxyCode(code: string | undefined): boolean {
  return code === 'CONFIDENTIAL_POLICY_BLOCKED'
    || code === 'SESSION_NOT_AUTHORIZED'
    || code === 'SESSION_EXPIRED'
    || code === 'SESSION_STALE'
    || code === 'ORDER_EXPIRED'
    || code === 'POLICY_NOT_CONFIGURED'
    || code === 'INVALID_POLICY_WITNESS'
    || code === 'ENCRYPT_POLICY_PENDING'
    || code === 'ENCRYPT_POLICY_VERIFIED_BLOCKED'
    || code === 'IKA_ROUTE_NOT_ALLOWED'
    || code === 'IKA_RISK_GUARDRAIL_BLOCKED';
}

function isSupportedIkaDestination(from: ChainAsset, to: ChainAsset): boolean {
  return from.chain === 'solana'
    && from.asset === 'USDC'
    && (
      (to.chain === 'sui' && to.asset === 'SUI')
      || (to.chain === 'ethereum' && to.asset === 'ETH')
    );
}

function redactIntent<TIntent extends PoletIntent>(intent: TIntent): RedactedPoletIntent {
  const params = { ...(intent.params as unknown as Record<string, unknown>) };
  delete params.encryptionWitness;

  return {
    ...intent,
    params,
  };
}

function buildIkaAgentProof(data: ProxyTradeDataLike): IkaAgentProof {
  const request = data.ikaRequest;
  const signing = request?.preAlphaSigning;

  return {
    dWallet: signing?.dwalletAccount,
    messageHash: signing?.ikaMessageHash ?? signing?.messageDigest,
    ikaMessageHash: signing?.ikaMessageHash ?? request?.ikaMessageHash,
    messageApprovalAccount: signing?.messageApprovalPda,
    canonicalOrderHash: request?.canonicalOrderHash,
    destinationSigningDigest: signing?.destinationSigningDigest ?? request?.destinationSigningDigest,
    cpiAuthority: signing?.cpiAuthorityPda,
    signatureScheme: signing?.signatureScheme,
    suiTransactionDigest: request?.suiTransactionDigest,
    ethereumMessageDigest: request?.ethereumMessageDigest,
    destination: request?.target,
    poletApprovalTransaction: request?.poletApprovalTransaction,
    devnetSmokeProof: request?.devnetSmokeProof ?? data.devnetSmokeProof,
    settlement: 'not-executed',
  };
}

async function requestProxy<TResponse>(
  path: string,
  payload: unknown,
  options: ProxyClientOptions
): Promise<TResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(new URL(path, normalizeBaseUrl(options.baseUrl)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => undefined);

  if (!response.ok || isProxyFailure(data)) {
    const message = extractProxyErrorMessage(data) ?? `Polet proxy request failed with HTTP ${response.status}`;
    throw new ProxyRequestError(message, response.status, data);
  }

  return data as TResponse;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function isProxyFailure(data: unknown): boolean {
  return Boolean(data && typeof data === 'object' && (data as { success?: unknown }).success === false);
}

function extractProxyErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const error = (data as { error?: unknown }).error;
  if (!error || typeof error !== 'object') return undefined;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

/**
 * Get the amount from an intent in lamports
 */
export function getIntentAmount(intent: Intent): number {
  switch (intent.action) {
    case 'transfer':
      return (intent.params as TransferParams).amount;
    case 'swap':
      return (intent.params as SwapParams).inputAmount;
    case 'stake':
    case 'unstake':
      return (intent.params as StakeParams).amount;
    case 'delegate':
    case 'undelegate':
      return (intent.params as DelegateParams).amount;
    default:
      return 0;
  }
}

/**
 * Get the destination (where funds are going) from an intent
 */
export function getIntentDestination(intent: Intent): string | null {
  switch (intent.action) {
    case 'transfer':
      return (intent.params as TransferParams).destination;
    case 'swap':
      return (intent.params as SwapParams).outputMint;
    case 'stake':
    case 'unstake':
      return (intent.params as StakeParams).validator;
    case 'delegate':
    case 'undelegate':
      return (intent.params as DelegateParams).target;
    case 'custom':
      return (intent.params as CustomParams).programId;
    default:
      return null;
  }
}

export {
  createLocalAgentRuntime,
  defaultScenarioAmount,
  DEFAULT_AGENT_RUNTIME_WITNESS,
  LocalAgentRuntime,
  type AgentRuntimeResult,
  type AgentRuntimeScenario,
  type DcaRunData,
  type HybridAgentRuntimeResult,
  type IkaAgentRuntimeResult,
  type IkaRunData,
  type LocalAgentRuntimeConfig,
  type ProxyEnvelope,
  type RunDcaScenarioInput,
  type RunIkaScenarioInput,
} from './local-agent-runtime.js';
