import {
  currentDayIndex,
  evaluateConfidentialNumericPolicy,
} from './confidential-numeric-policy';
import {
  evaluateOfficialEncryptPolicyLifecycle,
  hasOfficialEncryptPolicy,
  type OfficialEncryptPolicyExecution,
  type OfficialEncryptPolicyResolver,
} from './official-encrypt-policy';
import {
  getWalletData,
  type WalletData,
} from './wallet-store';

export type GuardedStrategyBlockedCode =
  | 'SESSION_NOT_AUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'SESSION_STALE'
  | 'POLICY_NOT_CONFIGURED'
  | 'INVALID_POLICY_WITNESS'
  | 'CONFIDENTIAL_POLICY_BLOCKED'
  | 'ENCRYPT_POLICY_PENDING'
  | 'ENCRYPT_POLICY_VERIFIED_BLOCKED'
  | 'TOKEN_CUSTODY_NOT_CONFIGURED';

export interface GuardedStrategyBlocked<TPrepared = unknown> {
  allowed: false;
  code: GuardedStrategyBlockedCode;
  reason: string;
  prepared?: TPrepared;
  encryptPolicy?: OfficialEncryptPolicyExecution;
}

export interface GuardedStrategyAllowed<TPayload> {
  allowed: true;
  payload: TPayload;
}

export type GuardedStrategyDecision<TPayload, TPrepared = unknown> =
  | GuardedStrategyAllowed<TPayload>
  | GuardedStrategyBlocked<TPrepared>;

export interface GuardedStrategyContext<TPrepared = undefined> {
  wallet: WalletData;
  owner: string;
  sessionKey: string;
  amountBaseUnits: bigint;
  maskedWitnessDevFixture?: number[];
  encryptPolicy?: OfficialEncryptPolicyExecution;
  prepared: TPrepared;
}

export interface ExecuteGuardedStrategyRequest<TPrepared, TPayload> {
  owner: string;
  sessionKey: string;
  amountBaseUnits: bigint;
  maskedWitnessDevFixture?: number[];
  blockedReason: string;
  requireDemoCustody?: boolean;
  prepare?: (context: GuardedStrategyContext) => Promise<TPrepared>;
  buildAllowed: (context: GuardedStrategyContext<TPrepared>) => Promise<TPayload>;
}

export interface StrategyExecutionDeps {
  getWalletData?: (owner: string) => Promise<WalletData | null>;
  nowSeconds?: () => number;
  todayIndex?: () => number;
  resolveEncryptPolicyExecution?: OfficialEncryptPolicyResolver;
}

export class StrategyExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'StrategyExecutionError';
  }
}

export async function executeGuardedStrategy<TPrepared, TPayload>(
  request: ExecuteGuardedStrategyRequest<TPrepared, TPayload>,
  deps: StrategyExecutionDeps = {}
): Promise<GuardedStrategyDecision<TPayload, TPrepared>> {
  const wallet = await (deps.getWalletData ?? getWalletData)(request.owner);
  if (!wallet) {
    throw new StrategyExecutionError('Wallet not found', 'WALLET_NOT_FOUND', 404);
  }

  const sessionResult = validateSession(
    wallet,
    request.sessionKey,
    deps.nowSeconds?.() ?? Math.floor(Date.now() / 1000)
  );
  if (!sessionResult.allowed) return sessionResult;

  if (request.requireDemoCustody && !wallet.demoCustody.configured) {
    return {
      allowed: false,
      code: 'TOKEN_CUSTODY_NOT_CONFIGURED',
      reason: 'Smart wallet demo custody is not configured.',
    };
  }

  const baseContext: GuardedStrategyContext = {
    wallet,
    owner: request.owner,
    sessionKey: request.sessionKey,
    amountBaseUnits: request.amountBaseUnits,
    maskedWitnessDevFixture: request.maskedWitnessDevFixture,
    encryptPolicy: undefined,
    prepared: undefined,
  };
  const prepared = request.prepare ? await request.prepare(baseContext) : undefined;

  if (hasOfficialEncryptPolicy(wallet)) {
    const encryptPolicy = await evaluateOfficialEncryptPolicyLifecycle(
      {
        wallet,
        owner: request.owner,
        sessionKey: request.sessionKey,
        amountBaseUnits: request.amountBaseUnits,
      },
      deps.resolveEncryptPolicyExecution
    );

    if (encryptPolicy.status === 'pending-encrypt-execution') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_PENDING',
        reason: 'Encrypt policy graph execution is pending verification.',
        encryptPolicy,
        ...(prepared !== undefined && { prepared }),
      };
    }

    if (encryptPolicy.status === 'encrypt-verified-blocked') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_VERIFIED_BLOCKED',
        reason: request.blockedReason,
        encryptPolicy,
        ...(prepared !== undefined && { prepared }),
      };
    }

    return {
      allowed: true,
      payload: await request.buildAllowed({
        ...baseContext,
        encryptPolicy,
        prepared: prepared as TPrepared,
      }),
    };
  }

  const context: GuardedStrategyContext<TPrepared> = {
    ...baseContext,
    prepared: prepared as TPrepared,
  };

  const policyResult = evaluateConfidentialNumericPolicy(
    wallet,
    request.amountBaseUnits,
    requireMaskedWitnessDevFixture(request.maskedWitnessDevFixture),
    deps.todayIndex?.() ?? currentDayIndex(),
    { blockedReason: request.blockedReason }
  );
  if (!policyResult.allowed) {
    return {
      ...policyResult,
      ...(prepared !== undefined && { prepared }),
    };
  }

  return {
    allowed: true,
    payload: await request.buildAllowed(context),
  };
}

function requireMaskedWitnessDevFixture(maskedWitnessDevFixture: number[] | undefined): number[] {
  if (!Array.isArray(maskedWitnessDevFixture) || maskedWitnessDevFixture.length !== 32) {
    throw new StrategyExecutionError(
      'maskedWitnessDevFixture must be exactly 32 bytes for legacy masked-witness execution. (This is a dev fixture only)',
      'INVALID_POLICY_WITNESS'
    );
  }
  return maskedWitnessDevFixture;
}

function validateSession(wallet: WalletData, sessionKey: string, now: number): GuardedStrategyBlocked | { allowed: true } {
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
