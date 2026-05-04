import { createHash } from 'crypto';
import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  JUPITER_SOL_MINT,
  JUPITER_USDC_MINT,
  createJupiterStrategyGateway,
} from '../src/lib/jupiter-gateway';
import {
  deriveWalletPda,
  runConfidentialDcaExecution,
} from '../src/lib/confidential-dca-execution';
import type { WalletData } from '../src/lib/wallet-store';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('Confidential DCA execution path', () => {
  test('allows a 5 USDC run after Jupiter prechecks and uses the wallet PDA as authority', async () => {
    const fixture = createFixture();
    const requestedUrls: string[] = [];

    const result = await runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 5,
        encryptionWitness: Array.from(fixture.witness),
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway: mockGateway(requestedUrls),
        buildTransaction: async (request) => {
          expect(request.wallet).toBe(fixture.wallet.walletPda);
          expect(request.sessionKey).toBe(fixture.sessionKey);
          expect(request.amount.toString()).toBe('5000000');
          return mockBuiltTransaction(fixture.sessionKey);
        },
      }
    );

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.code).toBe('DCA_ALLOWED');
      expect(result.amount).toBe('5');
      expect(result.amountBaseUnits).toBe('5000000');
      expect(result.smartWalletAuthority).toBe(fixture.wallet.walletPda);
      expect(result.jupiterPlan.executionPath).toBe('swap-build-fallback');
      expect(result.jupiterPlan.build?.swapInstruction.accounts[0].pubkey).toBe(fixture.wallet.walletPda);
      expect(result.transaction.signers).toEqual([fixture.sessionKey]);
    }

    expect(requestedUrls.some((url) => url.includes('/tokens/v2/search'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/price/v3'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/swap/v2/build'))).toBe(true);
  });

  test('blocks a 25 USDC run without leaking the confidential threshold', async () => {
    const fixture = createFixture();
    const result = await runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 25,
        encryptionWitness: Array.from(fixture.witness),
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway: mockGateway(),
        buildTransaction: async () => {
          throw new Error('blocked runs must not build transactions');
        },
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect(result.reason).toBe('Confidential policy blocked this DCA run.');
      expect(result.reason).not.toContain('10');
      expect(result.reason).not.toContain('20');
      expect(JSON.stringify(result)).not.toContain('10000000');
      expect(JSON.stringify(result)).not.toContain('20000000');
    }
  });

  test('rejects a stale session after the kill switch', async () => {
    const fixture = createFixture({
      sessionGrantedSlot: 10,
      lastRevokedSlot: 11,
    });

    const result = await runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 5,
        encryptionWitness: Array.from(fixture.witness),
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway: mockGateway(),
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.code).toBe('SESSION_STALE');
  });

  test('rejects a revoked session', async () => {
    const fixture = createFixture({ sessionAuthorized: false });

    const result = await runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 5,
        encryptionWitness: Array.from(fixture.witness),
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway: mockGateway(),
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.code).toBe('SESSION_NOT_AUTHORIZED');
  });

  test('surfaces Jupiter precheck failure before policy execution', async () => {
    const fixture = createFixture();
    const gateway = createJupiterStrategyGateway({
      apiKey: 'test-key',
      fetch: ((() => Promise.resolve(new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 }))) as unknown) as typeof fetch,
    });

    await expect(runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 5,
        encryptionWitness: Array.from(fixture.witness),
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway,
      }
    )).rejects.toThrow('Jupiter API request failed with HTTP 429');
  });

  test('rejects an invalid policy witness without revealing policy values', async () => {
    const fixture = createFixture();
    const badWitness = Array.from(fixture.witness);
    badWitness[0] ^= 255;

    const result = await runConfidentialDcaExecution(
      {
        owner: fixture.owner,
        sessionKey: fixture.sessionKey,
        amountUsdc: 5,
        encryptionWitness: badWitness,
      },
      {
        getWalletData: async () => fixture.wallet,
        gateway: mockGateway(),
      }
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('INVALID_POLICY_WITNESS');
      expect(result.reason).not.toContain('10');
      expect(result.reason).not.toContain('20');
    }
  });
});

function createFixture(options: {
  sessionAuthorized?: boolean;
  sessionGrantedSlot?: number;
  lastRevokedSlot?: number;
} = {}) {
  const owner = Keypair.generate().publicKey.toString();
  const sessionKey = Keypair.generate().publicKey.toString();
  const walletPda = deriveWalletPda(owner);
  const solTokenAccount = Keypair.generate().publicKey.toString();
  const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
  const maxPerRun = 10_000_000n;
  const dailyCap = 20_000_000n;
  const dailySpent = 0n;
  const wallet: WalletData = {
    walletPda,
    owner,
    proxyPk: PublicKey.default.toString(),
    policyCommitment: Array.from({ length: 32 }, () => 7),
    merkleRoot: Array.from({ length: 32 }, () => 0),
    policySeq: 3,
    lastRevokedSlot: options.lastRevokedSlot ?? 2,
    confidentialPolicy: {
      policyCommitment: Array.from({ length: 32 }, () => 7),
      encryptionWitnessHash: Array.from(createHash('sha256').update(witness).digest()),
      encryptedMaxPerRun: encryptAmount(maxPerRun, witness),
      encryptedDailyCap: encryptAmount(dailyCap, witness),
      encryptedDailySpent: encryptAmount(dailySpent, witness),
      spentDayIndex: Math.floor(Math.floor(Date.now() / 1000) / 86_400),
      enabled: true,
    },
    demoCustody: {
      usdcMint: JUPITER_USDC_MINT,
      usdcTokenAccount: Keypair.generate().publicKey.toString(),
      solMint: JUPITER_SOL_MINT,
      solTokenAccount,
      tokenProgram: TOKEN_PROGRAM,
      configured: true,
    },
    sessions: [
      {
        key: sessionKey,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        grantedSlot: options.sessionGrantedSlot ?? 2,
        authorized: options.sessionAuthorized ?? true,
      },
    ],
    temporalKeys: [],
  };
  wallet.temporalKeys = wallet.sessions;

  return { owner, sessionKey, wallet, witness };
}

function mockGateway(requestedUrls: string[] = []) {
  return createJupiterStrategyGateway({
    apiKey: 'test-key',
    fetch: ((input: URL | RequestInfo) => {
      const url = input instanceof URL ? input : new URL(input.toString());
      requestedUrls.push(url.toString());

      if (url.pathname.endsWith('/tokens/v2/search')) {
        return Promise.resolve(jsonResponse([
          { id: JUPITER_USDC_MINT, symbol: 'USDC', decimals: 6, isVerified: true },
          { id: JUPITER_SOL_MINT, symbol: 'SOL', decimals: 9, isVerified: true },
        ]));
      }
      if (url.pathname.endsWith('/price/v3')) {
        return Promise.resolve(jsonResponse({
          [JUPITER_USDC_MINT]: { usdPrice: 1 },
          [JUPITER_SOL_MINT]: { usdPrice: 145 },
        }));
      }
      if (url.pathname.endsWith('/swap/v2/build')) {
        const taker = url.searchParams.get('taker') ?? '';
        return Promise.resolve(jsonResponse({
          inputMint: JUPITER_USDC_MINT,
          outputMint: JUPITER_SOL_MINT,
          inAmount: url.searchParams.get('amount') ?? '0',
          outAmount: '34400',
          computeBudgetInstructions: [],
          setupInstructions: [],
          swapInstruction: {
            programId: 'JUP6LkbZbjS1jKKwapdH673zwLsBH3M427A871qYx1W',
            accounts: [{ pubkey: taker, isSigner: true, isWritable: true }],
            data: 'AQID',
          },
          cleanupInstruction: null,
          otherInstructions: [],
          tipInstruction: null,
          addressesByLookupTableAddress: null,
        }));
      }

      return Promise.resolve(jsonResponse({ error: 'not found' }, 404));
    }) as typeof fetch,
  });
}

function encryptAmount(amount: bigint, witness: Uint8Array): bigint {
  return amount ^ witnessMask(witness);
}

function witnessMask(witness: Uint8Array): bigint {
  let value = 0n;
  for (let index = 7; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(witness[index]);
  }
  return value;
}

function mockBuiltTransaction(sessionKey: string) {
  return {
    transaction: 'base64-tx',
    blockHash: 'blockhash',
    slot: 123,
    signers: [sessionKey],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
