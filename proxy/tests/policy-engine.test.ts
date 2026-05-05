import { describe, expect, test } from 'bun:test';
import { evaluateLegacyPublicIntent } from '../src/lib/legacy-public-policy-engine.js';
import type { Intent, Policy } from '../src/types/intent.js';

describe('Legacy public policy engine', () => {
  describe('evaluateLegacyPublicIntent', () => {
    test('allows transfer when policy is empty', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'dest789', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(true);
    });

    test('allows transfer to destination in allowlist', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'allowed_dest', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: ['allowed_dest'],
        blocklist: [],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(true);
    });

    test('blocks transfer to destination NOT in allowlist', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'not_allowed', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: ['allowed_dest'],
        blocklist: [],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not on the allowlist');
    });

    test('blocks transfer to destination in blocklist', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'blocked_dest', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: ['blocked_dest'],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('on the blocklist');
    });

    test('blocklist takes precedence over allowlist', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'both_dest', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: ['both_dest'],
        blocklist: ['both_dest'],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('on the blocklist');
    });

    test('blocks when amount exceeds maxAmount', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'dest', amount: 5000000000 }, // 5 SOL in lamports
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        maxAmount: 1000000000, // 1 SOL in lamports
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });

    test('allows when amount is within maxAmount', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'dest', amount: 500000000 }, // 0.5 SOL
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        maxAmount: 1000000000, // 1 SOL
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(true);
    });

    test('allows action when in allowedActions list', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'transfer',
        params: { destination: 'dest', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        allowedActions: ['transfer', 'swap'],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(true);
    });

    test('blocks action when NOT in allowedActions list', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'stake',
        params: { validator: 'val123', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        allowedActions: ['transfer', 'swap'],
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in the allowed actions list');
    });

    test('allows stake action when allowedActions is empty (all allowed)', () => {
      const intent: Intent = {
        id: 'test-1',
        owner: 'owner123',
        sessionKey: 'session456',
        action: 'stake',
        params: { validator: 'val123', amount: 1000000 },
        timestamp: 0,
      };

      const policy: Policy = {
        allowlist: [],
        blocklist: [],
        // allowedActions not set - all actions allowed
      };

      const result = evaluateLegacyPublicIntent(intent, policy);
      expect(result.allowed).toBe(true);
    });
  });
});