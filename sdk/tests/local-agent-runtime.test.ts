import { describe, expect, test } from 'bun:test';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  createMultichainStrategyIntent,
  createLocalAgentRuntime,
  createPoletAgentKit,
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

  test('auto-executes an allowed Jupiter transaction after signer and simulation checks', async () => {
    const agent = Keypair.generate();
    const transaction = buildUnsignedAgentTransaction(agent);
    const calls: string[] = [];
    const fetchMock = async () => Response.json({
      success: true,
      data: {
        allowed: true,
        code: 'DCA_ALLOWED',
        executionPath: 'policy-gated-custody-trade',
        transaction: {
          transaction,
          signers: [agent.publicKey.toBase58()],
        },
      },
    });
    const kit = createPoletAgentKit({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      baseUrl: 'https://proxy.polet.ai',
      fetch: fetchMock,
      agentSigner: () => agent,
      connection: {
        async simulateTransaction() {
          calls.push('simulate');
          return { context: { slot: 1 }, value: { err: null, logs: ['ok'] } };
        },
        async sendRawTransaction() {
          calls.push('send');
          return 'submitted-signature-1';
        },
      },
    });

    const result = await kit.autoExecuteTrade({
      from: 'USDC',
      to: 'SOL',
      amount: '5',
    });

    expect(result.status).toBe('submitted');
    expect(result.signature).toBe('submitted-signature-1');
    expect(result.requiredSigners).toEqual([agent.publicKey.toBase58()]);
    expect(calls).toEqual(['simulate', 'send']);
  });

  test('refuses auto-execute when unsigned transaction does not require configured agent signer', async () => {
    const agent = Keypair.generate();
    const other = Keypair.generate();
    const transaction = buildUnsignedAgentTransaction(other);
    const kit = createPoletAgentKit({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      baseUrl: 'https://proxy.polet.ai',
      fetch: async () => Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'DCA_ALLOWED',
          transaction: {
            transaction,
            signers: [other.publicKey.toBase58()],
          },
        },
      }),
      agentSigner: agent,
      connection: {
        async simulateTransaction() {
          throw new Error('must not simulate before signer check passes');
        },
      },
    });

    const result = await kit.autoExecuteTrade({ from: 'USDC', to: 'SOL', amount: '5' });

    expect(result.status).toBe('signer-required');
    expect(result.agentSigner).toBe(agent.publicKey.toBase58());
    expect(result.requiredSigners).toEqual([other.publicKey.toBase58()]);
  });

  test('stops auto-execute when simulation fails', async () => {
    const agent = Keypair.generate();
    const transaction = buildUnsignedAgentTransaction(agent);
    const kit = createPoletAgentKit({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      baseUrl: 'https://proxy.polet.ai',
      fetch: async () => Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'DCA_ALLOWED',
          transaction: {
            transaction,
            signers: [agent.publicKey.toBase58()],
          },
        },
      }),
      agentSigner: agent,
      connection: {
        async simulateTransaction() {
          return { context: { slot: 1 }, value: { err: { InstructionError: [0, 'Custom'] }, logs: ['blocked by runtime'] } };
        },
        async sendRawTransaction() {
          throw new Error('must not send after failed simulation');
        },
      },
    });

    const result = await kit.autoExecuteTrade({ from: 'USDC', to: 'SOL', amount: '5' });

    expect(result.status).toBe('simulation-failed');
    expect(result.ok).toBe(false);
    expect(result.simulation?.ok).toBe(false);
  });

  test('normalizes blocked and revoked session responses without broadcasting', async () => {
    const agent = Keypair.generate();
    const blockedKit = createPoletAgentKit({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      baseUrl: 'https://proxy.polet.ai',
      fetch: async () => Response.json({
        success: true,
        data: {
          allowed: false,
          code: 'CONFIDENTIAL_POLICY_BLOCKED',
          reason: 'Confidential policy blocked this DCA run.',
        },
      }),
      agentSigner: agent,
    });
    const revokedKit = createPoletAgentKit({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      baseUrl: 'https://proxy.polet.ai',
      fetch: async () => Response.json({
        success: true,
        data: {
          allowed: false,
          code: 'SESSION_NOT_AUTHORIZED',
          reason: 'Session is not authorized for this wallet.',
        },
      }),
      agentSigner: agent,
    });

    const blocked = await blockedKit.autoExecuteTrade({ from: 'USDC', to: 'SOL', amount: '25' });
    const revoked = await revokedKit.autoExecuteTrade({ from: 'USDC', to: 'SOL', amount: '5' });

    expect(blocked.status).toBe('not-executed');
    expect(blocked.outcome.decision).toBe('blocked');
    expect(JSON.stringify(blocked)).not.toContain('10 USDC');
    expect(JSON.stringify(blocked)).not.toContain('20 USDC');
    expect(revoked.status).toBe('not-executed');
    expect(revoked.outcome.decision).toBe('blocked');
    expect(revoked.trade.policy.code).toBe('SESSION_NOT_AUTHORIZED');
  });

  test('local runtime exposes the auto-execute DCA scenario', async () => {
    const agent = Keypair.generate();
    const transaction = buildUnsignedAgentTransaction(agent);
    const runtime = createLocalAgentRuntime({
      owner: 'owner-1',
      sessionKey: agent.publicKey.toBase58(),
      proxyUrl: 'https://proxy.polet.ai',
      agentSigner: agent,
      fetch: async () => Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'DCA_ALLOWED',
          transaction: {
            transaction,
            signers: [agent.publicKey.toBase58()],
          },
        },
      }),
      connection: {
        async simulateTransaction() {
          return { context: { slot: 1 }, value: { err: null, logs: [] } };
        },
        async sendRawTransaction() {
          return 'runtime-signature-1';
        },
      },
    });

    const result = await runtime.runDcaAutoExecuteScenario({ intentId: 'runtime-auto-1' });

    expect(result.intent.id).toBe('runtime-auto-1');
    expect(result.decision).toBe('submitted');
    expect(result.execution.signature).toBe('runtime-signature-1');
  });
});

function buildUnsignedAgentTransaction(agent: Keypair): string {
  const transaction = new Transaction({
    feePayer: agent.publicKey,
    recentBlockhash: '11111111111111111111111111111111',
  }).add(SystemProgram.transfer({
    fromPubkey: agent.publicKey,
    toPubkey: Keypair.generate().publicKey,
    lamports: 1,
  }));

  return transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');
}
