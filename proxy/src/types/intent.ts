/**
 * Intent types for the Polet AI Policy Engine Proxy
 * These types represent the JSON interface that AI agents use to submit intents
 */
import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';

export type IntentAction = 'transfer' | 'swap' | 'stake' | 'unstake' | 'delegate' | 'undelegate' | 'custom';
export type StrategyIntentAction = 'multichain-strategy';
export type PoletIntentAction = IntentAction | StrategyIntentAction;
export type PoletChain = 'solana' | 'sui' | 'ethereum' | 'base';
export type PoletExecutionRail = 'jupiter' | 'ika';

export interface Intent {
  /** Unique intent identifier for tracking */
  id: string;
  /** Wallet owner pubkey (base58) */
  owner: string;
  /** Session key that is authorized to act on behalf of owner (base58) */
  sessionKey: string;
  /** Action type */
  action: PoletIntentAction;
  /** Action parameters - varies by action type */
  params: TransferParams | SwapParams | StakeParams | CustomParams | MultichainStrategyParams;
  /** Unix timestamp when intent was created */
  timestamp: number;
  /** Optional: policy hash to use for evaluation */
  policyHash?: string;
  /** Optional: policy object for demo/bypass */
  policy?: Policy;
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
  destinationTokenAccount?: string;
  nativeDestinationAccount?: string;
}

export interface TransferParams {
  /** Destination pubkey (base58) */
  destination: string;
  /** Amount in lamports or token smallest unit */
  amount: number;
  /** Token mint - null for SOL */
  mint?: string;
}

export interface SwapParams {
  /** Input token mint */
  inputMint: string;
  /** Output token mint */
  outputMint: string;
  /** Input amount */
  inputAmount: number;
  /** Minimum output amount (for slippage) */
  minOutputAmount: number;
}

export interface StakeParams {
  /** Validator vote pubkey */
  validator: string;
  /** Amount to stake */
  amount: number;
}

export interface UnstakeParams {
  /** Validator vote pubkey */
  validator: string;
  /** Amount to unstake */
  amount: number;
}

export interface DelegateParams {
  /** Target delegate pubkey */
  target: string;
  /** Amount */
  amount: number;
}

export interface UndelegateParams {
  /** Target delegate pubkey */
  target: string;
  /** Amount */
  amount: number;
}

export interface CustomParams {
  /** Program ID to interact with */
  programId: string;
  /** Instruction data encoded as base64 */
  instructionData: string;
  /** Accounts involved (array of base58 pubkeys) */
  accounts: string[];
}

export interface Policy {
  /** List of allowed destination pubkeys (base58) */
  allowlist: string[];
  /** List of blocked destination pubkeys (base58) */
  blocklist: string[];
  /** Maximum amount per transaction */
  maxAmount?: number;
  /** Maximum daily total */
  dailyLimit?: number;
  /** Allowed action types - empty means all allowed */
  allowedActions?: IntentAction[];
}

export interface IntentEvaluationResult {
  /** Whether the intent is allowed */
  allowed: boolean;
  /** Reason if blocked */
  reason?: string;
  /** Policy hash used for evaluation */
  policyHash?: string;
  /** Attestation data for on-chain verification */
  attestation?: Attestation;
}

export interface Attestation {
  /** Wallet owner pubkey */
  owner: string;
  /** Session key pubkey */
  sessionKey: string;
  /** Policy hash */
  policyHash: string;
  /** Intent hash */
  intentHash: string;
  /** Block hash to use for transaction */
  blockHash: string;
  /** Slot at time of attestation */
  slot: number;
  /** Unix timestamp */
  timestamp: number;
}

// On-chain account types (matching the smart contract)
export interface TemporalKeyAccount {
  key: PublicKey;
  expiresAt: BN;
  grantedSlot?: BN;
  authorized: boolean;
}

export interface ConfidentialNumericPolicyAccount {
  policyCommitment: number[] | Uint8Array;
  encryptionWitnessHash: number[] | Uint8Array;
  encryptedMaxPerRun: BN;
  encryptedDailyCap: BN;
  encryptedDailySpent: BN;
  spentDayIndex: BN;
  enabled: boolean;
}

export interface DemoTokenCustodyAccount {
  usdcMint: PublicKey;
  usdcTokenAccount: PublicKey;
  solMint: PublicKey;
  solTokenAccount: PublicKey;
  tokenProgram: PublicKey;
  configured: boolean;
}

export interface WalletAccount {
  owner: PublicKey;
  proxyPk: PublicKey;
  policyCommitment: number[] | Uint8Array;
  merkleRoot: number[] | Uint8Array;
  policySeq: BN;
  lastRevokedSlot: BN;
  confidentialPolicy: ConfidentialNumericPolicyAccount;
  demoCustody: DemoTokenCustodyAccount;
  sessions: TemporalKeyAccount[];
}
