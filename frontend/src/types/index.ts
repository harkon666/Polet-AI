/**
 * Polet AI Frontend Types
 * Type definitions matching the SDK and proxy types
 */

export type IntentAction = 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';

export interface TransferParams {
  destination: string;
  amount: number;
  mint?: string;
}

export interface SwapParams {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  minOutputAmount: number;
}

export interface StakeParams {
  validator: string;
  amount: number;
}

export interface UnstakeParams {
  validator: string;
  amount: number;
}

export interface DelegateParams {
  target: string;
  amount: number;
}

export interface UndelegateParams {
  target: string;
  amount: number;
}

export interface CustomParams {
  programId: string;
  instructionData: string;
  accounts: string[];
}

export interface Intent {
  id: string;
  owner: string;
  sessionKey: string;
  action: IntentAction;
  params: TransferParams | SwapParams | StakeParams | UnstakeParams | DelegateParams | UndelegateParams | CustomParams;
  timestamp: number;
  policyHash?: string;
  /** Full policy object for demo/testing - not part of production SDK */
  policy?: Policy;
}

export interface Policy {
  allowlist: string[];
  blocklist: string[];
  maxAmount?: number;
  dailyLimit?: number;
  allowedActions?: IntentAction[];
}

export interface IntentEvaluationResult {
  allowed: boolean;
  reason?: string;
  code?: string;
  policyHash?: string;
  attestation?: Attestation;
}

export interface Attestation {
  owner: string;
  sessionKey: string;
  policyHash: string;
  intentHash: string;
  blockHash: string;
  slot: number;
  timestamp: number;
}

export type TemplateId = 'whitelist-only' | 'daily-limit' | 'gambling-block' | 'enterprise-control';

export interface PolicyTemplate {
  id: TemplateId;
  name: string;
  description: string;
  useCase: string;
  policy: Policy;
  options?: TemplateOption[];
}

export interface TemplateOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'array';
  default?: unknown;
  description?: string;
}

export interface CreatePolicyOptions {
  customAllowlist?: string[];
  customBlocklist?: string[];
  dailyLimitAmount?: number;
  maxTransactionAmount?: number;
}

// Wallet state from on-chain
export interface WalletState {
  owner: string;
  policyHash: string;
  policyData: Uint8Array;
  dailySpent: number;
  lastReset: number;
  dailyLimit: number;
  temporalKeys: TemporalKeyState[];
}

export interface TemporalKeyState {
  key: string;
  expiresAt: number;
  authorized: boolean;
  dailyLimit: number;
  dailySpent: number;
  lastReset: number;
}
