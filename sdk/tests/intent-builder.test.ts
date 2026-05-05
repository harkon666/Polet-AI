import { describe, expect, test } from 'bun:test';
import {
  createTransferIntent,
  createSwapIntent,
  createStakeIntent,
  createCustomIntent,
  createUnstakeIntent,
  createDelegateIntent,
  createUndelegateIntent,
  createDcaIntent,
  createMultichainStrategyIntent,
  createPoletAgent,
  createRiskGatedSwapIntent,
  broadcastIkaDestinationDemo,
  evaluateIntentWithProxy,
  isValidIntent,
  submitIntent,
  generateIntentId,
  ProxyRequestError,
  JUPITER_USDC_MINT,
  JUPITER_SOL_MINT,
  type Intent,
  type TransferParams,
  type SwapParams,
  type StakeParams,
  type CustomParams,
} from '../src/index.js';

/**
 * SDK tests - these verify the public interface that AI agent developers use.
 * Tests describe BEHAVIOR, not implementation.
 */

describe('Polet AI SDK - Intent Builder', () => {
  describe('createTransferIntent', () => {
    test('creates a valid transfer intent with required fields', () => {
      const intent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
      });

      expect(intent.id).toBeDefined();
      expect(intent.owner).toBe('AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2');
      expect(intent.sessionKey).toBe('BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4');
      expect(intent.action).toBe('transfer');
      expect(intent.params.destination).toBe('CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
      expect(intent.params.amount).toBe(1000000);
      expect(intent.timestamp).toBeDefined();
      expect(typeof intent.timestamp).toBe('number');
    });

    test('creates transfer intent with mint parameter for tokens', () => {
      const intent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
      });

      expect(intent.params.mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    test('creates transfer intent with optional policyHash', () => {
      const intent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        policyHash: 'policy-hash-123',
      });

      expect(intent.policyHash).toBe('policy-hash-123');
    });

    test('uses provided intentId if given', () => {
      const intent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        intentId: 'custom-intent-id-123',
      });

      expect(intent.id).toBe('custom-intent-id-123');
    });
  });

  describe('createSwapIntent', () => {
    test('creates a valid swap intent', () => {
      const intent = createSwapIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        inputMint: 'So11111111111111111111111111111111111111112', // wSOL
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        inputAmount: 1000000000, // 1 SOL in lamports
        minOutputAmount: 150000000, // min 150 USDC (assuming price)
      });

      expect(intent.action).toBe('swap');
      expect(intent.params.inputMint).toBe('So11111111111111111111111111111111111111112');
      expect(intent.params.outputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(intent.params.inputAmount).toBe(1000000000);
      expect(intent.params.minOutputAmount).toBe(150000000);
    });
  });

  describe('createDcaIntent', () => {
    test('creates a valid USDC to SOL DCA strategy intent', () => {
      const witness = Array.from({ length: 32 }, (_, index) => index);
      const intent = createDcaIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        amountUsdc: 5,
        encryptionWitness: witness,
        slippageBps: 75,
        intentId: 'dca-demo-1',
      });

      expect(intent.id).toBe('dca-demo-1');
      expect(intent.action).toBe('dca');
      expect(intent.params.amountUsdc).toBe(5);
      expect(intent.params.inputMint).toBe(JUPITER_USDC_MINT);
      expect(intent.params.outputMint).toBe(JUPITER_SOL_MINT);
      expect(intent.params.encryptionWitness).toEqual(witness);
      expect(intent.params.slippageBps).toBe(75);
      expect(isValidIntent(intent)).toBe(true);
    });
  });

  describe('createMultichainStrategyIntent', () => {
    test('creates a valid multichain strategy intent for the current Solana Jupiter path', () => {
      const witness = Array.from({ length: 32 }, (_, index) => index + 1);
      const intent = createMultichainStrategyIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        sourceMint: JUPITER_USDC_MINT,
        targetChain: 'solana',
        targetAsset: 'SOL',
        targetMint: JUPITER_SOL_MINT,
        amount: '5',
        executionRail: 'jupiter',
        encryptionWitness: witness,
        intentId: 'multichain-1',
      });

      expect(intent.id).toBe('multichain-1');
      expect(intent.action).toBe('multichain-strategy');
      expect(intent.params.sourceChain).toBe('solana');
      expect(intent.params.sourceAsset).toBe('USDC');
      expect(intent.params.targetChain).toBe('solana');
      expect(intent.params.targetAsset).toBe('SOL');
      expect(intent.params.amount).toBe('5');
      expect(intent.params.executionRail).toBe('jupiter');
      expect(intent.params.encryptionWitness).toEqual(witness);
      expect(isValidIntent(intent)).toBe(true);
    });

    test('keeps optional Ika Pre-Alpha signing metadata on explicit multichain intents', () => {
      const intent = createMultichainStrategyIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: 'sui',
        targetAsset: 'SUI',
        amount: '5',
        executionRail: 'ika',
        encryptionWitness: Array.from({ length: 32 }, () => 1),
        ikaPreAlpha: {
          dwalletAccount: 'DwALLET1111111111111111111111111111111111',
          userPublicKey: 'User1111111111111111111111111111111111111',
          signatureScheme: 'ecdsa-secp256k1-sha256',
        },
      });

      expect(intent.params.ikaPreAlpha).toEqual({
        dwalletAccount: 'DwALLET1111111111111111111111111111111111',
        userPublicKey: 'User1111111111111111111111111111111111111',
        signatureScheme: 'ecdsa-secp256k1-sha256',
      });
    });
  });

  describe('createRiskGatedSwapIntent', () => {
    test('keeps swap compatibility while adding risk gate metadata', () => {
      const intent = createRiskGatedSwapIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        inputMint: JUPITER_USDC_MINT,
        outputMint: JUPITER_SOL_MINT,
        inputAmount: 5_000_000,
        minOutputAmount: 30_000_000,
        slippageBps: 100,
        risk: {
          maxPriceImpactBps: 50,
          requireVerifiedTokens: true,
        },
      });

      expect(intent.action).toBe('swap');
      expect(intent.params.inputMint).toBe(JUPITER_USDC_MINT);
      expect(intent.params.outputMint).toBe(JUPITER_SOL_MINT);
      expect(intent.params.inputAmount).toBe(5_000_000);
      expect(intent.params.minOutputAmount).toBe(30_000_000);
      expect(intent.params.strategy).toBe('risk-gated-swap');
      expect(intent.params.risk).toEqual({
        maxSlippageBps: 100,
        maxPriceImpactBps: 50,
        requireVerifiedTokens: true,
      });
      expect(isValidIntent(intent)).toBe(true);
    });
  });

  describe('createStakeIntent', () => {
    test('creates a valid stake intent', () => {
      const intent = createStakeIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        validator: 'GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x',
        amount: 5000000000, // 5 SOL
      });

      expect(intent.action).toBe('stake');
      expect(intent.params.validator).toBe('GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x');
      expect(intent.params.amount).toBe(5000000000);
    });
  });

  describe('createCustomIntent', () => {
    test('creates a valid custom intent for arbitrary program interaction', () => {
      const intent = createCustomIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        instructionData: 'base64-encoded-data',
        accounts: [
          'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
          'DxY0lq0rDmQafX2Y22Uj36tB6jzC3mD1kN5oX8yT4zA',
        ],
      });

      expect(intent.action).toBe('custom');
      expect(intent.params.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(intent.params.instructionData).toBe('base64-encoded-data');
      expect(intent.params.accounts).toHaveLength(2);
    });
  });

  describe('createUnstakeIntent', () => {
    test('creates a valid unstake intent', () => {
      const intent = createUnstakeIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        validator: 'GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x',
        amount: 1000000000, // 1 SOL
      });

      expect(intent.action).toBe('unstake');
      expect(intent.params.validator).toBe('GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x');
      expect(intent.params.amount).toBe(1000000000);
    });
  });

  describe('createDelegateIntent', () => {
    test('creates a valid delegate intent', () => {
      const intent = createDelegateIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        target: 'ExZ9kp0sClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 2500000000, // 2.5 SOL
      });

      expect(intent.action).toBe('delegate');
      expect(intent.params.target).toBe('ExZ9kp0sClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
      expect(intent.params.amount).toBe(2500000000);
    });
  });

  describe('createUndelegateIntent', () => {
    test('creates a valid undelegate intent', () => {
      const intent = createUndelegateIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        target: 'ExZ9kp0sClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000000,
      });

      expect(intent.action).toBe('undelegate');
      expect(intent.params.target).toBe('ExZ9kp0sClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
      expect(intent.params.amount).toBe(1000000000);
    });
  });

  describe('isValidIntent', () => {
    test('returns true for a valid intent', () => {
      const intent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
      });

      expect(isValidIntent(intent)).toBe(true);
    });

    test('returns false for an invalid intent (missing fields)', () => {
      const invalidIntent = {
        id: 'test-id',
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        // missing sessionKey
        action: 'transfer',
        params: { destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', amount: 1000000 },
        timestamp: Date.now(),
      } as Intent;

      expect(isValidIntent(invalidIntent)).toBe(false);
    });

    test('returns false for invalid action type', () => {
      const invalidIntent = {
        id: 'test-id',
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        action: 'invalid_action',
        params: {},
        timestamp: Date.now(),
      } as Intent;

      expect(isValidIntent(invalidIntent)).toBe(false);
    });
  });

  describe('generateIntentId', () => {
    test('generates a unique string id', () => {
      const id1 = generateIntentId();
      const id2 = generateIntentId();

      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2); // should be unique
    });
  });

  describe('end-to-end: AI agent submits intent', () => {
    test('complete flow: create intent and validate for submission', () => {
      // Simulate AI agent creating an intent
      const transferIntent = createTransferIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 50000000, // 0.05 SOL
        policyHash: 'QmXz123456789',
      });

      // Validate before sending to proxy
      expect(isValidIntent(transferIntent)).toBe(true);

      // Intent should have all fields needed for proxy submission
      expect(transferIntent.id).toBeDefined();
      expect(transferIntent.owner).toBeDefined();
      expect(transferIntent.sessionKey).toBeDefined();
      expect(transferIntent.action).toBe('transfer');
      expect(transferIntent.timestamp).toBeDefined();

      // Serialize to JSON for submission
      const jsonPayload = JSON.stringify(transferIntent);
      expect(() => JSON.parse(jsonPayload)).not.toThrow();
    });

    test('create swap intent for Jupiter trading', () => {
      const swapIntent = createSwapIntent({
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inputAmount: 1000000000, // 1 SOL
        minOutputAmount: 140000000, // min 140 USDC (with slippage)
        policyHash: 'QmXz123456789',
      });

      expect(isValidIntent(swapIntent)).toBe(true);
      const jsonPayload = JSON.stringify(swapIntent);
      const parsed = JSON.parse(jsonPayload);
      expect(parsed.action).toBe('swap');
    });
  });

  describe('proxy helpers', () => {
    test('submitIntent sends DCA intents to the DCA run endpoint', async () => {
      const requests: Array<{ url: string; body: unknown }> = [];
      const fetchMock = async (input: URL | RequestInfo, init?: RequestInit) => {
        requests.push({
          url: input.toString(),
          body: JSON.parse(init?.body?.toString() ?? '{}'),
        });
        return Response.json({ success: true, data: { allowed: true, code: 'DCA_ALLOWED' } });
      };

      const result = await submitIntent(
        createDcaIntent({
          owner: 'owner-1',
          sessionKey: 'session-1',
          amountUsdc: '5',
          encryptionWitness: Array.from({ length: 32 }, () => 1),
        }),
        { baseUrl: 'https://proxy.polet.ai', fetch: fetchMock }
      );

      expect(result).toEqual({ success: true, data: { allowed: true, code: 'DCA_ALLOWED' } });
      expect(requests[0].url).toBe('https://proxy.polet.ai/intent/dca/run');
      expect(requests[0].body).toMatchObject({
        owner: 'owner-1',
        sessionKey: 'session-1',
        amountUsdc: '5',
        inputMint: JUPITER_USDC_MINT,
        outputMint: JUPITER_SOL_MINT,
      });
    });

    test('submitIntent sends multichain strategy intents to the multichain endpoint', async () => {
      const requests: Array<{ url: string; body: unknown }> = [];
      const fetchMock = async (input: URL | RequestInfo, init?: RequestInit) => {
        requests.push({
          url: input.toString(),
          body: JSON.parse(init?.body?.toString() ?? '{}'),
        });
        return Response.json({ success: true, data: { allowed: true, code: 'DCA_ALLOWED' } });
      };

      const intent = createMultichainStrategyIntent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: 'solana',
        targetAsset: 'SOL',
        amount: '5',
        executionRail: 'jupiter',
        encryptionWitness: Array.from({ length: 32 }, () => 1),
      });

      const result = await submitIntent(intent, {
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
      });

      expect(result).toEqual({ success: true, data: { allowed: true, code: 'DCA_ALLOWED' } });
      expect(requests[0].url).toBe('https://proxy.polet.ai/intent/multichain/run');
      expect(requests[0].body).toMatchObject({
        action: 'multichain-strategy',
        params: {
          sourceChain: 'solana',
          sourceAsset: 'USDC',
          targetChain: 'solana',
          targetAsset: 'SOL',
          executionRail: 'jupiter',
        },
      });
    });

    test('evaluateIntentWithProxy sends legacy intents to the legacy evaluate endpoint', async () => {
      const requests: string[] = [];
      const fetchMock = async (input: URL | RequestInfo) => {
        requests.push(input.toString());
        return Response.json({ success: true, data: { allowed: true } });
      };
      const intent = createTransferIntent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        destination: 'destination-1',
        amount: 1,
      });

      const result = await evaluateIntentWithProxy(intent, {
        baseUrl: 'https://proxy.polet.ai/',
        fetch: fetchMock,
      });

      expect(result).toEqual({ success: true, data: { allowed: true } });
      expect(requests).toEqual(['https://proxy.polet.ai/legacy/intent/evaluate']);
    });

    test('broadcastIkaDestinationDemo sends produced Pre-Alpha signatures to the narrow broadcast endpoint', async () => {
      const requests: Array<{ url: string; body: unknown }> = [];
      const fetchMock = async (input: URL | RequestInfo, init?: RequestInit) => {
        requests.push({
          url: input.toString(),
          body: JSON.parse(init?.body?.toString() ?? '{}'),
        });
        return Response.json({
          success: true,
          data: {
            ok: true,
            status: 'broadcast-submitted',
            receipt: {
              chain: 'solana',
              cluster: 'devnet',
              action: 'memo-proof',
              transactionId: 'tx-1',
              explorerUrl: 'https://explorer.solana.com/tx/tx-1?cluster=devnet',
            },
          },
        });
      };

      const result = await broadcastIkaDestinationDemo({
        ikaRequest: { requestId: 'ika-1' },
        producedSignature: {
          status: 'signature-produced-prealpha',
          signature: 'a'.repeat(64),
          publicKey: '11111111111111111111111111111111',
          messageDigest: 'b'.repeat(64),
          signatureScheme: 'ecdsa-secp256k1-sha256',
        },
      }, {
        baseUrl: 'https://proxy.polet.ai/',
        fetch: fetchMock,
      });

      expect(result.status).toBe('broadcast-submitted');
      expect(result.receipt?.transactionId).toBe('tx-1');
      expect(requests[0].url).toBe('https://proxy.polet.ai/intent/ika/destination-broadcast');
      expect(requests[0].body).toMatchObject({
        ikaRequest: { requestId: 'ika-1' },
        producedSignature: {
          status: 'signature-produced-prealpha',
          messageDigest: 'b'.repeat(64),
        },
      });
    });

    test('submitIntent throws ProxyRequestError when the proxy rejects the request', async () => {
      const fetchMock = async () => Response.json({
        success: false,
        error: {
          code: 'SESSION_NOT_AUTHORIZED',
          message: 'Session key is not authorized for this wallet',
        },
      }, { status: 403 });
      const intent = createTransferIntent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        destination: 'destination-1',
        amount: 1,
      });

      await expect(submitIntent(intent, {
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
      })).rejects.toThrow(ProxyRequestError);
    });
  });

  describe('createPoletAgent trade API', () => {
    test('submits a simple USDC to SOL trade through the Jupiter DCA adapter', async () => {
      const requests: Array<{ url: string; body: unknown }> = [];
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
            executionPath: 'jupiter-swap-v2-build',
            smartWalletTransaction: { unsignedTransaction: 'base64-tx' },
            route: { inputMint: JUPITER_USDC_MINT, outputMint: JUPITER_SOL_MINT },
          },
        });
      };

      const polet = createPoletAgent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
        encryptionWitness: Array.from({ length: 32 }, () => 7),
      });

      const result = await polet.trade({ from: 'USDC', to: 'SOL', amount: '5' });

      expect(result.allowed).toBe(true);
      expect(result.rail).toBe('jupiter');
      expect(result.status).toBe('preview-ready');
      expect(result.settlement).toBe('not-executed');
      expect(result.execution?.path).toBe('jupiter-swap-v2-build');
      expect(requests[0].url).toBe('https://proxy.polet.ai/intent/dca/run');
      expect(requests[0].body).toMatchObject({
        owner: 'owner-1',
        sessionKey: 'session-1',
        amountUsdc: '5',
        inputMint: JUPITER_USDC_MINT,
        outputMint: JUPITER_SOL_MINT,
      });
    });

    test('submits an explicit Ika trade through the multichain adapter', async () => {
      const requests: Array<{ url: string; body: unknown }> = [];
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
              requestId: 'ika-request-1',
              executionBoundary: { status: 'request-prepared' },
            },
          },
        });
      };

      const polet = createPoletAgent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
      });

      const result = await polet.trade({
        rail: 'ika',
        from: { chain: 'solana', asset: 'USDC', mint: JUPITER_USDC_MINT },
        to: { chain: 'sui', asset: 'SUI' },
        amount: '5',
        strategy: 'dca',
        slippageBps: 100,
        encryptionWitness: Array.from({ length: 32 }, () => 3),
      });

      expect(result.allowed).toBe(true);
      expect(result.rail).toBe('ika');
      expect(result.status).toBe('request-prepared');
      expect(result.settlement).toBe('not-executed');
      expect(result.execution?.requestId).toBe('ika-request-1');
      expect(requests[0].url).toBe('https://proxy.polet.ai/intent/multichain/run');
      expect(requests[0].body).toMatchObject({
        action: 'multichain-strategy',
        params: {
          sourceChain: 'solana',
          sourceAsset: 'USDC',
          targetChain: 'sui',
          targetAsset: 'SUI',
          executionRail: 'ika',
          amount: '5',
        },
      });
    });

    test('normalizes Ika Pre-Alpha message approval status from proxy responses', async () => {
      const fetchMock = async () => Response.json({
        success: true,
        data: {
          allowed: true,
          code: 'IKA_PREALPHA_MESSAGE_APPROVED',
          status: 'message-approved',
          ikaRequest: {
            executionRail: 'ika-bridgeless',
            settlement: 'not-executed',
            requestId: 'ika-request-1',
            executionBoundary: { status: 'message-approved' },
            preAlphaSigning: {
              status: 'message-approved',
              messageApprovalPda: 'message-approval-pda',
            },
          },
        },
      });
      const polet = createPoletAgent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
        encryptionWitness: Array.from({ length: 32 }, () => 2),
      });

      const result = await polet.trade({
        rail: 'ika',
        from: { chain: 'solana', asset: 'USDC' },
        to: { chain: 'sui', asset: 'SUI' },
        amount: '5',
      });

      expect(result.allowed).toBe(true);
      expect(result.status).toBe('message-approved');
      expect(result.policy.code).toBe('IKA_PREALPHA_MESSAGE_APPROVED');
      expect(result.details?.preAlphaSigning).toMatchObject({
        status: 'message-approved',
        messageApprovalPda: 'message-approval-pda',
      });
    });

    test('normalizes blocked policy responses without returning witness bytes', async () => {
      const witness = Array.from({ length: 32 }, (_, index) => index + 1);
      const fetchMock = async () => Response.json({
        success: true,
        data: {
          allowed: false,
          code: 'CONFIDENTIAL_POLICY_BLOCKED',
          reason: 'Confidential policy blocked this DCA run.',
        },
      });
      const polet = createPoletAgent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        baseUrl: 'https://proxy.polet.ai',
        fetch: fetchMock,
        encryptionWitness: witness,
      });

      const result = await polet.trade({ from: 'USDC', to: 'SOL', amount: '25' });

      expect(result.allowed).toBe(false);
      expect(result.status).toBe('blocked');
      expect(result.settlement).toBe('not-executed');
      expect(result.policy.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect(JSON.stringify(result)).not.toContain(witness.join(','));
    });

    test('normalizes unsupported routes without calling the proxy', async () => {
      let requestCount = 0;
      const polet = createPoletAgent({
        owner: 'owner-1',
        sessionKey: 'session-1',
        baseUrl: 'https://proxy.polet.ai',
        fetch: async () => {
          requestCount += 1;
          return Response.json({ success: true });
        },
        encryptionWitness: Array.from({ length: 32 }, () => 1),
      });

      const result = await polet.trade({
        rail: 'jupiter',
        from: { chain: 'ethereum', asset: 'USDC' },
        to: { chain: 'solana', asset: 'SOL' },
        amount: '5',
      });

      expect(result.allowed).toBe(false);
      expect(result.rail).toBe('jupiter');
      expect(result.status).toBe('not-supported');
      expect(result.settlement).toBe('not-executed');
      expect(requestCount).toBe(0);
    });
  });
});
