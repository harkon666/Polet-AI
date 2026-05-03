import { describe, expect, test } from 'vitest';
import { TEMPLATES, getPolicyTemplates, getTemplateById, createPolicyFromTemplate, lamportsToSol, solToLamports } from './policy-templates';
import type { TemplateId } from '../types';

describe('Policy Templates', () => {
  describe('getPolicyTemplates', () => {
    test('returns all 4 templates', () => {
      const templates = getPolicyTemplates();
      expect(templates.length).toBe(4);
    });

    test('each template has required fields', () => {
      for (const template of TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.useCase).toBeDefined();
        expect(template.policy).toBeDefined();
        expect(Array.isArray(template.policy.allowlist)).toBe(true);
        expect(Array.isArray(template.policy.blocklist)).toBe(true);
      }
    });

    test('all template IDs are valid', () => {
      const validIds: TemplateId[] = ['whitelist-only', 'daily-limit', 'gambling-block', 'enterprise-control'];
      for (const template of TEMPLATES) {
        expect(validIds.includes(template.id)).toBe(true);
      }
    });
  });

  describe('getTemplateById', () => {
    test('returns template for valid id', () => {
      const template = getTemplateById('whitelist-only');
      expect(template).not.toBeNull();
      expect(template?.id).toBe('whitelist-only');
    });

    test('returns null for unknown id', () => {
      const template = getTemplateById('non-existent' as TemplateId);
      expect(template).toBeNull();
    });
  });

  describe('createPolicyFromTemplate', () => {
    test('creates policy from daily-limit template', () => {
      const policy = createPolicyFromTemplate('daily-limit');
      expect(policy?.dailyLimit).toBe(50000000);
      expect(policy?.maxAmount).toBe(10000000);
    });

    test('applies custom daily limit in SOL', () => {
      const policy = createPolicyFromTemplate('daily-limit', {
        dailyLimitAmount: 0.1,
        maxTransactionAmount: 0.02,
      });
      expect(policy?.dailyLimit).toBe(100000000);
      expect(policy?.maxAmount).toBe(20000000);
    });

    test('applies custom allowlist', () => {
      const customList = ['addr1', 'addr2'];
      const policy = createPolicyFromTemplate('whitelist-only', {
        customAllowlist: customList,
      });
      expect(policy?.allowlist).toEqual(customList);
    });

    test('returns null for invalid template', () => {
      const policy = createPolicyFromTemplate('invalid' as TemplateId);
      expect(policy).toBeNull();
    });
  });

  describe('lamportsToSol', () => {
    test('converts lamports to SOL string', () => {
      expect(lamportsToSol(1000000000)).toBe('1.000000000');
      expect(lamportsToSol(50000000)).toBe('0.050000000');
      expect(lamportsToSol(1)).toBe('0.000000001');
    });
  });

  describe('solToLamports', () => {
    test('converts SOL to lamports', () => {
      expect(solToLamports(1)).toBe(1000000000);
      expect(solToLamports(0.05)).toBe(50000000);
      expect(solToLamports(0.000000001)).toBe(1);
    });
  });

  describe('template policy structure', () => {
    test('whitelist-only has allowlist but no blocklist', () => {
      const template = getTemplateById('whitelist-only');
      expect(template?.policy.allowlist.length).toBeGreaterThan(0);
      expect(template?.policy.blocklist.length).toBe(0);
    });

    test('gambling-block has blocklist', () => {
      const template = getTemplateById('gambling-block');
      expect(template?.policy.blocklist.length).toBeGreaterThan(0);
    });

    test('daily-limit has dailyLimit and maxAmount', () => {
      const template = getTemplateById('daily-limit');
      expect(template?.policy.dailyLimit).toBe(50000000);
      expect(template?.policy.maxAmount).toBe(10000000);
    });

    test('enterprise-control is strict with allowlist, blocklist, and limits', () => {
      const template = getTemplateById('enterprise-control');
      expect(template?.policy.allowlist.length).toBeGreaterThan(0);
      expect(template?.policy.blocklist.length).toBeGreaterThan(0);
      expect(template?.policy.dailyLimit).toBeDefined();
      expect(template?.policy.maxAmount).toBeDefined();
    });
  });
});
