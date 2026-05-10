/**
 * Ika Pre-Alpha gRPC / BCS wire schema.
 *
 * Ika devnet reference: https://pre-alpha-dev-1.ika.ika-network.net:443
 * Program id:           87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
 *
 * This module vendors the minimum types required to build `UserSignedRequest`
 * payloads and parse `TransactionResponseData` results as described in
 * docs/ika/raw.txt. It is intentionally self-contained (no BCS library
 * dependency) so proxy tests can run without network access.
 *
 * Pre-alpha disclaimer: wire format is subject to change; production MPC,
 * production settlement, and mainnet guarantees do not apply.
 */

// ---------- BCS primitives (ULEB128 lengths, LE fixed-width ints) ----------

export class BcsWriter {
  private chunks: number[] = [];

  bytes(data: Uint8Array | number[]): this {
    for (const b of data) this.chunks.push(b & 0xff);
    return this;
  }

  u8(value: number): this {
    this.chunks.push(value & 0xff);
    return this;
  }

  u16Le(value: number): this {
    this.chunks.push(value & 0xff, (value >>> 8) & 0xff);
    return this;
  }

  u32Le(value: number): this {
    this.chunks.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    return this;
  }

  u64Le(value: bigint | number): this {
    let v = typeof value === 'bigint' ? value : BigInt(value);
    for (let i = 0; i < 8; i += 1) {
      this.chunks.push(Number(v & 0xffn));
      v >>= 8n;
    }
    return this;
  }

  uleb128(value: number | bigint): this {
    let v = typeof value === 'bigint' ? value : BigInt(value);
    if (v < 0n) throw new Error('ULEB128 value must be non-negative');
    while (v >= 0x80n) {
      this.chunks.push(Number((v & 0x7fn) | 0x80n));
      v >>= 7n;
    }
    this.chunks.push(Number(v));
    return this;
  }

  /** BCS `Vec<u8>` = ULEB128 length prefix + raw bytes. */
  byteSeq(data: Uint8Array | number[]): this {
    this.uleb128(data.length);
    this.bytes(data);
    return this;
  }

  /** BCS `String` is `Vec<u8>` of UTF-8. */
  string(value: string): this {
    return this.byteSeq(new TextEncoder().encode(value));
  }

  /** `Option<T>`: 0x00 for None, 0x01 then body for Some. */
  option(write: ((writer: BcsWriter) => void) | null): this {
    if (write === null) {
      this.u8(0);
      return this;
    }
    this.u8(1);
    write(this);
    return this;
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

export class BcsReader {
  private offset = 0;
  constructor(private readonly buf: Uint8Array) {}

  get remaining(): number {
    return this.buf.length - this.offset;
  }

  u8(): number {
    this.ensure(1);
    return this.buf[this.offset++]!;
  }

  u16Le(): number {
    this.ensure(2);
    const v = this.buf[this.offset]! | (this.buf[this.offset + 1]! << 8);
    this.offset += 2;
    return v >>> 0;
  }

  u64Le(): bigint {
    this.ensure(8);
    let v = 0n;
    for (let i = 0; i < 8; i += 1) v |= BigInt(this.buf[this.offset + i]!) << BigInt(i * 8);
    this.offset += 8;
    return v;
  }

  uleb128(): bigint {
    let result = 0n;
    let shift = 0n;
    while (true) {
      this.ensure(1);
      const byte = this.buf[this.offset++]!;
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7n;
      if (shift > 70n) throw new Error('ULEB128 overflow');
    }
  }

  fixedBytes(len: number): Uint8Array {
    this.ensure(len);
    const out = this.buf.slice(this.offset, this.offset + len);
    this.offset += len;
    return out;
  }

  byteSeq(): Uint8Array {
    const len = Number(this.uleb128());
    return this.fixedBytes(len);
  }

  string(): string {
    return new TextDecoder('utf-8', { fatal: true }).decode(this.byteSeq());
  }

  assertExhausted(): void {
    if (this.offset !== this.buf.length) {
      throw new Error(`BCS parse left ${this.buf.length - this.offset} trailing byte(s)`);
    }
  }

  private ensure(n: number): void {
    if (this.offset + n > this.buf.length) {
      throw new Error(`BCS parse underflow: need ${n} byte(s), have ${this.remaining}`);
    }
  }
}

// ---------- Cryptographic parameter enums ----------

export const DWALLET_CURVE = Object.freeze({
  Secp256k1: 0,
  Secp256r1: 1,
  Curve25519: 2,
  Ristretto: 3,
} as const);
export type DWalletCurveId = (typeof DWALLET_CURVE)[keyof typeof DWALLET_CURVE];

export const DWALLET_SIGNATURE_SCHEME = Object.freeze({
  EcdsaKeccak256: 0,
  EcdsaSha256: 1,
  EcdsaDoubleSha256: 2,
  TaprootSha256: 3,
  EcdsaBlake2b256: 4,
  EddsaSha512: 5,
  SchnorrkelMerlin: 6,
} as const);
export type DWalletSignatureSchemeId = (typeof DWALLET_SIGNATURE_SCHEME)[keyof typeof DWALLET_SIGNATURE_SCHEME];

export const DWALLET_SIGNATURE_ALGORITHM = Object.freeze({
  EcdsaSecp256k1: 0,
  EcdsaSecp256r1: 1,
  Taproot: 2,
  EdDsa: 3,
  Schnorrkel: 4,
} as const);
export type DWalletSignatureAlgorithmId = (typeof DWALLET_SIGNATURE_ALGORITHM)[keyof typeof DWALLET_SIGNATURE_ALGORITHM];

export const CHAIN_ID = Object.freeze({
  Solana: 0,
  Sui: 1,
} as const);
export type ChainIdValue = (typeof CHAIN_ID)[keyof typeof CHAIN_ID];

export const USER_SIGNATURE_SCHEME = Object.freeze({
  Ed25519: 0,
  Secp256k1: 1,
  Secp256r1: 2,
} as const);
export type UserSignatureSchemeId = (typeof USER_SIGNATURE_SCHEME)[keyof typeof USER_SIGNATURE_SCHEME];

// ---------- UserSignature ----------

export type UserSignature =
  | { scheme: 'ed25519'; signature: Uint8Array; publicKey: Uint8Array }
  | { scheme: 'secp256k1'; signature: Uint8Array; publicKey: Uint8Array }
  | { scheme: 'secp256r1'; signature: Uint8Array; publicKey: Uint8Array };

export function encodeUserSignature(sig: UserSignature): Uint8Array {
  const writer = new BcsWriter();
  const variantIndex =
    sig.scheme === 'ed25519'
      ? USER_SIGNATURE_SCHEME.Ed25519
      : sig.scheme === 'secp256k1'
        ? USER_SIGNATURE_SCHEME.Secp256k1
        : USER_SIGNATURE_SCHEME.Secp256r1;
  writer.u8(variantIndex);
  assertSignatureLength(sig);
  writer.byteSeq(sig.signature);
  writer.byteSeq(sig.publicKey);
  return writer.toUint8Array();
}

function assertSignatureLength(sig: UserSignature): void {
  if (sig.signature.length !== 64) {
    throw new Error(`UserSignature.signature must be 64 bytes (got ${sig.signature.length})`);
  }
  const expectedPkLen =
    sig.scheme === 'ed25519' ? 32 : 33;
  if (sig.publicKey.length !== expectedPkLen) {
    throw new Error(
      `UserSignature.publicKey for ${sig.scheme} must be ${expectedPkLen} bytes (got ${sig.publicKey.length})`
    );
  }
}

// ---------- ApprovalProof ----------

export type ApprovalProof =
  | { chain: 'solana'; transactionSignature: Uint8Array; slot: bigint | number }
  | { chain: 'sui'; effectsCertificate: Uint8Array };

export function encodeApprovalProof(proof: ApprovalProof, writer = new BcsWriter()): BcsWriter {
  if (proof.chain === 'solana') {
    writer.u8(0);
    writer.byteSeq(proof.transactionSignature);
    writer.u64Le(proof.slot);
    return writer;
  }
  writer.u8(1);
  writer.byteSeq(proof.effectsCertificate);
  return writer;
}

// ---------- UserSecretKeyShare ----------

export type UserSecretKeyShare =
  | {
      mode: 'encrypted';
      encryptedCentralizedSecretShareAndProof: Uint8Array;
      encryptionKey: Uint8Array;
      signerPublicKey: Uint8Array;
    }
  | {
      mode: 'public';
      publicUserSecretKeyShare: Uint8Array;
    };

export function encodeUserSecretKeyShare(share: UserSecretKeyShare, writer = new BcsWriter()): BcsWriter {
  if (share.mode === 'encrypted') {
    writer.u8(0);
    writer.byteSeq(share.encryptedCentralizedSecretShareAndProof);
    writer.byteSeq(share.encryptionKey);
    writer.byteSeq(share.signerPublicKey);
    return writer;
  }
  writer.u8(1);
  writer.byteSeq(share.publicUserSecretKeyShare);
  return writer;
}

// ---------- NetworkSignedAttestation ----------

export interface NetworkSignedAttestation {
  attestationData: Uint8Array;
  networkSignature: Uint8Array;
  networkPublicKey: Uint8Array;
  epoch: bigint;
}

export function encodeNetworkSignedAttestation(
  attestation: NetworkSignedAttestation,
  writer = new BcsWriter()
): BcsWriter {
  writer.byteSeq(attestation.attestationData);
  writer.byteSeq(attestation.networkSignature);
  writer.byteSeq(attestation.networkPublicKey);
  writer.u64Le(attestation.epoch);
  return writer;
}

export function decodeNetworkSignedAttestation(reader: BcsReader): NetworkSignedAttestation {
  const attestationData = reader.byteSeq();
  const networkSignature = reader.byteSeq();
  const networkPublicKey = reader.byteSeq();
  const epoch = reader.u64Le();
  return { attestationData, networkSignature, networkPublicKey, epoch };
}

// ---------- DWalletRequest ----------

export type DWalletRequest =
  | {
      kind: 'dkg';
      dwalletNetworkEncryptionPublicKey: Uint8Array;
      curve: DWalletCurveId;
      centralizedPublicKeyShareAndProof: Uint8Array;
      userSecretKeyShare: UserSecretKeyShare;
      userPublicOutput: Uint8Array;
      signDuringDkgRequest?: null;
    }
  | {
      kind: 'sign';
      message: Uint8Array;
      messageMetadata: Uint8Array;
      presignSessionIdentifier: Uint8Array;
      messageCentralizedSignature: Uint8Array;
      dwalletAttestation: NetworkSignedAttestation;
      approvalProof: ApprovalProof;
      /** Polet-only hint; not encoded on the wire (scheme is read from MessageApproval). */
      hashSchemeHint?: DWalletSignatureSchemeId;
    }
  | {
      kind: 'imported-key-sign';
      message: Uint8Array;
      messageMetadata: Uint8Array;
      presignSessionIdentifier: Uint8Array;
      messageCentralizedSignature: Uint8Array;
      dwalletAttestation: NetworkSignedAttestation;
      approvalProof: ApprovalProof;
    }
  | {
      kind: 'presign';
      dwalletNetworkEncryptionPublicKey: Uint8Array;
      curve: DWalletCurveId;
      signatureAlgorithm: DWalletSignatureAlgorithmId;
    }
  | {
      kind: 'presign-for-dwallet';
      dwalletNetworkEncryptionPublicKey: Uint8Array;
      dwalletPublicKey: Uint8Array;
      curve: DWalletCurveId;
      signatureAlgorithm: DWalletSignatureAlgorithmId;
    };

const DWALLET_REQUEST_VARIANT = Object.freeze({
  dkg: 0,
  sign: 1,
  'imported-key-sign': 2,
  presign: 3,
  'presign-for-dwallet': 4,
  // Remaining variants (imported-key-verification, re-encrypt-share, make-share-public,
  // future-sign, sign-with-partial-user-sig, imported-key-sign-with-partial-user-sig)
  // are acknowledged but not implemented in Polet; they can be stubbed as needed.
  'imported-key-verification': 5,
  're-encrypt-share': 6,
  'make-share-public': 7,
  'future-sign': 8,
  'sign-with-partial-user-sig': 9,
  'imported-key-sign-with-partial-user-sig': 10,
} as const);
export type DWalletRequestKind = keyof typeof DWALLET_REQUEST_VARIANT;

export function encodeDWalletRequest(request: DWalletRequest, writer = new BcsWriter()): BcsWriter {
  const variantIndex = DWALLET_REQUEST_VARIANT[request.kind];
  writer.u8(variantIndex);
  switch (request.kind) {
    case 'dkg': {
      writer.byteSeq(request.dwalletNetworkEncryptionPublicKey);
      // DWalletCurve is a BCS enum -> single-byte variant tag (0..3), not u16.
      writer.u8(request.curve);
      writer.byteSeq(request.centralizedPublicKeyShareAndProof);
      encodeUserSecretKeyShare(request.userSecretKeyShare, writer);
      writer.byteSeq(request.userPublicOutput);
      // sign_during_dkg_request: Option<SignDuringDKGRequest>. Polet sets to None.
      writer.option(null);
      return writer;
    }
    case 'sign':
    case 'imported-key-sign': {
      writer.byteSeq(request.message);
      writer.byteSeq(request.messageMetadata);
      writer.byteSeq(request.presignSessionIdentifier);
      writer.byteSeq(request.messageCentralizedSignature);
      encodeNetworkSignedAttestation(request.dwalletAttestation, writer);
      encodeApprovalProof(request.approvalProof, writer);
      return writer;
    }
    case 'presign': {
      writer.byteSeq(request.dwalletNetworkEncryptionPublicKey);
      // BCS enum variants — both single-byte tags.
      writer.u8(request.curve);
      writer.u8(request.signatureAlgorithm);
      return writer;
    }
    case 'presign-for-dwallet': {
      writer.byteSeq(request.dwalletNetworkEncryptionPublicKey);
      writer.byteSeq(request.dwalletPublicKey);
      writer.u8(request.curve);
      writer.u8(request.signatureAlgorithm);
      return writer;
    }
    default: {
      throw new Error(`DWalletRequest variant ${(request as { kind: string }).kind} is not implemented in Polet's BCS encoder`);
    }
  }
}

// ---------- SignedRequestData ----------

export interface SignedRequestData {
  sessionIdentifierPreimage: Uint8Array;
  epoch: bigint | number;
  chainId: ChainIdValue;
  intendedChainSender: Uint8Array;
  request: DWalletRequest;
}

export function encodeSignedRequestData(data: SignedRequestData): Uint8Array {
  if (data.sessionIdentifierPreimage.length !== 32) {
    throw new Error('SignedRequestData.sessionIdentifierPreimage must be 32 bytes');
  }
  const writer = new BcsWriter();
  writer.bytes(data.sessionIdentifierPreimage);
  writer.u64Le(data.epoch);
  writer.u8(data.chainId);
  writer.byteSeq(data.intendedChainSender);
  encodeDWalletRequest(data.request, writer);
  return writer.toUint8Array();
}

// ---------- UserSignedRequest envelope ----------

export interface UserSignedRequest {
  userSignature: Uint8Array;
  signedRequestData: Uint8Array;
}

// ---------- TransactionResponseData ----------

export type TransactionResponseData =
  | { kind: 'signature'; signature: Uint8Array }
  | { kind: 'attestation'; attestation: NetworkSignedAttestation }
  | { kind: 'error'; message: string };

export function decodeTransactionResponseData(raw: Uint8Array): TransactionResponseData {
  const reader = new BcsReader(raw);
  const variant = reader.u8();
  switch (variant) {
    case 0: {
      const signature = reader.byteSeq();
      reader.assertExhausted();
      return { kind: 'signature', signature };
    }
    case 1: {
      const attestation = decodeNetworkSignedAttestation(reader);
      reader.assertExhausted();
      return { kind: 'attestation', attestation };
    }
    case 2: {
      const message = reader.string();
      reader.assertExhausted();
      return { kind: 'error', message };
    }
    default:
      throw new Error(`Unknown TransactionResponseData variant: ${variant}`);
  }
}

// ---------- Message digest helper (Keccak256 is the MessageApproval lookup hash) ----------

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error('hexToBytes: value must be a hex string');
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Pre-Alpha environment constants ----------

export const IKA_PREALPHA_GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';
export const IKA_DWALLET_PROGRAM_ID = '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY';
export const COMMIT_SIGNATURE_DISCRIMINATOR = 43;
export const TRANSFER_OWNERSHIP_DISCRIMINATOR = 24;
export const COMMIT_DWALLET_DISCRIMINATOR = 31;
export const CREATE_DEPOSIT_DISCRIMINATOR = 36;
export const TOP_UP_DISCRIMINATOR = 37;
export const APPROVE_MESSAGE_DISCRIMINATOR = 8;

/** MessageApproval account layout offsets per docs/ika/raw.txt. */
export const MESSAGE_APPROVAL_LAYOUT = Object.freeze({
  discriminator: 0,
  version: 1,
  dwallet: 2,
  messageDigest: 34,
  messageMetadataDigest: 66,
  approver: 98,
  userPubkey: 130,
  signatureScheme: 162,
  epoch: 164,
  status: 172,
  signatureLen: 173,
  signature: 175,
  bump: 303,
  reserved: 304,
  totalSize: 312,
  discriminatorValue: 14,
} as const);

export const MESSAGE_APPROVAL_STATUS = Object.freeze({
  Pending: 0,
  Signed: 1,
} as const);

/** GasDeposit account layout offsets per docs/ika/raw.txt. */
export const GAS_DEPOSIT_LAYOUT = Object.freeze({
  discriminator: 0,
  version: 1,
  userPubkey: 2,
  ikaBalance: 34,
  solBalance: 42,
  totalIkaDeposited: 50,
  totalIkaConsumed: 58,
  totalSolDeposited: 66,
  totalSolConsumed: 74,
  pendingIkaWithdrawal: 82,
  pendingSolWithdrawal: 90,
  withdrawalEpoch: 98,
  lastSettlementEpoch: 106,
  createdAtEpoch: 114,
  bump: 122,
  totalSize: 139,
  discriminatorValue: 4,
} as const);
