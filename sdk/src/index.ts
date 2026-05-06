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

export const JUPITER_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const JUPITER_SOL_MINT = 'So11111111111111111111111111111111111111112';

export {
  CANONICAL_BRIDGELESS_ORDER_SCHEMA,
  assertCanonicalBridgelessOrderActive,
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
  serializeCanonicalBridgelessOrder,
  validateCanonicalBridgelessOrder,
  verifyCanonicalBridgelessOrderHash,
  type BuildCanonicalBridgelessOrderInput,
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
  encryptionWitness: number[];
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
  encryptionWitness: number[];
  ikaPreAlpha?: IkaPreAlphaSigningInput;
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export type IkaPreAlphaSignatureScheme = 'ecdsa-secp256k1-sha256' | 'ed25519-prealpha';

export interface IkaPreAlphaSigningInput {
  dwalletAccount?: string;
  userPublicKey?: string;
  signatureScheme?: IkaPreAlphaSignatureScheme;
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
  encryptionWitness: number[];
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
  encryptionWitness: number[];
  sourceMint?: string;
  targetMint?: string;
  strategy?: 'dca' | 'swap';
  slippageBps?: number;
  ikaPreAlpha?: IkaPreAlphaSigningInput;
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
      encryptionWitness: input.encryptionWitness,
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
      encryptionWitness: input.encryptionWitness,
      ...(input.slippageBps !== undefined && { slippageBps: input.slippageBps }),
      ...(input.ikaPreAlpha && { ikaPreAlpha: input.ikaPreAlpha }),
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
  | 'message-approved'
  | 'signature-pending'
  | 'signature-produced-prealpha'
  | 'devnet-smoke-proof'
  | 'broadcast-submitted'
  | 'broadcast-confirmed'
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
  canonicalOrderHash?: string;
  messageApprovalAccount?: string;
  cpiAuthority?: string;
  signatureScheme?: string;
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

async function tradeWithJupiter(input: PoletTradeInput, options: PoletAgentOptions): Promise<PoletTradeResult> {
  const from = normalizeTradeAsset(input.from, 'solana');
  const to = normalizeTradeAsset(input.to, 'solana');
  const strategy = input.strategy ?? 'dca';

  if (!isSupportedJupiterDca(from, to, strategy)) {
    return notSupportedTradeResult('jupiter', 'Only Solana USDC -> SOL DCA is supported on the Jupiter adapter in this MVP slice.');
  }

  const witness = input.encryptionWitness ?? options.encryptionWitness;
  if (!isEncryptionWitness(witness)) {
    return notSupportedTradeResult('jupiter', 'A 32-byte confidential policy witness is required.');
  }

  const intent = createDcaIntent({
    owner: options.owner,
    sessionKey: options.sessionKey,
    amountUsdc: input.amount,
    encryptionWitness: witness,
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
  const witness = input.encryptionWitness ?? options.encryptionWitness;

  if (!isSupportedIkaSui(from, to)) {
    return notSupportedTradeResult('ika', 'Only Solana USDC -> Sui SUI is supported on the Ika adapter in this MVP slice.');
  }

  if (!isEncryptionWitness(witness)) {
    return notSupportedTradeResult('ika', 'A 32-byte confidential policy witness is required.');
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
    encryptionWitness: witness,
    slippageBps: input.slippageBps,
    ikaPreAlpha: input.ikaPreAlpha,
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
  status?: PoletTradeStatus;
  devnetSmokeProof?: unknown;
  executionPath?: string;
  transaction?: unknown;
  smartWalletTransaction?: unknown;
  route?: unknown;
  build?: unknown;
  multichain?: unknown;
  ikaRequest?: {
    requestId?: string;
    settlement?: PoletSettlementStatus;
    executionBoundary?: {
      status?: PoletTradeStatus;
    };
    preAlphaSigning?: {
      status?: PoletTradeStatus;
      dwalletAccount?: string;
      messageDigest?: string;
      messageApprovalPda?: string;
      cpiAuthorityPda?: string;
      signatureScheme?: string;
      [key: string]: unknown;
    };
    poletApprovalTransaction?: unknown;
    canonicalOrderHash?: string;
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
    },
    raw: response,
  };
}

function normalizeIkaTradeResponse(response: ProxyEnvelopeLike, intent: MultichainStrategyIntent): PoletTradeResult {
  const data = response.data ?? {};
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
    || value === 'message-approved'
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
  return {
    allowed: false,
    rail,
    status: 'blocked',
    settlement: 'not-executed',
    policy: {
      allowed: false,
      code,
      reason: reason ?? 'Polet confidential policy blocked this trade without revealing private thresholds.',
    },
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
    || code === 'INVALID_POLICY_WITNESS';
}

function isSupportedIkaSui(from: ChainAsset, to: ChainAsset): boolean {
  return from.chain === 'solana'
    && from.asset === 'USDC'
    && to.chain === 'sui'
    && to.asset === 'SUI';
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
    messageHash: signing?.messageDigest,
    messageApprovalAccount: signing?.messageApprovalPda,
    canonicalOrderHash: request?.canonicalOrderHash,
    cpiAuthority: signing?.cpiAuthorityPda,
    signatureScheme: signing?.signatureScheme,
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
