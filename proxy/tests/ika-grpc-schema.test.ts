import { describe, expect, test } from 'bun:test';
import {
  BcsReader,
  BcsWriter,
  bytesToHex,
  decodeTransactionResponseData,
  encodeApprovalProof,
  encodeSignedRequestData,
  encodeUserSignature,
  hexToBytes,
  CHAIN_ID,
  DWALLET_CURVE,
  DWALLET_SIGNATURE_ALGORITHM,
  GAS_DEPOSIT_LAYOUT,
  MESSAGE_APPROVAL_LAYOUT,
  type NetworkSignedAttestation,
  type SignedRequestData,
  type UserSignature,
} from '../src/lib/ika-grpc-schema';

const ZERO_32 = new Uint8Array(32);
const FIXED_64 = Uint8Array.from(Array.from({ length: 64 }, (_, i) => i));
const FIXED_PK32 = Uint8Array.from(Array.from({ length: 32 }, (_, i) => 0xa0 + i));

describe('Ika BCS primitives', () => {
  test('ULEB128 roundtrip for boundary values', () => {
    const values = [0n, 1n, 127n, 128n, 255n, 16384n, 1_000_000n];
    for (const v of values) {
      const writer = new BcsWriter();
      writer.uleb128(v);
      const reader = new BcsReader(writer.toUint8Array());
      expect(reader.uleb128()).toBe(v);
    }
  });

  test('byteSeq writes ULEB length then payload', () => {
    const writer = new BcsWriter();
    writer.byteSeq(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    expect(Array.from(writer.toUint8Array())).toEqual([4, 0xde, 0xad, 0xbe, 0xef]);
  });

  test('u64Le writes 8 little-endian bytes', () => {
    const writer = new BcsWriter();
    writer.u64Le(0x0102030405060708n);
    expect(Array.from(writer.toUint8Array())).toEqual([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  });
});

describe('UserSignature encoding', () => {
  test('Ed25519 variant emits tag 0 + signature + public key with length prefixes', () => {
    const sig: UserSignature = {
      scheme: 'ed25519',
      signature: FIXED_64,
      publicKey: FIXED_PK32,
    };
    const encoded = encodeUserSignature(sig);
    expect(encoded[0]).toBe(0); // variant tag for Ed25519
    // ULEB length 64 = 0x40 (single byte for <= 127)
    expect(encoded[1]).toBe(0x40);
    expect(Array.from(encoded.slice(2, 2 + 64))).toEqual(Array.from(FIXED_64));
    const pubkeyLengthIndex = 2 + 64;
    expect(encoded[pubkeyLengthIndex]).toBe(0x20); // 32
    expect(Array.from(encoded.slice(pubkeyLengthIndex + 1))).toEqual(Array.from(FIXED_PK32));
  });

  test('rejects invalid signature length', () => {
    expect(() =>
      encodeUserSignature({ scheme: 'ed25519', signature: new Uint8Array(10), publicKey: FIXED_PK32 })
    ).toThrow();
  });
});

describe('SignedRequestData encoding (Presign fixture)', () => {
  test('produces deterministic bytes for a known Presign request', () => {
    const data: SignedRequestData = {
      sessionIdentifierPreimage: ZERO_32,
      epoch: 42n,
      chainId: CHAIN_ID.Solana,
      intendedChainSender: hexToBytes('aa'.repeat(32)),
      request: {
        kind: 'presign',
        dwalletNetworkEncryptionPublicKey: hexToBytes('11'.repeat(32)),
        curve: DWALLET_CURVE.Curve25519,
        signatureAlgorithm: DWALLET_SIGNATURE_ALGORITHM.EdDsa,
      },
    };
    const serialized = encodeSignedRequestData(data);
    // Reproducible: serialize twice and compare.
    expect(bytesToHex(encodeSignedRequestData(data))).toBe(bytesToHex(serialized));
    // Sanity: starts with the 32-byte session identifier.
    expect(Array.from(serialized.slice(0, 32))).toEqual(Array.from(ZERO_32));
    // Then epoch (8 bytes LE).
    expect(Array.from(serialized.slice(32, 40))).toEqual([42, 0, 0, 0, 0, 0, 0, 0]);
    // Then chain id byte (Solana = 0).
    expect(serialized[40]).toBe(CHAIN_ID.Solana);
    // Then intended_chain_sender length prefix (32) + 32 bytes.
    expect(serialized[41]).toBe(0x20);
  });
});

describe('encodeApprovalProof', () => {
  test('Solana variant writes variant=0, transaction signature, slot', () => {
    const writer = new BcsWriter();
    encodeApprovalProof(
      { chain: 'solana', transactionSignature: hexToBytes('cafe'), slot: 1_234_567n },
      writer
    );
    const bytes = writer.toUint8Array();
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(2); // length of transaction_signature
    expect(Array.from(bytes.slice(2, 4))).toEqual([0xca, 0xfe]);
    const slotBytes = bytes.slice(4, 12);
    const recoveredSlot = new BcsReader(slotBytes).u64Le();
    expect(recoveredSlot).toBe(1_234_567n);
  });
});

describe('TransactionResponseData decoding', () => {
  test('decodes Signature variant', () => {
    const writer = new BcsWriter();
    writer.u8(0).byteSeq(FIXED_64);
    const decoded = decodeTransactionResponseData(writer.toUint8Array());
    expect(decoded.kind).toBe('signature');
    if (decoded.kind === 'signature') {
      expect(Array.from(decoded.signature)).toEqual(Array.from(FIXED_64));
    }
  });

  test('decodes Attestation variant', () => {
    const attestation: NetworkSignedAttestation = {
      attestationData: hexToBytes('deadbeef'),
      networkSignature: FIXED_64,
      networkPublicKey: FIXED_PK32,
      epoch: 7n,
    };
    const writer = new BcsWriter();
    writer.u8(1);
    writer.byteSeq(attestation.attestationData);
    writer.byteSeq(attestation.networkSignature);
    writer.byteSeq(attestation.networkPublicKey);
    writer.u64Le(attestation.epoch);
    const decoded = decodeTransactionResponseData(writer.toUint8Array());
    expect(decoded.kind).toBe('attestation');
    if (decoded.kind === 'attestation') {
      expect(decoded.attestation.epoch).toBe(7n);
      expect(bytesToHex(decoded.attestation.attestationData)).toBe('deadbeef');
    }
  });

  test('decodes Error variant', () => {
    const writer = new BcsWriter();
    writer.u8(2).string('insufficient gas');
    const decoded = decodeTransactionResponseData(writer.toUint8Array());
    expect(decoded.kind).toBe('error');
    if (decoded.kind === 'error') expect(decoded.message).toBe('insufficient gas');
  });

  test('rejects unknown variant', () => {
    expect(() => decodeTransactionResponseData(new Uint8Array([99]))).toThrow();
  });

  test('rejects trailing bytes', () => {
    const writer = new BcsWriter();
    writer.u8(0).byteSeq(FIXED_64).u8(0xff);
    expect(() => decodeTransactionResponseData(writer.toUint8Array())).toThrow();
  });
});

describe('Account layout constants match docs/ika/raw.txt', () => {
  test('MessageApproval layout total = 312 with Pending(0)/Signed(1) statuses', () => {
    expect(MESSAGE_APPROVAL_LAYOUT.totalSize).toBe(312);
    expect(MESSAGE_APPROVAL_LAYOUT.signature).toBe(175);
    expect(MESSAGE_APPROVAL_LAYOUT.status).toBe(172);
  });

  test('GasDeposit layout total = 139 with discriminator 4', () => {
    expect(GAS_DEPOSIT_LAYOUT.totalSize).toBe(139);
    expect(GAS_DEPOSIT_LAYOUT.discriminatorValue).toBe(4);
    expect(GAS_DEPOSIT_LAYOUT.ikaBalance).toBe(34);
    expect(GAS_DEPOSIT_LAYOUT.solBalance).toBe(42);
  });
});
