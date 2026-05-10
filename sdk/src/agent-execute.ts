/**
 * Unified `agent.execute()` orchestrator.
 *
 * Wraps `trade()` → (if Ika rail) sign Polet approval tx via the configured
 * agent signer → `progressIkaLifecycle()` → destination broadcast into a
 * single call that returns a machine-readable discriminated union. Agents
 * can switch on `result.status` to decide whether to replan, abort, or
 * celebrate the executed swap.
 *
 *   const result = await agent.execute({ from: 'USDC', to: 'SUI', amount: 5 });
 *   switch (result.status) {
 *     case 'executed':
 *       console.log('Sui tx', result.destinationTxHash, result.destinationExplorerUrl);
 *       break;
 *     case 'policy-blocked':
 *       // agent replans with smaller amount
 *       break;
 *     case 'session-revoked-midflight':
 *       // abort; owner revoked us
 *       break;
 *     ...
 *   }
 */

import { Connection, type Signer } from '@solana/web3.js';
import type {
  IkaAgentProof,
  PoletAgent,
  PoletAgentKitOptions,
  PoletExecutionRail,
  PoletTradeInput,
  PoletTradeResult,
  PoletIkaLifecycleOutcome,
  PoletSignAndSendInput,
  PoletSignAndSendResult,
  RedactedPoletIntent,
  SharedIkaApprovalProgress,
  SimulatePoletTransactionInput,
  SimulatePoletTransactionResult,
} from './index.js';
import {
  PoletAgentError,
  PoletBroadcastDisabledError,
  PoletBroadcastError,
  PoletDwalletNotEnabledError,
  PoletGasFloorError,
  PoletLifecycleError,
  PoletNeedsApprovalError,
  PoletPolicyBlockedError,
  PoletSessionRevokedError,
  PoletSessionRevokedMidflightError,
  PoletSignerRequiredError,
  PoletUnsupportedRailError,
  toPoletAgentError,
} from './agent-errors.js';

// ---------- Result types ----------

export type PoletExecutionStatus =
  | 'executed'
  | 'executed-preview'
  | 'policy-blocked'
  | 'session-revoked'
  | 'session-revoked-midflight'
  | 'needs-approval'
  | 'gas-floor-underfunded'
  | 'signer-required'
  | 'lifecycle-error'
  | 'broadcast-disabled'
  | 'broadcast-failed'
  | 'unsupported-rail';

interface PoletExecutionBase {
  ok: boolean;
  rail: PoletExecutionRail | 'unknown';
  trade: PoletTradeResult;
  /** Human-readable one-liner safe to show in agent transcripts. */
  message: string;
}

export interface PoletExecutionExecuted extends PoletExecutionBase {
  status: 'executed';
  ok: true;
  rail: 'ika';
  destinationChain: string;
  destinationTxHash: string;
  destinationExplorerUrl: string;
  /** 64-byte Ika-produced signature, hex-encoded. */
  signatureHex: string;
  messageApprovalPda: string;
  /** On-chain Polet approval tx on Solana devnet. */
  approvalTxSignature: string;
  lifecycle: PoletIkaLifecycleOutcome;
  proof?: IkaAgentProof;
}

export interface PoletExecutionExecutedPreview extends PoletExecutionBase {
  status: 'executed-preview';
  ok: true;
  rail: 'jupiter';
  /**
   * Jupiter rail currently returns a route/build preview rather than a
   * submitted on-chain swap. Agents can treat this as "allowed, preview
   * ready — session signer needed for final submission" depending on proxy
   * configuration.
   */
  execution: NonNullable<PoletTradeResult['execution']>;
}

export interface PoletExecutionBlocked extends PoletExecutionBase {
  status: 'policy-blocked';
  ok: false;
  code?: string;
  reason: string;
  /** True if an agent retry with a smaller amount would plausibly succeed. */
  recoverable: true;
}

export interface PoletExecutionSessionRevoked extends PoletExecutionBase {
  status: 'session-revoked';
  ok: false;
  reason: string;
}

export interface PoletExecutionSessionRevokedMidflight extends PoletExecutionBase {
  status: 'session-revoked-midflight';
  ok: false;
  revokePhase?: 'pre-presign' | 'pre-sign' | 'post-sign-pre-broadcast';
  reason: string;
  lifecycle?: PoletIkaLifecycleOutcome;
}

export interface PoletExecutionNeedsApproval extends PoletExecutionBase {
  status: 'needs-approval';
  ok: false;
  recoverable: true;
  approval: SharedIkaApprovalProgress;
  reason: string;
}

export interface PoletExecutionGasFloor extends PoletExecutionBase {
  status: 'gas-floor-underfunded';
  ok: false;
  recoverable: true;
  reason: string;
}

export interface PoletExecutionSignerRequired extends PoletExecutionBase {
  status: 'signer-required';
  ok: false;
  requiredSigners: string[];
  missingSigners: string[];
  reason: string;
}

export interface PoletExecutionLifecycleError extends PoletExecutionBase {
  status: 'lifecycle-error';
  ok: false;
  code?: string;
  reason: string;
  lifecycle?: PoletIkaLifecycleOutcome;
}

export interface PoletExecutionBroadcastDisabled extends PoletExecutionBase {
  status: 'broadcast-disabled';
  ok: true;
  rail: 'ika';
  /** Lifecycle completed (signature committed) but broadcast was off. */
  signatureHex: string;
  messageApprovalPda: string;
  approvalTxSignature: string;
  lifecycle: PoletIkaLifecycleOutcome;
  reason: string;
}

export interface PoletExecutionBroadcastFailed extends PoletExecutionBase {
  status: 'broadcast-failed';
  ok: false;
  code?: string;
  reason: string;
  signatureHex?: string;
  lifecycle?: PoletIkaLifecycleOutcome;
}

export interface PoletExecutionUnsupportedRail extends PoletExecutionBase {
  status: 'unsupported-rail';
  ok: false;
  rail: 'unknown';
  reason: string;
}

export type PoletExecutionResult =
  | PoletExecutionExecuted
  | PoletExecutionExecutedPreview
  | PoletExecutionBlocked
  | PoletExecutionSessionRevoked
  | PoletExecutionSessionRevokedMidflight
  | PoletExecutionNeedsApproval
  | PoletExecutionGasFloor
  | PoletExecutionSignerRequired
  | PoletExecutionLifecycleError
  | PoletExecutionBroadcastDisabled
  | PoletExecutionBroadcastFailed
  | PoletExecutionUnsupportedRail;

// ---------- Inputs ----------

export interface PoletExecuteOptions {
  /** If true, throw a `PoletAgentError` subclass on failure paths instead of returning the result. */
  throwOnFailure?: boolean;
  /** Override the approval-tx RPC commitment. Defaults to `confirmed`. */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** Injected connection for tests; when absent the kit creates one from `options.rpcUrl`. */
  connection?: Connection;
  /** Injected fetch for tests. */
  fetch?: typeof fetch;
  /** When true (default), automatically run the Encrypt policy-graph preflight if the first trade attempt is blocked with reason "graph must be executed". */
  autoEncryptPreflight?: boolean;
  /** Maximum number of automatic preflight retries. Default 1. */
  maxEncryptPreflightRetries?: number;
}

export interface PoletExecuteDeps {
  agent: Pick<PoletAgent, 'trade' | 'progressIkaLifecycle'>;
  signAndSendTransaction: (input: PoletSignAndSendInput) => Promise<PoletSignAndSendResult>;
  simulateTransaction?: (input: SimulatePoletTransactionInput) => Promise<SimulatePoletTransactionResult>;
  kitOptions: PoletAgentKitOptions;
  resolveAgentSigner?: () => Promise<Signer | undefined>;
}

// ---------- Executor ----------

export async function executePoletTrade(
  input: PoletTradeInput,
  deps: PoletExecuteDeps,
  options: PoletExecuteOptions = {}
): Promise<PoletExecutionResult> {
  const maxRetries = options.maxEncryptPreflightRetries ?? 1;
  return executeWithEncryptRetry(input, deps, options, maxRetries);
}

async function executeWithEncryptRetry(
  input: PoletTradeInput,
  deps: PoletExecuteDeps,
  options: PoletExecuteOptions,
  retriesLeft: number
): Promise<PoletExecutionResult> {
  let trade: PoletTradeResult;
  try {
    trade = await deps.agent.trade(input);
  } catch (error) {
    const wrapped = toPoletAgentError(error);
    if (options.throwOnFailure) throw wrapped;
    return {
      status: 'lifecycle-error',
      ok: false,
      rail: rail(input),
      trade: errorTrade(input, wrapped.message),
      message: wrapped.message,
      reason: wrapped.message,
    };
  }

  // Auto-run Encrypt policy-graph preflight if proxy says we must.
  if (
    !trade.allowed
    && options.autoEncryptPreflight !== false
    && retriesLeft > 0
    && isEncryptPreflightRequired(trade)
    && canResolveAgentSigner(deps)
  ) {
    try {
      const { runEncryptPolicyPreflight } = await import('./encrypt-preflight.js');
      const signer = await deps.resolveAgentSigner!();
      if (!signer) throw new Error('resolveAgentSigner returned undefined');
      const amount = extractAmount(input);
      if (!amount) throw new Error('Cannot extract USDC amount from trade input for preflight');
      const preflight = await runEncryptPolicyPreflight({
        baseUrl: deps.kitOptions.baseUrl,
        owner: deps.kitOptions.owner!,
        sessionKey: deps.kitOptions.sessionKey!,
        agentSigner: signer,
        amountUsdc: amount,
        rpcUrl: deps.kitOptions.rpcUrl,
        connection: options.connection,
        fetch: options.fetch,
        log: (message) => process.stderr.write(`${message}\n`),
      });
      if (preflight.decision.status === 'encrypt-verified-allowed') {
        const retryInput: PoletTradeInput = {
          ...(input as PoletTradeInput),
          officialEncrypt: preflight.refs,
        } as PoletTradeInput;
        return executeWithEncryptRetry(retryInput, deps, options, retriesLeft - 1);
      }
      // Verified-blocked: surface as policy-blocked, non-recoverable.
      const reason = 'Official Encrypt verifier blocked this trade (amount exceeds the private cap).';
      if (options.throwOnFailure) throw new PoletPolicyBlockedError(reason, { code: 'ENCRYPT_VERIFIED_BLOCKED' });
      return {
        status: 'policy-blocked',
        ok: false,
        recoverable: true,
        rail: trade.rail,
        trade,
        code: 'ENCRYPT_VERIFIED_BLOCKED',
        reason,
        message: `Polet policy blocked via Encrypt verifier: ${reason}`,
      };
    } catch (error) {
      const wrapped = toPoletAgentError(error);
      if (options.throwOnFailure) throw wrapped;
      return {
        status: 'lifecycle-error',
        ok: false,
        rail: rail(input),
        trade,
        message: wrapped.message,
        reason: `Encrypt preflight failed: ${wrapped.message}`,
      };
    }
  }

  // Non-allowed paths ----------------------------------------------------
  if (!trade.allowed) {
    return mapDisallowedTrade(trade, options);
  }

  // Jupiter rail preview ------------------------------------------------
  if (trade.rail === 'jupiter') {
    return {
      status: 'executed-preview',
      ok: true,
      rail: 'jupiter',
      trade,
      execution: trade.execution ?? { intent: redactIntent(input) as RedactedPoletIntent },
      message: 'Jupiter route/build preview ready. Session signer required for final submission.',
    };
  }

  // Ika rail end-to-end -------------------------------------------------
  if (trade.rail === 'ika') {
    return runIkaEndToEnd(input, trade, deps, options);
  }

  // Unknown rail --------------------------------------------------------
  if (options.throwOnFailure) {
    throw new PoletUnsupportedRailError(`Polet rail ${trade.rail} is not supported by execute()`);
  }
  return {
    status: 'unsupported-rail',
    ok: false,
    rail: 'unknown',
    trade,
    reason: `Polet rail ${trade.rail} is not supported by execute()`,
    message: `Rail ${trade.rail} cannot be executed end-to-end by this SDK build.`,
  };
}

function isEncryptPreflightRequired(trade: PoletTradeResult): boolean {
  const reason = trade.policy?.reason?.toLowerCase() ?? '';
  const code = (trade.policy?.code ?? '').toString().toLowerCase();
  return (
    reason.includes('encrypt policy graph must be executed')
    || reason.includes('pending-encrypt-execution')
    || code === 'encrypt_policy_graph_not_executed'
    || code === 'encrypt_policy_pending'
  );
}

function canResolveAgentSigner(deps: PoletExecuteDeps): boolean {
  return typeof deps.resolveAgentSigner === 'function';
}

function extractAmount(input: PoletTradeInput): string | null {
  const candidate = (input as unknown as { amount?: unknown }).amount;
  if (typeof candidate === 'string') return candidate.trim();
  if (typeof candidate === 'number') return String(candidate);
  return null;
}

function mapDisallowedTrade(
  trade: PoletTradeResult,
  options: PoletExecuteOptions
): PoletExecutionResult {
  const reason = trade.policy.reason ?? trade.policy.code ?? 'Polet policy blocked this trade.';
  const code = trade.policy.code;

  if (trade.status === 'needs-approval' && trade.approval) {
    const err = new PoletNeedsApprovalError(reason, trade.approval.approvedApprovers.length, trade.approval.threshold, { code });
    if (options.throwOnFailure) throw err;
    return {
      status: 'needs-approval',
      ok: false,
      recoverable: true,
      rail: trade.rail,
      trade,
      approval: trade.approval,
      reason,
      message: `Shared access quorum needs ${trade.approval.threshold - trade.approval.approvedApprovers.length} more approver(s).`,
    };
  }
  if (trade.status === 'revoked-session') {
    const err = new PoletSessionRevokedError(reason, { code });
    if (options.throwOnFailure) throw err;
    return {
      status: 'session-revoked',
      ok: false,
      rail: trade.rail,
      trade,
      reason,
      message: 'Polet session was revoked.',
    };
  }

  const err = new PoletPolicyBlockedError(reason, { code });
  if (options.throwOnFailure) throw err;
  return {
    status: 'policy-blocked',
    ok: false,
    recoverable: true,
    rail: trade.rail,
    trade,
    code,
    reason,
    message: `Polet policy blocked: ${reason}`,
  };
}

async function runIkaEndToEnd(
  input: PoletTradeInput,
  trade: PoletTradeResult,
  deps: PoletExecuteDeps,
  options: PoletExecuteOptions
): Promise<PoletExecutionResult> {
  const ikaRequest = extractIkaRequest(trade);
  if (!ikaRequest) {
    const err = new PoletLifecycleError('Allowed Ika trade did not return an ikaRequest payload');
    if (options.throwOnFailure) throw err;
    return {
      status: 'lifecycle-error',
      ok: false,
      rail: 'ika',
      trade,
      reason: err.message,
      message: err.message,
    };
  }
  const approvalTransaction = ikaRequest.poletApprovalTransaction?.transaction;
  if (!approvalTransaction) {
    const err = new PoletLifecycleError('Ika rail missing unsigned Polet approval transaction');
    if (options.throwOnFailure) throw err;
    return {
      status: 'lifecycle-error',
      ok: false,
      rail: 'ika',
      trade,
      reason: err.message,
      message: err.message,
    };
  }

  // Step 1: sign + send the Polet approval transaction ------------------
  const send = await deps.signAndSendTransaction({
    transaction: approvalTransaction,
    commitment: options.commitment,
  });

  if (send.status === 'signer-required' || !send.ok) {
    if (send.status === 'revoked-session') {
      const err = new PoletSessionRevokedMidflightError(send.reason ?? 'Session revoked while signing Polet approval.', 'pre-presign');
      if (options.throwOnFailure) throw err;
      return {
        status: 'session-revoked-midflight',
        ok: false,
        rail: 'ika',
        trade,
        revokePhase: 'pre-presign',
        reason: err.message,
        message: err.message,
      };
    }
    const err = new PoletSignerRequiredError(
      send.reason ?? 'Polet approval transaction needs an agent signer.',
      send.requiredSigners ?? [],
      missingFrom(send.requiredSigners ?? []),
    );
    if (options.throwOnFailure) throw err;
    return {
      status: 'signer-required',
      ok: false,
      rail: 'ika',
      trade,
      requiredSigners: send.requiredSigners ?? [],
      missingSigners: missingFrom(send.requiredSigners ?? []),
      reason: err.message,
      message: err.message,
    };
  }

  const approvalSignature = send.signature!;
  const approvalSlot = await resolveApprovalSlot(deps.kitOptions, options.connection);

  // Step 2: progress lifecycle through Presign/Sign/CommitSignature ----
  const lifecycle = await deps.agent.progressIkaLifecycle({
    ikaRequest,
    approvalTransactionSignature: approvalSignature,
    approvalTransactionSlot: approvalSlot,
    managedFixture: true,
  });

  switch (lifecycle.status) {
    case 'signature-committed': {
      const broadcast = lifecycle.broadcast;
      if (!broadcast) {
        const err = new PoletBroadcastDisabledError('Lifecycle succeeded but destination broadcast is disabled.');
        if (options.throwOnFailure) throw err;
        return {
          status: 'broadcast-disabled',
          ok: true,
          rail: 'ika',
          trade,
          signatureHex: lifecycle.signatureHex ?? '',
          messageApprovalPda: lifecycle.messageApprovalPda ?? '',
          approvalTxSignature: approvalSignature,
          lifecycle,
          reason: 'Destination broadcast disabled on proxy.',
          message: 'Ika signature committed. Destination broadcast disabled — enable POLET_DESTINATION_BROADCAST to submit on-chain.',
        };
      }
      if (broadcast.ok && broadcast.transactionHash) {
        return {
          status: 'executed',
          ok: true,
          rail: 'ika',
          trade,
          destinationChain: broadcast.chain,
          destinationTxHash: broadcast.transactionHash,
          destinationExplorerUrl: broadcast.explorerUrl ?? '',
          signatureHex: lifecycle.signatureHex ?? '',
          messageApprovalPda: lifecycle.messageApprovalPda ?? '',
          approvalTxSignature: approvalSignature,
          lifecycle,
          message: `Executed ${trade.rail} trade on ${broadcast.chain}: ${broadcast.transactionHash}`,
        };
      }
      if (broadcast.status === 'broadcast-disabled') {
        return {
          status: 'broadcast-disabled',
          ok: true,
          rail: 'ika',
          trade,
          signatureHex: lifecycle.signatureHex ?? '',
          messageApprovalPda: lifecycle.messageApprovalPda ?? '',
          approvalTxSignature: approvalSignature,
          lifecycle,
          reason: broadcast.reason ?? 'Destination broadcast disabled on proxy.',
          message: broadcast.reason ?? 'Ika signature committed. Destination broadcast disabled.',
        };
      }
      const err = new PoletBroadcastError(broadcast.reason ?? 'Destination broadcast failed.', broadcast.code);
      if (options.throwOnFailure) throw err;
      return {
        status: 'broadcast-failed',
        ok: false,
        rail: 'ika',
        trade,
        code: broadcast.code,
        reason: broadcast.reason ?? 'Destination broadcast failed',
        signatureHex: lifecycle.signatureHex,
        lifecycle,
        message: `Ika signature committed, but destination broadcast failed: ${broadcast.reason ?? broadcast.code ?? 'unknown error'}.`,
      };
    }
    case 'session-revoked-midflight': {
      const err = new PoletSessionRevokedMidflightError(
        lifecycle.reason ?? 'Session revoked mid-flight.',
        lifecycle.revokePhase,
      );
      if (options.throwOnFailure) throw err;
      return {
        status: 'session-revoked-midflight',
        ok: false,
        rail: 'ika',
        trade,
        revokePhase: lifecycle.revokePhase,
        reason: err.message,
        lifecycle,
        message: err.message,
      };
    }
    case 'gas-floor-blocked': {
      const err = new PoletGasFloorError(lifecycle.reason ?? 'GasDeposit under the configured floor.');
      if (options.throwOnFailure) throw err;
      return {
        status: 'gas-floor-underfunded',
        ok: false,
        recoverable: true,
        rail: 'ika',
        trade,
        reason: err.message,
        message: err.message,
      };
    }
    case 'broadcast-disabled': {
      return {
        status: 'broadcast-disabled',
        ok: true,
        rail: 'ika',
        trade,
        signatureHex: lifecycle.signatureHex ?? '',
        messageApprovalPda: lifecycle.messageApprovalPda ?? '',
        approvalTxSignature: approvalSignature,
        lifecycle,
        reason: lifecycle.reason ?? 'Destination broadcast disabled.',
        message: 'Ika signature committed; destination broadcast disabled.',
      };
    }
    case 'lifecycle-error':
    default: {
      const err = new PoletLifecycleError(lifecycle.reason ?? 'Polet Ika lifecycle failed', lifecycle.code);
      if (options.throwOnFailure) throw err;
      return {
        status: 'lifecycle-error',
        ok: false,
        rail: 'ika',
        trade,
        code: lifecycle.code,
        reason: err.message,
        lifecycle,
        message: err.message,
      };
    }
  }
}

// ---------- Helpers ----------

function extractIkaRequest(trade: PoletTradeResult): ExtractedIkaRequest | null {
  const details = trade.details as { ikaRequest?: ExtractedIkaRequest } | undefined;
  const fromDetails = details?.ikaRequest;
  const fromExecution = (trade.execution?.payload as { ikaRequest?: ExtractedIkaRequest } | undefined)?.ikaRequest;
  const fromRaw = (trade.raw as { ikaRequest?: ExtractedIkaRequest } | undefined)?.ikaRequest
    ?? (trade.raw as { data?: { ikaRequest?: ExtractedIkaRequest } } | undefined)?.data?.ikaRequest;
  return fromDetails ?? fromExecution ?? fromRaw ?? null;
}

interface ExtractedIkaRequest {
  poletApprovalTransaction?: { transaction?: string };
  [key: string]: unknown;
}

async function resolveApprovalSlot(
  options: PoletAgentKitOptions,
  injected?: Connection
): Promise<number> {
  const connection = injected
    ?? (options.connection as Connection | undefined)
    ?? (options.rpcUrl ? new Connection(options.rpcUrl) : undefined);
  if (connection?.getSlot) {
    try {
      return await connection.getSlot();
    } catch {
      return 0;
    }
  }
  return 0;
}

function missingFrom(required: string[]): string[] {
  return required; // Without a configured signer, every required address counts as missing.
}

function rail(input: PoletTradeInput): PoletExecutionRail | 'unknown' {
  return (input.rail as PoletExecutionRail | undefined) ?? 'jupiter';
}

function redactIntent(input: PoletTradeInput): Record<string, unknown> {
  return { action: 'multichain-strategy', params: input } as Record<string, unknown>;
}

function errorTrade(input: PoletTradeInput, reason: string): PoletTradeResult {
  return {
    allowed: false,
    rail: rail(input) === 'unknown' ? 'jupiter' : (rail(input) as PoletExecutionRail),
    status: 'blocked',
    settlement: 'not-executed',
    policy: { allowed: false, reason },
  };
}

// Narrow re-exports so consumers can `import { PoletExecutionResult, ... } from '@polet-ai/sdk/agent-execute'`.
export { PoletAgentError } from './agent-errors.js';
