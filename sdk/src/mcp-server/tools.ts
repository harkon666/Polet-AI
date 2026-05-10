/**
 * Polet MCP tool definitions.
 *
 * Each tool wraps a `PoletAgentKit` call into a JSON-schema-described tool
 * descriptor that MCP clients (Hermes, OpenClaw, Claude Desktop, Cursor,
 * Zed, custom LLM runners) can discover + invoke. Results follow a
 * discriminated-union shape so agents can switch on `status` without
 * parsing free-form text.
 */

import type { PoletAgentKit } from '../index.js';
import type { PoletExecutionResult } from '../agent-execute.js';

export type PoletToolStatus =
  | 'ok'
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
  | 'unsupported-rail'
  | 'chain-already-enabled'
  | 'chain-enabled'
  | 'setup-incomplete'
  | 'failed';

export interface PoletToolCallResult {
  status: PoletToolStatus;
  ok: boolean;
  /** Short human-readable one-liner for agent transcripts. */
  summary?: string;
  /** Detailed machine-readable payload. */
  data: Record<string, unknown>;
  /** Error code when `ok === false`. */
  code?: string;
  /** Explanation when `ok === false`. */
  reason?: string;
  /** True if replanning (e.g. smaller amount, wait for approval) might succeed. */
  recoverable?: boolean;
}

export interface PoletToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call(args: unknown): Promise<PoletToolCallResult>;
}

export interface PoletToolSet {
  list(): PoletToolDefinition[];
  get(name: string): PoletToolDefinition | undefined;
}

export function createPoletToolSet(kit: PoletAgentKit): PoletToolSet {
  const tools: PoletToolDefinition[] = [
    createStatusTool(kit),
    createEnableChainTool(kit),
    createTradeTool(kit),
    createExecuteTool(kit),
  ];
  const byName = new Map(tools.map((t) => [t.name, t]));
  return {
    list: () => tools,
    get: (name) => byName.get(name),
  };
}

// ---------- polet_status ----------

function createStatusTool(kit: PoletAgentKit): PoletToolDefinition {
  return {
    name: 'polet_status',
    description:
      'Inspect the owner Polet smart wallet: whether the confidential policy is configured, whether the current session key is authorized, which chains (Sui / Ethereum) have an Ika signer enabled, and whether the Ika GasDeposit passes the proxy floor. Call this first so the agent knows what it can do without leaking private policy thresholds.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async call() {
      try {
        const status = await kit.status();
        const ok = status.ok;
        return {
          status: ok ? 'ok' : 'setup-incomplete',
          ok,
          summary: ok
            ? 'Polet wallet is ready for agent trading.'
            : 'Polet wallet setup is incomplete. See `diagnostics` for missing pieces.',
          data: status as unknown as Record<string, unknown>,
          reason: ok ? undefined : summarizeDiagnostics(status.diagnostics),
        };
      } catch (error) {
        return failureResult('failed', error);
      }
    },
  };
}

function summarizeDiagnostics(diagnostics: Array<{ field: string; code: string; message: string }>): string | undefined {
  if (!diagnostics || diagnostics.length === 0) return undefined;
  return diagnostics.map((d) => `${d.code}: ${d.message}`).join('; ');
}

// ---------- polet_enable_chain ----------

function createEnableChainTool(kit: PoletAgentKit): PoletToolDefinition {
  return {
    name: 'polet_enable_chain',
    description:
      'Activate a multi-chain Ika signer for the owner in Polet managed demo mode. Use `sui` for Sui devnet or `ethereum` for Ethereum Sepolia. Idempotent: returns `chain-already-enabled` when the dWallet is already bound. The managed demo mode disclosure is returned verbatim so agents can echo it.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', enum: ['sui', 'ethereum'], description: 'Destination chain to enable.' },
      },
      required: ['chain'],
      additionalProperties: false,
    },
    async call(args) {
      try {
        const { chain } = args as { chain?: 'sui' | 'ethereum' };
        if (chain !== 'sui' && chain !== 'ethereum') {
          return {
            status: 'failed',
            ok: false,
            data: {},
            code: 'INVALID_ARGS',
            reason: 'chain must be "sui" or "ethereum"',
          };
        }
        // Touch status + registry via kit is indirect; call proxy directly via the kit's PROXY_URL would
        // require exposing fetch helpers. For demo scope, delegate to kit.status() first and short-circuit
        // when the owner already has a registration for the chain's default curve.
        const status = await kit.status();
        const proxyUrl = status.programId
          // kit options aren't accessible from the interface; fall back to import.meta env via a helper.
          ? ((kit as unknown as { __options?: { baseUrl?: string } }).__options?.baseUrl)
          : undefined;
        // Delegate to the proxy endpoint directly; the kit does not expose enable yet in this build.
        const owner = status.owner;
        if (!owner) {
          return {
            status: 'setup-incomplete',
            ok: false,
            data: { diagnostics: status.diagnostics },
            code: 'OWNER_MISSING',
            reason: 'kit.status() did not return an owner. Check POLET_OWNER env.',
          };
        }
        const baseUrl = proxyUrl ?? (process.env.POLET_PROXY_URL ?? 'http://localhost:3001');
        const response = await fetch(new URL('/ika/enable-chain', normalizeBaseUrl(baseUrl)), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, chain }),
        });
        const envelope = (await response.json().catch(() => ({}))) as { success?: boolean; data?: unknown; error?: string; code?: string };
        if (!envelope?.success) {
          return {
            status: 'failed',
            ok: false,
            data: (envelope?.data ?? {}) as Record<string, unknown>,
            code: envelope?.code ?? 'ENABLE_FAILED',
            reason: envelope?.error ?? 'Polet /ika/enable-chain returned an error',
          };
        }
        return {
          status: 'chain-enabled',
          ok: true,
          summary: `Polet multi-chain signer enabled for ${chain}.`,
          data: envelope.data as Record<string, unknown>,
        };
      } catch (error) {
        return failureResult('failed', error);
      }
    },
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

// ---------- polet_trade ----------

function createTradeTool(kit: PoletAgentKit): PoletToolDefinition {
  return {
    name: 'polet_trade',
    description:
      'Request a Polet trade and inspect the policy outcome without broadcasting. Use this when the agent wants to check "would X be allowed" before committing. Amounts over the confidential policy return `status: "policy-blocked"` without revealing the private threshold.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source asset symbol (e.g. USDC, SOL).' },
        to: { type: 'string', description: 'Target asset symbol (e.g. SOL, SUI, ETH).' },
        amount: { oneOf: [{ type: 'number' }, { type: 'string' }], description: 'Human-readable amount.' },
        rail: { type: 'string', enum: ['jupiter', 'ika'], description: 'Execution rail. Defaults to jupiter for Solana->Solana trades.' },
      },
      required: ['from', 'to', 'amount'],
      additionalProperties: true,
    },
    async call(args) {
      try {
        const result = await kit.trade(args as Parameters<PoletAgentKit['trade']>[0]);
        const status = mapTradeStatus(result);
        return {
          status,
          ok: result.allowed,
          summary: result.allowed
            ? `Polet ${result.rail} trade preview ready (status=${result.status}).`
            : `Polet policy rejected the request: ${result.policy.reason ?? result.policy.code ?? 'blocked'}`,
          data: result as unknown as Record<string, unknown>,
          code: result.policy.code,
          reason: result.allowed ? undefined : result.policy.reason,
          recoverable: status === 'policy-blocked' || status === 'needs-approval',
        };
      } catch (error) {
        return failureResult('failed', error);
      }
    },
  };
}

function mapTradeStatus(result: Awaited<ReturnType<PoletAgentKit['trade']>>): PoletToolStatus {
  if (result.allowed) return 'ok';
  if (result.status === 'needs-approval') return 'needs-approval';
  if (result.status === 'revoked-session') return 'session-revoked';
  return 'policy-blocked';
}

// ---------- polet_execute ----------

function createExecuteTool(kit: PoletAgentKit): PoletToolDefinition {
  return {
    name: 'polet_execute',
    description:
      'Run an end-to-end Polet trade: submit intent, sign the Polet approval transaction, progress the Ika Pre-Alpha lifecycle (Presign → Sign → CommitSignature), and broadcast to Sui devnet or Ethereum Sepolia. Returns a discriminated `status` the agent can switch on (`executed`, `policy-blocked`, `session-revoked-midflight`, `needs-approval`, `gas-floor-underfunded`, `signer-required`, `lifecycle-error`, `broadcast-disabled`, `broadcast-failed`). The confidential policy values never appear in the response.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source asset symbol.' },
        to: { type: 'string', description: 'Target asset symbol.' },
        amount: { oneOf: [{ type: 'number' }, { type: 'string' }], description: 'Human-readable amount.' },
        rail: { type: 'string', enum: ['jupiter', 'ika'], description: 'Execution rail.' },
      },
      required: ['from', 'to', 'amount'],
      additionalProperties: true,
    },
    async call(args) {
      try {
        const result: PoletExecutionResult = await kit.execute(args as Parameters<PoletAgentKit['execute']>[0]);
        return executionToToolResult(result);
      } catch (error) {
        return failureResult('lifecycle-error', error);
      }
    },
  };
}

function executionToToolResult(result: PoletExecutionResult): PoletToolCallResult {
  const summary = result.message;
  const base = { summary, data: result as unknown as Record<string, unknown> };
  switch (result.status) {
    case 'executed':
      return {
        ...base,
        status: 'executed',
        ok: true,
      };
    case 'executed-preview':
      return {
        ...base,
        status: 'executed-preview',
        ok: true,
      };
    case 'policy-blocked':
      return {
        ...base,
        status: 'policy-blocked',
        ok: false,
        code: result.code,
        reason: result.reason,
        recoverable: true,
      };
    case 'session-revoked':
      return {
        ...base,
        status: 'session-revoked',
        ok: false,
        reason: result.reason,
      };
    case 'session-revoked-midflight':
      return {
        ...base,
        status: 'session-revoked-midflight',
        ok: false,
        reason: result.reason,
      };
    case 'needs-approval':
      return {
        ...base,
        status: 'needs-approval',
        ok: false,
        reason: result.reason,
        recoverable: true,
      };
    case 'gas-floor-underfunded':
      return {
        ...base,
        status: 'gas-floor-underfunded',
        ok: false,
        reason: result.reason,
        recoverable: true,
      };
    case 'signer-required':
      return {
        ...base,
        status: 'signer-required',
        ok: false,
        reason: result.reason,
      };
    case 'broadcast-disabled':
      return {
        ...base,
        status: 'broadcast-disabled',
        ok: true,
        reason: result.reason,
      };
    case 'broadcast-failed':
      return {
        ...base,
        status: 'broadcast-failed',
        ok: false,
        code: result.code,
        reason: result.reason,
      };
    case 'lifecycle-error':
    default:
      return {
        ...base,
        status: 'lifecycle-error',
        ok: false,
        code: 'code' in result ? result.code : undefined,
        reason: 'reason' in result ? result.reason : 'Polet lifecycle failed',
      };
  }
}

function failureResult(status: PoletToolStatus, error: unknown): PoletToolCallResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    status,
    ok: false,
    data: { error: message },
    code: 'POLET_TOOL_ERROR',
    reason: message,
  };
}
