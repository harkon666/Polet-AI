import { describe, expect, test } from 'bun:test';
import {
  buildExecuteIntentData,
  to_LE_Bytes,
  type TransactionRequest,
  type BuiltTransaction,
} from '../src/lib/transaction-builder.js';
import type { Attestation } from '../src/types/intent.js';

describe('Transaction Builder', () => {
  describe('to_LE_Bytes', () => {
    test('converts bigint to little-endian bytes', () => {
      const result = to_LE_Bytes(256n);
      expect(result.length).toBe(8);
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(1);
    });

    test('handles maximum u64 value', () => {
      const maxU64 = 18446744073709551615n;
      const result = to_LE_Bytes(maxU64);
      expect(result.length).toBe(8);
      // All bytes should be 255
      expect(result.every(b => b === 255)).toBe(true);
    });

    test('handles zero', () => {
      const result = to_LE_Bytes(0n);
      expect(result.length).toBe(8);
      expect(result.every(b => b === 0)).toBe(true);
    });
  });

  describe('buildExecuteIntentData', () => {
    test('builds correct data for transfer instruction', () => {
      const instruction = 0; // transfer
      const destination = new Uint8Array(32).fill(1);
      const amount = 1000000n;

      const data = buildExecuteIntentData(instruction, destination, amount);

      expect(data.length).toBe(41); // 1 + 32 + 8
      expect(data[0]).toBe(0); // instruction byte
      expect(data.slice(1, 33)).toEqual(destination); // destination bytes
      // Last 8 bytes should be the little-endian amount
      const extractedAmount = data.slice(33, 41);
      expect(extractedAmount[0]).toBe(0x40); // 1000000 in little-endian
    });

    test('instruction byte is correctly set', () => {
      const instruction = 5;
      const destination = new Uint8Array(32).fill(2);
      const amount = 5000000n;

      const data = buildExecuteIntentData(instruction, destination, amount);

      expect(data[0]).toBe(5);
    });

    test('amount is correctly encoded in little-endian', () => {
      const instruction = 0;
      const destination = new Uint8Array(32).fill(0);
      const amount = 1n; // 1 lamport

      const data = buildExecuteIntentData(instruction, destination, amount);

      // Last 8 bytes should be [1, 0, 0, 0, 0, 0, 0, 0]
      const amountBytes = data.slice(33, 41);
      expect(amountBytes[0]).toBe(1);
      expect(amountBytes.every((b, i) => i === 0 || b === 0)).toBe(true);
    });
  });

  describe('BuiltTransaction interface', () => {
    test('BuiltTransaction has required fields', () => {
      const mockTx: BuiltTransaction = {
        transaction: 'base64-encoded-tx',
        blockHash: 'mock-block-hash',
        slot: 123456,
        signers: ['session-key-1', 'session-key-2'],
      };

      expect(mockTx.transaction).toBe('base64-encoded-tx');
      expect(mockTx.blockHash).toBe('mock-block-hash');
      expect(mockTx.slot).toBe(123456);
      expect(mockTx.signers).toHaveLength(2);
    });
  });

  describe('TransactionRequest interface', () => {
    test('TransactionRequest has required fields', () => {
      const mockAttestation: Attestation = {
        owner: 'owner123',
        sessionKey: 'session456',
        policyHash: 'policy-hash-123',
        intentHash: 'intent-hash-456',
        blockHash: 'block-hash-789',
        slot: 123456,
        timestamp: Math.floor(Date.now() / 1000),
      };

      const request: TransactionRequest = {
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        instruction: 0,
        destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
        amount: 1000000,
        attestation: mockAttestation,
      };

      expect(request.owner).toBeDefined();
      expect(request.sessionKey).toBeDefined();
      expect(request.instruction).toBe(0);
      expect(request.destination).toBeDefined();
      expect(request.amount).toBe(1000000);
      expect(request.attestation).toBeDefined();
    });
  });
});