import { describe, expect, test } from 'bun:test';
import { parseIntent, getActionDestination, getIntentAmount } from '../src/lib/intent-parser.js';

describe('Intent Parser', () => {
  describe('parseIntent', () => {
    test('parses valid transfer intent', () => {
      const intent = {
        id: 'test-123',
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'transfer',
        params: {
          destination: '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V',
          amount: 1000000,
        },
        timestamp: 1700000000,
      };

      const result = parseIntent(intent);

      expect(result.id).toBe('test-123');
      expect(result.owner).toBe('4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X');
      expect(result.action).toBe('transfer');
      expect((result.params as any).destination).toBe('7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V');
      expect((result.params as any).amount).toBe(1000000);
    });

    test('throws on missing id', () => {
      const intent = {
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'transfer',
        params: { destination: '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V', amount: 1000000 },
        timestamp: 1700000000,
      };

      expect(() => parseIntent(intent)).toThrow('Intent must have a string id');
    });

    test('throws on invalid action', () => {
      const intent = {
        id: 'test-123',
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'invalid_action',
        params: { destination: '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V', amount: 1000000 },
        timestamp: 1700000000,
      };

      expect(() => parseIntent(intent)).toThrow(/Invalid action/);
    });

    test('throws on negative amount', () => {
      const intent = {
        id: 'test-123',
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'transfer',
        params: { destination: '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V', amount: -100 },
        timestamp: 1700000000,
      };

      expect(() => parseIntent(intent)).toThrow(/positive number amount/);
    });

    test('parses swap intent', () => {
      const intent = {
        id: 'swap-123',
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'swap',
        params: {
          inputMint: 'EPjFWdd5VzqK8LS5CkF3j3gJZt8Kw7Nh8mYqG9mC1Z2S',
          outputMint: 'So11111111111111111111111111111111111111112',
          inputAmount: 1000000,
          minOutputAmount: 900000,
        },
        timestamp: 1700000000,
      };

      const result = parseIntent(intent);
      expect(result.action).toBe('swap');
      expect((result.params as any).inputMint).toBe('EPjFWdd5VzqK8LS5CkF3j3gJZt8Kw7Nh8mYqG9mC1Z2S');
    });
  });

  describe('getActionDestination', () => {
    test('returns destination for transfer', () => {
      const intent = {
        id: 'test-123',
        owner: 'owner',
        sessionKey: 'session',
        action: 'transfer',
        params: { destination: 'dest123', amount: 100 },
        timestamp: 0,
      };

      expect(getActionDestination(intent as any)).toBe('dest123');
    });

    test('returns outputMint for swap', () => {
      const intent = {
        id: 'test-123',
        owner: 'owner',
        sessionKey: 'session',
        action: 'swap',
        params: { inputMint: 'A', outputMint: 'B', inputAmount: 100, minOutputAmount: 90 },
        timestamp: 0,
      };

      expect(getActionDestination(intent as any)).toBe('B');
    });

    test('returns programId for custom', () => {
      const intent = {
        id: 'test-123',
        owner: 'owner',
        sessionKey: 'session',
        action: 'custom',
        params: { programId: 'prog123', instructionData: 'data', accounts: [] },
        timestamp: 0,
      };

      expect(getActionDestination(intent as any)).toBe('prog123');
    });
  });

  describe('getIntentAmount', () => {
    test('returns amount for transfer', () => {
      const intent = {
        id: 'test',
        owner: 'owner',
        sessionKey: 'session',
        action: 'transfer',
        params: { destination: 'dest', amount: 5000000 },
        timestamp: 0,
      };

      expect(getIntentAmount(intent as any)).toBe(5000000);
    });

    test('returns inputAmount for swap', () => {
      const intent = {
        id: 'test',
        owner: 'owner',
        sessionKey: 'session',
        action: 'swap',
        params: { inputMint: 'A', outputMint: 'B', inputAmount: 999, minOutputAmount: 900 },
        timestamp: 0,
      };

      expect(getIntentAmount(intent as any)).toBe(999);
    });

    test('returns 0 for custom', () => {
      const intent = {
        id: 'test',
        owner: 'owner',
        sessionKey: 'session',
        action: 'custom',
        params: { programId: 'prog', instructionData: 'data', accounts: [] },
        timestamp: 0,
      };

      expect(getIntentAmount(intent as any)).toBe(0);
    });
  });
});