/**
 * Policy Templates for Polet AI
 *
 * Provides beginner-friendly, template-based policy configuration.
 * Users can select a template and customize it without understanding smart contract internals.
 */

import type { Policy } from '../types/intent.js';

// Template ID type
export type TemplateId = 'whitelist-only' | 'daily-limit' | 'gambling-block' | 'enterprise-control';

// Template metadata interface
export interface PolicyTemplate {
  id: TemplateId;
  name: string;
  description: string;
  useCase: string;
  policy: Policy;
  options?: TemplateOption[];
}

// Template option for customization
export interface TemplateOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'array';
  default?: unknown;
  description?: string;
}

// Pre-defined blocklist for gambling sites (common Solana addresses)
const GAMBLING_ADDRESSES = [
  'Bet1abcdefghijklmnopqrstuvwxyz123456789', // example gambling site
  'Dice2abcdefghijklmnopqrstuvwxyz12345678', // example dice game
];

/**
 * All available policy templates
 */
const TEMPLATES: PolicyTemplate[] = [
  {
    id: 'whitelist-only',
    name: 'Whitelist Only',
    description: 'Allow transactions only to pre-approved addresses. Perfect for AI agents that should only interact with specific protocols.',
    useCase: 'For users who want AI to interact only with specific protocols',
    policy: {
      allowlist: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
        'JUP6LkbAkbj97q1CYsGFoCfPSrF2N2nvJKqLBvpvS2p', // Jupiter DEX
        'RaydiumSiRzSZzSLDEVq8xDjeG8t8mt4f3qSGEhgP', // Raydium
      ],
      blocklist: [],
      allowedActions: ['transfer', 'swap'],
    },
    options: [
      {
        key: 'customAllowlist',
        label: 'Additional Allowed Addresses',
        type: 'array',
        description: 'Add additional Solana addresses that the AI agent can transact with',
      },
    ],
  },
  {
    id: 'daily-limit',
    name: 'Daily Limit',
    description: 'Set daily spending limits to contain blast radius if compromised. AI agent can transact up to the daily total.',
    useCase: 'For users who want to limit AI agent daily spending',
    policy: {
      allowlist: [],
      blocklist: [],
      maxAmount: 10000000, // 0.01 SOL per transaction
      dailyLimit: 50000000, // 0.05 SOL per day
      allowedActions: ['transfer', 'swap'],
    },
    options: [
      {
        key: 'dailyLimitAmount',
        label: 'Daily Limit (SOL)',
        type: 'number',
        default: 0.05,
        description: 'Maximum total amount the AI can spend in 24 hours',
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
    description: 'Block known gambling and high-risk addresses. Use with whitelist-only for maximum security.',
    useCase: 'For users who want to block known gambling sites',
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
    description: 'Strict controls for high-value wallets with both allowlist and daily limits. Maximum security for serious holdings.',
    useCase: 'For enterprise users needing strict transaction controls',
    policy: {
      allowlist: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        'JUP6LkbAkbj97q1CYsGFoCfPSrF2N2nvJKqLBvpvS2p',
        'RaydiumSiRzSZzSLDEVq8xDjeG8t8mt4f3qSGEhgP',
        'Marinagne123456789abcdefghijklmnop', // Marinade stake program
      ],
      blocklist: GAMBLING_ADDRESSES,
      maxAmount: 10000000, // 0.01 SOL per tx
      dailyLimit: 100000000, // 0.1 SOL per day
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

/**
 * Get all available policy templates
 */
export function getPolicyTemplates(): PolicyTemplate[] {
  return TEMPLATES;
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: TemplateId): PolicyTemplate | null {
  return TEMPLATES.find(t => t.id === id) || null;
}

/**
 * Apply a template to get a base policy (without customization)
 */
export function applyTemplate(template: PolicyTemplate): Policy {
  return { ...template.policy };
}

/**
 * Create a policy from a template with customization options
 */
export interface CreatePolicyOptions {
  customAllowlist?: string[];
  customBlocklist?: string[];
  dailyLimitAmount?: number;
  maxTransactionAmount?: number;
}

export function createPolicyFromTemplate(
  templateId: TemplateId,
  options?: CreatePolicyOptions
): Policy | null {
  const template = getTemplateById(templateId);
  if (!template) {
    return null;
  }

  const policy = applyTemplate(template);

  if (options) {
    if (options.customAllowlist?.length) {
      policy.allowlist = options.customAllowlist;
    }
    if (options.customBlocklist?.length) {
      policy.blocklist = options.customBlocklist;
    }
    if (options.dailyLimitAmount !== undefined) {
      // Convert SOL to lamports (input is in SOL, e.g., 0.05)
      policy.dailyLimit = Math.round(options.dailyLimitAmount * 1_000_000_000);
    }
    if (options.maxTransactionAmount !== undefined) {
      // Convert SOL to lamports
      policy.maxAmount = Math.round(options.maxTransactionAmount * 1_000_000_000);
    }
  }

  return policy;
}