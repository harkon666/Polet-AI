import { Hono } from 'hono';
import { parseIntent } from '../lib/intent-parser.js';
import { evaluateIntent } from '../lib/policy-engine.js';
import { generateAttestation } from '../lib/policy-engine.js';
import { buildTransaction } from '../lib/transaction-builder.js';
import { getWalletPolicy, isSessionAuthorized } from '../lib/wallet-store.js';
import type { Intent, Policy } from '../types/intent.js';

export const intentRouter = new Hono();

// Program ID for the Polet AI contract
const PROGRAM_ID = '22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw';

/**
 * POST /intent/evaluate
 * Evaluate an intent against the policy and return an attestation if allowed
 */
intentRouter.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json();

    // Parse and validate intent
    let intent: Intent;
    try {
      intent = parseIntent(body);
    } catch (e) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INTENT',
          message: e instanceof Error ? e.message : 'Invalid intent format',
        }
      }, 400);
    }

    // Validate session key is authorized
    // In demo mode (policy in body), skip auth check; otherwise use wallet store
    const isDemo = !!body.policy;
    const authorized = isDemo
      ? true
      : isSessionAuthorized(intent.owner, intent.sessionKey);
    if (!authorized) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_NOT_AUTHORIZED',
          message: 'Session key is not authorized for this wallet',
        }
      }, 403);
    }

    // Get policy for wallet
    // Priority: 1) policy passed in body (for demo/custom), 2) wallet's stored policy, 3) fallback mock
    const policy: Policy = body.policy ?? getWalletPolicy(intent.owner) ?? {
      allowlist: [],
      blocklist: [],
      maxAmount: 10_000_000_000,
      dailyLimit: 100_000_000_000,
    };

    // Evaluate intent against policy
    const result = evaluateIntent(intent, policy);

    if (!result.allowed) {
      return c.json({
        success: true,
        data: {
          allowed: false,
          reason: result.reason,
          code: 'POLICY_BLOCKED',
        }
      });
    }

    // Intent is allowed - generate attestation
    // In production, blockHash and slot would come from RPC
    const blockHash = '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V4W6X';
    const slot = 123456789;

    const attestation = generateAttestation(
      intent,
      policy ? 'mock-policy-hash' : '',
      blockHash,
      slot
    );

    return c.json({
      success: true,
      data: {
        allowed: true,
        attestation,
      }
    });

  } catch (e) {
    console.error('Intent evaluation error:', e);
    return c.json({
      success: false,
      error: {
        code: 'EVALUATION_ERROR',
        message: e instanceof Error ? e.message : 'Failed to evaluate intent',
      }
    }, 500);
  }
});

/**
 * POST /intent/execute
 * Build and return a signed transaction for an allowed intent
 */
intentRouter.post('/execute', async (c) => {
  try {
    const body = await c.req.json();

    // Parse and validate intent
    let intent: Intent;
    try {
      intent = parseIntent(body);
    } catch (e) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INTENT',
          message: e instanceof Error ? e.message : 'Invalid intent format',
        }
      }, 400);
    }

    // Validate session key is authorized
    // In demo mode (policy in body), skip auth check; otherwise use wallet store
    const isDemo = !!body.policy;
    const authorized = isDemo
      ? true
      : isSessionAuthorized(intent.owner, intent.sessionKey);
    if (!authorized) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_NOT_AUTHORIZED',
          message: 'Session key is not authorized for this wallet',
        }
      }, 403);
    }

    // Get policy for wallet
    // Priority: 1) policy passed in body (for demo/custom), 2) wallet's stored policy, 3) fallback mock
    const policy: Policy = body.policy ?? getWalletPolicy(intent.owner) ?? {
      allowlist: [],
      blocklist: [],
      maxAmount: 10_000_000_000,
      dailyLimit: 100_000_000_000,
    };

    // Evaluate intent against policy
    const result = evaluateIntent(intent, policy);

    if (!result.allowed) {
      return c.json({
        success: true,
        data: {
          allowed: false,
          reason: result.reason,
          code: 'POLICY_BLOCKED',
        }
      });
    }

    // Build transaction
    const instruction = 0; // 0 = transfer
    const destination = intent.action === 'transfer'
      ? (intent.params as { destination: string }).destination
      : '';

    try {
      const builtTx = await buildTransaction(
        {
          owner: intent.owner,
          sessionKey: intent.sessionKey,
          instruction,
          destination,
          amount: intent.action === 'transfer'
            ? (intent.params as { amount: number }).amount
            : 0,
          attestation: generateAttestation(intent, '', 'mock-block-hash', 0),
        },
        PROGRAM_ID,
        intent.owner
      );

      return c.json({
        success: true,
        data: {
          allowed: true,
          transaction: builtTx.transaction,
          blockHash: builtTx.blockHash,
          slot: builtTx.slot,
          signers: builtTx.signers,
        }
      });

    } catch (e) {
      console.error('Transaction build error:', e);
      return c.json({
        success: false,
        error: {
          code: 'BUILD_ERROR',
          message: e instanceof Error ? e.message : 'Failed to build transaction',
        }
      }, 500);
    }

  } catch (e) {
    console.error('Intent execution error:', e);
    return c.json({
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: e instanceof Error ? e.message : 'Failed to execute intent',
      }
    }, 500);
  }
});

/**
 * POST /intent/route
 * Parse intent and determine routing (for SDK integration)
 */
intentRouter.post('/route', async (c) => {
  try {
    const body = await c.req.json();

    // Parse and validate intent
    let intent: Intent;
    try {
      intent = parseIntent(body);
    } catch (e) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INTENT',
          message: e instanceof Error ? e.message : 'Invalid intent format',
        }
      }, 400);
    }

    // Route based on action type
    const routes: Record<string, string> = {
      transfer: '/intent/transfer',
      swap: '/intent/swap',
      stake: '/intent/stake',
      unstake: '/intent/unstake',
      delegate: '/intent/delegate',
      undelegate: '/intent/undelegate',
      custom: '/intent/custom',
    };

    const route = routes[intent.action] || '/intent/unknown';

    return c.json({
      success: true,
      data: {
        intentId: intent.id,
        action: intent.action,
        route,
        params: intent.params,
      }
    });

  } catch (e) {
    console.error('Intent routing error:', e);
    return c.json({
      success: false,
      error: {
        code: 'ROUTING_ERROR',
        message: e instanceof Error ? e.message : 'Failed to route intent',
      }
    }, 500);
  }
});