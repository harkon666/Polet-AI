/**
 * Ika Pre-Alpha signing lifecycle progression.
 *
 * Progresses an approved bridgeless request from
 * `approval-transaction-prepared` through `Presign` -> `Sign` -> polling
 * `MessageApproval` until the NOA writes `CommitSignature` (status=Signed).
 *
 * Two kill-switch checkpoints honour Polet session revocation:
 *   (a) before issuing the Sign request
 *   (b) before returning the produced signature (immediately before
 *       destination broadcast would be attempted)
 *
 * The orchestrator never sees or logs the user's private policy values; it
 * only surfaces lifecycle status codes and on-chain public data.
 *
 * Pre-alpha disclaimer: produced signatures come from a single mock signer,
 * not real distributed MPC. Destination broadcast and settlement are
 * handled by `destination-broadcast.ts`.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  APPROVE_MESSAGE_DISCRIMINATOR,
  bytesToHex,
  CHAIN_ID,
  DWALLET_CURVE,
  DWALLET_SIGNATURE_ALGORITHM,
  DWALLET_SIGNATURE_SCHEME,
  hexToBytes,
  MESSAGE_APPROVAL_LAYOUT,
  MESSAGE_APPROVAL_STATUS,
  BcsReader,
  type ChainIdValue,
  type DWalletCurveId,
  type DWalletSignatureAlgorithmId,
  type DWalletSignatureSchemeId,
  type NetworkSignedAttestation,
} from './ika-grpc-schema';
import {
  buildPresignForDWalletRequest,
  buildPresignRequest,
  buildSignRequest,
  type IkaGrpcClient,
  type IkaGrpcRequestError,
  type PresignSummary,
} from './ika-grpc-client';
import { enforceGasDepositFloor, readIkaGasDepositStatus, type IkaGasFloorError } from './ika-gas-deposit';
import type { IkaDWalletRegistry, IkaDWalletRegistryEntry } from './ika-dwallet-registry';
import type { IkaBridgelessExecutionRequest } from './ika-bridgeless-request';

export type IkaLifecycleStatus =
  | 'approval-transaction-prepared'
  | 'approval-submitted'
  | 'gas-floor-blocked'
  | 'presign-issued'
  | 'sign-submitted'
  | 'signature-committed'
  | 'session-revoked-midflight'
  | 'lifecycle-error';

export type SessionRevokePhase =
  | 'pre-presign'
  | 'pre-sign'
  | 'post-sign-pre-broadcast';

export interface IkaLifecycleSessionContext {
  owner: string;
  sessionKey: string;
  grantedSlot: number;
  lastRevokedSlot: number;
}

export interface IkaLifecycleProgressionInput {
  ikaRequest: IkaBridgelessExecutionRequest;
  approvalTransactionSignature: Uint8Array | string;
  approvalTransactionSlot: bigint | number;
  dwalletAttestation: NetworkSignedAttestation;
  dwalletRegistryEntry: IkaDWalletRegistryEntry;
  messageCentralizedSignature: Uint8Array;
  dwalletNetworkEncryptionPublicKey: Uint8Array;
  /**
   * Only required for imported ECDSA dWallets. When provided, lifecycle uses
   * `PresignForDWallet` instead of the global `Presign` allocator.
   */
  importedKey?: boolean;
  /**
   * The Polet-level smart-wallet context used for the kill switch. `grantedSlot`
   * must be the session signer's grant slot; `lastRevokedSlot` the wallet's
   * latest on-chain revoke slot at the moment the lifecycle starts.
   */
  sessionContext: IkaLifecycleSessionContext;
  /**
   * Called before Presign/Sign/broadcast to reload revocation state from the
   * authoritative source (wallet-store). Return the most recent
   * `lastRevokedSlot` so midflight revokes abort the lifecycle.
   */
  readLatestRevokedSlot: () => Promise<number>;
  /** Optional hint for tests to bypass live Presign discovery. */
  existingPresignSessionIdentifier?: Uint8Array;
  /** Override for polling behaviour. */
  polling?: {
    timeoutMs?: number;
    intervalMs?: number;
  };
  /**
   * Extra metadata message bytes to sign when the destination chain requires
   * it. Defaults to `ikaRequest.ikaMessageHash` bytes (keccak256 digest).
   */
  messageOverride?: Uint8Array;
  messageMetadata?: Uint8Array;
}

export interface IkaProducedSignatureArtifact {
  status: 'signature-committed';
  signature: Uint8Array;
  signatureHex: string;
  messageDigestHex: string;
  messageApprovalPda: string;
  dwalletAccount: string;
  signatureScheme: DWalletSignatureSchemeId;
  epoch: bigint;
}

export interface IkaLifecycleProgressionOk {
  ok: true;
  status: 'signature-committed';
  lifecycleStatus: IkaLifecycleStatus;
  produced: IkaProducedSignatureArtifact;
  approvalTransactionSignatureBase58: string;
  approvalTransactionSlot: bigint;
  attemptedSteps: IkaLifecycleStatus[];
}

export interface IkaLifecycleProgressionFailure {
  ok: false;
  status: 'session-revoked-midflight' | 'gas-floor-blocked' | 'lifecycle-error';
  lifecycleStatus: IkaLifecycleStatus;
  code: IkaLifecycleFailureCode;
  reason: string;
  revokePhase?: SessionRevokePhase;
  attemptedSteps: IkaLifecycleStatus[];
  /** Populated when `status = gas-floor-blocked`. */
  gas?: {
    pda: string;
    minIkaBaseUnits: string;
    minSolLamports: string;
    observedIkaBalance?: string;
    observedSolLamports?: string;
  };
}

export type IkaLifecycleResult = IkaLifecycleProgressionOk | IkaLifecycleProgressionFailure;

export type IkaLifecycleFailureCode =
  | 'SESSION_REVOKED_MIDFLIGHT'
  | 'GAS_FLOOR_UNDERFUNDED'
  | 'PRESIGN_REQUEST_FAILED'
  | 'SIGN_REQUEST_FAILED'
  | 'COMMIT_SIGNATURE_TIMEOUT'
  | 'MESSAGE_APPROVAL_MISSING'
  | 'INVALID_PRODUCED_SIGNATURE'
  | 'GRPC_PROTOCOL_ERROR';

export interface IkaLifecycleDeps {
  connection: Connection;
  grpcClient: IkaGrpcClient;
  registry: IkaDWalletRegistry;
  /** Override for GasDeposit floor read; defaults to `readIkaGasDepositStatus`. */
  readGasDepositStatus?: typeof readIkaGasDepositStatus;
  /** Current Ika epoch provider; defaults to 0n (tests supply fakes). */
  fetchEpoch?: () => Promise<bigint>;
}

const DEFAULT_POLL_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

export async function progressIkaLifecycle(
  input: IkaLifecycleProgressionInput,
  deps: IkaLifecycleDeps
): Promise<IkaLifecycleResult> {
  const attempted: IkaLifecycleStatus[] = ['approval-transaction-prepared'];
  const approvalSignatureBase58 = toBase58Signature(input.approvalTransactionSignature);
  const approvalSlot = BigInt(input.approvalTransactionSlot);

  attempted.push('approval-submitted');

  // Gas floor gate ----------------------------------------------------------
  try {
    const status = await (deps.readGasDepositStatus ?? readIkaGasDepositStatus)(
      deps.connection,
      input.sessionContext.owner
    );
    enforceGasDepositFloor(status);
  } catch (error) {
    const floorError = error as IkaGasFloorError;
    attempted.push('gas-floor-blocked');
    return {
      ok: false,
      status: 'gas-floor-blocked',
      lifecycleStatus: 'gas-floor-blocked',
      code: 'GAS_FLOOR_UNDERFUNDED',
      reason: floorError.status?.reason ?? floorError.message ?? 'GasDeposit underfunded',
      attemptedSteps: attempted,
      gas: floorError.status
        ? {
            pda: floorError.status.pda,
            minIkaBaseUnits: floorError.status.floors.minIkaBaseUnits.toString(),
            minSolLamports: floorError.status.floors.minSolLamports.toString(),
            observedIkaBalance: floorError.status.account?.ikaBalance.toString(),
            observedSolLamports: floorError.status.account?.solBalance.toString(),
          }
        : undefined,
    };
  }

  // Kill switch: revoke before Presign --------------------------------------
  const prePresignRevoke = await assertSessionLive(input, 'pre-presign');
  if (prePresignRevoke) {
    attempted.push('session-revoked-midflight');
    return prePresignRevoke(attempted);
  }

  // Presign allocation -------------------------------------------------------
  const curve = input.dwalletRegistryEntry.curve;
  const signatureAlgorithm = inferSignatureAlgorithm(curve);
  const networkEncryptionPublicKey = input.dwalletNetworkEncryptionPublicKey;
  const dwalletPublicKey = hexToBytes(input.dwalletRegistryEntry.dwalletPublicKeyHex);
  const epoch = input.dwalletAttestation.epoch
    ?? (deps.fetchEpoch ? await deps.fetchEpoch() : 0n);

  // Presign + Sign via Polet's hand-rolled BCS gRPC client.
  //
  // Why not @ika.xyz/pre-alpha-solana-client? The official helper's
  // `requestPresign()` uses `PresignForDWallet` (server rejects for
  // Curve25519+EdDSA with "PresignForDWallet is only for imported ECDSA
  // keys") and `requestSign()` hard-codes zero-filled `dwallet_attestation`
  // (server rejects with "failed to decode dwallet_attestation: unexpected
  // end of input"). See scripts/ika-fresh-sign-e2e-v2.ts for the working
  // combination this path now implements:
  //   1. sessionIdentifierPreimage = 32 zero bytes (MUST match DKG's preimage
  //      — server uses it as the literal dWallet key lookup id).
  //   2. Real `NetworkSignedAttestation` from DKG (threaded via fixture).
  //   3. Global `Presign` for non-imported dWallets; `PresignForDWallet`
  //      only when `input.importedKey === true` (ECDSA-only).
  //   4. ApprovalProof::Solana { transaction_signature: bs58-decoded bytes,
  //      slot }.
  const senderPubkey = intendedChainSenderForTarget(input.ikaRequest);
  const sessionIdentifierPreimage = new Uint8Array(32);
  const chainId = resolveChainId(input.ikaRequest.target.chain);

  let presignSessionIdentifier: Uint8Array;
  if (input.existingPresignSessionIdentifier) {
    presignSessionIdentifier = input.existingPresignSessionIdentifier;
  } else {
    try {
      const presignRequestBody = input.importedKey
        ? buildPresignForDWalletRequest(
            curve,
            signatureAlgorithm,
            networkEncryptionPublicKey,
            dwalletPublicKey
          )
        : buildPresignRequest(curve, signatureAlgorithm, networkEncryptionPublicKey);
      const { response } = await deps.grpcClient.submitDWalletRequest({
        sessionIdentifierPreimage,
        epoch,
        chainId,
        intendedChainSender: senderPubkey,
        request: presignRequestBody,
      });
      if (response.kind !== 'attestation') {
        return failure(attempted, 'lifecycle-error', 'PRESIGN_REQUEST_FAILED',
          `Presign response returned kind=${response.kind} (expected attestation)`);
      }
      presignSessionIdentifier = decodePresignSessionIdentifier(response.attestation.attestationData);
    } catch (error) {
      return failure(attempted, 'lifecycle-error', 'PRESIGN_REQUEST_FAILED',
        errorMessage(error, 'Presign request failed'));
    }
  }
  attempted.push('presign-issued');

  // Kill switch: revoke before Sign -----------------------------------------
  const preSignRevoke = await assertSessionLive(input, 'pre-sign');
  if (preSignRevoke) {
    attempted.push('session-revoked-midflight');
    return preSignRevoke(attempted);
  }

  // Sign request via Polet's local client ----------------------------------
  try {
    const message = input.messageOverride ?? hexToBytes(input.ikaRequest.ikaMessageHash ?? '');
    const approvalSignatureBytes = toSolanaSignatureBytes(input.approvalTransactionSignature);
    const signRequestBody = buildSignRequest({
      message,
      messageMetadata: input.messageMetadata ?? new Uint8Array(),
      presignSessionIdentifier,
      messageCentralizedSignature: input.messageCentralizedSignature,
      dwalletAttestation: input.dwalletAttestation,
      approvalProof: {
        chain: 'solana',
        transactionSignature: approvalSignatureBytes,
        slot: approvalSlot,
      },
    });
    const { response } = await deps.grpcClient.submitDWalletRequest({
      sessionIdentifierPreimage,
      epoch,
      chainId,
      intendedChainSender: senderPubkey,
      request: signRequestBody,
    });
    if (response.kind !== 'signature') {
      return failure(attempted, 'lifecycle-error', 'SIGN_REQUEST_FAILED',
        `Sign response returned kind=${response.kind} (expected signature)`);
    }
    if (response.signature.length !== 64) {
      return failure(attempted, 'lifecycle-error', 'INVALID_PRODUCED_SIGNATURE',
        `Produced signature length ${response.signature.length} is not 64 bytes`);
    }
    attempted.push('sign-submitted');
  } catch (error) {
    return failure(attempted, 'lifecycle-error', 'SIGN_REQUEST_FAILED',
      errorMessage(error, 'Sign request failed'));
  }

  // Poll on-chain MessageApproval for CommitSignature ------------------------
  const messageApprovalPda = input.ikaRequest.preAlphaSigning?.messageApprovalPda;
  if (!messageApprovalPda) {
    return failure(attempted, 'lifecycle-error', 'MESSAGE_APPROVAL_MISSING',
      'Ika request is missing preAlphaSigning.messageApprovalPda');
  }
  const pollResult = await pollMessageApprovalForSignature(
    deps.connection,
    new PublicKey(messageApprovalPda),
    input.polling?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS,
    input.polling?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS
  );
  if (!pollResult.ok) {
    return failure(attempted, 'lifecycle-error', pollResult.code, pollResult.reason);
  }
  attempted.push('signature-committed');

  // Kill switch: revoke after Sign and before broadcast ---------------------
  const postSignRevoke = await assertSessionLive(input, 'post-sign-pre-broadcast');
  if (postSignRevoke) {
    attempted.push('session-revoked-midflight');
    return postSignRevoke(attempted);
  }

  return {
    ok: true,
    status: 'signature-committed',
    lifecycleStatus: 'signature-committed',
    produced: {
      status: 'signature-committed',
      signature: pollResult.signature,
      signatureHex: bytesToHex(pollResult.signature),
      messageDigestHex: pollResult.messageDigestHex,
      messageApprovalPda,
      dwalletAccount: input.dwalletRegistryEntry.dwalletAccount,
      signatureScheme: pollResult.signatureScheme,
      epoch: pollResult.epoch,
    },
    approvalTransactionSignatureBase58: approvalSignatureBase58,
    approvalTransactionSlot: approvalSlot,
    attemptedSteps: attempted,
  };
}

// ---------- Helpers ----------

interface PollSuccess {
  ok: true;
  signature: Uint8Array;
  messageDigestHex: string;
  signatureScheme: DWalletSignatureSchemeId;
  epoch: bigint;
}

interface PollFailure {
  ok: false;
  code: Extract<IkaLifecycleFailureCode, 'COMMIT_SIGNATURE_TIMEOUT' | 'MESSAGE_APPROVAL_MISSING'>;
  reason: string;
}

async function pollMessageApprovalForSignature(
  connection: Connection,
  messageApprovalPda: PublicKey,
  timeoutMs: number,
  intervalMs: number
): Promise<PollSuccess | PollFailure> {
  const deadline = Date.now() + timeoutMs;
  let lastMissingReason = 'MessageApproval account not found';
  while (Date.now() < deadline) {
    const info = await connection.getAccountInfo(messageApprovalPda);
    if (!info) {
      lastMissingReason = 'MessageApproval account not found (waiting for approve_message to land)';
    } else {
      const data = Buffer.from(info.data);
      if (data.length < MESSAGE_APPROVAL_LAYOUT.totalSize) {
        lastMissingReason = `MessageApproval account data length ${data.length} < expected ${MESSAGE_APPROVAL_LAYOUT.totalSize}`;
      } else {
        const status = data.readUInt8(MESSAGE_APPROVAL_LAYOUT.status);
        const signatureLen = data.readUInt16LE(MESSAGE_APPROVAL_LAYOUT.signatureLen);
        if (status === MESSAGE_APPROVAL_STATUS.Signed && signatureLen > 0) {
          const signature = data.subarray(
            MESSAGE_APPROVAL_LAYOUT.signature,
            MESSAGE_APPROVAL_LAYOUT.signature + signatureLen
          );
          const messageDigestHex = bytesToHex(
            data.subarray(MESSAGE_APPROVAL_LAYOUT.messageDigest, MESSAGE_APPROVAL_LAYOUT.messageDigest + 32)
          );
          const signatureScheme = data.readUInt16LE(MESSAGE_APPROVAL_LAYOUT.signatureScheme) as DWalletSignatureSchemeId;
          const epoch = data.readBigUInt64LE(MESSAGE_APPROVAL_LAYOUT.epoch);
          return {
            ok: true,
            signature: new Uint8Array(signature),
            messageDigestHex,
            signatureScheme,
            epoch,
          };
        }
      }
    }
    await sleep(intervalMs);
  }
  return {
    ok: false,
    code: 'COMMIT_SIGNATURE_TIMEOUT',
    reason: `Timed out after ${timeoutMs}ms waiting for CommitSignature (${lastMissingReason})`,
  };
}

async function assertSessionLive(
  input: IkaLifecycleProgressionInput,
  phase: SessionRevokePhase
): Promise<((steps: IkaLifecycleStatus[]) => IkaLifecycleProgressionFailure) | null> {
  const latestRevoked = await input.readLatestRevokedSlot();
  if (latestRevoked > input.sessionContext.grantedSlot) {
    return (steps: IkaLifecycleStatus[]) => ({
      ok: false,
      status: 'session-revoked-midflight',
      lifecycleStatus: 'session-revoked-midflight',
      code: 'SESSION_REVOKED_MIDFLIGHT',
      reason: `Session revoked midflight (${phase}); lifecycle aborted before ${nextStepLabel(phase)}.`,
      revokePhase: phase,
      attemptedSteps: steps,
    });
  }
  return null;
}

function nextStepLabel(phase: SessionRevokePhase): string {
  if (phase === 'pre-presign') return 'Presign request';
  if (phase === 'pre-sign') return 'Sign request';
  return 'destination broadcast';
}

function failure(
  steps: IkaLifecycleStatus[],
  status: 'lifecycle-error' | 'gas-floor-blocked' | 'session-revoked-midflight',
  code: IkaLifecycleFailureCode,
  reason: string
): IkaLifecycleProgressionFailure {
  return {
    ok: false,
    status,
    lifecycleStatus: status,
    code,
    reason,
    attemptedSteps: steps,
  };
}

function inferSignatureAlgorithm(curve: DWalletCurveId): DWalletSignatureAlgorithmId {
  if (curve === DWALLET_CURVE.Curve25519) return DWALLET_SIGNATURE_ALGORITHM.EdDsa;
  if (curve === DWALLET_CURVE.Secp256k1) return DWALLET_SIGNATURE_ALGORITHM.EcdsaSecp256k1;
  if (curve === DWALLET_CURVE.Secp256r1) return DWALLET_SIGNATURE_ALGORITHM.EcdsaSecp256r1;
  if (curve === DWALLET_CURVE.Ristretto) return DWALLET_SIGNATURE_ALGORITHM.Schnorrkel;
  throw new Error(`Unsupported dWallet curve ${curve}`);
}

function resolveChainId(targetChain: string): ChainIdValue {
  if (targetChain === 'sui') return CHAIN_ID.Sui;
  return CHAIN_ID.Solana;
}

function intendedChainSenderForTarget(ikaRequest: IkaBridgelessExecutionRequest): Uint8Array {
  // For Solana-signed approvals the intended chain sender is the owner's
  // 32-byte public key so validators can check the approval's authority on
  // the same chain. Tests can override via a custom DWalletRequest builder.
  return new PublicKey(ikaRequest.sessionContext.owner).toBytes();
}

function toBase58Signature(value: Uint8Array | string): string {
  if (typeof value === 'string') return value;
  return bs58.encode(Buffer.from(value));
}

/**
 * Normalize an approval tx signature (Solana base58 string or raw bytes)
 * into the raw 64-byte form the Ika gRPC Sign request expects for
 * `approval_proof.Solana.transaction_signature`.
 */
function toSolanaSignatureBytes(value: Uint8Array | string): Uint8Array {
  if (value instanceof Uint8Array) return value;
  // Solana tx signatures are base58 (~88 chars of the base58 alphabet).
  // Try bs58 first; if that fails, fall back to hex / base64 for test
  // compatibility.
  try {
    return new Uint8Array(bs58.decode(value));
  } catch {
    if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {
      return hexToBytes(value);
    }
    if (/^[A-Za-z0-9+/=]+$/.test(value)) {
      return new Uint8Array(Buffer.from(value, 'base64'));
    }
    throw new Error(`Unable to decode approval transaction signature: ${value.slice(0, 16)}...`);
  }
}

/**
 * Decode `VersionedPresignDataAttestation` (BCS-encoded inside
 * `NetworkSignedAttestation.attestation_data`) just far enough to extract
 * `V1.presign_session_identifier`. We skip past the earlier fields without
 * allocating their payloads.
 *
 * Layout (all BCS):
 *   u8 variant (0 = V1)
 *   [u8; 32] session_identifier
 *   u64 epoch
 *   Vec<u8> presign_session_identifier   ← what we return
 *   ... (rest unused)
 */
function decodePresignSessionIdentifier(attestationData: Uint8Array): Uint8Array {
  const reader = new BcsReader(attestationData);
  const variant = reader.u8();
  if (variant !== 0) {
    throw new Error(
      `VersionedPresignDataAttestation: unsupported variant ${variant} (expected 0 for V1)`
    );
  }
  reader.fixedBytes(32); // session_identifier
  reader.u64Le(); // epoch
  return reader.byteSeq(); // presign_session_identifier
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return `${fallback}: ${error.message}`;
  return fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Shared DWalletSignatureScheme hint helpers ----------

export function signatureSchemeForDestinationChain(chain: string): DWalletSignatureSchemeId {
  if (chain === 'ethereum' || chain === 'base') return DWALLET_SIGNATURE_SCHEME.EcdsaKeccak256;
  if (chain === 'sui' || chain === 'solana') return DWALLET_SIGNATURE_SCHEME.EddsaSha512;
  return DWALLET_SIGNATURE_SCHEME.EddsaSha512;
}

export { MESSAGE_APPROVAL_LAYOUT, MESSAGE_APPROVAL_STATUS };

// Re-export lifecycle error for tests to pattern-match on.
export type { IkaGrpcRequestError } from './ika-grpc-client';
