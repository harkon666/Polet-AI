import { describe, expect, test, mock } from 'bun:test';
import { executePoletTrade, type PoletExecuteDeps } from '../src/agent-execute.js';
import {
  PoletAgentError,
  PoletPolicyBlockedError,
  PoletSessionRevokedError,
  PoletSignerRequiredError,
  toPoletAgentError,
} from '../src/agent-errors.js';
import type {
  PoletAgentKit,
  PoletAgentKitOptions,
  PoletIkaLifecycleOutcome,
  PoletSignAndSendResult,
  PoletTradeInput,
  PoletTradeResult,
} from '../src/index.js';
import { createPoletToolSet } from '../src/mcp-server/tools.js';
import { createPoletOpenAiTools } from '../src/adapters/openai.js';
import { createPoletLangChainTools } from '../src/adapters/langchain.js';
import { createPoletSolanaAgentKitActions } from '../src/adapters/solana-agent-kit.js';
import { PoletMcpServer } from '../src/mcp-server/server.js';

const OWNER = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';

function mockDeps(overrides: {
  trade?: PoletTradeResult;
  signResult?: PoletSignAndSendResult;
  lifecycle?: PoletIkaLifecycleOutcome;
}): PoletExecuteDeps {
  return {
    agent: {
      trade: async () => overrides.trade ?? { allowed: true, rail: 'ika', status: 'approval-transaction-prepared', settlement: 'not-executed', policy: { allowed: true }, details: { ikaRequest: { poletApprovalTransaction: { transaction: 'base64tx' } } } },
      progressIkaLifecycle: async () => overrides.lifecycle ?? { status: 'signature-committed', signatureHex: 'ab'.repeat(64), messageApprovalPda: 'PDA', broadcast: { ok: true, status: 'broadcast-submitted', chain: 'sui', transactionHash: 'sui-tx-hash', explorerUrl: 'https://suiscan.xyz/devnet/tx/sui-tx-hash', productionSettlement: false } },
    },
    signAndSendTransaction: async () => overrides.signResult ?? { status: 'submitted', ok: true, requiredSigners: [OWNER], signature: 'solana-approval-sig' },
    kitOptions: { owner: OWNER, sessionKey: OWNER, baseUrl: 'http://localhost:3001' } as PoletAgentKitOptions,
  };
}

describe('agent-execute', () => {
  const input: PoletTradeInput = { from: 'USDC', to: 'SUI', amount: 5, rail: 'ika' } as PoletTradeInput;

  test('happy path returns executed with destination tx hash', async () => {
    const result = await executePoletTrade(input, mockDeps({}));
    expect(result.status).toBe('executed');
    expect(result.ok).toBe(true);
    if (result.status === 'executed') {
      expect(result.destinationChain).toBe('sui');
      expect(result.destinationTxHash).toBe('sui-tx-hash');
      expect(result.destinationExplorerUrl).toContain('suiscan');
    }
  });

  test('policy-blocked trade returns recoverable result', async () => {
    const blocked: PoletTradeResult = {
      allowed: false,
      rail: 'ika',
      status: 'blocked',
      settlement: 'not-executed',
      policy: { allowed: false, code: 'POLICY_BLOCKED', reason: 'over cap' },
    };
    const result = await executePoletTrade(input, mockDeps({ trade: blocked }));
    expect(result.status).toBe('policy-blocked');
    expect(result.ok).toBe(false);
    if (result.status === 'policy-blocked') {
      expect(result.recoverable).toBe(true);
      expect(result.reason).toBe('over cap');
    }
  });

  test('revoked-session trade maps to session-revoked', async () => {
    const revoked: PoletTradeResult = {
      allowed: false,
      rail: 'ika',
      status: 'revoked-session',
      settlement: 'not-executed',
      policy: { allowed: false, reason: 'session expired' },
    };
    const result = await executePoletTrade(input, mockDeps({ trade: revoked }));
    expect(result.status).toBe('session-revoked');
  });

  test('signer-required when sign returns that status', async () => {
    const result = await executePoletTrade(input, mockDeps({
      signResult: { status: 'signer-required', ok: false, requiredSigners: [OWNER], reason: 'no signer' },
    }));
    expect(result.status).toBe('signer-required');
  });

  test('session-revoked-midflight from lifecycle surfaces revokePhase', async () => {
    const result = await executePoletTrade(input, mockDeps({
      lifecycle: { status: 'session-revoked-midflight', revokePhase: 'pre-sign', reason: 'revoked' },
    }));
    expect(result.status).toBe('session-revoked-midflight');
    if (result.status === 'session-revoked-midflight') {
      expect(result.revokePhase).toBe('pre-sign');
    }
  });

  test('gas-floor-blocked lifecycle maps to gas-floor-underfunded', async () => {
    const result = await executePoletTrade(input, mockDeps({
      lifecycle: { status: 'gas-floor-blocked', reason: 'underfunded' },
    }));
    expect(result.status).toBe('gas-floor-underfunded');
  });

  test('throwOnFailure raises PoletPolicyBlockedError on blocked trades', async () => {
    const blocked: PoletTradeResult = {
      allowed: false,
      rail: 'ika',
      status: 'blocked',
      settlement: 'not-executed',
      policy: { allowed: false, reason: 'over cap' },
    };
    await expect(executePoletTrade(input, mockDeps({ trade: blocked }), { throwOnFailure: true })).rejects.toBeInstanceOf(PoletPolicyBlockedError);
  });
});

describe('agent-errors', () => {
  test('PoletPolicyBlockedError is recoverable', () => {
    const err = new PoletPolicyBlockedError('over cap');
    expect(err.code).toBe('POLICY_BLOCKED');
    expect(err.recoverable).toBe(true);
    const serialized = err.toJSON();
    expect(serialized.code).toBe('POLICY_BLOCKED');
    expect(serialized.message).toBe('over cap');
  });

  test('toPoletAgentError preserves PoletAgentError instances', () => {
    const err = new PoletSessionRevokedError();
    expect(toPoletAgentError(err)).toBe(err);
  });

  test('toPoletAgentError coerces plain Error', () => {
    const coerced = toPoletAgentError(new Error('boom'));
    expect(coerced).toBeInstanceOf(PoletAgentError);
    expect(coerced.code).toBe('LIFECYCLE_ERROR');
  });

  test('PoletSignerRequiredError exposes required + missing signers', () => {
    const err = new PoletSignerRequiredError('needs sig', ['pk-a'], ['pk-a']);
    expect(err.requiredSigners).toEqual(['pk-a']);
    expect(err.missingSigners).toEqual(['pk-a']);
  });
});

describe('adapter output shapes', () => {
  const kit = {
    status: async () => ({ ok: true, owner: OWNER, diagnostics: [] } as unknown as Awaited<ReturnType<PoletAgentKit['status']>>),
    trade: async (_input: PoletTradeInput) => ({
      allowed: true,
      rail: 'jupiter',
      status: 'preview-ready',
      settlement: 'not-executed',
      policy: { allowed: true },
    } as PoletTradeResult),
    execute: async () => ({ status: 'executed-preview', ok: true, rail: 'jupiter', trade: {} as PoletTradeResult, message: 'preview', execution: {} } as never),
  } as unknown as PoletAgentKit;

  test('createPoletToolSet lists 4 tools with JSON schemas', () => {
    const toolset = createPoletToolSet(kit);
    const names = toolset.list().map((t) => t.name);
    expect(names).toEqual(['polet_status', 'polet_enable_chain', 'polet_trade', 'polet_execute']);
    for (const tool of toolset.list()) {
      expect(tool.inputSchema).toHaveProperty('type', 'object');
    }
  });

  test('Solana Agent Kit adapter produces SendAI-style descriptors', () => {
    const actions = createPoletSolanaAgentKitActions(kit);
    expect(actions.length).toBe(4);
    const execute = actions.find((a) => a.name === 'polet_execute');
    expect(execute?.similes.length).toBeGreaterThan(0);
    expect(Array.isArray(execute?.examples)).toBe(true);
  });

  test('OpenAI adapter returns function tools + invoke helper', async () => {
    const bundle = createPoletOpenAiTools(kit);
    expect(bundle.tools.every((t) => t.type === 'function')).toBe(true);
    const result = await bundle.invoke('polet_trade', JSON.stringify({ from: 'USDC', to: 'SOL', amount: 5 }));
    expect(result.ok).toBe(true);
    expect(['ok', 'executed-preview']).toContain(result.status);
  });

  test('LangChain adapter returns structured + string functions', async () => {
    const tools = createPoletLangChainTools(kit);
    const status = tools.find((t) => t.name === 'polet_status');
    expect(status).toBeTruthy();
    const str = await status!.func({});
    const parsed = JSON.parse(str);
    expect(parsed).toHaveProperty('status');
    expect(parsed).toHaveProperty('ok');
  });
});

describe('MCP server protocol', () => {
  const kit = {
    status: async () => ({ ok: true, owner: OWNER, diagnostics: [] } as unknown as Awaited<ReturnType<PoletAgentKit['status']>>),
    trade: async () => ({ allowed: true, rail: 'jupiter', status: 'preview-ready', settlement: 'not-executed', policy: { allowed: true } }) as PoletTradeResult,
    execute: async () => ({ status: 'executed-preview', ok: true, rail: 'jupiter', trade: {} as PoletTradeResult, message: 'preview', execution: {} } as never),
  } as unknown as PoletAgentKit;

  const server = new PoletMcpServer({ kit, write: () => undefined, log: () => undefined });

  test('initialize returns protocol version + tool capabilities', async () => {
    const raw = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const response = await server.handle(raw);
    const parsed = JSON.parse(response!);
    expect(parsed.result.protocolVersion).toBe('2025-03-26');
    expect(parsed.result.capabilities.tools).toBeTruthy();
  });

  test('tools/list returns 4 Polet tools', async () => {
    const response = await server.handle(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const parsed = JSON.parse(response!);
    expect(parsed.result.tools.length).toBe(4);
    expect(parsed.result.tools.map((t: { name: string }) => t.name)).toContain('polet_execute');
  });

  test('tools/call routes to matching tool and returns structured content', async () => {
    const response = await server.handle(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'polet_status', arguments: {} },
    }));
    const parsed = JSON.parse(response!);
    expect(parsed.result.content[0].type).toBe('text');
    expect(parsed.result.metadata.status).toBe('ok');
  });

  test('unknown tool returns isError true', async () => {
    const response = await server.handle(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'polet_nope' },
    }));
    const parsed = JSON.parse(response!);
    expect(parsed.error || parsed.result?.isError).toBeTruthy();
  });

  test('invalid JSON returns parse error', async () => {
    const response = await server.handle('not-json');
    const parsed = JSON.parse(response!);
    expect(parsed.error.code).toBe(-32700);
  });

  test('notifications return null (no response emitted)', async () => {
    const response = await server.handle(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
    expect(response).toBeNull();
  });
});
