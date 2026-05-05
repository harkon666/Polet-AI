import { Hono } from 'hono';
import { mapMultichainIntentToDcaRunRequest, parseIntent } from '../lib/intent-parser';
import {
  ConfidentialDcaExecutionError,
  runConfidentialDcaExecution,
} from '../lib/confidential-dca-execution';
import {
  IkaBridgelessRequestError,
  createIkaBridgelessExecutionRequest,
} from '../lib/ika-bridgeless-request';
import { JupiterGatewayError } from '../lib/jupiter-gateway';
import type { Intent, MultichainStrategyParams } from '../types/intent';

export const intentRouter = new Hono();

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

    // Route based on action type. Non-strategy actions are legacy public-policy
    // compatibility routes; confidential DCA is the current product path.
    const routes: Record<string, string> = {
      transfer: '/legacy/intent/execute',
      swap: '/legacy/intent/evaluate',
      stake: '/legacy/intent/evaluate',
      unstake: '/legacy/intent/evaluate',
      delegate: '/legacy/intent/evaluate',
      undelegate: '/legacy/intent/evaluate',
      custom: '/legacy/intent/evaluate',
      dca: '/intent/dca/run',
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
