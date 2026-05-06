import { describe, expect, test } from 'bun:test';
import {
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
} from '../src/lib/bridgeless-order';
import {
  POLET_SUI_DEVNET_VERIFIER_ADDRESS,
  buildSuiDevnetTransactionDigest,
  normalizeSuiAddress,
} from '../src/lib/sui-transaction-digest';

describe('Sui transaction digest adapter', () => {
  test('maps an approved canonical order into a deterministic Sui devnet digest artifact', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);
    const recipient = `0x${'ab'.repeat(32)}`;

    const artifact = buildSuiDevnetTransactionDigest({ order, canonicalOrderHash, recipient });
    const repeated = buildSuiDevnetTransactionDigest({ order, canonicalOrderHash, recipient });
    const differentRecipient = buildSuiDevnetTransactionDigest({
      order,
      canonicalOrderHash,
      recipient: `0x${'cd'.repeat(32)}`,
    });

    expect(artifact).toMatchObject({
      schema: 'polet.sui.devnet.transaction-digest.v1',
      chain: 'sui',
      network: 'devnet',
      action: 'zero-mist-transfer-proof',
      transactionKind: 'programmable-transaction-block',
      broadcastable: false,
      productionSettlement: false,
      intent: {
        scope: 'TransactionData',
        prefixHex: '000000',
        hash: 'blake2b-256',
      },
      transaction: {
        recipient: normalizeSuiAddress(recipient),
        amountMist: '0',
        canonicalOrderHash,
        intentId: 'ika-sui-digest-1',
        sourcePolicyAmountBaseUnits: '5000000',
      },
    });
    expect(artifact.digestHex).toMatch(/^[0-9a-f]{64}$/);
    expect(artifact.digestBase58.length).toBeGreaterThan(0);
    expect(artifact.transactionPayloadBase64.length).toBeGreaterThan(0);
    expect(artifact.digestHex).toBe(repeated.digestHex);
    expect(artifact.digestHex).not.toBe(canonicalOrderHash);
    expect(artifact.digestHex).not.toBe(differentRecipient.digestHex);
  });

  test('defaults to the Polet Sui devnet verifier address when no destination is supplied', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);

    const artifact = buildSuiDevnetTransactionDigest({ order, canonicalOrderHash });

    expect(artifact.transaction.recipient).toBe(POLET_SUI_DEVNET_VERIFIER_ADDRESS);
  });

  test('rejects invalid destination data and unsupported order targets', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);

    expect(() => buildSuiDevnetTransactionDigest({
      order,
      canonicalOrderHash,
      recipient: '0xnot-a-sui-address',
    })).toThrow('nativeDestinationAccount must be a 32-byte Sui address hex string');
    expect(() => normalizeSuiAddress(`0x${'0'.repeat(64)}`)).toThrow('must not be the zero Sui address');
    expect(() => buildSuiDevnetTransactionDigest({
      order: {
        ...order,
        target: { chain: 'ethereum', asset: 'ETH' },
      },
      canonicalOrderHash,
    })).toThrow('Sui digest adapter requires a Sui SUI target order');
  });
});

function buildFixtureOrder() {
  return buildCanonicalBridgelessOrder({
    intentId: 'ika-sui-digest-1',
    source: {
      chain: 'solana',
      asset: 'USDC',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    target: {
      chain: 'sui',
      asset: 'SUI',
    },
    amount: '5',
    amountBaseUnits: '5000000',
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    policySequence: 7,
    nonce: 'nonce-001',
    expiresAtUnix: 1_900_000_000,
    slippageBps: 100,
  });
}
