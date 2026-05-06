import { describe, expect, test } from 'bun:test';
import {
  assertCanonicalBridgelessOrderActive,
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
  serializeCanonicalBridgelessOrder,
  verifyCanonicalBridgelessOrderHash,
} from '../src/lib/bridgeless-order';

const BASE_ORDER = {
  intentId: 'ika-sui-allow-1',
  source: {
    chain: 'solana' as const,
    asset: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  target: {
    chain: 'sui' as const,
    asset: 'SUI',
  },
  amount: '5',
  amountBaseUnits: '5000000',
  slippageBps: 100,
  owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
  sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
  policySequence: 7,
  nonce: 'nonce-001',
  expiresAtUnix: 1_900_000_000,
};

describe('canonical bridgeless order message', () => {
  test('serializes and hashes a Sui-primary order deterministically', async () => {
    const order = buildCanonicalBridgelessOrder(BASE_ORDER);

    expect(serializeCanonicalBridgelessOrder(order)).toBe(
      '{"amount":{"baseUnits":"5000000","display":"5","policyAsset":"USDC","policyBaseUnits":"5000000"},"expiresAtUnix":1900000000,"intentId":"ika-sui-allow-1","nonce":"nonce-001","owner":"AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2","policySequence":7,"schema":"polet.bridgeless.order.v1","sessionKey":"BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4","slippageBps":100,"source":{"asset":"USDC","chain":"solana","mint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},"target":{"asset":"SUI","chain":"sui"}}'
    );
    expect(await hashCanonicalBridgelessOrder(order)).toBe(
      'e33cfb1071118e2303819a7cd1eb30dd1438b41ccb35a344f120ca813d734b26'
    );
  });

  test('detects hash mismatches', async () => {
    const order = buildCanonicalBridgelessOrder(BASE_ORDER);

    expect(await verifyCanonicalBridgelessOrderHash(order, '00'.repeat(32))).toBe(false);
  });

  test('rejects expired orders', () => {
    const order = buildCanonicalBridgelessOrder({
      ...BASE_ORDER,
      expiresAtUnix: 100,
    });

    expect(() => assertCanonicalBridgelessOrderActive(order, 101)).toThrow(/expired/);
  });

  test('accepts Ethereum as optional destination shape', async () => {
    const order = buildCanonicalBridgelessOrder({
      ...BASE_ORDER,
      intentId: 'ika-eth-allow-1',
      target: {
        chain: 'ethereum',
        asset: 'ETH',
      },
    });

    expect(order.target).toEqual({ chain: 'ethereum', asset: 'ETH' });
    expect(await hashCanonicalBridgelessOrder(order)).toHaveLength(64);
  });

  test('rejects unsupported destination chains and assets', () => {
    expect(() => buildCanonicalBridgelessOrder({
      ...BASE_ORDER,
      target: {
        chain: 'solana' as never,
        asset: 'SOL',
      },
    })).toThrow(/target chain/);

    expect(() => buildCanonicalBridgelessOrder({
      ...BASE_ORDER,
      target: {
        chain: 'sui',
        asset: 'USDC',
      },
    })).toThrow(/SUI/);
  });
});
