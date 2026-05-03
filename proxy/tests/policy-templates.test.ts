import { describe, expect, test } from 'bun:test';
import {
  getPolicyTemplates,
  getTemplateById,
  applyTemplate,
  createPolicyFromTemplate,
  type PolicyTemplate,
  type TemplateId,
} from '../src/lib/policy-templates.js';

/**
 * Policy Template tests - verify template-based policy configuration works
 * These enable beginner-friendly policy setup without deep knowledge
 */

describe('Policy Templates', () => {
  describe('getPolicyTemplates', () => {
    test('returns all available templates with metadata', () => {
      const templates = getPolicyTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].id).toBeDefined();
      expect(templates[0].name).toBeDefined();
      expect(templates[0].description).toBeDefined();
      expect(templates[0].policy).toBeDefined();
    });

    test('templates have valid structure', () => {
      const templates = getPolicyTemplates();
      const validIds = ['whitelist-only', 'daily-limit', 'gambling-block', 'enterprise-control'];

      for (const template of templates) {
        expect(validIds.includes(template.id)).toBe(true);
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(template.policy).toBeDefined();
        expect(Array.isArray(template.policy.allowlist)).toBe(true);
        expect(Array.isArray(template.policy.blocklist)).toBe(true);
      }
    });
  });

  describe('getTemplateById', () => {
    test('returns template when exists', () => {
      const template = getTemplateById('whitelist-only');

      expect(template).not.toBeNull();
      expect(template?.id).toBe('whitelist-only');
    });

    test('returns null for unknown template', () => {
      const template = getTemplateById('non-existent' as unknown as TemplateId);

      expect(template).toBeNull();
    });
  });

  describe('applyTemplate', () => {
    test('applies whitelist-only template correctly', () => {
      const template = getTemplateById('whitelist-only')!;
      const policy = applyTemplate(template);

      expect(policy.allowlist.length).toBeGreaterThan(0);
      expect(policy.blocklist.length).toBe(0);
      expect(policy.maxAmount).toBeUndefined();
    });

    test('applies daily-limit template correctly', () => {
      const template = getTemplateById('daily-limit')!;
      const policy = applyTemplate(template);

      expect(policy.dailyLimit).toBe(50000000); // 0.05 SOL
      expect(policy.maxAmount).toBe(10000000); // 0.01 SOL per tx
    });

    test('applies gambling-block template correctly', () => {
      const template = getTemplateById('gambling-block')!;
      const policy = applyTemplate(template);

      expect(policy.blocklist.length).toBeGreaterThan(0);
      expect(policy.allowlist.length).toBe(0);
    });
  });

  describe('createPolicyFromTemplate', () => {
    test('creates policy with custom allowlist entries', () => {
      const template = getTemplateById('whitelist-only')!;
      const customAllowlist = [
        'SolanaTokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
        'JUP6LkbAkbj97q1CYsGFoCfPSrF2N2nvJKqLBvpvS2p', // Jupiter
      ];

      const policy = createPolicyFromTemplate(template.id, {
        customAllowlist,
      });

      expect(policy!.allowlist).toEqual(customAllowlist);
    });

    test('creates policy with custom daily limit', () => {
      // Pass amount in SOL (e.g., 0.1), function converts to lamports
      const policy = createPolicyFromTemplate('daily-limit', {
        dailyLimitAmount: 0.1, // 0.1 SOL = 100000000 lamports
        maxTransactionAmount: 0.02, // 0.02 SOL = 20000000 lamports
      });

      expect(policy!.dailyLimit).toBe(100000000);
      expect(policy!.maxAmount).toBe(20000000);
    });

    test('returns null for invalid template id', () => {
      const policy = createPolicyFromTemplate('invalid-template' as TemplateId);

      expect(policy).toBeNull();
    });
  });

  describe('template use case coverage', () => {
    test('whitelist-only: allows only pre-approved addresses', () => {
      const template = getTemplateById('whitelist-only')!;
      const policy = applyTemplate(template);

      // User can add their own addresses to allowlist
      expect(template.useCase).toBe('For users who want AI to interact only with specific protocols');
    });

    test('daily-limit: restricts total daily spending', () => {
      const template = getTemplateById('daily-limit')!;
      const policy = applyTemplate(template);

      expect(template.useCase).toBe('For users who want to limit AI agent daily spending');
    });

    test('gambling-block: blocks known gambling addresses', () => {
      const template = getTemplateById('gambling-block')!;
      const policy = applyTemplate(template);

      expect(template.useCase).toBe('For users who want to block known gambling sites');
    });

    test('enterprise-control: strict controls for high-value wallets', () => {
      const template = getTemplateById('enterprise-control')!;
      const policy = applyTemplate(template);

      expect(template.useCase).toBe('For enterprise users needing strict transaction controls');
    });
  });
});