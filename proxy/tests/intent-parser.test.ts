import { describe, expect, test } from 'bun:test';
import {
  getActionDestination,
  getIntentAmount,
  mapMultichainIntentToDcaRunRequest,
  parseIntent,
} from '../src/lib/intent-parser';
import { JUPITER_SOL_MINT, JUPITER_USDC_MINT } from '../src/lib/jupiter-gateway';
import type { Intent, MultichainStrategyParams, TransferParams, SwapParams } from '../src/types/intent';

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
      expect((result.params as TransferParams).destination).toBe('7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V');
      expect((result.params as TransferParams).amount).toBe(1000000);
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
      expect((result.params as SwapParams).inputMint).toBe('EPjFWdd5VzqK8LS5CkF3j3gJZt8Kw7Nh8mYqG9mC1Z2S');
    });

    test('parses valid multichain strategy intent', () => {
      const witness = Array.from({ length: 32 }, () => 7);
      const intent = {
        id: 'multi-123',
        owner: '4Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8X',
        sessionKey: '5Nd1mBQtrMJVYVfKf2PJF9nP93qJbJbV1L1dG9m6Z8Y',
        action: 'multichain-strategy',
        params: {
          sourceChain: 'solana',
          sourceAsset: 'USDC',
          sourceMint: JUPITER_USDC_MINT,
          targetChain: 'solana',
          targetAsset: 'SOL',
          targetMint: JUPITER_SOL_MINT,
          amount: '5',
          executionRail: 'jupiter',
          encryptionWitness: witness,
        },
        timestamp: 1700000000,
      };

      const result = parseIntent(intent);
      const params = result.params as MultichainStrategyParams;

      expect(result.action).toBe('multichain-strategy');
      expect(params.sourceChain).toBe('solana');
      expect(params.targetAsset).toBe('SOL');
      expect(params.executionRail).toBe('jupiter');
      expect(params.encryptionWitness).toEqual(witness);
    });

    test('throws on invalid multichain chain and asset combinations', () => {
      const witness = Array.from({ length: 32 }, () => 7);
      const intent = parseIntent({
        id: 'multi-unsupported',
        owner: 'owner',
        sessionKey: 'session',
        action: 'multichain-strategy',
        params: {
          sourceChain: 'sui',
          sourceAsset: 'USDC',
          targetChain: 'solana',
          targetAsset: 'SOL',
          amount: '5',
          executionRail: 'ika',
          encryptionWitness: witness,
        },
        timestamp: 1700000000,
      });

      expect(() => mapMultichainIntentToDcaRunRequest(intent)).toThrow(/Unsupported multichain intent/);
    });

    test('maps Solana USDC to SOL multichain intent to the existing DCA run request', () => {
      const witness = Array.from({ length: 32 }, (_, index) => index);
      const intent = parseIntent({
        id: 'multi-dca',
        owner: 'owner',
        sessionKey: 'session',
        action: 'multichain-strategy',
        params: {
          sourceChain: 'solana',
          sourceAsset: 'USDC',
          sourceMint: JUPITER_USDC_MINT,
          targetChain: 'solana',
          targetAsset: 'SOL',
          targetMint: JUPITER_SOL_MINT,
          amount: '5',
          executionRail: 'jupiter',
          strategy: 'dca',
          slippageBps: 100,
          encryptionWitness: witness,
        },
        timestamp: 1700000000,
      });

      expect(mapMultichainIntentToDcaRunRequest(intent)).toEqual({
        owner: 'owner',
        sessionKey: 'session',
        amountUsdc: '5',
        inputMint: JUPITER_USDC_MINT,
        outputMint: JUPITER_SOL_MINT,
        slippageBps: 100,
        encryptionWitness: witness,
      });
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

      expect(getActionDestination(intent as Intent)).toBe('dest123');
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

      expect(getActionDestination(intent as Intent)).toBe('B');
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

      expect(getActionDestination(intent as Intent)).toBe('prog123');
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

      expect(getIntentAmount(intent as Intent)).toBe(5000000);
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

      expect(getIntentAmount(intent as Intent)).toBe(999);
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

      expect(getIntentAmount(intent as Intent)).toBe(0);
    });
  });
});
