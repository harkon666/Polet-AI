import { keccak_256 } from '@noble/hashes/sha3.js';
import type { CanonicalBridgelessOrder } from './bridgeless-order';

export const ETHEREUM_SEPOLIA_MESSAGE_DIGEST_SCHEMA = 'polet.ethereum.sepolia.message-digest.v1';
export const ETHEREUM_SEPOLIA_CHAIN_ID = 11_155_111;
export const POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS = `0x${'0'.repeat(39)}1`;

export interface EthereumMessageDigestArtifact {
  schema: typeof ETHEREUM_SEPOLIA_MESSAGE_DIGEST_SCHEMA;
  chain: 'ethereum';
  network: 'sepolia';
  chainId: typeof ETHEREUM_SEPOLIA_CHAIN_ID;
  action: 'zero-wei-transfer-proof';
  digestHex: string;
  intent: {
    standard: 'EIP-191';
    version: 'personal_sign';
    hash: 'keccak256';
  };
  messagePayloadEncoding: 'stable-json-sepolia-v1';
  messagePayloadBase64: string;
  message: {
    recipient: string;
    asset: 'ETH';
    amountWei: '0';
    canonicalOrderHash: string;
    intentId: string;
    policySequence: number;
    sourcePolicyAmountBaseUnits: string;
    expiresAtUnix: number;
    slippageBps: number;
  };
  broadcastable: false;
  productionSettlement: false;
  note: string;
}

export interface BuildEthereumMessageDigestInput {
  order: CanonicalBridgelessOrder;
  canonicalOrderHash: string;
  recipient?: string;
}

export function buildEthereumSepoliaMessageDigest(input: BuildEthereumMessageDigestInput): EthereumMessageDigestArtifact {
  validateEthereumOrder(input.order);
  const canonicalOrderHash = normalizeHex32(input.canonicalOrderHash, 'canonicalOrderHash');
  const recipient = normalizeEthereumAddress(
    input.recipient ?? POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS,
    'nativeDestinationAccount'
  );
  const message = {
    recipient,
    asset: 'ETH' as const,
    amountWei: '0' as const,
    canonicalOrderHash,
    intentId: input.order.intentId,
    policySequence: input.order.policySequence,
    sourcePolicyAmountBaseUnits: input.order.amount.policyBaseUnits,
    expiresAtUnix: input.order.expiresAtUnix,
    slippageBps: input.order.slippageBps,
  };
  const messagePayload = stableStringify({
    schema: ETHEREUM_SEPOLIA_MESSAGE_DIGEST_SCHEMA,
    chain: 'ethereum',
    network: 'sepolia',
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    action: 'zero-wei-transfer-proof',
    message,
  });
  const messageBytes = new TextEncoder().encode(messagePayload);
  const prefixBytes = new TextEncoder().encode(`\x19Ethereum Signed Message:\n${messageBytes.length}`);
  const digestBytes = keccak_256(concatBytes(prefixBytes, messageBytes));
  const digestHex = bytesToHex(digestBytes);

  return {
    schema: ETHEREUM_SEPOLIA_MESSAGE_DIGEST_SCHEMA,
    chain: 'ethereum',
    network: 'sepolia',
    chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    action: 'zero-wei-transfer-proof',
    digestHex,
    intent: {
      standard: 'EIP-191',
      version: 'personal_sign',
      hash: 'keccak256',
    },
    messagePayloadEncoding: 'stable-json-sepolia-v1',
    messagePayloadBase64: Buffer.from(messageBytes).toString('base64'),
    message,
    broadcastable: false,
    productionSettlement: false,
    note: 'Ethereum Sepolia sign-only EIP-191 digest for a zero-wei verification message. It is not broadcast or production settlement.',
  };
}

export function normalizeEthereumAddress(value: string, label = 'ethereumAddress'): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be an Ethereum address string`);
  }

  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    throw new Error(`${label} must be a 20-byte Ethereum address hex string`);
  }
  if (/^0x0{40}$/i.test(trimmed)) {
    throw new Error(`${label} must not be the zero Ethereum address`);
  }

  return trimmed.toLowerCase();
}

function validateEthereumOrder(order: CanonicalBridgelessOrder): void {
  if (order.source.chain !== 'solana' || order.source.asset !== 'USDC') {
    throw new Error('Ethereum digest adapter requires a Solana USDC source order');
  }
  if (order.target.chain !== 'ethereum' || order.target.asset !== 'ETH') {
    throw new Error('Ethereum digest adapter requires an Ethereum ETH target order');
  }
}

function normalizeHex32(value: string, label: string): string {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${label} must be a 32-byte hex string`);
  }
  return value.toLowerCase();
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
