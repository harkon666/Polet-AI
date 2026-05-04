import { describe, expect, test } from 'bun:test';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  JupiterGatewayError,
  createJupiterStrategyGateway,
} from '../src/lib/jupiter-gateway';

const TAKER = 'PoLetDcaWallet1111111111111111111111111111111';

describe('Jupiter Strategy Gateway', () => {
  test('fetches token metadata, prices, and Swap V2 build instructions for fallback DCA', async () => {
    const requestedUrls: string[] = [];
    const gateway = createJupiterStrategyGateway({
      apiKey: 'test-key',
      fetch: mockFetch((url) => {
        requestedUrls.push(url.toString());
        if (url.pathname.endsWith('/tokens/v2/search')) {
          expect(url.searchParams.get('query')).toBe(`${JUPITER_USDC_MINT},${JUPITER_SOL_MINT}`);
          return jsonResponse([
            {
              id: JUPITER_USDC_MINT,
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              isVerified: true,
              organicScore: 99,
              organicScoreLabel: 'high',
              tags: ['verified', 'strict'],
              audit: { mintAuthorityDisabled: true, freezeAuthorityDisabled: true },
            },
            {
              id: JUPITER_SOL_MINT,
              symbol: 'SOL',
              name: 'Wrapped SOL',
              decimals: 9,
              isVerified: true,
              organicScore: 98,
              organicScoreLabel: 'high',
              tags: ['verified', 'strict'],
            },
          ]);
        }
        if (url.pathname.endsWith('/price/v3')) {
          expect(url.searchParams.get('ids')).toBe(`${JUPITER_USDC_MINT},${JUPITER_SOL_MINT}`);
          return jsonResponse({
            [JUPITER_USDC_MINT]: { usdPrice: 1 },
            [JUPITER_SOL_MINT]: { usdPrice: 145.5 },
          });
        }
        if (url.pathname.endsWith('/swap/v2/build')) {
          expect(url.searchParams.get('inputMint')).toBe(JUPITER_USDC_MINT);
          expect(url.searchParams.get('outputMint')).toBe(JUPITER_SOL_MINT);
          expect(url.searchParams.get('amount')).toBe('5000000');
          expect(url.searchParams.get('taker')).toBe(TAKER);
          expect(url.searchParams.get('slippageBps')).toBe('100');
          return jsonResponse(mockBuildResponse());
        }
        return jsonResponse({ error: 'not found' }, 404);
      }),
    });

    const plan = await gateway.prepareDcaStrategy({
      inputMint: JUPITER_USDC_MINT,
      outputMint: JUPITER_SOL_MINT,
      amount: 5_000_000,
      taker: TAKER,
      slippageBps: 100,
    });

    expect(plan.inputToken.symbol).toBe('USDC');
    expect(plan.outputToken.symbol).toBe('SOL');
    expect(plan.prices[JUPITER_SOL_MINT].usdPrice).toBe(145.5);
    expect(plan.recurring.compatible).toBe(false);
    expect(plan.executionPath).toBe('swap-build-fallback');
    expect(plan.build?.swapInstruction.programId).toBe('JUP6LkbZbjS1jKKwapdH673zwLsBH3M427A871qYx1W');
    expect(requestedUrls.some((url) => url.includes('/tokens/v2/search'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/price/v3'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/swap/v2/build'))).toBe(true);
  });

  test('requires a Jupiter API key by default', async () => {
    const gateway = createJupiterStrategyGateway({
      apiKey: '',
      fetch: mockFetch(() => jsonResponse([])),
    });

    await expect(gateway.fetchTokenMetadata([JUPITER_USDC_MINT])).rejects.toThrow('Missing JUPITER_API_KEY');
  });

  test('surfaces Jupiter API failures with status and body', async () => {
    const gateway = createJupiterStrategyGateway({
      apiKey: 'test-key',
      fetch: mockFetch(() => jsonResponse({ message: 'rate limited' }, 429)),
    });

    try {
      await gateway.fetchPrices([JUPITER_USDC_MINT]);
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(JupiterGatewayError);
      expect((error as JupiterGatewayError).code).toBe('JUPITER_API_ERROR');
      expect((error as JupiterGatewayError).status).toBe(429);
      expect((error as JupiterGatewayError).body).toContain('rate limited');
    }
  });

  test('records Recurring as incompatible and selects Swap V2 build fallback', () => {
    const gateway = createJupiterStrategyGateway({
      apiKey: 'test-key',
      fetch: mockFetch(() => jsonResponse({})),
    });

    const recurring = gateway.probeRecurringCompatibility();

    expect(recurring.compatible).toBe(false);
    expect(recurring.mode).toBe('swap-build-fallback');
    expect(recurring.reason).toContain('Swap V2 /build fallback');
    expect(recurring.requirements.length).toBeGreaterThan(0);
  });
});

function mockBuildResponse() {
  return {
    inputMint: JUPITER_USDC_MINT,
    outputMint: JUPITER_SOL_MINT,
    inAmount: '5000000',
    outAmount: '34400',
    otherAmountThreshold: '34000',
    swapMode: 'ExactIn',
    slippageBps: 100,
    routePlan: [],
    computeBudgetInstructions: [],
    setupInstructions: [],
    swapInstruction: {
      programId: 'JUP6LkbZbjS1jKKwapdH673zwLsBH3M427A871qYx1W',
      accounts: [
        { pubkey: TAKER, isSigner: true, isWritable: true },
      ],
      data: 'AQID',
    },
    cleanupInstruction: null,
    otherInstructions: [],
    tipInstruction: null,
    addressesByLookupTableAddress: null,
    blockhashWithMetadata: {
      blockhash: Array.from({ length: 32 }, (_, index) => index),
      lastValidBlockHeight: 123,
    },
  };
}

function mockFetch(handler: (url: URL, init?: RequestInit) => Response): typeof fetch {
  return ((input: URL | RequestInfo, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(input.toString());
    expect((init?.headers as Record<string, string> | undefined)?.accept).toBe('application/json');
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
