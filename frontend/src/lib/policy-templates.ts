/**
 * Policy Templates for Polet AI Frontend
 */

import type { Policy, TemplateId, PolicyTemplate, CreatePolicyOptions } from '../types';

const GAMBLING_ADDRESSES = [
  'Bet1abcdefghijklmnopqrstuvwxyz123456789',
  'Dice2abcdefghijklmnopqrstuvwxyz12345678',
];

export const TEMPLATES: PolicyTemplate[] = [
  {
    id: 'whitelist-only',
    name: 'Whitelist Only',
    description: 'Allow transactions only to pre-approved addresses.',
    useCase: 'For AI agents that should only interact with specific protocols',
    policy: {
      allowlist: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'JUP6LkbAkbj97q1CYsGFoCfPSrF2N2nvJKqLBvpvS2p',
        'RaydiumSiRzSZzSLDEVq8xDjeG8t8mt4f3qSGEhgP',
      ],
      blocklist: [],
      allowedActions: ['transfer', 'swap'],
    },
    options: [
      {
        key: 'customAllowlist',
        label: 'Additional Allowed Addresses',
        type: 'array',
        description: 'Add additional Solana addresses',
      },
    ],
  },
  {
    id: 'daily-limit',
    name: 'Daily Limit',
    description: 'Set daily spending limits to contain blast radius.',
    useCase: 'For limiting AI agent daily spending',
    policy: {
      allowlist: [],
      blocklist: [],
      maxAmount: 10000000,
      dailyLimit: 50000000,
      allowedActions: ['transfer', 'swap'],
    },
    options: [
      {
        key: 'dailyLimitAmount',
        label: 'Daily Limit (SOL)',
        type: 'number',
        default: 0.05,
        description: 'Maximum total amount in 24 hours',
      },
      {
        key: 'maxTransactionAmount',
        label: 'Per-Transaction Limit (SOL)',
        type: 'number',
        default: 0.01,
        description: 'Maximum amount for a single transaction',
      },
    ],
  },
  {
    id: 'gambling-block',
    name: 'Gambling Block',
    description: 'Block known gambling and high-risk addresses.',
    useCase: 'For blocking known gambling sites',
    policy: {
      allowlist: [],
      blocklist: GAMBLING_ADDRESSES,
      allowedActions: ['transfer', 'swap', 'stake', 'unstake'],
    },
    options: [
      {
        key: 'customBlocklist',
        label: 'Additional Blocked Addresses',
        type: 'array',
        description: 'Add additional addresses to block',
      },
    ],
  },
  {
    id: 'enterprise-control',
    name: 'Enterprise Control',
    description: 'Strict controls for high-value wallets.',
    useCase: 'For enterprise users needing strict controls',
    policy: {
      allowlist: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'JUP6LkbAkbj97q1CYsGFoCfPSrF2N2nvJKqLBvpvS2p',
        'RaydiumSiRzSZzSLDEVq8xDjeG8t8mt4f3qSGEhgP',
        'Marinagne123456789abcdefghijklmnop',
      ],
      blocklist: GAMBLING_ADDRESSES,
      maxAmount: 10000000,
      dailyLimit: 100000000,
      allowedActions: ['transfer', 'swap', 'stake', 'unstake'],
    },
    options: [
      {
        key: 'customAllowlist',
        label: 'Additional Allowed Addresses',
        type: 'array',
      },
      {
        key: 'dailyLimitAmount',
        label: 'Daily Limit (SOL)',
        type: 'number',
        default: 0.1,
      },
      {
        key: 'maxTransactionAmount',
        label: 'Per-Transaction Limit (SOL)',
        type: 'number',
        default: 0.01,
      },
    ],
  },
];

export function getPolicyTemplates(): PolicyTemplate[] {
  return TEMPLATES;
}

export function getTemplateById(id: TemplateId): PolicyTemplate | null {
  return TEMPLATES.find(t => t.id === id) || null;
}

export function createPolicyFromTemplate(
  templateId: TemplateId,
  options?: CreatePolicyOptions
): Policy | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  const policy = { ...template.policy };

  if (options) {
    if (options.customAllowlist?.length) {
      policy.allowlist = options.customAllowlist;
    }
    if (options.customBlocklist?.length) {
      policy.blocklist = options.customBlocklist;
    }
    if (options.dailyLimitAmount !== undefined) {
      policy.dailyLimit = Math.round(options.dailyLimitAmount * 1_000_000_000);
    }
    if (options.maxTransactionAmount !== undefined) {
      policy.maxAmount = Math.round(options.maxTransactionAmount * 1_000_000_000);
    }
  }

  return policy;
}

export function lamportsToSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9);
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
