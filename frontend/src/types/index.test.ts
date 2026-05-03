import { describe, expect, test } from 'vitest';
import type { Intent, Policy, TemplateId, TransferParams, SwapParams } from '../types';

describe('Frontend Types', () => {
  describe('Intent type', () => {
    test('valid transfer intent structure', () => {
      const intent: Intent = {
        id: 'test-123',
        owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
        sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
        action: 'transfer',
        params: {
          destination: 'CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3',
          amount: 1000000,
        },
        timestamp: 1700000000,
      };

      expect(intent.id).toBe('test-123');
      expect(intent.action).toBe('transfer');
      expect((intent.params as TransferParams).destination).toBe('CxX9kp9rClPzeW1X11Uj25sA5iyB2nC0lL4mN7wW6yS3');
    });

    test('valid swap intent structure', () => {
      const intent: Intent = {
        id: 'swap-123',
        owner: 'owner',
        sessionKey: 'session',
        action: 'swap',
        params: {
          inputMint: 'EPjFWdd5VzqK8LS5CkF3j3gJZt8Kw7Nh8mYqG9mC1Z2S',
          outputMint: 'So11111111111111111111111111111111111111112',
          inputAmount: 1000000000,
          minOutputAmount: 900000000,
        },
        timestamp: 1700000000,
      };

      expect(intent.action).toBe('swap');
      expect((intent.params as SwapParams).inputMint).toBeDefined();
    });

    test('intent with optional policyHash', () => {
      const intent: Intent = {
        id: 'test-123',
        owner: 'owner',
        sessionKey: 'session',
        action: 'transfer',
        params: { destination: 'dest', amount: 100 },
        timestamp: 1700000000,
        policyHash: 'QmXyz123',
      };

      expect(intent.policyHash).toBe('QmXyz123');
    });
  });

  describe('Policy type', () => {
    test('minimal policy with just allowlist', () => {
      const policy: Policy = {
        allowlist: ['addr1', 'addr2'],
        blocklist: [],
      };

      expect(policy.allowlist.length).toBe(2);
      expect(policy.blocklist.length).toBe(0);
    });

    test('policy with limits', () => {
      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        maxAmount: 10000000,
        dailyLimit: 50000000,
      };

      expect(policy.maxAmount).toBe(10000000);
      expect(policy.dailyLimit).toBe(50000000);
    });

    test('policy with allowedActions', () => {
      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        allowedActions: ['transfer', 'swap'],
      };

      expect(policy.allowedActions).toContain('transfer');
      expect(policy.allowedActions).toContain('swap');
    });
  });

  describe('TemplateId type', () => {
    test('all valid template IDs', () => {
      const validIds: TemplateId[] = ['whitelist-only', 'daily-limit', 'gambling-block', 'enterprise-control'];
      expect(validIds.length).toBe(4);
    });
  });
});
