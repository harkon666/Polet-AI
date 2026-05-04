import { describe, expect, test } from 'bun:test';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  createLocalAgentRuntime,
} from '../src/index.js';

describe('local scripted agent runtime', () => {
  test('creates and submits the default allowed USDC to SOL DCA intent', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchMock = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: input.toString(),
        body: JSON.parse(init?.body?.toString() ?? '{}'),
      });
      return Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'DCA_ALLOWED',
          executionPath: 'swap-build-fallback',
        },
      });
    };
    const runtime = createLocalAgentRuntime({
      owner: 'owner-1',
      sessionKey: 'session-1',
      proxyUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
    });

    const result = await runtime.runDcaScenario({ intentId: 'agent-allow-1' });

    expect(result.runtime).toBe('local-scripted-agent');
    expect(result.scenario).toBe('allow');
    expect(result.decision).toBe('allowed');
    expect(result.intent.id).toBe('agent-allow-1');
    expect(result.intent.action).toBe('dca');
    expect(result.intent.params.amountUsdc).toBe('5');
    expect(result.intent.params.inputMint).toBe(JUPITER_USDC_MINT);
    expect(result.intent.params.outputMint).toBe(JUPITER_SOL_MINT);
    expect(requests[0].url).toBe('https://proxy.polet.ai/intent/dca/run');
    expect(requests[0].body).toMatchObject({
      owner: 'owner-1',
      sessionKey: 'session-1',
      amountUsdc: '5',
      inputMint: JUPITER_USDC_MINT,
      outputMint: JUPITER_SOL_MINT,
    });
  });

  test('can demonstrate the blocked 25 USDC scenario without leaking thresholds', async () => {
    const fetchMock = async () => Response.json({
      success: true,
      data: {
        allowed: false,
        code: 'POLICY_BLOCKED',
        reason: 'Confidential policy blocked this DCA run.',
      },
    });
    const runtime = createLocalAgentRuntime({
      owner: 'owner-1',
      sessionKey: 'session-1',
      proxyUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
    });

    const result = await runtime.runDcaScenario({ scenario: 'block' });

    expect(result.scenario).toBe('block');
    expect(result.decision).toBe('blocked');
    expect(result.intent.params.amountUsdc).toBe('25');
    expect(result.proxyResponse.data?.reason).toBe('Confidential policy blocked this DCA run.');
    expect(result.proxyResponse.data?.reason).not.toContain('10');
    expect(result.proxyResponse.data?.reason).not.toContain('20');
  });
});
