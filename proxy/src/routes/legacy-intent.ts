import { Hono } from 'hono';
import { parseIntent } from '../lib/intent-parser';
import {
  evaluateLegacyPublicIntent,
  generateLegacyPublicAttestation,
} from '../lib/legacy-public-policy-engine';
import { evaluateConfidentialNumericPolicy } from '../lib/confidential-numeric-policy';
import { buildTransaction } from '../lib/transaction-builder';
import { getWalletPolicy, isSessionAuthorized } from '../lib/wallet-store';
import type { Intent, Policy } from '../types/intent';
import { PROGRAM_ID_STRING } from '../lib/program-identity';
import { getWalletData } from '../lib/wallet-store';
import { getIntentAmount } from '../lib/intent-parser';

export const legacyIntentRouter = new Hono();

/**
 * POST /legacy/intent/evaluate
 * Legacy plaintext policy path retained for prior transfer demos only.
 * Current confidential DCA uses `/intent/dca/run`.
 */
legacyIntentRouter.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json();
    let intent: Intent;
    try {
      intent = parseIntent(body);
    } catch (e) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INTENT',
          message: e instanceof Error ? e.message : 'Invalid intent format',
        },
      }, 400);
    }

    const authorized = await isSessionAuthorized(intent.owner, intent.sessionKey);
    if (!authorized) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_NOT_AUTHORIZED',
          message: 'Session key is not authorized for this wallet',
        },
      }, 403);
    }

    const policy: Policy | null = await getWalletPolicy(intent.owner);
    if (!policy) {
      return c.json({
        success: false,
        error: {
          code: 'POLICY_NOT_FOUND',
          message: 'Legacy public wallet policy not found or invalid',
        },
      }, 404);
    }

    const result = evaluateLegacyPublicIntent(intent, policy);
    
    // Check confidential policy if enabled
    const walletData = await getWalletData(intent.owner);
    if (walletData?.confidentialPolicy?.enabled) {
      const amount = getIntentAmount(intent);
      // For simple demo, we assume the witness is the same mock one [42, 0, ..., 0]
      const witness = Array(32).fill(0);
      witness[0] = 42;
      
      const confidentialResult = evaluateConfidentialNumericPolicy(
        walletData,
        BigInt(amount),
        witness
      );
      
      if (!confidentialResult.allowed) {
        return c.json({
          success: true,
          data: {
            allowed: false,
            reason: `Confidential: ${confidentialResult.reason}`,
            code: 'CONFIDENTIAL_POLICY_BLOCKED',
          },
        });
      }
    }

    if (!result.allowed) {
      return c.json({
        success: true,
        data: {
          allowed: false,
          reason: result.reason,
          code: 'LEGACY_PUBLIC_POLICY_BLOCKED',
        },
      });
    }

    const blockHash = '7nKSqW2MmLqzK7K8Gz3D7Z3Q9L4M6N2P4R6S8T0U2V4W6X';
    const slot = 123456789;
    const attestation = generateLegacyPublicAttestation(intent, 'mock-legacy-policy-hash', blockHash, slot);

    return c.json({
      success: true,
      data: {
        allowed: true,
        legacy: true,
        attestation,
      },
    });
  } catch (e) {
    console.error('Legacy intent evaluation error:', e);
    return c.json({
      success: false,
      error: {
        code: 'LEGACY_EVALUATION_ERROR',
        message: e instanceof Error ? e.message : 'Failed to evaluate legacy intent',
      },
    }, 500);
  }
});

/**
 * POST /legacy/intent/execute
 * Legacy plaintext policy transaction builder retained for prior transfer demos only.
 */
legacyIntentRouter.post('/execute', async (c) => {
  try {
    const body = await c.req.json();
    let intent: Intent;
    try {
      intent = parseIntent(body);
    } catch (e) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_INTENT',
          message: e instanceof Error ? e.message : 'Invalid intent format',
        },
      }, 400);
    }

    const authorized = await isSessionAuthorized(intent.owner, intent.sessionKey);
    if (!authorized) {
      return c.json({
        success: false,
        error: {
          code: 'SESSION_NOT_AUTHORIZED',
          message: 'Session key is not authorized for this wallet',
        },
      }, 403);
    }

    const policy: Policy | null = await getWalletPolicy(intent.owner);
    if (!policy) {
      return c.json({
        success: false,
        error: {
          code: 'POLICY_NOT_FOUND',
          message: 'Legacy public wallet policy not found or invalid',
        },
      }, 404);
    }

    const result = evaluateLegacyPublicIntent(intent, policy);

    // Check confidential policy if enabled
    const walletData = await getWalletData(intent.owner);
    if (walletData?.confidentialPolicy?.enabled) {
      const amount = getIntentAmount(intent);
      const witness = Array(32).fill(0);
      witness[0] = 42;
      
      const confidentialResult = evaluateConfidentialNumericPolicy(
        walletData,
        BigInt(amount),
        witness
      );
      
      if (!confidentialResult.allowed) {
        return c.json({
          success: true,
          data: {
            allowed: false,
            reason: `Confidential: ${confidentialResult.reason}`,
            code: 'CONFIDENTIAL_POLICY_BLOCKED',
          },
        });
      }
    }

    if (!result.allowed) {
      return c.json({
        success: true,
        data: {
          allowed: false,
          reason: result.reason,
          code: 'LEGACY_PUBLIC_POLICY_BLOCKED',
        },
      });
    }

    const destination = intent.action === 'transfer'
      ? (intent.params as import('../types/intent').TransferParams).destination
      : '';

    try {
      const builtTx = await buildTransaction(
        {
          owner: intent.owner,
          sessionKey: intent.sessionKey,
          instruction: 0,
          destination,
          amount: intent.action === 'transfer'
            ? (intent.params as import('../types/intent').TransferParams).amount
            : 0,
          attestation: generateLegacyPublicAttestation(intent, '', 'mock-block-hash', 0),
        },
        PROGRAM_ID_STRING,
        intent.owner
      );

      return c.json({
        success: true,
        data: {
          allowed: true,
          legacy: true,
          transaction: builtTx.transaction,
          blockHash: builtTx.blockHash,
          slot: builtTx.slot,
          signers: builtTx.signers,
        },
      });
    } catch (e) {
      console.error('Legacy transaction build error:', e);
      return c.json({
        success: false,
        error: {
          code: 'LEGACY_BUILD_ERROR',
          message: e instanceof Error ? e.message : 'Failed to build legacy transaction',
        },
      }, 500);
    }
  } catch (e) {
    console.error('Legacy intent execution error:', e);
    return c.json({
      success: false,
      error: {
        code: 'LEGACY_EXECUTION_ERROR',
        message: e instanceof Error ? e.message : 'Failed to execute legacy intent',
      },
    }, 500);
  }
});
