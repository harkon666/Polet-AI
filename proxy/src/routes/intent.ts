import { Hono } from 'hono';
import { mapMultichainIntentToDcaRunRequest, parseIntent } from '../lib/intent-parser';
import { evaluateIntent } from '../lib/policy-engine';
import { generateAttestation } from '../lib/policy-engine';
import { buildTransaction } from '../lib/transaction-builder';
import { getWalletPolicy, isSessionAuthorized } from '../lib/wallet-store';
import {
  ConfidentialDcaExecutionError,
  runConfidentialDcaExecution,
} from '../lib/confidential-dca-execution';
import {
  IkaBridgelessRequestError,
  createIkaBridgelessExecutionRequest,
} from '../lib/ika-bridgeless-request';
import { JupiterGatewayError } from '../lib/jupiter-gateway';
import type { Intent, MultichainStrategyParams, Policy } from '../types/intent';

export const intentRouter = new Hono();

// Program ID for the Polet AI contract
const PROGRAM_ID = 'J1AmhNEsVQukD8cvRh7zRD9jh56QocsoGCBrfTvTmAus';

/**
 * POST /intent/dca/run
 * Run the confidential USDC -> SOL DCA demo path.
 */
intentRouter.post('/dca/run', async (c) => {
  try {
    const body = await c.req.json();
    const result = await runConfidentialDcaExecution(body);

    return c.json({
      success: true,
      data: result,
    });
  } catch (e) {
    if (e instanceof ConfidentialDcaExecutionError) {
      return c.json({
        success: false,
        error: {
          code: e.code,
          message: e.message,
        },
      }, e.status as 400 | 404 | 500);
    }
    if (e instanceof JupiterGatewayError) {
      return c.json({
        success: false,
        error: {
          code: e.code,
          message: 'Jupiter precheck failed',
          status: e.status,
        },
      }, 502);
    }

    console.error('Confidential DCA execution error:', e);
    return c.json({
      success: false,
      error: {
        code: 'DCA_EXECUTION_ERROR',
        message: e instanceof Error ? e.message : 'Failed to run confidential DCA',
      },
    }, 500);
  }
});

/**
 * POST /intent/multichain/run
 * Accept the cross-chain strategy intent envelope. The currently executable
 * combination is Solana USDC -> SOL on the Jupiter rail, mapped to DCA.
 */
intentRouter.post('/multichain/run', async (c) => {
  try {
    const body = await c.req.json();
    const intent = parseIntent(body);
    const params = intent.params as MultichainStrategyParams;

    if (params.executionRail === 'ika') {
      const result = await createIkaBridgelessExecutionRequest(intent);

      return c.json({
        success: true,
        data: result,
      });
    }

    const dcaRequest = mapMultichainIntentToDcaRunRequest(intent);
    const result = await runConfidentialDcaExecution(dcaRequest);

    return c.json({
      success: true,
      data: {
        ...result,
        multichain: {
          sourceChain: params.sourceChain,
          sourceAsset: params.sourceAsset,
          targetChain: params.targetChain,
          targetAsset: params.targetAsset,
          executionRail: params.executionRail,
          settlement: 'not-executed',
        },
      },
    });
  } catch (e) {
    if (e instanceof ConfidentialDcaExecutionError) {
      return c.json({
        success: false,
        error: {
          code: e.code,
          message: e.message,
        },
      }, e.status as 400 | 404 | 500);
    }
    if (e instanceof JupiterGatewayError) {
      return c.json({
        success: false,
        error: {
          code: e.code,
          message: 'Jupiter precheck failed',
          status: e.status,
        },
      }, 502);
    }
    if (e instanceof IkaBridgelessRequestError) {
      return c.json({
        success: false,
        error: {
          code: e.code,
          message: e.message,
        },
      }, e.status as 400 | 404 | 500);
    }

    const message = e instanceof Error ? e.message : 'Invalid multichain intent';
    return c.json({
      success: false,
      error: {
        code: 'INVALID_MULTICHAIN_INTENT',
        message,
      },
    }, 400);
  }
});

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
    const authorized = await isSessionAuthorized(intent.owner, intent.sessionKey);
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
    const policy: Policy | null = await getWalletPolicy(intent.owner);
    if (!policy) {
      return c.json({
        success: false,
        error: {
          code: 'POLICY_NOT_FOUND',
          message: 'Wallet policy not found or invalid',
        }
      }, 404);
    }

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
    const authorized = await isSessionAuthorized(intent.owner, intent.sessionKey);
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
    const policy: Policy | null = await getWalletPolicy(intent.owner);
    if (!policy) {
      return c.json({
        success: false,
        error: {
          code: 'POLICY_NOT_FOUND',
          message: 'Wallet policy not found or invalid',
        }
      }, 404);
    }

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
      ? (intent.params as import('../types/intent').TransferParams).destination
      : '';

    try {
      const builtTx = await buildTransaction(
        {
          owner: intent.owner,
          sessionKey: intent.sessionKey,
          instruction,
          destination,
          amount: intent.action === 'transfer'
            ? (intent.params as import('../types/intent').TransferParams).amount
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
      'multichain-strategy': '/intent/multichain/run',
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
