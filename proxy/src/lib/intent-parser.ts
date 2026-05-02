import type { Intent, TransferParams, SwapParams, StakeParams, CustomParams, IntentAction } from './intent.js';

/**
 * Parse and validate an intent JSON payload
 */
export function parseIntent(payload: unknown): Intent {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Intent payload must be an object');
  }

  const obj = payload as Record<string, unknown>;

  // Validate required fields
  if (!obj.id || typeof obj.id !== 'string') {
    throw new Error('Intent must have a string id');
  }
  if (!obj.owner || typeof obj.owner !== 'string') {
    throw new Error('Intent must have a string owner');
  }
  if (!obj.sessionKey || typeof obj.sessionKey !== 'string') {
    throw new Error('Intent must have a string sessionKey');
  }
  if (!obj.action || typeof obj.action !== 'string') {
    throw new Error('Intent must have a string action');
  }
  if (!obj.params || typeof obj.params !== 'object') {
    throw new Error('Intent must have a params object');
  }
  if (typeof obj.timestamp !== 'number') {
    throw new Error('Intent must have a number timestamp');
  }

  // Validate action type
  const validActions: IntentAction[] = ['transfer', 'swap', 'stake', 'unstake', 'delegate', 'undelegate', 'custom'];
  if (!validActions.includes(obj.action as IntentAction)) {
    throw new Error(`Invalid action: ${obj.action}. Must be one of: ${validActions.join(', ')}`);
  }

  // Validate params based on action type
  const action = obj.action as IntentAction;
  const params = obj.params as Record<string, unknown>;

  switch (action) {
    case 'transfer':
      validateTransferParams(params);
      break;
    case 'swap':
      validateSwapParams(params);
      break;
    case 'stake':
      validateStakeParams(params);
      break;
    case 'custom':
      validateCustomParams(params);
      break;
    default:
      // For other actions, just validate basic structure
      if (!params || typeof params !== 'object') {
        throw new Error('Params must be an object');
      }
  }

  return {
    id: obj.id,
    owner: obj.owner,
    sessionKey: obj.sessionKey,
    action: obj.action as IntentAction,
    params: obj.params as TransferParams | SwapParams | StakeParams | CustomParams,
    timestamp: obj.timestamp,
    policyHash: obj.policyHash as string | undefined,
  };
}

function validateTransferParams(params: Record<string, unknown>): void {
  if (!params.destination || typeof params.destination !== 'string') {
    throw new Error('Transfer params must have a string destination');
  }
  if (typeof params.amount !== 'number' || params.amount <= 0) {
    throw new Error('Transfer params must have a positive number amount');
  }
}

function validateSwapParams(params: Record<string, unknown>): void {
  if (!params.inputMint || typeof params.inputMint !== 'string') {
    throw new Error('Swap params must have a string inputMint');
  }
  if (!params.outputMint || typeof params.outputMint !== 'string') {
    throw new Error('Swap params must have a string outputMint');
  }
  if (typeof params.inputAmount !== 'number' || params.inputAmount <= 0) {
    throw new Error('Swap params must have a positive number inputAmount');
  }
  if (typeof params.minOutputAmount !== 'number' || params.minOutputAmount <= 0) {
    throw new Error('Swap params must have a positive number minOutputAmount');
  }
}

function validateStakeParams(params: Record<string, unknown>): void {
  if (!params.validator || typeof params.validator !== 'string') {
    throw new Error('Stake params must have a string validator');
  }
  if (typeof params.amount !== 'number' || params.amount <= 0) {
    throw new Error('Stake params must have a positive number amount');
  }
}

function validateCustomParams(params: Record<string, unknown>): void {
  if (!params.programId || typeof params.programId !== 'string') {
    throw new Error('Custom params must have a string programId');
  }
  if (!params.instructionData || typeof params.instructionData !== 'string') {
    throw new Error('Custom params must have a string instructionData');
  }
  if (!Array.isArray(params.accounts)) {
    throw new Error('Custom params must have an accounts array');
  }
}

/**
 * Determine the action type from an intent
 */
export function getActionDestination(intent: Intent): string | null {
  switch (intent.action) {
    case 'transfer':
      return (intent.params as TransferParams).destination;
    case 'swap':
      return (intent.params as SwapParams).outputMint;
    case 'stake':
      return (intent.params as StakeParams).validator;
    case 'custom':
      return (intent.params as CustomParams).programId;
    default:
      return null;
  }
}

/**
 * Get the amount from an intent
 */
export function getIntentAmount(intent: Intent): number {
  switch (intent.action) {
    case 'transfer':
      return (intent.params as TransferParams).amount;
    case 'swap':
      return (intent.params as SwapParams).inputAmount;
    case 'stake':
      return (intent.params as StakeParams).amount;
    case 'unstake':
      return (intent.params as { amount: number }).amount;
    case 'delegate':
      return (intent.params as { target: string; amount: number }).amount;
    case 'undelegate':
      return (intent.params as { target: string; amount: number }).amount;
    case 'custom':
      return 0; // Custom txs don't have a standard amount
    default:
      return 0;
  }
}