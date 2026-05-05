import { createHash } from 'crypto';
import { deriveWalletPda } from './confidential-dca-execution';
import {
  getWalletData,
  type WalletData,
} from './wallet-store';
import type { Intent, MultichainStrategyParams, PoletChain } from '../types/intent';

const USDC_DECIMALS = 6;

export interface IkaBridgelessExecutionRequest {
  executionRail: 'ika-bridgeless';
  settlement: 'not-executed';
  requestId: string;
  source: {
    chain: PoletChain;
    asset: string;
    mint?: string;
  };
  target: {
    chain: PoletChain;
    asset: string;
    mint?: string;
  };
  amount: string;
  amountBaseUnits: string;
  routeIntent: {
    strategy: 'dca' | 'swap';
    slippageBps?: number;
    bridgeMode: 'bridgeless';
  };
  sessionContext: {
    owner: string;
    sessionKey: string;
    smartWalletAuthority: string;
    policySequence: number;
  };
  policyAttestation: {
    status: 'approved';
    policySequence: number;
    policyCommitment: number[];
    attestationHash: string;
  };
  executionBoundary: {
    status: 'request-prepared';
    note: string;
  };
}

export interface IkaBridgelessAllowed {
  allowed: true;
  code: 'IKA_BRIDGELESS_REQUEST_READY';
  ikaRequest: IkaBridgelessExecutionRequest;
}

export interface IkaBridgelessBlocked {
  allowed: false;
  code:
    | 'SESSION_NOT_AUTHORIZED'
    | 'SESSION_EXPIRED'
    | 'SESSION_STALE'
    | 'POLICY_NOT_CONFIGURED'
    | 'INVALID_POLICY_WITNESS'
    | 'CONFIDENTIAL_POLICY_BLOCKED';
  reason: string;
}

export type IkaBridgelessResult = IkaBridgelessAllowed | IkaBridgelessBlocked;

export interface IkaBridgelessDeps {
  getWalletData?: (owner: string) => Promise<WalletData | null>;
  nowSeconds?: () => number;
  todayIndex?: () => number;
}

export class IkaBridgelessRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'IkaBridgelessRequestError';
  }
}

export async function createIkaBridgelessExecutionRequest(
  intent: Intent,
  deps: IkaBridgelessDeps = {}
): Promise<IkaBridgelessResult> {
  if (intent.action !== 'multichain-strategy') {
    throw new IkaBridgelessRequestError('Intent action must be multichain-strategy', 'INVALID_IKA_INTENT');
  }

  const params = intent.params as MultichainStrategyParams;
  if (params.executionRail !== 'ika') {
    throw new IkaBridgelessRequestError('Ika request requires executionRail ika', 'INVALID_IKA_INTENT');
  }

  const wallet = await (deps.getWalletData ?? getWalletData)(intent.owner);
  if (!wallet) {
    throw new IkaBridgelessRequestError('Wallet not found', 'WALLET_NOT_FOUND', 404);
  }

  const sessionResult = validateSession(wallet, intent.sessionKey, deps.nowSeconds?.() ?? Math.floor(Date.now() / 1000));
  if (!sessionResult.allowed) return sessionResult;

  const amountBaseUnits = parsePolicyAmount(params.amount);
  const policyResult = evaluateConfidentialPolicy(
    wallet,
    amountBaseUnits,
    Uint8Array.from(params.encryptionWitness),
    deps.todayIndex?.() ?? currentDayIndex()
  );
  if (!policyResult.allowed) return policyResult;

  const amount = params.amount.toString();
  const smartWalletAuthority = wallet.walletPda || deriveWalletPda(intent.owner);
  const attestationHash = hashIkaAttestation({
    intentId: intent.id,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policySequence: wallet.policySeq,
    sourceChain: params.sourceChain,
    sourceAsset: params.sourceAsset,
    targetChain: params.targetChain,
    targetAsset: params.targetAsset,
    amount,
  });

  return {
    allowed: true,
    code: 'IKA_BRIDGELESS_REQUEST_READY',
    ikaRequest: {
      executionRail: 'ika-bridgeless',
      settlement: 'not-executed',
      requestId: `ika-${attestationHash.slice(0, 24)}`,
      source: {
        chain: params.sourceChain,
        asset: params.sourceAsset,
        ...(params.sourceMint && { mint: params.sourceMint }),
      },
      target: {
        chain: params.targetChain,
        asset: params.targetAsset,
        ...(params.targetMint && { mint: params.targetMint }),
      },
      amount,
      amountBaseUnits: amountBaseUnits.toString(),
      routeIntent: {
        strategy: params.strategy ?? 'dca',
        ...(params.slippageBps !== undefined && { slippageBps: params.slippageBps }),
        bridgeMode: 'bridgeless',
      },
      sessionContext: {
        owner: intent.owner,
        sessionKey: intent.sessionKey,
        smartWalletAuthority,
        policySequence: wallet.policySeq,
      },
      policyAttestation: {
        status: 'approved',
        policySequence: wallet.policySeq,
        policyCommitment: wallet.confidentialPolicy.policyCommitment,
        attestationHash,
      },
      executionBoundary: {
        status: 'request-prepared',
        note: 'Ika settlement is not executed by this demo slice; this envelope is prepared for a future verified Ika backend.',
      },
    },
  };
}

function validateSession(wallet: WalletData, sessionKey: string, now: number): IkaBridgelessBlocked | { allowed: true } {
  const session = wallet.sessions.find((candidate) => candidate.key === sessionKey);
  if (!session || !session.authorized) {
    return {
      allowed: false,
      code: 'SESSION_NOT_AUTHORIZED',
      reason: 'Session key is not authorized for this wallet.',
    };
  }
  if (session.expiresAt <= now) {
    return {
      allowed: false,
      code: 'SESSION_EXPIRED',
      reason: 'Session key has expired.',
    };
  }
  if (session.grantedSlot < wallet.lastRevokedSlot) {
    return {
      allowed: false,
      code: 'SESSION_STALE',
      reason: 'Session key predates the latest wallet kill switch.',
    };
  }

  return { allowed: true };
}

function evaluateConfidentialPolicy(
  wallet: WalletData,
  amount: bigint,
  witness: Uint8Array,
  today: number
): IkaBridgelessBlocked | { allowed: true } {
  const policy = wallet.confidentialPolicy;
  if (!policy.enabled) {
    return {
      allowed: false,
      code: 'POLICY_NOT_CONFIGURED',
      reason: 'Confidential policy is not configured.',
    };
  }

  const witnessHash = Array.from(createHash('sha256').update(witness).digest());
  if (!byteArraysEqual(witnessHash, policy.encryptionWitnessHash)) {
    return {
      allowed: false,
      code: 'INVALID_POLICY_WITNESS',
      reason: 'Confidential policy witness was rejected.',
    };
  }

  const maxPerRun = decryptAmount(policy.encryptedMaxPerRun, witness);
  const dailyCap = decryptAmount(policy.encryptedDailyCap, witness);
  const dailySpent = policy.spentDayIndex === today
    ? decryptAmount(policy.encryptedDailySpent, witness)
    : 0n;

  if (amount > maxPerRun || dailySpent + amount > dailyCap) {
    return {
      allowed: false,
      code: 'CONFIDENTIAL_POLICY_BLOCKED',
      reason: 'Confidential policy blocked this bridgeless request.',
    };
  }

  return { allowed: true };
}

function parsePolicyAmount(value: number | string): bigint {
  const raw = value.toString();
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new IkaBridgelessRequestError('amount must be a positive amount with up to 6 decimals', 'INVALID_IKA_INTENT');
  }
  const [whole, fraction = ''] = raw.split('.');
  const baseUnits = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(USDC_DECIMALS, '0'));
  if (baseUnits <= 0n) {
    throw new IkaBridgelessRequestError('amount must be positive', 'INVALID_IKA_INTENT');
  }
  return baseUnits;
}

function decryptAmount(encrypted: bigint | string | number, witness: Uint8Array): bigint {
  return BigInt(encrypted) ^ witnessMask(witness);
}

function witnessMask(witness: Uint8Array): bigint {
  let value = 0n;
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(witness[index]);
  }
  return value;
}

function byteArraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function currentDayIndex(): number {
  return Math.floor(Math.floor(Date.now() / 1000) / 86_400);
}

function hashIkaAttestation(value: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}
