import { describe, expect, test } from 'bun:test';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  createMultichainStrategyIntent,
  createLocalAgentRuntime,
  submitIntent,
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
    expect('maskedWitnessDevFixture' in result.intent.params).toBe(false);
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

  test('submits an approved Ika bridgeless intent through the multichain proxy route', async () => {
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
          code: 'IKA_BRIDGELESS_REQUEST_READY',
          ikaRequest: {
            executionRail: 'ika-bridgeless',
            settlement: 'not-executed',
            requestId: 'ika-demo-request',
            preAlphaSigning: {
              status: 'approval-transaction-prepared',
              dwalletAccount: 'dwallet-1',
              ikaMessageHash: 'ika-message-hash-1',
              messageDigest: 'ika-message-hash-1',
              messageApprovalPda: 'message-approval-pda',
              cpiAuthorityPda: 'cpi-authority-pda',
              signatureScheme: 'ed25519-prealpha',
            },
            poletApprovalTransaction: {
              signers: ['session-1'],
            },
            source: { chain: 'solana', asset: 'USDC' },
            target: { chain: 'sui', asset: 'SUI' },
            amount: '5',
          },
        },
      });
    };
    const runtime = createLocalAgentRuntime({
      owner: 'owner-1',
      sessionKey: 'session-1',
      proxyUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
    });

    const result = await runtime.runIkaScenario({ intentId: 'ika-allow-1' });

    expect(result.scenario).toBe('ika-sui');
    expect(result.decision).toBe('allowed');
    expect(result.intent.id).toBe('ika-allow-1');
    expect(result.intent.action).toBe('multichain-strategy');
    expect(result.intent.params.executionRail).toBe('ika');
    expect(result.intent.params.sourceChain).toBe('solana');
    expect(result.intent.params.targetChain).toBe('sui');
    expect(result.intent.params.amount).toBe('5');
    expect('maskedWitnessDevFixture' in result.intent.params).toBe(false);
    expect(requests[0].url).toBe('https://proxy.polet.ai/intent/multichain/run');
    expect(requests[0].body).toMatchObject({
      owner: 'owner-1',
      sessionKey: 'session-1',
      action: 'multichain-strategy',
      params: {
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: 'sui',
        targetAsset: 'SUI',
        amount: '5',
        executionRail: 'ika',
      },
    });
    expect(result.proxyResponse.data?.ikaRequest?.preAlphaSigning).toMatchObject({
      dwalletAccount: 'dwallet-1',
      ikaMessageHash: 'ika-message-hash-1',
      messageDigest: 'ika-message-hash-1',
      messageApprovalPda: 'message-approval-pda',
      cpiAuthorityPda: 'cpi-authority-pda',
      signatureScheme: 'ed25519-prealpha',
    });
    expect(result.proxyResponse.data?.ikaRequest?.poletApprovalTransaction?.signers).toEqual(['session-1']);
  });

  test('runs the final hybrid demo sequence across Encrypt, Jupiter, and Ika', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchMock = async (input: URL | RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(init?.body?.toString() ?? '{}');
      requests.push({ url: input.toString(), body });

      if (body.amountUsdc === '25') {
        return Response.json({
          success: true,
          data: {
            allowed: false,
            code: 'CONFIDENTIAL_POLICY_BLOCKED',
            reason: 'Confidential policy blocked this DCA run.',
          },
        });
      }

      if (body.action === 'multichain-strategy') {
        return Response.json({
          success: true,
          data: {
            allowed: true,
            code: 'IKA_BRIDGELESS_REQUEST_READY',
            ikaRequest: {
              executionRail: 'ika-bridgeless',
              settlement: 'not-executed',
              requestId: 'ika-hybrid-request',
              source: { chain: 'solana', asset: 'USDC' },
              target: { chain: 'sui', asset: 'SUI' },
              amount: '5',
            },
          },
        });
      }

      return Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'DCA_ALLOWED',
          executionPath: 'swap-build-fallback',
          smartWalletAuthority: 'wallet-pda',
          transaction: {
            signers: ['session-1'],
          },
        },
      });
    };
    const runtime = createLocalAgentRuntime({
      owner: 'owner-1',
      sessionKey: 'session-1',
      proxyUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
    });

    const result = await runtime.runHybridDemo();

    expect(result.scenario).toBe('hybrid');
    expect(result.summary).toEqual({
      blockedDca: 'blocked',
      jupiterDca: 'allowed',
      ikaBridgeless: 'allowed',
    });
    expect(result.steps.map((step) => step.name)).toEqual([
      'blocked-dca',
      'approved-jupiter-dca',
      'approved-ika-bridgeless',
    ]);
    expect(requests.map((request) => request.url)).toEqual([
      'https://proxy.polet.ai/intent/dca/run',
      'https://proxy.polet.ai/intent/dca/run',
      'https://proxy.polet.ai/intent/multichain/run',
    ]);
    expect(JSON.stringify(result)).not.toContain('10 USDC');
    expect(JSON.stringify(result)).not.toContain('20 USDC');
    expect(JSON.stringify(requests)).not.toContain('maskedWitnessDevFixture');
  });

  test('routes SDK-created multichain intents through submitIntent', async () => {
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
          code: 'IKA_BRIDGELESS_REQUEST_READY',
        },
      });
    };
    const intent = createMultichainStrategyIntent({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sourceChain: 'solana',
      sourceAsset: 'USDC',
      targetChain: 'sui',
      targetAsset: 'SUI',
      amount: '5',
      executionRail: 'ika',
      maskedWitnessDevFixture: Array.from({ length: 32 }, (_, index) => index + 1),
      intentId: 'submit-ika-1',
    });

    await submitIntent(intent, {
      baseUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
    });

    expect(requests[0].url).toBe('https://proxy.polet.ai/intent/multichain/run');
    expect(requests[0].body).toMatchObject({
      id: 'submit-ika-1',
      action: 'multichain-strategy',
      params: {
        executionRail: 'ika',
        amount: '5',
      },
    });
  });
});
