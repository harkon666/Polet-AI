import { describe, expect, test } from 'bun:test';
import {
  formatPublicKey,
  parseIntentParams,
  estimateFee,
  lamportsToSol,
  solToLamports,
  WALLET_SEED,
} from '../src/session.js';

/**
 * Session management tests
 * Tests describe behavior, not implementation
 * Note: We avoid testing Solana-specific PublicKey validation as that requires
 * real 32-byte base58 encoded keys which are complex to mock correctly.
 */

describe('Session Management Utils', () => {
  describe('formatPublicKey', () => {
    test('truncates long strings for display', () => {
      const key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop';
      const formatted = formatPublicKey(key, 4);
      expect(formatted).toBe('ABCD...mnop');
    });

    test('does not truncate short strings', () => {
      expect(formatPublicKey('12345', 4)).toBe('12345');
    });

    test('uses default 4 chars when not specified', () => {
      const key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop';
      const formatted = formatPublicKey(key);
      expect(formatted).toBe('ABCD...mnop');
    });

    test('handles exact length strings', () => {
      const key = 'ABCD';
      expect(formatPublicKey(key, 4)).toBe('ABCD');
    });
  });

  describe('parseIntentParams', () => {
    test('parses transfer params correctly', () => {
      const params = {
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
      };

      const parsed = parseIntentParams('transfer', params) as { destination: string; amount: number };
      expect(parsed.destination).toBe('CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
      expect(parsed.amount).toBe(1000000);
    });

    test('parses transfer params with optional mint', () => {
      const params = {
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      };

      const parsed = parseIntentParams('transfer', params) as { destination: string; amount: number; mint?: string };
      expect(parsed.destination).toBe('CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
      expect(parsed.amount).toBe(1000000);
      expect(parsed.mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    test('parses swap params correctly', () => {
      const params = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inputAmount: 1000000000,
        minOutputAmount: 150000000,
      };

      const parsed = parseIntentParams('swap', params) as { inputMint: string; outputMint: string; inputAmount: number; minOutputAmount: number };
      expect(parsed.inputMint).toBe('So11111111111111111111111111111111111111112');
      expect(parsed.outputMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(parsed.inputAmount).toBe(1000000000);
      expect(parsed.minOutputAmount).toBe(150000000);
    });

    test('parses stake params correctly for stake action', () => {
      const params = {
        validator: 'GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x',
        amount: 5000000000,
      };

      const parsed = parseIntentParams('stake', params) as { validator: string; amount: number };
      expect(parsed.validator).toBe('GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x');
      expect(parsed.amount).toBe(5000000000);
    });

    test('parses stake params correctly for unstake action', () => {
      const params = {
        validator: 'GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x',
        amount: 5000000000,
      };

      const parsed = parseIntentParams('unstake', params) as { validator: string; amount: number };
      expect(parsed.validator).toBe('GGGDKtETwX7HaiMk5r1GeXFP5P4a1dK8v6y4qT1mMZ5x');
      expect(parsed.amount).toBe(5000000000);
    });

    test('parses custom params correctly', () => {
      const params = {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        instructionData: 'base64-encoded-data',
        accounts: ['CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', 'DxY0lq0rDmQafX2Y22Uj36tB6jzC3mD1kN5oX8yT4zA'],
      };

      const parsed = parseIntentParams('custom', params) as { programId: string; instructionData: string; accounts: string[] };
      expect(parsed.programId).toBe('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      expect(parsed.instructionData).toBe('base64-encoded-data');
      expect(parsed.accounts).toHaveLength(2);
    });

    test('throws error for missing required transfer fields', () => {
      const invalidParams = { amount: 1000000 };
      expect(() => parseIntentParams('transfer', invalidParams)).toThrow();
    });

    test('throws error for invalid transfer amount', () => {
      const invalidParams = { destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', amount: -100 };
      expect(() => parseIntentParams('transfer', invalidParams)).toThrow();
    });

    test('throws error for zero transfer amount', () => {
      const invalidParams = { destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3', amount: 0 };
      expect(() => parseIntentParams('transfer', invalidParams)).toThrow();
    });

    test('throws error for missing swap inputMint', () => {
      const invalidParams = {
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inputAmount: 1000000000,
        minOutputAmount: 150000000,
      };
      expect(() => parseIntentParams('swap', invalidParams)).toThrow();
    });

    test('throws error for missing stake validator', () => {
      const invalidParams = { amount: 5000000000 };
      expect(() => parseIntentParams('stake', invalidParams)).toThrow();
    });

    test('throws error for missing custom programId', () => {
      const invalidParams = {
        instructionData: 'base64-encoded-data',
        accounts: [],
      };
      expect(() => parseIntentParams('custom', invalidParams)).toThrow();
    });
  });

  describe('estimateFee', () => {
    test('calculates base fee for single signer', () => {
      expect(estimateFee(1)).toBe(5500);
    });

    test('calculates fee for multiple signers', () => {
      expect(estimateFee(2)).toBe(6000);
      expect(estimateFee(3)).toBe(6500);
      expect(estimateFee(10)).toBe(10000);
    });

    test('defaults to single signer', () => {
      expect(estimateFee()).toBe(5500);
    });

    test('handles zero signers', () => {
      expect(estimateFee(0)).toBe(5000);
    });
  });

  describe('lamportsToSol', () => {
    test('converts lamports to SOL', () => {
      expect(lamportsToSol(1000000000)).toBe('1.000000000');
      expect(lamportsToSol(500000)).toBe('0.000500000');
      expect(lamportsToSol(1)).toBe('0.000000001');
    });

    test('handles zero', () => {
      expect(lamportsToSol(0)).toBe('0.000000000');
    });

    test('handles large amounts', () => {
      expect(lamportsToSol(1000000000000)).toBe('1000.000000000');
    });
  });

  describe('solToLamports', () => {
    test('converts SOL to lamports', () => {
      expect(solToLamports(1)).toBe(1000000000);
      expect(solToLamports(0.5)).toBe(500000000);
    });

    test('handles fractional SOL', () => {
      expect(solToLamports(0.001)).toBe(1000000);
    });

    test('handles zero', () => {
      expect(solToLamports(0)).toBe(0);
    });
  });

  describe('WALLET_SEED', () => {
    test('is a non-empty string constant for PDA derivation', () => {
      expect(typeof WALLET_SEED).toBe('string');
      expect(WALLET_SEED.length).toBeGreaterThan(0);
      expect(WALLET_SEED).toBe('polet_ai_wallet');
    });
  });
});