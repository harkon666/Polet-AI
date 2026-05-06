import type {
  BridgelessRouteRisk,
  BridgelessRouteRiskLevel,
} from './bridgeless-order';
import type { MultichainStrategyParams } from '../types/intent';

export interface BridgelessRiskGuardrailPolicy {
  mode: 'bridgeless-route-risk';
  maxSlippageBps: number;
  maxPriceImpactBps?: number;
  minLiquidityScore?: BridgelessRouteRiskLevel;
  requireVerifiedRoute?: boolean;
}

export interface BridgelessRiskGuardrailDecision {
  allowed: boolean;
  code?: 'IKA_RISK_GUARDRAIL_BLOCKED';
  reason?: string;
  policy: BridgelessRiskGuardrailPolicy;
  routeRisk?: BridgelessRouteRisk;
}

export const DEFAULT_BRIDGELESS_RISK_POLICY: BridgelessRiskGuardrailPolicy = {
  mode: 'bridgeless-route-risk',
  maxSlippageBps: 150,
  maxPriceImpactBps: 300,
  minLiquidityScore: 'medium',
  requireVerifiedRoute: false,
};

export function evaluateBridgelessRiskGuardrails(
  params: MultichainStrategyParams
): BridgelessRiskGuardrailDecision {
  const policy = normalizeRiskPolicy(params.riskGuardrails) ?? DEFAULT_BRIDGELESS_RISK_POLICY;
  const slippageBps = normalizeInteger(params.slippageBps ?? 100, 'slippageBps', 0, 10_000);
  const routeRisk = normalizeRouteRisk(params.routeRisk);

  if (slippageBps > policy.maxSlippageBps) {
    return blocked(policy, routeRisk, 'Requested bridgeless slippage is outside the wallet route-risk policy. No Ika approval data was prepared.');
  }

  if (routeRisk?.priceImpactBps !== undefined && policy.maxPriceImpactBps !== undefined && routeRisk.priceImpactBps > policy.maxPriceImpactBps) {
    return blocked(policy, routeRisk, 'Estimated bridgeless route price impact is outside the wallet route-risk policy. No Ika approval data was prepared.');
  }

  if (routeRisk?.liquidityScore !== undefined && policy.minLiquidityScore !== undefined && scoreRank(routeRisk.liquidityScore) < scoreRank(policy.minLiquidityScore)) {
    return blocked(policy, routeRisk, 'Estimated bridgeless route liquidity is below the wallet route-risk policy. No Ika approval data was prepared.');
  }

  if (policy.requireVerifiedRoute === true && routeRisk?.verifiedRoute !== true) {
    return blocked(policy, routeRisk, 'The bridgeless route is not verified by the wallet route-risk policy. No Ika approval data was prepared.');
  }

  return {
    allowed: true,
    policy,
    ...(routeRisk && { routeRisk }),
  };
}

function normalizeRiskPolicy(value: MultichainStrategyParams['riskGuardrails'] | undefined): BridgelessRiskGuardrailPolicy | undefined {
  if (!value) return undefined;
  if (value.mode !== 'bridgeless-route-risk') {
    throw new Error('riskGuardrails.mode must be bridgeless-route-risk');
  }

  return {
    mode: 'bridgeless-route-risk',
    maxSlippageBps: normalizeInteger(value.maxSlippageBps, 'riskGuardrails.maxSlippageBps', 0, 10_000),
    ...(value.maxPriceImpactBps !== undefined && {
      maxPriceImpactBps: normalizeInteger(value.maxPriceImpactBps, 'riskGuardrails.maxPriceImpactBps', 0, 10_000),
    }),
    ...(value.minLiquidityScore !== undefined && {
      minLiquidityScore: normalizeLiquidityScore(value.minLiquidityScore, 'riskGuardrails.minLiquidityScore'),
    }),
    ...(value.requireVerifiedRoute !== undefined && {
      requireVerifiedRoute: normalizeBoolean(value.requireVerifiedRoute, 'riskGuardrails.requireVerifiedRoute'),
    }),
  };
}

function normalizeRouteRisk(value: MultichainStrategyParams['routeRisk'] | undefined): BridgelessRouteRisk | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('routeRisk must be an object');
  }

  const routeRisk: BridgelessRouteRisk = {
    ...(value.priceImpactBps !== undefined && {
      priceImpactBps: normalizeInteger(value.priceImpactBps, 'routeRisk.priceImpactBps', 0, 10_000),
    }),
    ...(value.liquidityScore !== undefined && {
      liquidityScore: normalizeLiquidityScore(value.liquidityScore, 'routeRisk.liquidityScore'),
    }),
    ...(value.verifiedRoute !== undefined && {
      verifiedRoute: normalizeBoolean(value.verifiedRoute, 'routeRisk.verifiedRoute'),
    }),
    ...(value.provider !== undefined && {
      provider: normalizeProvider(value.provider),
    }),
  };

  return Object.keys(routeRisk).length === 0 ? undefined : routeRisk;
}

function normalizeInteger(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function normalizeLiquidityScore(value: unknown, label: string): BridgelessRouteRiskLevel {
  if (value !== 'low' && value !== 'medium' && value !== 'high') {
    throw new Error(`${label} must be low, medium, or high`);
  }
  return value;
}

function normalizeProvider(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 64) {
    throw new Error('routeRisk.provider must be a non-empty string of 64 characters or fewer');
  }
  return value;
}

function scoreRank(value: BridgelessRouteRiskLevel): number {
  if (value === 'low') return 0;
  if (value === 'medium') return 1;
  return 2;
}

function blocked(
  policy: BridgelessRiskGuardrailPolicy,
  routeRisk: BridgelessRouteRisk | undefined,
  reason: string
): BridgelessRiskGuardrailDecision {
  return {
    allowed: false,
    code: 'IKA_RISK_GUARDRAIL_BLOCKED',
    reason,
    policy,
    ...(routeRisk && { routeRisk }),
  };
}
