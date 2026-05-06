import { blake2b } from '@noble/hashes/blake2.js';
import bs58 from 'bs58';
import type { CanonicalBridgelessOrder } from './bridgeless-order';

export const SUI_DEVNET_TRANSACTION_DIGEST_SCHEMA = 'polet.sui.devnet.transaction-digest.v1';
export const SUI_TRANSACTION_DATA_INTENT_PREFIX_HEX = '000000';
export const POLET_SUI_DEVNET_VERIFIER_ADDRESS = `0x${'0'.repeat(63)}1`;

export interface SuiTransactionDigestArtifact {
  schema: typeof SUI_DEVNET_TRANSACTION_DIGEST_SCHEMA;
  chain: 'sui';
  network: 'devnet';
  action: 'zero-mist-transfer-proof';
  transactionKind: 'programmable-transaction-block';
  digestHex: string;
  digestBase58: string;
  intent: {
    scope: 'TransactionData';
    version: 'V0';
    appId: 'Sui';
    prefixHex: typeof SUI_TRANSACTION_DATA_INTENT_PREFIX_HEX;
    hash: 'blake2b-256';
  };
  transactionPayloadEncoding: 'stable-json-devnet-v1';
  transactionPayloadBase64: string;
  transaction: {
    recipient: string;
    asset: 'SUI';
    amountMist: '0';
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

export interface BuildSuiTransactionDigestInput {
  order: CanonicalBridgelessOrder;
  canonicalOrderHash: string;
  recipient?: string;
}

export function buildSuiDevnetTransactionDigest(input: BuildSuiTransactionDigestInput): SuiTransactionDigestArtifact {
  validateSuiOrder(input.order);
  const canonicalOrderHash = normalizeHex32(input.canonicalOrderHash, 'canonicalOrderHash');
  const recipient = normalizeSuiAddress(input.recipient ?? POLET_SUI_DEVNET_VERIFIER_ADDRESS, 'nativeDestinationAccount');
  const transaction = {
    recipient,
    asset: 'SUI' as const,
    amountMist: '0' as const,
    canonicalOrderHash,
    intentId: input.order.intentId,
    policySequence: input.order.policySequence,
    sourcePolicyAmountBaseUnits: input.order.amount.policyBaseUnits,
    expiresAtUnix: input.order.expiresAtUnix,
    slippageBps: input.order.slippageBps,
  };
  const transactionPayload = stableStringify({
    schema: SUI_DEVNET_TRANSACTION_DIGEST_SCHEMA,
    chain: 'sui',
    network: 'devnet',
    action: 'zero-mist-transfer-proof',
    transactionKind: 'programmable-transaction-block',
    transaction,
  });
  const payloadBytes = new TextEncoder().encode(transactionPayload);
  const preimage = concatBytes(hexToBytes(SUI_TRANSACTION_DATA_INTENT_PREFIX_HEX), payloadBytes);
  const digestBytes = blake2b(preimage, { dkLen: 32 });
  const digestHex = bytesToHex(digestBytes);

  return {
    schema: SUI_DEVNET_TRANSACTION_DIGEST_SCHEMA,
    chain: 'sui',
    network: 'devnet',
    action: 'zero-mist-transfer-proof',
    transactionKind: 'programmable-transaction-block',
    digestHex,
    digestBase58: bs58.encode(digestBytes),
    intent: {
      scope: 'TransactionData',
      version: 'V0',
      appId: 'Sui',
      prefixHex: SUI_TRANSACTION_DATA_INTENT_PREFIX_HEX,
      hash: 'blake2b-256',
    },
    transactionPayloadEncoding: 'stable-json-devnet-v1',
    transactionPayloadBase64: Buffer.from(payloadBytes).toString('base64'),
    transaction,
    broadcastable: false,
    productionSettlement: false,
    note: 'Sui devnet sign-only digest for a zero-MIST verification action. It is not broadcast or production settlement.',
  };
}

export function normalizeSuiAddress(value: string, label = 'suiAddress'): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a Sui address string`);
  }

  const trimmed = value.trim();
  const raw = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{1,64}$/.test(raw)) {
    throw new Error(`${label} must be a 32-byte Sui address hex string`);
  }
  if (/^0+$/.test(raw)) {
    throw new Error(`${label} must not be the zero Sui address`);
  }

  return `0x${raw.toLowerCase().padStart(64, '0')}`;
}

function validateSuiOrder(order: CanonicalBridgelessOrder): void {
  if (order.source.chain !== 'solana' || order.source.asset !== 'USDC') {
    throw new Error('Sui digest adapter requires a Solana USDC source order');
  }
  if (order.target.chain !== 'sui' || order.target.asset !== 'SUI') {
    throw new Error('Sui digest adapter requires a Sui SUI target order');
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

function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'hex'));
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
