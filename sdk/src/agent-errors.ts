/**
 * Structured Polet agent errors.
 *
 * Agent runtimes (Hermes, OpenClaw, Solana Agent Kit, LangChain, raw
 * function-calling clients) often prefer exceptions over result tuples for
 * terminal states. These classes wrap the same machine-readable codes that
 * `PoletExecutionResult` carries, so callers can choose either style:
 *
 *   // Result pattern (preferred for agents that want to branch on decision)
 *   const result = await agent.execute(input);
 *   if (result.status === 'policy-blocked') { ... }
 *
 *   // Throw pattern (preferred inside try/catch loops)
 *   const result = await agent.execute(input, { throwOnFailure: true });
 *
 * Every error carries a `code` (stable machine-readable key) and
 * `recoverable` hint so agents can decide whether to replan or abort.
 */

export type PoletAgentErrorCode =
  | 'POLICY_BLOCKED'
  | 'SESSION_REVOKED'
  | 'SESSION_REVOKED_MIDFLIGHT'
  | 'NEEDS_APPROVAL'
  | 'GAS_FLOOR_UNDERFUNDED'
  | 'LIFECYCLE_ERROR'
  | 'BROADCAST_FAILED'
  | 'BROADCAST_DISABLED'
  | 'SIGNER_REQUIRED'
  | 'SIMULATION_FAILED'
  | 'UNSUPPORTED_RAIL'
  | 'DWALLET_NOT_ENABLED'
  | 'MANAGED_FIXTURE_MISSING'
  | 'PROXY_UNREACHABLE';

export interface PoletAgentErrorInit {
  code: PoletAgentErrorCode;
  message: string;
  /** Whether replanning (e.g. smaller amount) might succeed. */
  recoverable?: boolean;
  /** Arbitrary diagnostic payload safe to include in agent reasoning. */
  details?: Record<string, unknown>;
  /** Original error from a lower-level call, if any. */
  cause?: unknown;
}

/**
 * Base class for all Polet agent errors. Prefer subclasses below for
 * specific failure categories.
 */
export class PoletAgentError extends Error {
  readonly code: PoletAgentErrorCode;
  readonly recoverable: boolean;
  readonly details: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(init: PoletAgentErrorInit) {
    super(init.message);
    this.name = 'PoletAgentError';
    this.code = init.code;
    this.recoverable = init.recoverable ?? false;
    this.details = init.details ?? {};
    if (init.cause !== undefined) this.cause = init.cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}

/** Confidential policy rejected the request (amount over cap, rail not allowed, etc). */
export class PoletPolicyBlockedError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'POLICY_BLOCKED', message, recoverable: true, details });
    this.name = 'PoletPolicyBlockedError';
  }
}

/** Session key was revoked before the request could be built. */
export class PoletSessionRevokedError extends PoletAgentError {
  constructor(message = 'Polet session has been revoked. Ask the owner to grant a new session key.', details: Record<string, unknown> = {}) {
    super({ code: 'SESSION_REVOKED', message, recoverable: false, details });
    this.name = 'PoletSessionRevokedError';
  }
}

/** Session key was revoked in the middle of lifecycle progression. */
export class PoletSessionRevokedMidflightError extends PoletAgentError {
  readonly revokePhase?: 'pre-presign' | 'pre-sign' | 'post-sign-pre-broadcast';

  constructor(message: string, revokePhase?: 'pre-presign' | 'pre-sign' | 'post-sign-pre-broadcast', details: Record<string, unknown> = {}) {
    super({ code: 'SESSION_REVOKED_MIDFLIGHT', message, recoverable: false, details: { ...details, revokePhase } });
    this.name = 'PoletSessionRevokedMidflightError';
    if (revokePhase) this.revokePhase = revokePhase;
  }
}

/** Shared multisig-lite quorum needs more approvers. */
export class PoletNeedsApprovalError extends PoletAgentError {
  readonly approvalsReceived: number;
  readonly approvalsRequired: number;

  constructor(message: string, approvalsReceived: number, approvalsRequired: number, details: Record<string, unknown> = {}) {
    super({
      code: 'NEEDS_APPROVAL',
      message,
      recoverable: true,
      details: { ...details, approvalsReceived, approvalsRequired },
    });
    this.name = 'PoletNeedsApprovalError';
    this.approvalsReceived = approvalsReceived;
    this.approvalsRequired = approvalsRequired;
  }
}

/** Ika GasDeposit PDA is under the configured IKA/SOL floor. */
export class PoletGasFloorError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'GAS_FLOOR_UNDERFUNDED', message, recoverable: true, details });
    this.name = 'PoletGasFloorError';
  }
}

/** Lifecycle (Presign/Sign/CommitSignature poll) failed. */
export class PoletLifecycleError extends PoletAgentError {
  readonly lifecycleCode?: string;

  constructor(message: string, lifecycleCode?: string, details: Record<string, unknown> = {}) {
    super({ code: 'LIFECYCLE_ERROR', message, recoverable: false, details: { ...details, lifecycleCode } });
    this.name = 'PoletLifecycleError';
    if (lifecycleCode) this.lifecycleCode = lifecycleCode;
  }
}

/** Destination chain broadcast failed. */
export class PoletBroadcastError extends PoletAgentError {
  readonly broadcastCode?: string;

  constructor(message: string, broadcastCode?: string, details: Record<string, unknown> = {}) {
    super({ code: 'BROADCAST_FAILED', message, recoverable: true, details: { ...details, broadcastCode } });
    this.name = 'PoletBroadcastError';
    if (broadcastCode) this.broadcastCode = broadcastCode;
  }
}

/** Broadcast is off (demo-disabled / disabled mode). */
export class PoletBroadcastDisabledError extends PoletAgentError {
  constructor(message = 'Polet destination broadcast is disabled in the current proxy configuration.', details: Record<string, unknown> = {}) {
    super({ code: 'BROADCAST_DISABLED', message, recoverable: false, details });
    this.name = 'PoletBroadcastDisabledError';
  }
}

/** Caller needs to wire an `agentSigner` (or missing signer coverage for a tx). */
export class PoletSignerRequiredError extends PoletAgentError {
  readonly requiredSigners: string[];
  readonly missingSigners: string[];

  constructor(message: string, requiredSigners: string[] = [], missingSigners: string[] = [], details: Record<string, unknown> = {}) {
    super({ code: 'SIGNER_REQUIRED', message, recoverable: false, details: { ...details, requiredSigners, missingSigners } });
    this.name = 'PoletSignerRequiredError';
    this.requiredSigners = requiredSigners;
    this.missingSigners = missingSigners;
  }
}

/** Simulation rejected the transaction before broadcast. */
export class PoletSimulationError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'SIMULATION_FAILED', message, recoverable: true, details });
    this.name = 'PoletSimulationError';
  }
}

/** Rail/chain combination is not supported by the current Polet build. */
export class PoletUnsupportedRailError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'UNSUPPORTED_RAIL', message, recoverable: false, details });
    this.name = 'PoletUnsupportedRailError';
  }
}

/** Owner has not enabled the requested chain's dWallet yet. */
export class PoletDwalletNotEnabledError extends PoletAgentError {
  constructor(chain: string, message?: string, details: Record<string, unknown> = {}) {
    super({
      code: 'DWALLET_NOT_ENABLED',
      message: message ?? `No dWallet registered for chain ${chain}. Run /ika/enable-chain or the managed setup first.`,
      recoverable: false,
      details: { ...details, chain },
    });
    this.name = 'PoletDwalletNotEnabledError';
  }
}

/** Managed demo fixture file is not present on the proxy host. */
export class PoletManagedFixtureMissingError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'MANAGED_FIXTURE_MISSING', message, recoverable: false, details });
    this.name = 'PoletManagedFixtureMissingError';
  }
}

/** Proxy unreachable / HTTP errors talking to Polet proxy. */
export class PoletProxyUnreachableError extends PoletAgentError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super({ code: 'PROXY_UNREACHABLE', message, recoverable: true, details });
    this.name = 'PoletProxyUnreachableError';
  }
}

/** Utility: coerce any thrown value into a `PoletAgentError`. */
export function toPoletAgentError(error: unknown): PoletAgentError {
  if (error instanceof PoletAgentError) return error;
  if (error instanceof Error) {
    return new PoletAgentError({
      code: 'LIFECYCLE_ERROR',
      message: error.message,
      recoverable: false,
      cause: error,
    });
  }
  return new PoletAgentError({
    code: 'LIFECYCLE_ERROR',
    message: typeof error === 'string' ? error : 'Unknown Polet agent error',
    recoverable: false,
    cause: error,
  });
}
