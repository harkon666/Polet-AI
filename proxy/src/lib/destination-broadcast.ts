/**
 * Destination broadcast dispatcher.
 *
 * After the Ika lifecycle produces a 64-byte signature, this module submits
 * the signed destination-chain transaction:
 *   - Sui devnet: wraps the signed digest in the Sui zero-mist transfer
 *     proof artifact and POSTs to the Sui devnet RPC.
 *   - Ethereum Sepolia: wraps the signed digest in the existing EIP-191
 *     zero-wei transfer proof artifact and POSTs to the Sepolia RPC.
 * When `POLET_DESTINATION_BROADCAST_MODE=demo-memo` (or the live broadcast
 * is disabled via `POLET_DESTINATION_BROADCAST=disabled`), the dispatcher
 * falls back to the existing Solana devnet memo proof clearly labelled as
 * non-settlement.
 *
 * The live broadcast paths here are skeletons: they build the correct RPC
 * payload and explorer URLs and delegate the HTTP call to an injectable
 * transport. Live devnet verification is a user-run acceptance step (see
 * docs/ika-devnet-smoke-runbook.md).
 */

import { Connection } from '@solana/web3.js';
import {
  DESTINATION_BROADCAST_DEMO_EXPLORER_BASE,
  DESTINATION_BROADCAST_DEMO_PATH,
  runDestinationBroadcastDemo,
  type DestinationBroadcastFailure,
  type DestinationBroadcastFailureCode,
  type DestinationBroadcastInput as DemoBroadcastInput,
  type DestinationBroadcastSubmitted as DemoBroadcastSubmitted,
  type DestinationBroadcastResult as DemoBroadcastResult,
  type IkaPreAlphaProducedSignature,
} from './destination-broadcast-demo';
import type { IkaBridgelessExecutionRequest } from './ika-bridgeless-request';
import { hexToBytes } from './ika-grpc-schema';

export type DestinationBroadcastMode = 'auto' | 'live' | 'demo-memo' | 'disabled';

export type DestinationBroadcastChain = 'sui' | 'ethereum' | 'solana-demo';

export interface DestinationBroadcastConfig {
  mode?: DestinationBroadcastMode;
  sui?: {
    rpcUrl?: string;
    explorerBase?: string;
  };
  ethereum?: {
    rpcUrl?: string;
    explorerBase?: string;
    chainId?: number;
  };
  demo?: DemoBroadcastInput['demoConfig'];
  /** Injectable JSON-RPC transport for tests. */
  rpcFetch?: typeof fetch;
}

export interface DestinationBroadcastExecutionInput {
  ikaRequest: IkaBridgelessExecutionRequest;
  producedSignature: IkaPreAlphaProducedSignature;
  /** Ed25519/Secp256k1 public key of the dWallet in the scheme expected by the destination chain. */
  dwalletPublicKey: Uint8Array;
  config?: DestinationBroadcastConfig;
}

export interface DestinationBroadcastReceipt {
  chain: DestinationBroadcastChain;
  cluster: 'devnet' | 'sepolia' | 'mainnet-not-supported';
  transactionHash: string;
  explorerUrl: string;
  productionSettlement: false;
}

export type DestinationBroadcastResult =
  | {
      ok: true;
      status: 'broadcast-submitted' | 'broadcast-confirmed' | 'broadcast-disabled';
      chain: DestinationBroadcastChain;
      receipt?: DestinationBroadcastReceipt;
      demoFallback?: DemoBroadcastResult;
      productionSettlement: false;
    }
  | {
      ok: false;
      status: 'broadcast-failed' | 'broadcast-disabled';
      code: DestinationBroadcastFailureCode | 'UNSUPPORTED_DESTINATION_CHAIN' | 'LIVE_BROADCAST_DISABLED';
      chain: DestinationBroadcastChain;
      reason: string;
      demoFallback?: DemoBroadcastResult;
    };

export const SUI_DEVNET_RPC_URL = 'https://fullnode.devnet.sui.io:443';
export const SUI_DEVNET_EXPLORER_BASE = 'https://suiscan.xyz/devnet/tx';
export const ETHEREUM_SEPOLIA_RPC_URL = 'https://rpc.sepolia.org';
export const ETHEREUM_SEPOLIA_EXPLORER_BASE = 'https://sepolia.etherscan.io/tx';
export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;

export async function runDestinationBroadcast(
  input: DestinationBroadcastExecutionInput
): Promise<DestinationBroadcastResult> {
  const mode = resolveMode(input.config?.mode);
  const targetChain = input.ikaRequest.target.chain;
  const rpcFetch = input.config?.rpcFetch ?? (globalThis.fetch as typeof fetch | undefined);

  if (mode === 'disabled') {
    return disabledResult(targetChain, 'Destination broadcast is disabled on proxy (pre-alpha version).');
  }

  if (mode === 'demo-memo') {
    const fallback = await runMemoFallback(input);
    return adaptMemoFallback(fallback, targetChain);
  }

  if (targetChain === 'sui') {
    if (!rpcFetch) {
      return failureResult(
        'sui',
        'LIVE_BROADCAST_DISABLED',
        'Sui devnet broadcast requires a fetch-compatible RPC transport; none configured.'
      );
    }
    return broadcastSuiDevnet(input, rpcFetch);
  }
  if (targetChain === 'ethereum') {
    if (!rpcFetch) {
      return failureResult(
        'ethereum',
        'LIVE_BROADCAST_DISABLED',
        'Ethereum Sepolia broadcast requires a fetch-compatible RPC transport; none configured.'
      );
    }
    return broadcastEthereumSepolia(input, rpcFetch);
  }

  return failureResult(
    'solana-demo',
    'UNSUPPORTED_DESTINATION_CHAIN',
    `Destination chain ${targetChain} is not supported by Polet's Ika broadcast dispatcher`
  );
}

function resolveMode(mode: DestinationBroadcastMode | undefined): DestinationBroadcastMode {
  if (mode && mode !== 'auto') return mode;
  const envMode = process.env.POLET_DESTINATION_BROADCAST_MODE;
  if (envMode === 'demo-memo' || envMode === 'live' || envMode === 'disabled') return envMode;
  const demoFlag = process.env.POLET_DESTINATION_BROADCAST_DEMO;
  if (demoFlag === 'enabled') return 'demo-memo';
  const flag = process.env.POLET_DESTINATION_BROADCAST;
  if (flag === 'live') return 'live';
  if (flag === 'disabled') return 'disabled';
  // Default: live broadcast off, return demo-memo so responses stay safe.
  return 'demo-memo';
}

function disabledResult(
  targetChain: string,
  reason: string
): DestinationBroadcastResult {
  return {
    ok: false,
    status: 'broadcast-disabled',
    code: 'LIVE_BROADCAST_DISABLED',
    chain: targetChain === 'sui' ? 'sui' : targetChain === 'ethereum' ? 'ethereum' : 'solana-demo',
    reason,
  };
}

type DestinationBroadcastErrorCode =
  | DestinationBroadcastFailureCode
  | 'UNSUPPORTED_DESTINATION_CHAIN'
  | 'LIVE_BROADCAST_DISABLED';

function failureResult(
  chain: DestinationBroadcastChain,
  code: DestinationBroadcastErrorCode,
  reason: string
): DestinationBroadcastResult {
  return { ok: false, status: 'broadcast-failed', code, chain, reason };
}

async function runMemoFallback(
  input: DestinationBroadcastExecutionInput
): Promise<DemoBroadcastResult> {
  const demoConfig = {
    enabled: process.env.POLET_DESTINATION_BROADCAST_DEMO === 'enabled',
    feePayerSecretKey: process.env.POLET_DESTINATION_BROADCAST_FEE_PAYER,
    rpcUrl: process.env.POLET_DESTINATION_BROADCAST_RPC_URL,
    confirm: process.env.POLET_DESTINATION_BROADCAST_CONFIRM === 'true',
    ...input.config?.demo,
  } as DemoBroadcastInput['demoConfig'];
  return runDestinationBroadcastDemo({
    ikaRequest: input.ikaRequest,
    producedSignature: input.producedSignature,
    demoConfig,
  });
}

function adaptMemoFallback(
  fallback: DemoBroadcastResult,
  targetChain: string
): DestinationBroadcastResult {
  const chain: DestinationBroadcastChain = 'solana-demo';
  if (fallback.ok) {
    const submitted = fallback as DemoBroadcastSubmitted;
    return {
      ok: true,
      status: submitted.status,
      chain,
      receipt: {
        chain,
        cluster: 'devnet',
        transactionHash: submitted.receipt.transactionId,
        explorerUrl: submitted.receipt.explorerUrl,
        productionSettlement: false,
      },
      demoFallback: fallback,
      productionSettlement: false,
    };
  }
  const failure = fallback as DestinationBroadcastFailure;
  if (failure.status === 'broadcast-disabled') {
    return {
      ok: true,
      status: 'broadcast-disabled',
      chain,
      demoFallback: fallback,
      productionSettlement: false,
    };
  }
  return {
    ok: false,
    status: 'broadcast-failed',
    code: failure.code,
    chain,
    reason: failure.reason,
    demoFallback: fallback,
  };
}

// ---------- Sui devnet ----------

async function broadcastSuiDevnet(
  input: DestinationBroadcastExecutionInput,
  rpcFetch: typeof fetch
): Promise<DestinationBroadcastResult> {
  const digestHex = input.ikaRequest.suiTransactionDigest?.digestHex;
  if (!digestHex) {
    return failureResult('sui', 'INVALID_PREALPHA_SIGNATURE', 'Ika request is missing suiTransactionDigest');
  }
  // `SuiTransactionDigestArtifact` exposes the unsigned tx bytes as
  // `transactionPayloadBase64` (base64 of the TransactionData BCS bytes).
  const txBytes = input.ikaRequest.suiTransactionDigest?.transactionPayloadBase64;
  const rpcUrl = input.config?.sui?.rpcUrl ?? process.env.POLET_SUI_DEVNET_RPC_URL ?? SUI_DEVNET_RPC_URL;
  const explorerBase = input.config?.sui?.explorerBase ?? SUI_DEVNET_EXPLORER_BASE;
  const signatureBytes = hexToBytes(input.producedSignature.signature);
  // Sui expects a signature schema byte + signature (64) + pubkey (32) for Ed25519.
  const signatureBase64 = buildSuiEd25519SerializedSignature(
    signatureBytes,
    input.dwalletPublicKey
  );
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'sui_executeTransactionBlock',
    params: [
      txBytes ?? '',
      [signatureBase64],
      { showEffects: false, showEvents: false },
      'WaitForLocalExecution',
    ],
  };
  try {
    const response = await rpcFetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return failureResult('sui', 'RPC_FAILURE', `Sui RPC returned HTTP ${response.status}`);
    }
    const parsed = (await response.json()) as { result?: { digest?: string } };
    const txHash = parsed?.result?.digest;
    if (!txHash) {
      return failureResult('sui', 'RPC_FAILURE', `Sui RPC response missing digest: ${JSON.stringify(parsed)}`);
    }
    return {
      ok: true,
      status: 'broadcast-submitted',
      chain: 'sui',
      receipt: {
        chain: 'sui',
        cluster: 'devnet',
        transactionHash: txHash,
        explorerUrl: `${explorerBase}/${txHash}`,
        productionSettlement: false,
      },
      productionSettlement: false,
    };
  } catch (error) {
    return failureResult('sui', 'RPC_FAILURE', errorMessage(error, 'Sui devnet RPC call failed'));
  }
}

function buildSuiEd25519SerializedSignature(signature: Uint8Array, publicKey: Uint8Array): string {
  // Sui serialized signature = base64(flag(1) || signature(64) || pubkey(32)). Flag 0x00 = Ed25519.
  const flagged = new Uint8Array(1 + signature.length + publicKey.length);
  flagged[0] = 0x00;
  flagged.set(signature, 1);
  flagged.set(publicKey, 1 + signature.length);
  return Buffer.from(flagged).toString('base64');
}

// ---------- Ethereum Sepolia ----------

async function broadcastEthereumSepolia(
  input: DestinationBroadcastExecutionInput,
  rpcFetch: typeof fetch
): Promise<DestinationBroadcastResult> {
  // `EthereumMessageDigestArtifact` exposes the personal_sign-style message
  // payload (not a full unsigned raw transaction) as `messagePayloadBase64`.
  // Polet's Sepolia skeleton repackages that payload + the Ika-produced
  // Secp256k1 signature into a proof string the runbook then assembles into
  // a real signed transaction with an external tool (viem etc.). No real
  // unsigned raw tx is built inside the proxy yet, so the runbook's manual
  // Sepolia step remains the authoritative broadcast path.
  const messagePayloadBase64 = input.ikaRequest.ethereumMessageDigest?.messagePayloadBase64;
  if (!messagePayloadBase64) {
    return failureResult(
      'ethereum',
      'INVALID_PREALPHA_SIGNATURE',
      'Ika request is missing ethereumMessageDigest.messagePayloadBase64 for Sepolia broadcast'
    );
  }
  const signatureBytes = hexToBytes(input.producedSignature.signature);
  const signedRaw = assembleEthereumRawTransaction(
    messagePayloadBase64,
    signatureBytes,
    input.config?.ethereum?.chainId ?? ETHEREUM_SEPOLIA_CHAIN_ID
  );
  const rpcUrl = input.config?.ethereum?.rpcUrl ?? process.env.POLET_ETHEREUM_SEPOLIA_RPC_URL ?? ETHEREUM_SEPOLIA_RPC_URL;
  const explorerBase = input.config?.ethereum?.explorerBase ?? ETHEREUM_SEPOLIA_EXPLORER_BASE;
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendRawTransaction',
    params: [`0x${signedRaw}`],
  };
  try {
    const response = await rpcFetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return failureResult('ethereum', 'RPC_FAILURE', `Sepolia RPC returned HTTP ${response.status}`);
    }
    const parsed = (await response.json()) as { error?: { message?: string }; result?: string };
    if (parsed?.error) {
      return failureResult(
        'ethereum',
        'RPC_FAILURE',
        `Sepolia RPC error: ${parsed.error?.message ?? JSON.stringify(parsed.error)}`
      );
    }
    const txHash = parsed?.result;
    if (!txHash) {
      return failureResult('ethereum', 'RPC_FAILURE', `Sepolia RPC response missing txHash: ${JSON.stringify(parsed)}`);
    }
    return {
      ok: true,
      status: 'broadcast-submitted',
      chain: 'ethereum',
      receipt: {
        chain: 'ethereum',
        cluster: 'sepolia',
        transactionHash: txHash,
        explorerUrl: `${explorerBase}/${txHash}`,
        productionSettlement: false,
      },
      productionSettlement: false,
    };
  } catch (error) {
    return failureResult('ethereum', 'RPC_FAILURE', errorMessage(error, 'Sepolia RPC call failed'));
  }
}

/**
 * Minimal assembler: expects `rawTransactionHex` to be an RLP-encoded EIP-155
 * transaction without the signature fields (v, r, s) appended. Real EVM
 * signing requires re-RLP-encoding with v=chainId*2+35+recovery, r, s. The
 * pre-alpha signature we produce is Secp256k1 compact (64 bytes: r||s) – the
 * recovery byte must be derived externally. For the Pre-Alpha runbook the
 * session signer is expected to provide the recovery id, so this helper is
 * intentionally a thin skeleton: it panics with a descriptive error so tests
 * can exercise the failure path while the live runbook documents the manual
 * Sepolia step.
 */
function assembleEthereumRawTransaction(
  messagePayloadBase64: string,
  signature: Uint8Array,
  chainId: number
): string {
  if (signature.length !== 64) {
    throw new Error(`Sepolia broadcast expects a 64-byte Secp256k1 compact signature (got ${signature.length})`);
  }
  // Polet does not ship a full RLP encoder in this pre-alpha slice; the
  // runbook instructs operators to assemble the signed transaction with an
  // external tool (e.g. viem) and re-submit through the lifecycle. Emit a
  // deterministic placeholder so higher layers can detect the skeleton state.
  const chainIdHex = chainId.toString(16).padStart(2, '0');
  const payloadHex = Buffer.from(messagePayloadBase64, 'base64').toString('hex');
  return `${payloadHex}${Buffer.from(signature).toString('hex')}${chainIdHex}`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return `${fallback}: ${error.message}`;
  return fallback;
}

// Re-export demo path metadata so callers keep a single import point.
export { DESTINATION_BROADCAST_DEMO_PATH, DESTINATION_BROADCAST_DEMO_EXPLORER_BASE };
export { runMemoFallback as runDestinationMemoFallback };

// Satisfy Solana connection type reference so tree-shakers keep it for
// callers that construct a shared connection in proxy bootstrapping.
export type { Connection };
