import type { MultichainStrategyParams, PoletChain } from '../types/intent';

export interface ChainAssetAllowlistPolicy {
  mode: 'chain-asset-allowlist';
  allowedSourceChains: PoletChain[];
  allowedTargetChains: PoletChain[];
  allowedSourceAssets: string[];
  allowedTargetAssets: string[];
}

export interface ChainAssetGuardrailDecision {
  allowed: boolean;
  code?: 'IKA_ROUTE_NOT_ALLOWED';
  reason?: string;
}

export const DEFAULT_IKA_CHAIN_ASSET_POLICY: ChainAssetAllowlistPolicy = {
  mode: 'chain-asset-allowlist',
  allowedSourceChains: ['solana'],
  allowedTargetChains: ['sui', 'ethereum'],
  allowedSourceAssets: ['USDC'],
  allowedTargetAssets: ['SUI', 'ETH'],
};

export function evaluateIkaChainAssetGuardrails(params: MultichainStrategyParams): ChainAssetGuardrailDecision {
  const policy = normalizeChainAssetPolicy(params.routeGuardrails) ?? DEFAULT_IKA_CHAIN_ASSET_POLICY;
  const sourceAsset = normalizeAsset(params.sourceAsset);
  const targetAsset = normalizeAsset(params.targetAsset);

  if (!policy.allowedSourceChains.includes(params.sourceChain)) return blocked();
  if (!policy.allowedTargetChains.includes(params.targetChain)) return blocked();
  if (!policy.allowedSourceAssets.includes(sourceAsset)) return blocked();
  if (!policy.allowedTargetAssets.includes(targetAsset)) return blocked();
  if (!isSupportedIkaRoute(params.sourceChain, sourceAsset, params.targetChain, targetAsset)) return blocked();

  return { allowed: true };
}

function normalizeChainAssetPolicy(value: MultichainStrategyParams['routeGuardrails'] | undefined): ChainAssetAllowlistPolicy | undefined {
  if (!value) return undefined;
  if (value.mode !== 'chain-asset-allowlist') {
    throw new Error('routeGuardrails.mode must be chain-asset-allowlist');
  }

  return {
    mode: 'chain-asset-allowlist',
    allowedSourceChains: normalizeChains(value.allowedSourceChains, 'routeGuardrails.allowedSourceChains'),
    allowedTargetChains: normalizeChains(value.allowedTargetChains, 'routeGuardrails.allowedTargetChains'),
    allowedSourceAssets: normalizeAssets(value.allowedSourceAssets, 'routeGuardrails.allowedSourceAssets'),
    allowedTargetAssets: normalizeAssets(value.allowedTargetAssets, 'routeGuardrails.allowedTargetAssets'),
  };
}

function normalizeChains(values: PoletChain[], label: string): PoletChain[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  return Array.from(new Set(values));
}

function normalizeAssets(values: string[], label: string): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  return Array.from(new Set(values.map(normalizeAsset)));
}

function normalizeAsset(value: string): string {
  return value.trim().toUpperCase();
}

function isSupportedIkaRoute(sourceChain: PoletChain, sourceAsset: string, targetChain: PoletChain, targetAsset: string): boolean {
  return sourceChain === 'solana'
    && sourceAsset === 'USDC'
    && (
      (targetChain === 'sui' && targetAsset === 'SUI')
      || (targetChain === 'ethereum' && targetAsset === 'ETH')
    );
}

function blocked(): ChainAssetGuardrailDecision {
  return {
    allowed: false,
    code: 'IKA_ROUTE_NOT_ALLOWED',
    reason: 'This chain or asset route is outside the wallet allowed route policy. No Ika approval data was prepared.',
  };
}
