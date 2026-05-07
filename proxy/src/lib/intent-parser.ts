import type { ConfidentialDcaRunRequest } from './confidential-dca-execution';
import { JUPITER_SOL_MINT, JUPITER_USDC_MINT } from './jupiter-gateway';
import type {
  CustomParams,
  Intent,
  MultichainStrategyParams,
  PoletChain,
  PoletExecutionRail,
  PoletIntentAction,
  StakeParams,
  SwapParams,
  TransferParams,
} from '../types/intent';

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
  const validActions: PoletIntentAction[] = ['transfer', 'swap', 'stake', 'unstake', 'delegate', 'undelegate', 'custom', 'multichain-strategy'];
  if (!validActions.includes(obj.action as PoletIntentAction)) {
    throw new Error(`Invalid action: ${obj.action}. Must be one of: ${validActions.join(', ')}`);
  }

  // Validate params based on action type
  const action = obj.action as PoletIntentAction;
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
    case 'multichain-strategy':
      validateMultichainStrategyParams(params);
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
    action: obj.action as PoletIntentAction,
    params: obj.params as TransferParams | SwapParams | StakeParams | CustomParams | MultichainStrategyParams,
    timestamp: obj.timestamp,
    policyHash: obj.policyHash as string | undefined,
    policy: obj.policy as import('../types/intent').Policy | undefined,
  };
}

export function mapMultichainIntentToDcaRunRequest(intent: Intent): ConfidentialDcaRunRequest {
  if (intent.action !== 'multichain-strategy') {
    throw new Error('Intent action must be multichain-strategy');
  }

  const params = intent.params as MultichainStrategyParams;
  validateSupportedMultichainDca(params);

  return {
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    amountUsdc: params.amount,
    inputMint: params.sourceMint ?? JUPITER_USDC_MINT,
    outputMint: params.targetMint ?? JUPITER_SOL_MINT,
    ...(params.maskedWitnessDevFixture && { maskedWitnessDevFixture: params.maskedWitnessDevFixture }),
    ...(params.slippageBps !== undefined && { slippageBps: params.slippageBps }),
    ...(params.destinationTokenAccount && { destinationTokenAccount: params.destinationTokenAccount }),
    ...(params.nativeDestinationAccount && { nativeDestinationAccount: params.nativeDestinationAccount }),
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

function validateMultichainStrategyParams(params: Record<string, unknown>): void {
  if (!isPoletChain(params.sourceChain)) {
    throw new Error('Multichain params must have a valid sourceChain');
  }
  if (!params.sourceAsset || typeof params.sourceAsset !== 'string') {
    throw new Error('Multichain params must have a string sourceAsset');
  }
  if (params.sourceMint !== undefined && typeof params.sourceMint !== 'string') {
    throw new Error('Multichain params sourceMint must be a string');
  }
  if (!isPoletChain(params.targetChain)) {
    throw new Error('Multichain params must have a valid targetChain');
  }
  if (!params.targetAsset || typeof params.targetAsset !== 'string') {
    throw new Error('Multichain params must have a string targetAsset');
  }
  if (params.targetMint !== undefined && typeof params.targetMint !== 'string') {
    throw new Error('Multichain params targetMint must be a string');
  }
  if (!isPositiveAmount(params.amount)) {
    throw new Error('Multichain params must have a positive amount');
  }
  if (!isPoletExecutionRail(params.executionRail)) {
    throw new Error('Multichain params must have a valid executionRail');
  }
  if (params.strategy !== undefined && params.strategy !== 'dca' && params.strategy !== 'swap') {
    throw new Error('Multichain params strategy must be dca or swap');
  }
  if (params.slippageBps !== undefined && params.slippageBps !== null && (!Number.isInteger(params.slippageBps) || (params.slippageBps as number) < 0)) {
    throw new Error('Multichain params slippageBps must be a non-negative integer');
  }
  if (params.maskedWitnessDevFixture !== undefined && (!Array.isArray(params.maskedWitnessDevFixture) || params.maskedWitnessDevFixture.length !== 32)) {
    throw new Error('Multichain params maskedWitnessDevFixture must contain 32 bytes when provided');
  }
}

function validateSupportedMultichainDca(params: MultichainStrategyParams): void {
  const sourceAsset = params.sourceAsset.toUpperCase();
  const targetAsset = params.targetAsset.toUpperCase();
  const sourceMint = params.sourceMint ?? JUPITER_USDC_MINT;
  const targetMint = params.targetMint ?? JUPITER_SOL_MINT;

  if (
    params.sourceChain !== 'solana'
    || params.targetChain !== 'solana'
    || params.executionRail !== 'jupiter'
    || (params.strategy ?? 'dca') !== 'dca'
    || sourceAsset !== 'USDC'
    || targetAsset !== 'SOL'
    || sourceMint !== JUPITER_USDC_MINT
    || targetMint !== JUPITER_SOL_MINT
  ) {
    throw new Error('Unsupported multichain intent: only Solana USDC -> SOL on the Jupiter rail maps to the current confidential DCA path');
  }
}

function isPoletChain(value: unknown): value is PoletChain {
  return value === 'solana' || value === 'sui' || value === 'ethereum' || value === 'base';
}

function isPoletExecutionRail(value: unknown): value is PoletExecutionRail {
  return value === 'jupiter' || value === 'ika';
}

function isPositiveAmount(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value !== 'string') return false;
  return /^\d+(\.\d+)?$/.test(value) && Number(value) > 0;
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
    case 'multichain-strategy':
      return `${(intent.params as MultichainStrategyParams).targetChain}:${(intent.params as MultichainStrategyParams).targetAsset}`;
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
      return (intent.params as StakeParams).amount;
    case 'delegate':
    case 'undelegate':
      return (intent.params as { amount: number }).amount;
    case 'custom':
      return 0; // Custom txs don't have a standard amount
    case 'multichain-strategy': {
      const amount = (intent.params as MultichainStrategyParams).amount;
      return typeof amount === 'number' ? amount : Number(amount);
    }
    default:
      return 0;
  }
}
