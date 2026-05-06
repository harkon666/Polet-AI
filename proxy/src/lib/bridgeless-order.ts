export const CANONICAL_BRIDGELESS_ORDER_SCHEMA = 'polet.bridgeless.order.v1';

export type CanonicalBridgelessSourceChain = 'solana';
export type CanonicalBridgelessTargetChain = 'sui' | 'ethereum';

export interface CanonicalBridgelessOrderAsset {
  chain: CanonicalBridgelessSourceChain | CanonicalBridgelessTargetChain;
  asset: string;
  mint?: string;
}

export interface CanonicalBridgelessOrder {
  schema: typeof CANONICAL_BRIDGELESS_ORDER_SCHEMA;
  intentId: string;
  source: CanonicalBridgelessOrderAsset & { chain: CanonicalBridgelessSourceChain };
  target: CanonicalBridgelessOrderAsset & { chain: CanonicalBridgelessTargetChain };
  amount: {
    display: string;
    baseUnits: string;
    policyAsset: 'USDC';
    policyBaseUnits: string;
  };
  slippageBps: number;
  owner: string;
  sessionKey: string;
  policySequence: number;
  nonce: string;
  expiresAtUnix: number;
}

export interface BuildCanonicalBridgelessOrderInput {
  intentId: string;
  source: CanonicalBridgelessOrder['source'];
  target: CanonicalBridgelessOrder['target'];
  amount: string;
  amountBaseUnits: string;
  policyBaseUnits?: string;
  slippageBps?: number;
  owner: string;
  sessionKey: string;
  policySequence: number;
  nonce?: string;
  expiresAtUnix: number;
}

export function buildCanonicalBridgelessOrder(input: BuildCanonicalBridgelessOrderInput): CanonicalBridgelessOrder {
  const order: CanonicalBridgelessOrder = {
    schema: CANONICAL_BRIDGELESS_ORDER_SCHEMA,
    intentId: requireNonEmpty(input.intentId, 'intentId'),
    source: normalizeSource(input.source),
    target: normalizeTarget(input.target),
    amount: {
      display: requireNonEmpty(input.amount, 'amount'),
      baseUnits: requireBaseUnits(input.amountBaseUnits, 'amountBaseUnits'),
      policyAsset: 'USDC',
      policyBaseUnits: requireBaseUnits(input.policyBaseUnits ?? input.amountBaseUnits, 'policyBaseUnits'),
    },
    slippageBps: normalizeSlippage(input.slippageBps ?? 100),
    owner: requireNonEmpty(input.owner, 'owner'),
    sessionKey: requireNonEmpty(input.sessionKey, 'sessionKey'),
    policySequence: requireNonNegativeInteger(input.policySequence, 'policySequence'),
    nonce: requireNonEmpty(input.nonce ?? input.intentId, 'nonce'),
    expiresAtUnix: requirePositiveInteger(input.expiresAtUnix, 'expiresAtUnix'),
  };

  return order;
}

export function serializeCanonicalBridgelessOrder(order: CanonicalBridgelessOrder): string {
  validateCanonicalBridgelessOrder(order);
  return stableStringify(order);
}

export async function hashCanonicalBridgelessOrder(order: CanonicalBridgelessOrder): Promise<string> {
  const bytes = new TextEncoder().encode(serializeCanonicalBridgelessOrder(order));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyCanonicalBridgelessOrderHash(
  order: CanonicalBridgelessOrder,
  expectedHash: string
): Promise<boolean> {
  return (await hashCanonicalBridgelessOrder(order)) === expectedHash.toLowerCase();
}

export function assertCanonicalBridgelessOrderActive(
  order: CanonicalBridgelessOrder,
  nowUnix = Math.floor(Date.now() / 1000)
): void {
  validateCanonicalBridgelessOrder(order);
  if (order.expiresAtUnix <= nowUnix) {
    throw new Error('canonical bridgeless order is expired');
  }
}

export function validateCanonicalBridgelessOrder(order: CanonicalBridgelessOrder): void {
  if (order.schema !== CANONICAL_BRIDGELESS_ORDER_SCHEMA) {
    throw new Error('invalid canonical bridgeless order schema');
  }
  requireNonEmpty(order.intentId, 'intentId');
  normalizeSource(order.source);
  normalizeTarget(order.target);
  requireNonEmpty(order.amount.display, 'amount.display');
  requireBaseUnits(order.amount.baseUnits, 'amount.baseUnits');
  if (order.amount.policyAsset !== 'USDC') {
    throw new Error('amount.policyAsset must be USDC');
  }
  requireBaseUnits(order.amount.policyBaseUnits, 'amount.policyBaseUnits');
  normalizeSlippage(order.slippageBps);
  requireNonEmpty(order.owner, 'owner');
  requireNonEmpty(order.sessionKey, 'sessionKey');
  requireNonNegativeInteger(order.policySequence, 'policySequence');
  requireNonEmpty(order.nonce, 'nonce');
  requirePositiveInteger(order.expiresAtUnix, 'expiresAtUnix');
}

function normalizeSource(source: CanonicalBridgelessOrder['source']): CanonicalBridgelessOrder['source'] {
  if (source.chain !== 'solana') {
    throw new Error('canonical bridgeless source chain must be solana');
  }
  if (source.asset.toUpperCase() !== 'USDC') {
    throw new Error('canonical bridgeless policy amount must use source USDC');
  }
  return {
    chain: 'solana',
    asset: 'USDC',
    ...(source.mint && { mint: source.mint }),
  };
}

function normalizeTarget(target: CanonicalBridgelessOrder['target']): CanonicalBridgelessOrder['target'] {
  if (target.chain === 'sui') {
    if (target.asset.toUpperCase() !== 'SUI') {
      throw new Error('sui canonical bridgeless target asset must be SUI');
    }
    return {
      chain: 'sui',
      asset: 'SUI',
      ...(target.mint && { mint: target.mint }),
    };
  }
  if (target.chain === 'ethereum') {
    if (target.asset.toUpperCase() !== 'ETH') {
      throw new Error('ethereum canonical bridgeless target asset must be ETH');
    }
    return {
      chain: 'ethereum',
      asset: 'ETH',
      ...(target.mint && { mint: target.mint }),
    };
  }
  throw new Error('canonical bridgeless target chain must be sui or ethereum');
}

function normalizeSlippage(value: number): number {
  return requireIntegerInRange(value, 'slippageBps', 0, 10_000);
}

function requireNonEmpty(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireBaseUnits(value: string, label: string): string {
  requireNonEmpty(value, label);
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${label} must be a positive integer string`);
  }
  return value;
}

function requirePositiveInteger(value: number, label: string): number {
  return requireIntegerInRange(value, label, 1, Number.MAX_SAFE_INTEGER);
}

function requireNonNegativeInteger(value: number, label: string): number {
  return requireIntegerInRange(value, label, 0, Number.MAX_SAFE_INTEGER);
}

function requireIntegerInRange(value: number, label: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}
