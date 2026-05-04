/**
 * Polet AI SDK - Intent JSON Builder
 *
 * This SDK provides a simple interface for AI agents to create intent payloads
 * that are submitted to the Polet AI Policy Engine Proxy.
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
 * // Submit to proxy
 * const response = await fetch('https://proxy.polet.ai/intent/evaluate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(intent),
 * });
 * ```
 */

export const JUPITER_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const JUPITER_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Intent action types
export type IntentAction = 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';
export type StrategyIntentAction = 'dca';

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

export type PoletIntent = Intent | DcaIntent;

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
  if (obj.action !== 'dca' && !VALID_ACTIONS.includes(obj.action as IntentAction)) return false;

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
  return requestProxy<TResponse>('/intent/evaluate', intent, options);
}

export async function submitIntent<TResponse = unknown>(
  intent: PoletIntent,
  options: SubmitIntentOptions
): Promise<TResponse> {
  if (intent.action === 'dca') {
    return requestProxy<TResponse>('/intent/dca/run', toDcaRunRequest(intent), options);
  }

  const mode = options.mode ?? 'execute';
  return requestProxy<TResponse>(mode === 'evaluate' ? '/intent/evaluate' : '/intent/execute', intent, options);
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
  type LocalAgentRuntimeConfig,
  type ProxyEnvelope,
  type RunDcaScenarioInput,
} from './local-agent-runtime.js';
