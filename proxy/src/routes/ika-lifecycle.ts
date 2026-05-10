/**
 * Ika lifecycle + setup endpoints.
 *
 * `POST /ika/setup-dwallet/commit`: persist a completed dWallet DKG +
 *   TransferOwnership result into the local registry. Does not touch the
 *   network directly; operators run `scripts/ika-setup-dwallet.ts` for the
 *   live flow and then call this endpoint to record it.
 * `GET  /ika/dwallet/:owner`: read the registry entry for an owner.
 * `POST /ika/lifecycle/progress`: progress an approved bridgeless intent
 *   from `approval-transaction-prepared` through `signature-committed` and
 *   (optionally) destination broadcast.
 * `GET  /ika/gas-deposit/:owner`: inspect the on-chain GasDeposit PDA and
 *   report whether it passes Polet's floor guard.
 *
 * All responses avoid leaking private policy values; only lifecycle status
 * codes, on-chain public data, and gas thresholds are exposed.
 */

import { Hono } from 'hono';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  IkaDWalletRegistry,
  assertSupportedIkaCurve,
  type IkaDWalletRegistryEntry,
} from '../lib/ika-dwallet-registry';
import {
  bytesToHex,
  DWALLET_CURVE,
  hexToBytes,
  IKA_PREALPHA_GRPC_URL,
  type DWalletCurveId,
  type NetworkSignedAttestation,
} from '../lib/ika-grpc-schema';
import {
  createTlsGrpcTransport,
  IkaGrpcClient,
  loadIkaServiceKeypair,
} from '../lib/ika-grpc-client';
import {
  progressIkaLifecycle,
  type IkaLifecycleProgressionInput,
  type IkaLifecycleResult,
} from '../lib/ika-lifecycle-progression';
import {
  runDestinationBroadcast,
  type DestinationBroadcastResult,
} from '../lib/destination-broadcast';
import { readIkaGasDepositStatus } from '../lib/ika-gas-deposit';
import {
  enableManagedIkaChain,
  loadSubsidyKeypair,
  type EnableChainRequest,
  EnableChainError,
} from '../lib/ika-managed-setup';
import { loadManagedFixture, ManagedFixtureMissingError, requireManagedFixtureEntry } from '../lib/ika-dkg-orchestrator';
import { getWalletData } from '../lib/wallet-store';
import type { IkaBridgelessExecutionRequest } from '../lib/ika-bridgeless-request';

export const ikaLifecycleRouter = new Hono();

function solanaRpcUrl(): string {
  return process.env.SOLANA_RPC_URL
    ?? process.env.POLET_SOLANA_RPC_URL
    ?? 'https://api.devnet.solana.com';
}

function parseCurve(value: unknown): DWalletCurveId {
  if (value === 'curve25519' || value === DWALLET_CURVE.Curve25519) return DWALLET_CURVE.Curve25519;
  if (value === 'secp256k1' || value === DWALLET_CURVE.Secp256k1) return DWALLET_CURVE.Secp256k1;
  throw new Error('curve must be curve25519 or secp256k1');
}

// ---------- POST /ika/enable-chain (managed demo mode) ----------

ikaLifecycleRouter.post('/enable-chain', async (c) => {
  try {
    const body = (await c.req.json()) as EnableChainRequest;
    if (!body.owner) return c.json({ success: false, error: 'owner is required' }, 400);
    if (body.chain !== 'sui' && body.chain !== 'ethereum') {
      return c.json({ success: false, error: 'chain must be sui or ethereum' }, 400);
    }
    const connection = new Connection(solanaRpcUrl(), 'confirmed');
    const registry = new IkaDWalletRegistry();
    const subsidyKeypair = await loadSubsidyKeypair();
    const result = await enableManagedIkaChain(
      {
        owner: body.owner,
        chain: body.chain,
        curve: body.curve,
        subsidy: body.subsidy,
      },
      {
        connection,
        registry,
        subsidyKeypair,
      }
    );
    return c.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ManagedFixtureMissingError) {
      return c.json({
        success: false,
        error: error.message,
        code: 'MANAGED_FIXTURE_MISSING',
      }, 503);
    }
    if (error instanceof EnableChainError) {
      return c.json({ success: false, error: error.message, code: error.code }, error.status as 400 | 422 | 500);
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'enable-chain failed',
    }, 400);
  }
});

// ---------- GET /ika/managed-fixture/status ----------

ikaLifecycleRouter.get('/managed-fixture/status', async (c) => {
  try {
    const file = await loadManagedFixture();
    const entries = Object.entries(file.dwallets).map(([curveKey, entry]) => ({
      curveKey,
      dwalletAccount: entry?.dwalletAccount,
      dwalletPublicKeyHex: entry?.dwalletPublicKeyHex,
      transferredAuthority: entry?.transferredAuthority,
      createdEpoch: entry?.createdEpoch,
    }));
    return c.json({
      success: true,
      data: {
        version: file.version,
        disclosure: file.disclosure,
        entries,
      },
    });
  } catch (error) {
    if (error instanceof ManagedFixtureMissingError) {
      return c.json({
        success: false,
        error: error.message,
        code: 'MANAGED_FIXTURE_MISSING',
      }, 503);
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'managed-fixture/status failed',
    }, 400);
  }
});

// ---------- POST /ika/setup-dwallet/commit ----------

ikaLifecycleRouter.post('/setup-dwallet/commit', async (c) => {
  try {
    const body = (await c.req.json()) as Partial<IkaDWalletRegistryEntry> & { curve?: unknown };
    if (!body.owner) return c.json({ success: false, error: 'owner is required' }, 400);
    if (!body.dwalletPublicKeyHex) return c.json({ success: false, error: 'dwalletPublicKeyHex is required' }, 400);
    if (!body.dwalletAccount) return c.json({ success: false, error: 'dwalletAccount is required' }, 400);
    if (!body.transferredAuthority) return c.json({ success: false, error: 'transferredAuthority is required' }, 400);
    const curve = parseCurve(body.curve);
    assertSupportedIkaCurve(curve);
    const registry = new IkaDWalletRegistry();
    const entry = await registry.upsert({
      owner: body.owner,
      dwalletPublicKeyHex: body.dwalletPublicKeyHex,
      dwalletAccount: body.dwalletAccount,
      curve,
      createdEpoch: String(body.createdEpoch ?? '0'),
      transferredAuthority: body.transferredAuthority,
      label: body.label,
      source: body.source ?? 'api',
    });
    return c.json({ success: true, data: entry });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'setup-dwallet/commit failed',
    }, 400);
  }
});

// ---------- GET /ika/dwallet/:owner ----------

ikaLifecycleRouter.get('/dwallet/:owner', async (c) => {
  try {
    const owner = c.req.param('owner');
    const registry = new IkaDWalletRegistry();
    const entry = await registry.findByOwner(owner);
    if (!entry) return c.json({ success: false, error: `No dWallet registered for ${owner}` }, 404);
    return c.json({ success: true, data: entry });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'registry lookup failed',
    }, 400);
  }
});

// ---------- GET /ika/gas-deposit/:owner ----------

ikaLifecycleRouter.get('/gas-deposit/:owner', async (c) => {
  try {
    const owner = new PublicKey(c.req.param('owner'));
    const connection = new Connection(solanaRpcUrl(), 'confirmed');
    const status = await readIkaGasDepositStatus(connection, owner);
    return c.json({
      success: true,
      data: {
        pda: status.pda,
        exists: status.exists,
        passes: status.passes,
        reason: status.reason ?? null,
        floors: {
          minIkaBaseUnits: status.floors.minIkaBaseUnits.toString(),
          minSolLamports: status.floors.minSolLamports.toString(),
        },
        observed: status.account
          ? {
              ikaBalance: status.account.ikaBalance.toString(),
              solBalance: status.account.solBalance.toString(),
              createdAtEpoch: status.account.createdAtEpoch.toString(),
              lastSettlementEpoch: status.account.lastSettlementEpoch.toString(),
            }
          : null,
      },
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'gas-deposit lookup failed',
    }, 400);
  }
});

// ---------- POST /ika/lifecycle/progress ----------

interface LifecycleProgressBody {
  ikaRequest: IkaBridgelessExecutionRequest;
  approvalTransactionSignature: string; // base58 or base64
  approvalTransactionSlot: string | number;
  dwalletAttestation?: {
    attestationDataHex: string;
    networkSignatureHex: string;
    networkPublicKeyHex: string;
    epoch: string;
  };
  dwalletNetworkEncryptionPublicKeyHex?: string;
  messageCentralizedSignatureHex?: string;
  /** When true (default for managed demo mode) the proxy auto-loads attestation / NEK / centralized signature from `.polet/ika-managed-fixture.json`. */
  managedFixture?: boolean;
  importedKey?: boolean;
  polling?: { timeoutMs?: number; intervalMs?: number };
  broadcast?: {
    mode?: 'auto' | 'live' | 'demo-memo' | 'disabled';
    suiRpcUrl?: string;
    ethereumRpcUrl?: string;
  };
}

ikaLifecycleRouter.post('/lifecycle/progress', async (c) => {
  const serviceKeyHex = process.env.POLET_IKA_SERVICE_KEYPAIR_HEX;
  if (!serviceKeyHex) {
    return c.json({
      success: false,
      error: 'POLET_IKA_SERVICE_KEYPAIR_HEX is not configured on the proxy',
    }, 500);
  }
  let transportOpened: Awaited<ReturnType<typeof createTlsGrpcTransport>> | null = null;
  try {
    const body = (await c.req.json()) as LifecycleProgressBody;
    const ikaRequest = body.ikaRequest;
    if (!ikaRequest?.preAlphaSigning) {
      return c.json({ success: false, error: 'ikaRequest.preAlphaSigning is required' }, 400);
    }
    const registry = new IkaDWalletRegistry();
    const registryEntry = await registry.findByOwner(ikaRequest.sessionContext.owner);
    if (!registryEntry) {
      return c.json({
        success: false,
        error: `No dWallet registered for owner ${ikaRequest.sessionContext.owner}`,
      }, 404);
    }
    const wallet = await getWalletData(ikaRequest.sessionContext.owner);
    if (!wallet) {
      return c.json({ success: false, error: 'Polet wallet not found for owner' }, 404);
    }
    const matchingSession = wallet.sessions.find(
      (s) => s.key === ikaRequest.sessionContext.sessionKey && s.authorized
    );
    if (!matchingSession) {
      return c.json({
        success: false,
        error: 'Session key is not authorized for this owner',
      }, 403);
    }

    const transport = await createTlsGrpcTransport({
      endpoint: process.env.IKA_GRPC_URL ?? IKA_PREALPHA_GRPC_URL,
    });
    transportOpened = transport;
    const grpcClient = new IkaGrpcClient({
      transport,
      serviceKeypair: loadIkaServiceKeypair(serviceKeyHex),
    });

    const managedFixtureRequested = body.managedFixture !== false;
    const managedFixtureEntry = managedFixtureRequested
      ? await tryLoadManagedFixtureEntry(registryEntry.curve)
      : null;
    const attestationSource = body.dwalletAttestation ?? managedFixtureEntry?.dwalletAttestation;
    const nekHex = body.dwalletNetworkEncryptionPublicKeyHex
      ?? managedFixtureEntry?.dwalletNetworkEncryptionPublicKeyHex;
    const centralizedSigHex = body.messageCentralizedSignatureHex
      ?? managedFixtureEntry?.messageCentralizedSignatureHex;
    if (!attestationSource || !nekHex || !centralizedSigHex) {
      return c.json({
        success: false,
        error: 'dwalletAttestation / dwalletNetworkEncryptionPublicKeyHex / messageCentralizedSignatureHex are required (or provide a managed fixture on disk)',
        code: 'LIFECYCLE_INPUT_MISSING',
      }, 400);
    }

    const attestation: NetworkSignedAttestation = {
      attestationData: hexToBytes(attestationSource.attestationDataHex),
      networkSignature: hexToBytes(attestationSource.networkSignatureHex),
      networkPublicKey: hexToBytes(attestationSource.networkPublicKeyHex),
      epoch: BigInt(attestationSource.epoch),
    };

    const connection = new Connection(solanaRpcUrl(), 'confirmed');
    const progressionInput: IkaLifecycleProgressionInput = {
      ikaRequest,
      approvalTransactionSignature: body.approvalTransactionSignature,
      approvalTransactionSlot: BigInt(body.approvalTransactionSlot),
      dwalletAttestation: attestation,
      dwalletRegistryEntry: registryEntry,
      messageCentralizedSignature: hexToBytes(centralizedSigHex),
      dwalletNetworkEncryptionPublicKey: hexToBytes(nekHex),
      importedKey: body.importedKey,
      sessionContext: {
        owner: ikaRequest.sessionContext.owner,
        sessionKey: ikaRequest.sessionContext.sessionKey,
        grantedSlot: matchingSession.grantedSlot,
        lastRevokedSlot: wallet.lastRevokedSlot,
      },
      readLatestRevokedSlot: async () => {
        const latest = await getWalletData(ikaRequest.sessionContext.owner);
        return latest?.lastRevokedSlot ?? wallet.lastRevokedSlot;
      },
      polling: body.polling,
    };

    const lifecycleResult = await progressIkaLifecycle(progressionInput, {
      connection,
      grpcClient,
      registry,
    });

    if (!lifecycleResult.ok) {
      return c.json({ success: false, data: serializeLifecycleFailure(lifecycleResult) }, 400);
    }

    let broadcast: DestinationBroadcastResult | null = null;
    try {
      broadcast = await runDestinationBroadcast({
        ikaRequest,
        producedSignature: {
          status: 'signature-produced-prealpha',
          signature: Buffer.from(lifecycleResult.produced.signature).toString('hex'),
          publicKey: registryEntry.dwalletPublicKeyHex,
          messageDigest: lifecycleResult.produced.messageDigestHex,
          signatureScheme: ikaRequest.preAlphaSigning.signatureScheme,
        },
        dwalletPublicKey: hexToBytes(registryEntry.dwalletPublicKeyHex),
        config: {
          mode: body.broadcast?.mode,
          sui: body.broadcast?.suiRpcUrl ? { rpcUrl: body.broadcast.suiRpcUrl } : undefined,
          ethereum: body.broadcast?.ethereumRpcUrl ? { rpcUrl: body.broadcast.ethereumRpcUrl } : undefined,
        },
      });
    } catch (error) {
      broadcast = {
        ok: false,
        status: 'broadcast-failed',
        code: 'RPC_FAILURE',
        chain: ikaRequest.target.chain === 'ethereum' ? 'ethereum' : ikaRequest.target.chain === 'sui' ? 'sui' : 'solana-demo',
        reason: error instanceof Error ? error.message : 'Destination broadcast failed',
      };
    }

    return c.json({
      success: true,
      data: {
        lifecycleStatus: lifecycleResult.lifecycleStatus,
        signatureHex: bytesToHex(lifecycleResult.produced.signature),
        messageDigestHex: lifecycleResult.produced.messageDigestHex,
        messageApprovalPda: lifecycleResult.produced.messageApprovalPda,
        dwalletAccount: lifecycleResult.produced.dwalletAccount,
        signatureScheme: lifecycleResult.produced.signatureScheme,
        epoch: lifecycleResult.produced.epoch.toString(),
        broadcast: broadcast ? serializeBroadcast(broadcast) : null,
        attemptedSteps: lifecycleResult.attemptedSteps,
      },
    });
  } catch (error) {
    console.error('[ika-lifecycle] /progress failed:', error instanceof Error ? error.stack ?? error.message : error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'lifecycle/progress failed',
      details: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    }, 400);
  } finally {
    if (transportOpened) await transportOpened.close().catch(() => undefined);
  }
});

function serializeLifecycleFailure(result: Extract<IkaLifecycleResult, { ok: false }>): Record<string, unknown> {
  return {
    ok: false,
    status: result.status,
    lifecycleStatus: result.lifecycleStatus,
    code: result.code,
    reason: result.reason,
    revokePhase: result.revokePhase ?? null,
    attemptedSteps: result.attemptedSteps,
    gas: result.gas ?? null,
  };
}

function serializeBroadcast(result: DestinationBroadcastResult): Record<string, unknown> {
  if (result.ok) {
    return {
      ok: true,
      status: result.status,
      chain: result.chain,
      receipt: result.receipt ?? null,
      productionSettlement: false,
    };
  }
  return {
    ok: false,
    status: result.status,
    chain: result.chain,
    code: result.code,
    reason: result.reason,
    productionSettlement: false,
  };
}

async function tryLoadManagedFixtureEntry(curve: DWalletCurveId) {
  try {
    const fixture = await loadManagedFixture();
    return requireManagedFixtureEntry(fixture, curve);
  } catch {
    return null;
  }
}
