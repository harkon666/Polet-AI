import { describe, expect, test } from 'bun:test';
import {
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
} from '../src/lib/bridgeless-order';
import {
  ETHEREUM_SEPOLIA_CHAIN_ID,
  POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS,
  buildEthereumSepoliaMessageDigest,
  normalizeEthereumAddress,
} from '../src/lib/ethereum-transaction-digest';

describe('Ethereum message digest adapter', () => {
  test('maps an approved canonical order into a deterministic Sepolia EIP-191 digest artifact', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);
    const recipient = `0x${'ab'.repeat(20)}`;

    const artifact = buildEthereumSepoliaMessageDigest({ order, canonicalOrderHash, recipient });
    const repeated = buildEthereumSepoliaMessageDigest({ order, canonicalOrderHash, recipient });
    const differentRecipient = buildEthereumSepoliaMessageDigest({
      order,
      canonicalOrderHash,
      recipient: `0x${'cd'.repeat(20)}`,
    });

    expect(artifact).toMatchObject({
      schema: 'polet.ethereum.sepolia.message-digest.v1',
      chain: 'ethereum',
      network: 'sepolia',
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
      action: 'zero-wei-transfer-proof',
      broadcastable: false,
      productionSettlement: false,
      intent: {
        standard: 'EIP-191',
        version: 'personal_sign',
        hash: 'keccak256',
      },
      message: {
        recipient: normalizeEthereumAddress(recipient),
        amountWei: '0',
        canonicalOrderHash,
        intentId: 'ika-eth-digest-1',
        sourcePolicyAmountBaseUnits: '5000000',
      },
    });
    expect(artifact.digestHex).toMatch(/^[0-9a-f]{64}$/);
    expect(artifact.messagePayloadBase64.length).toBeGreaterThan(0);
    expect(artifact.digestHex).toBe(repeated.digestHex);
    expect(artifact.digestHex).not.toBe(canonicalOrderHash);
    expect(artifact.digestHex).not.toBe(differentRecipient.digestHex);
  });

  test('defaults to the Polet Ethereum Sepolia verifier address when no destination is supplied', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);

    const artifact = buildEthereumSepoliaMessageDigest({ order, canonicalOrderHash });

    expect(artifact.message.recipient).toBe(POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS);
  });

  test('rejects invalid destination data and unsupported order targets', async () => {
    const order = buildFixtureOrder();
    const canonicalOrderHash = await hashCanonicalBridgelessOrder(order);

    expect(() => buildEthereumSepoliaMessageDigest({
      order,
      canonicalOrderHash,
      recipient: '0xnot-an-evm-address',
    })).toThrow('nativeDestinationAccount must be a 20-byte Ethereum address hex string');
    expect(() => normalizeEthereumAddress(`0x${'0'.repeat(40)}`)).toThrow('must not be the zero Ethereum address');
    expect(() => buildEthereumSepoliaMessageDigest({
      order: {
        ...order,
        target: { chain: 'sui', asset: 'SUI' },
      },
      canonicalOrderHash,
    })).toThrow('Ethereum digest adapter requires an Ethereum ETH target order');
  });
});

function buildFixtureOrder() {
  return buildCanonicalBridgelessOrder({
    intentId: 'ika-eth-digest-1',
    source: {
      chain: 'solana',
      asset: 'USDC',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    target: {
      chain: 'ethereum',
      asset: 'ETH',
    },
    amount: '5',
    amountBaseUnits: '5000000',
    owner: 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2',
    sessionKey: 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4',
    policySequence: 7,
    nonce: 'nonce-eth-001',
    expiresAtUnix: 1_900_000_000,
    slippageBps: 100,
  });
}
