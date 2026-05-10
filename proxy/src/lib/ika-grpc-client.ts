/**
 * Ika Pre-Alpha gRPC client.
 *
 * Wraps the minimal `DWalletService` RPCs (`SubmitTransaction`,
 * `GetPresigns`, `GetPresignsForDWallet`) and provides helper builders for
 * the `UserSignedRequest` envelope. Authentication uses a proxy service
 * keypair (Ed25519 by default) that signs the BCS-serialized
 * `SignedRequestData`.
 *
 * Transport is raw HTTP/2 over TLS (no @grpc/grpc-js dep) so the proxy can
 * ship without adding a large dependency. The transport layer is behind an
 * interface so tests can inject a fake transport.
 *
 * Pre-alpha disclaimer: wire format, endpoints, and behaviour are subject
 * to change. Do not rely on any key material or signatures produced by the
 * pre-alpha mock signer.
 */

import nacl from 'tweetnacl';
import {
  BcsWriter,
  CHAIN_ID,
  DWALLET_CURVE,
  DWALLET_SIGNATURE_ALGORITHM,
  IKA_PREALPHA_GRPC_URL,
  encodeSignedRequestData,
  encodeUserSignature,
  decodeTransactionResponseData,
  type ApprovalProof,
  type ChainIdValue,
  type DWalletCurveId,
  type DWalletRequest,
  type DWalletSignatureAlgorithmId,
  type NetworkSignedAttestation,
  type SignedRequestData,
  type TransactionResponseData,
  type UserSignature,
  type UserSignedRequest,
} from './ika-grpc-schema';

// ---------- Protobuf helpers (length-delimited byte fields only) ----------

function protobufEncodeUserSignedRequest(req: UserSignedRequest): Uint8Array {
  const parts: Uint8Array[] = [];
  // field 1: user_signature (bytes)
  parts.push(new Uint8Array([0x0a]));
  parts.push(protobufVarint(req.userSignature.length));
  parts.push(req.userSignature);
  // field 2: signed_request_data (bytes)
  parts.push(new Uint8Array([0x12]));
  parts.push(protobufVarint(req.signedRequestData.length));
  parts.push(req.signedRequestData);
  return concat(parts);
}

function protobufEncodeBytesField(fieldNumber: number, data: Uint8Array): Uint8Array {
  const tag = (fieldNumber << 3) | 2; // wire type 2 = length-delimited
  return concat([new Uint8Array([tag]), protobufVarint(data.length), data]);
}

function protobufDecodeSingleBytesField(buffer: Uint8Array, expectedFieldNumber: number): Uint8Array {
  let offset = 0;
  while (offset < buffer.length) {
    const { value: tag, nextOffset: afterTag } = protobufReadVarint(buffer, offset);
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x07n);
    offset = afterTag;
    if (wireType !== 2) {
      throw new Error(`protobuf: unexpected wire type ${wireType} for field ${fieldNumber}`);
    }
    const { value: length, nextOffset: afterLength } = protobufReadVarint(buffer, offset);
    offset = afterLength;
    const end = offset + Number(length);
    if (end > buffer.length) throw new Error('protobuf: length overflow');
    if (fieldNumber === expectedFieldNumber) {
      return buffer.slice(offset, end);
    }
    offset = end;
  }
  throw new Error(`protobuf: field ${expectedFieldNumber} not found`);
}

function protobufVarint(value: number | bigint): Uint8Array {
  let v = typeof value === 'bigint' ? value : BigInt(value);
  if (v < 0n) throw new Error('protobuf varint must be non-negative');
  const bytes: number[] = [];
  while (v >= 0x80n) {
    bytes.push(Number((v & 0x7fn) | 0x80n));
    v >>= 7n;
  }
  bytes.push(Number(v));
  return Uint8Array.from(bytes);
}

function protobufReadVarint(buf: Uint8Array, offset: number): { value: bigint; nextOffset: number } {
  let shift = 0n;
  let result = 0n;
  let index = offset;
  while (true) {
    if (index >= buf.length) throw new Error('protobuf varint truncated');
    const byte = buf[index++]!;
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: result, nextOffset: index };
    shift += 7n;
    if (shift > 70n) throw new Error('protobuf varint overflow');
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ---------- gRPC frame helpers ----------

function wrapGrpcFrame(payload: Uint8Array): Uint8Array {
  const header = new Uint8Array(5);
  header[0] = 0; // uncompressed
  const len = payload.length;
  header[1] = (len >>> 24) & 0xff;
  header[2] = (len >>> 16) & 0xff;
  header[3] = (len >>> 8) & 0xff;
  header[4] = len & 0xff;
  return concat([header, payload]);
}

function unwrapGrpcFrame(frame: Uint8Array): Uint8Array {
  if (frame.length < 5) throw new Error('gRPC frame too short');
  if (frame[0] !== 0) throw new Error('gRPC frame compression not supported in Polet transport');
  const len =
    (frame[1]! << 24) |
    (frame[2]! << 16) |
    (frame[3]! << 8) |
    frame[4]!;
  if (frame.length < 5 + len) throw new Error('gRPC frame truncated');
  return frame.slice(5, 5 + len);
}

// ---------- Transport interface ----------

export interface IkaGrpcTransport {
  /**
   * Perform a unary gRPC call. `pathname` is like `/DWalletService/SubmitTransaction`.
   * `payload` is a single request message already serialized to protobuf bytes.
   * Returns the single response message as protobuf bytes.
   */
  unaryCall(pathname: string, payload: Uint8Array): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface TlsGrpcTransportOptions {
  endpoint?: string;
  /** Abort the request after `timeoutMs`; default 30s. */
  timeoutMs?: number;
  /** Custom `authority` HTTP/2 header. Defaults to the host from endpoint. */
  authority?: string;
  /** Allow plaintext (`http://`) for integration tests; off by default. */
  allowInsecure?: boolean;
}

export async function createTlsGrpcTransport(
  options: TlsGrpcTransportOptions = {}
): Promise<IkaGrpcTransport> {
  const endpoint = options.endpoint ?? process.env.IKA_GRPC_URL ?? IKA_PREALPHA_GRPC_URL;
  const url = normalizeEndpoint(endpoint, options.allowInsecure ?? false);
  const timeoutMs = options.timeoutMs ?? 30_000;

  // Lazy-require node:http2 so unit tests that don't touch the transport keep
  // working when http2 is not available (e.g. restricted sandboxes).
  const http2 = await import('node:http2');
  const client = http2.connect(url.origin, {
    settings: { enablePush: false },
  });

  client.on('error', () => {
    // Errors propagate to in-flight requests; nothing else to do at client level.
  });

  return {
    async unaryCall(pathname, payload) {
      return new Promise<Uint8Array>((resolve, reject) => {
        const req = client.request({
          ':method': 'POST',
          ':path': pathname,
          ':scheme': url.protocol === 'https:' ? 'https' : 'http',
          ':authority': options.authority ?? url.host,
          'content-type': 'application/grpc',
          te: 'trailers',
          'grpc-encoding': 'identity',
          'grpc-accept-encoding': 'identity',
        });
        const chunks: Buffer[] = [];
        let headersReceived = false;
        let grpcStatus: string | undefined;
        let grpcMessage: string | undefined;
        const timer = setTimeout(() => {
          req.close(http2.constants.NGHTTP2_CANCEL);
          reject(new Error(`Ika gRPC call ${pathname} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        req.on('response', (headers) => {
          headersReceived = true;
          const httpStatus = Number(headers[':status'] ?? 0);
          if (httpStatus !== 200) {
            reject(new Error(`Ika gRPC HTTP status ${httpStatus} for ${pathname}`));
            req.close(http2.constants.NGHTTP2_CANCEL);
          }
          if (typeof headers['grpc-status'] === 'string') grpcStatus = headers['grpc-status'];
          if (typeof headers['grpc-message'] === 'string') grpcMessage = headers['grpc-message'];
        });
        req.on('trailers', (trailers) => {
          if (typeof trailers['grpc-status'] === 'string') grpcStatus = trailers['grpc-status'];
          if (typeof trailers['grpc-message'] === 'string') grpcMessage = trailers['grpc-message'];
        });
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          clearTimeout(timer);
          if (!headersReceived) return reject(new Error(`Ika gRPC ${pathname} closed without response`));
          if (grpcStatus !== undefined && grpcStatus !== '0') {
            return reject(new Error(`Ika gRPC ${pathname} returned status ${grpcStatus}: ${grpcMessage ?? 'no message'}`));
          }
          try {
            const buffer = Buffer.concat(chunks);
            resolve(unwrapGrpcFrame(buffer));
          } catch (error) {
            reject(error);
          }
        });
        req.on('error', (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });
        req.end(Buffer.from(wrapGrpcFrame(payload)));
      });
    },
    async close() {
      client.close();
    },
  };
}

function normalizeEndpoint(raw: string, allowInsecure: boolean): URL {
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' && !allowInsecure) {
      throw new Error(`Insecure Ika gRPC endpoint ${raw} requires allowInsecure=true`);
    }
    return parsed;
  }
  if (!allowInsecure && !trimmed.includes(':443')) {
    // default to TLS
  }
  return new URL(`https://${trimmed}`);
}

// ---------- Service keypair (proxy KMS) ----------

export interface IkaServiceKeypair {
  scheme: 'ed25519';
  publicKey: Uint8Array;
  secretKey: Uint8Array; // 64-byte nacl secret key
}

export function generateIkaServiceKeypair(): IkaServiceKeypair {
  const pair = nacl.sign.keyPair();
  return {
    scheme: 'ed25519',
    publicKey: pair.publicKey,
    secretKey: pair.secretKey,
  };
}

export function loadIkaServiceKeypair(secretKeyHex: string): IkaServiceKeypair {
  const normalized = secretKeyHex.startsWith('0x') ? secretKeyHex.slice(2) : secretKeyHex;
  if (normalized.length !== 128) {
    throw new Error('Ika service keypair expects a 64-byte (128 hex char) tweetnacl secret key');
  }
  const secretKey = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) {
    secretKey[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  const publicKey = secretKey.slice(32);
  return { scheme: 'ed25519', publicKey, secretKey };
}

export function signSignedRequestData(
  serialized: Uint8Array,
  keypair: IkaServiceKeypair
): UserSignature {
  const signature = nacl.sign.detached(serialized, keypair.secretKey);
  return { scheme: 'ed25519', signature, publicKey: keypair.publicKey };
}

// ---------- Client ----------

export interface IkaGrpcClientOptions {
  transport: IkaGrpcTransport;
  serviceKeypair: IkaServiceKeypair;
  /** Epoch provider (defaults to reading from `DWalletCoordinator`). */
  fetchEpoch?: () => Promise<bigint>;
  /** Random session identifier generator (32 bytes). Defaults to `crypto.getRandomValues`. */
  sessionIdentifierSource?: () => Uint8Array;
}

export interface BuildUserSignedRequestInput {
  epoch: bigint | number;
  chainId?: ChainIdValue;
  intendedChainSender: Uint8Array;
  request: DWalletRequest;
  sessionIdentifierPreimage?: Uint8Array;
}

export class IkaGrpcClient {
  constructor(private readonly options: IkaGrpcClientOptions) {}

  buildUserSignedRequest(input: BuildUserSignedRequestInput): {
    envelope: UserSignedRequest;
    signedRequestData: SignedRequestData;
  } {
    const sessionIdentifierPreimage = input.sessionIdentifierPreimage ?? this.defaultSessionIdentifier();
    const signedRequestData: SignedRequestData = {
      sessionIdentifierPreimage,
      epoch: input.epoch,
      chainId: input.chainId ?? CHAIN_ID.Solana,
      intendedChainSender: input.intendedChainSender,
      request: input.request,
    };
    const serialized = encodeSignedRequestData(signedRequestData);
    const userSignature = signSignedRequestData(serialized, this.options.serviceKeypair);
    const envelope: UserSignedRequest = {
      userSignature: encodeUserSignature(userSignature),
      signedRequestData: serialized,
    };
    return { envelope, signedRequestData };
  }

  async submitTransaction(envelope: UserSignedRequest): Promise<TransactionResponseData> {
    const body = protobufEncodeUserSignedRequest(envelope);
    const raw = await this.options.transport.unaryCall('/DWalletService/SubmitTransaction', body);
    const responseDataBytes = protobufDecodeSingleBytesField(raw, 1);
    const decoded = decodeTransactionResponseData(responseDataBytes);
    return decoded;
  }

  async submitDWalletRequest(
    input: BuildUserSignedRequestInput
  ): Promise<{ response: TransactionResponseData; signedRequestData: SignedRequestData }> {
    const { envelope, signedRequestData } = this.buildUserSignedRequest(input);
    const response = await this.submitTransaction(envelope);
    if (response.kind === 'error') {
      throw new IkaGrpcRequestError(response.message, 'IKA_GRPC_ERROR_RESPONSE');
    }
    return { response, signedRequestData };
  }

  async getPresigns(userPubkey: Uint8Array): Promise<PresignSummary[]> {
    const requestPayload = protobufEncodeBytesField(1, userPubkey);
    const raw = await this.options.transport.unaryCall(
      '/DWalletService/GetPresigns',
      requestPayload
    );
    return decodePresignList(raw);
  }

  async getPresignsForDWallet(
    userPubkey: Uint8Array,
    dwalletId: Uint8Array
  ): Promise<PresignSummary[]> {
    const payload = concat([
      protobufEncodeBytesField(1, userPubkey),
      protobufEncodeBytesField(2, dwalletId),
    ]);
    const raw = await this.options.transport.unaryCall(
      '/DWalletService/GetPresignsForDWallet',
      payload
    );
    return decodePresignList(raw);
  }

  private defaultSessionIdentifier(): Uint8Array {
    if (this.options.sessionIdentifierSource) return this.options.sessionIdentifierSource();
    const buf = new Uint8Array(32);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cryptoRef = (globalThis as any).crypto;
    if (cryptoRef?.getRandomValues) {
      cryptoRef.getRandomValues(buf);
    } else {
      for (let i = 0; i < buf.length; i += 1) buf[i] = Math.floor(Math.random() * 256);
    }
    return buf;
  }
}

export class IkaGrpcRequestError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'IkaGrpcRequestError';
  }
}

// ---------- PresignInfo decoding ----------

export interface PresignSummary {
  presignId: Uint8Array;
  dwalletId: Uint8Array;
  curve: DWalletCurveId;
  signatureAlgorithm: DWalletSignatureAlgorithmId;
  epoch: bigint;
}

function decodePresignList(raw: Uint8Array): PresignSummary[] {
  // GetPresignsResponse.presigns (repeated field 1)
  const presigns: PresignSummary[] = [];
  let offset = 0;
  while (offset < raw.length) {
    const { value: tag, nextOffset: afterTag } = protobufReadVarint(raw, offset);
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x07n);
    offset = afterTag;
    if (wireType === 2) {
      const { value: length, nextOffset: afterLength } = protobufReadVarint(raw, offset);
      offset = afterLength;
      const end = offset + Number(length);
      if (fieldNumber === 1) {
        presigns.push(decodePresignInfo(raw.slice(offset, end)));
      }
      offset = end;
    } else {
      // Scalar fields in PresignInfo we don't care about at the top level.
      const { nextOffset } = protobufReadVarint(raw, offset);
      offset = nextOffset;
    }
  }
  return presigns;
}

function decodePresignInfo(buf: Uint8Array): PresignSummary {
  let presignId = new Uint8Array();
  let dwalletId = new Uint8Array();
  let curve: DWalletCurveId = DWALLET_CURVE.Curve25519;
  let signatureAlgorithm: DWalletSignatureAlgorithmId = DWALLET_SIGNATURE_ALGORITHM.EdDsa;
  let epoch = 0n;
  let offset = 0;
  while (offset < buf.length) {
    const { value: tag, nextOffset: afterTag } = protobufReadVarint(buf, offset);
    offset = afterTag;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x07n);
    if (wireType === 2) {
      const { value: length, nextOffset: afterLength } = protobufReadVarint(buf, offset);
      offset = afterLength;
      const end = offset + Number(length);
      const value = buf.slice(offset, end);
      if (fieldNumber === 1) presignId = value;
      if (fieldNumber === 2) dwalletId = value;
      offset = end;
    } else if (wireType === 0) {
      const { value: v, nextOffset: afterVal } = protobufReadVarint(buf, offset);
      offset = afterVal;
      if (fieldNumber === 3) curve = Number(v) as DWalletCurveId;
      if (fieldNumber === 4) signatureAlgorithm = Number(v) as DWalletSignatureAlgorithmId;
      if (fieldNumber === 5) epoch = v;
    } else {
      throw new Error(`PresignInfo: unsupported wire type ${wireType}`);
    }
  }
  return { presignId, dwalletId, curve, signatureAlgorithm, epoch };
}

// ---------- Convenience request builders ----------

export function buildPresignRequest(
  curve: DWalletCurveId,
  signatureAlgorithm: DWalletSignatureAlgorithmId,
  networkEncryptionPublicKey: Uint8Array
): DWalletRequest {
  return {
    kind: 'presign',
    dwalletNetworkEncryptionPublicKey: networkEncryptionPublicKey,
    curve,
    signatureAlgorithm,
  };
}

export function buildPresignForDWalletRequest(
  curve: DWalletCurveId,
  signatureAlgorithm: DWalletSignatureAlgorithmId,
  networkEncryptionPublicKey: Uint8Array,
  dwalletPublicKey: Uint8Array
): DWalletRequest {
  return {
    kind: 'presign-for-dwallet',
    dwalletNetworkEncryptionPublicKey: networkEncryptionPublicKey,
    dwalletPublicKey,
    curve,
    signatureAlgorithm,
  };
}

export function buildSignRequest(input: {
  message: Uint8Array;
  messageMetadata?: Uint8Array;
  presignSessionIdentifier: Uint8Array;
  messageCentralizedSignature: Uint8Array;
  dwalletAttestation: NetworkSignedAttestation;
  approvalProof: ApprovalProof;
}): DWalletRequest {
  return {
    kind: 'sign',
    message: input.message,
    messageMetadata: input.messageMetadata ?? new Uint8Array(),
    presignSessionIdentifier: input.presignSessionIdentifier,
    messageCentralizedSignature: input.messageCentralizedSignature,
    dwalletAttestation: input.dwalletAttestation,
    approvalProof: input.approvalProof,
  };
}

// ---------- Fixture helpers (used by tests and setup scripts) ----------

export function encodeTransactionResponseProtobuf(responseData: Uint8Array): Uint8Array {
  return protobufEncodeBytesField(1, responseData);
}

export function encodeUserSignedRequestProtobuf(req: UserSignedRequest): Uint8Array {
  return protobufEncodeUserSignedRequest(req);
}

export function decodeUserSignedRequestProtobuf(raw: Uint8Array): UserSignedRequest {
  const writer = new BcsWriter(); // keep import clean
  void writer;
  // Parse each field of UserSignedRequest.
  const userSignature = protobufDecodeSingleBytesField(raw, 1);
  const signedRequestData = protobufDecodeSingleBytesField(raw, 2);
  return { userSignature, signedRequestData };
}
