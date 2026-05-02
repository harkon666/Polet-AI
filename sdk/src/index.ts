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

// Intent action types
export type IntentAction = 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';

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
export function isValidIntent(intent: unknown): intent is Intent {
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
  if (!VALID_ACTIONS.includes(obj.action as IntentAction)) return false;

  // Check params is an object
  if (!obj.params || typeof obj.params !== 'object') return false;

  // Check timestamp is a number
  if (typeof obj.timestamp !== 'number') return false;

  return true;
}

/**
 * Get the amount from an intent in lamports
 */
export function getIntentAmount(intent: Intent): number {
  const params = intent.params as Record<string, unknown>;

  switch (intent.action) {
    case 'transfer':
      return (params as TransferParams).amount;
    case 'swap':
      return (params as SwapParams).inputAmount;
    case 'stake':
    case 'unstake':
      return (params as StakeParams).amount;
    case 'delegate':
    case 'undelegate':
      return (params as DelegateParams).amount;
    default:
      return 0;
  }
}

/**
 * Get the destination (where funds are going) from an intent
 */
export function getIntentDestination(intent: Intent): string | null {
  const params = intent.params as Record<string, unknown>;

  switch (intent.action) {
    case 'transfer':
      return (params as TransferParams).destination;
    case 'swap':
      return (params as SwapParams).outputMint;
    case 'stake':
    case 'unstake':
      return (params as StakeParams).validator;
    case 'delegate':
    case 'undelegate':
      return (params as DelegateParams).target;
    case 'custom':
      return (params as CustomParams).programId;
    default:
      return null;
  }
}