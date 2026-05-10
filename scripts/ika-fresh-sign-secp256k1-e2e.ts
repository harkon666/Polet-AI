/**
 * Secp256k1 sibling of ika-fresh-sign-e2e-v2.ts. Exercises the USDC -> ETH
 * Ika lifecycle (Secp256k1 + ECDSA-Keccak256) end-to-end on devnet.
 *
 * The official @ika.xyz/pre-alpha-solana-client.requestDKG() is hardcoded to
 * Curve25519, so DKG here goes over raw gRPC with BCS-encoded
 * `DWalletRequest::DKG { curve: Secp256k1, ... }`. Approve + Presign + Sign
 * follow the same flow as v2 but with curve=Secp256k1, signature_scheme=
 * EcdsaKeccak256 (0), signature_algorithm=ECDSASecp256k1 (0).
 *
 *   1. Raw DKG (Secp256k1 curve)       -> NetworkSignedAttestation +
 *                                         on-chain CommitDWallet (33-byte
 *                                         compressed pubkey, PDA chunks=[32,3]).
 *   2. approve_message (signer path)    -> MessageApproval PDA status=Pending.
 *   3. Presign (global, Secp256k1+ECDSA)-> presign_session_identifier.
 *   4. Sign (real dwallet_attestation)  -> 64-byte ECDSA (r||s) signature,
 *                                         network CommitSignature on-chain.
 *   5. Verify signature cryptographically against the dWallet pubkey using
 *      @noble/curves secp256k1 over keccak256(message).
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { keccak_256 } from '@noble/hashes/sha3.js';
// @ts-expect-error — resolved at runtime via proxy/node_modules
import { secp256k1 } from '../proxy/node_modules/@noble/curves/secp256k1';
import * as grpc from '@grpc/grpc-js';
import * as fs from 'node:fs';
import {
  BcsReader,
  BcsWriter,
} from '../proxy/src/lib/ika-grpc-schema';

const IKA_PROGRAM = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
const GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';
const DWALLET_SEED = Buffer.from('dwallet');
const MESSAGE_APPROVAL_SEED = Buffer.from('message_approval');
const COORDINATOR_SEED = Buffer.from('dwallet_coordinator');

const CURVE_SECP256K1 = 0; // BCS enum variant
const SIGNATURE_ALGORITHM_ECDSA_SECP256K1 = 0;
const SIGNATURE_SCHEME_ECDSA_KECCAK256 = 0;

// Funder (big devnet testing wallet)
const funder = Keypair.fromSecretKey(
  bs58.decode(
    '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie',
  ),
);
const ownerSecret = Uint8Array.from(
  JSON.parse(fs.readFileSync('/tmp/fresh-owner.json', 'utf-8')),
);
const owner = Keypair.fromSecretKey(ownerSecret);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

console.log('funder:', funder.publicKey.toBase58());
console.log('owner :', owner.publicKey.toBase58());

// Fund owner if needed
{
  const balance = await conn.getBalance(owner.publicKey);
  if (balance < 50_000_000) {
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: owner.publicKey,
        lamports: 50_000_000,
      }),
    );
    await sendAndConfirmTransaction(conn, fundTx, [funder]);
  }
}

// ── Raw gRPC + BCS helpers ────────────────────────────────────

function encodeUserSignatureEd25519(signature: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const w = new BcsWriter();
  w.u8(0); // Ed25519 variant
  w.byteSeq(signature);
  w.byteSeq(publicKey);
  return w.toUint8Array();
}

function encodeSignedRequestDataRaw(
  sessionPreimage: Uint8Array,
  epoch: bigint,
  chainId: number,
  intendedChainSender: Uint8Array,
  requestBody: Uint8Array,
): Uint8Array {
  if (sessionPreimage.length !== 32) throw new Error('session preimage must be 32 bytes');
  const w = new BcsWriter();
  w.bytes(sessionPreimage);
  w.u64Le(epoch);
  w.u8(chainId);
  w.byteSeq(intendedChainSender);
  w.bytes(requestBody); // already encoded variant + payload
  return w.toUint8Array();
}

function encodeDkgBody(
  curve: number,
  senderPubkey: Uint8Array,
): Uint8Array {
  const w = new BcsWriter();
  w.u8(0); // DWalletRequest::DKG variant
  w.byteSeq(new Uint8Array(32)); // dwallet_network_encryption_public_key (zeros)
  w.u8(curve); // DWalletCurve single-byte variant
  w.byteSeq(new Uint8Array(32)); // centralized_public_key_share_and_proof
  // user_secret_key_share = Encrypted { ... zeros ... }
  w.u8(0); // Encrypted variant
  w.byteSeq(new Uint8Array(32)); // encrypted_centralized_secret_share_and_proof
  w.byteSeq(new Uint8Array(32)); // encryption_key
  w.byteSeq(senderPubkey); // signer_public_key
  w.byteSeq(new Uint8Array(32)); // user_public_output
  w.option(null); // sign_during_dkg_request = None
  return w.toUint8Array();
}

function encodePresignBody(curve: number, signatureAlgorithm: number): Uint8Array {
  const w = new BcsWriter();
  w.u8(3); // DWalletRequest::Presign variant
  w.byteSeq(new Uint8Array(32)); // dwallet_network_encryption_public_key
  w.u8(curve);
  w.u8(signatureAlgorithm);
  return w.toUint8Array();
}

function encodeSignBody(
  message: Uint8Array,
  presignSessionIdentifier: Uint8Array,
  dwalletAttestationData: Uint8Array,
  dwalletAttestationNetworkSignature: Uint8Array,
  dwalletAttestationNetworkPubkey: Uint8Array,
  dwalletAttestationEpoch: bigint,
  approvalTransactionSignature: Uint8Array,
  approvalSlot: bigint,
): Uint8Array {
  const w = new BcsWriter();
  w.u8(1); // DWalletRequest::Sign variant
  w.byteSeq(message);
  w.byteSeq(new Uint8Array(0)); // message_metadata
  w.byteSeq(presignSessionIdentifier);
  w.byteSeq(new Uint8Array(64)); // message_centralized_signature (zeros in pre-alpha)
  // dwallet_attestation: NetworkSignedAttestation
  w.byteSeq(dwalletAttestationData);
  w.byteSeq(dwalletAttestationNetworkSignature);
  w.byteSeq(dwalletAttestationNetworkPubkey);
  w.u64Le(dwalletAttestationEpoch);
  // approval_proof = Solana { transaction_signature, slot }
  w.u8(0); // Solana variant
  w.byteSeq(approvalTransactionSignature);
  w.u64Le(approvalSlot);
  return w.toUint8Array();
}

// TransactionResponseData decoder (variants: 0=Signature, 1=Attestation, 2=Error)
interface TxResponseAttestation {
  kind: 'attestation';
  attestationData: Uint8Array;
  networkSignature: Uint8Array;
  networkPubkey: Uint8Array;
  epoch: bigint;
}
type TxResponse =
  | { kind: 'signature'; signature: Uint8Array }
  | TxResponseAttestation
  | { kind: 'error'; message: string };

function decodeTxResponse(raw: Uint8Array): TxResponse {
  const r = new BcsReader(raw);
  const variant = r.u8();
  if (variant === 0) {
    const signature = r.byteSeq();
    return { kind: 'signature', signature };
  }
  if (variant === 1) {
    const attestationData = r.byteSeq();
    const networkSignature = r.byteSeq();
    const networkPubkey = r.byteSeq();
    const epoch = r.u64Le();
    return { kind: 'attestation', attestationData, networkSignature, networkPubkey, epoch };
  }
  if (variant === 2) {
    return { kind: 'error', message: r.string() };
  }
  throw new Error('unknown TransactionResponseData variant: ' + variant);
}

function decodePresignId(attestationData: Uint8Array): Uint8Array {
  // VersionedPresignDataAttestation.V1: u8 variant(0) + [u8;32] session_identifier
  // + u64 epoch + Vec<u8> presign_session_identifier (<-- what we want)
  const r = new BcsReader(attestationData);
  const variant = r.u8();
  if (variant !== 0) throw new Error('presign attestation not V1');
  r.fixedBytes(32);
  r.u64Le();
  return r.byteSeq();
}

function decodeDkgPublicKey(attestationData: Uint8Array): Uint8Array {
  // VersionedDWalletDataAttestation.V1: u8 variant + [u8;32] session_id +
  // Vec<u8> intended_chain_sender + u8 curve + Vec<u8> public_key (<-- want)
  const r = new BcsReader(attestationData);
  const variant = r.u8();
  if (variant !== 0) throw new Error('dkg attestation not V1');
  r.fixedBytes(32);
  r.byteSeq(); // intended_chain_sender
  r.u8(); // curve
  return r.byteSeq(); // public_key
}

// Protobuf bytes field (field 1/2 with wire type 2)
function encodeBytesField(field: number, data: Uint8Array): Buffer {
  const tag = (field << 3) | 2;
  const lenBytes: number[] = [];
  let v = data.length;
  while (v > 0x7f) {
    lenBytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  lenBytes.push(v);
  return Buffer.concat([Buffer.from([tag, ...lenBytes]), Buffer.from(data)]);
}

async function submit(userSig: Uint8Array, signed: Uint8Array): Promise<Uint8Array> {
  const cli = new grpc.Client(GRPC_URL, grpc.credentials.createSsl());
  try {
    return await new Promise<Uint8Array>((res, rej) => {
      cli.makeUnaryRequest(
        '/ika.dwallet.v1.DWalletService/SubmitTransaction',
        (b) => b,
        (b) => b,
        Buffer.concat([encodeBytesField(1, userSig), encodeBytesField(2, signed)]),
        new grpc.Metadata(),
        { deadline: new Date(Date.now() + 60_000) },
        (err: any, resp: any) => {
          if (err) return rej(err);
          if (resp[0] !== 0x0a) return res(new Uint8Array(resp));
          let off = 1;
          let len = 0;
          let shift = 0;
          while (resp[off] & 0x80) {
            len |= (resp[off] & 0x7f) << shift;
            shift += 7;
            off += 1;
          }
          len |= resp[off] << shift;
          off += 1;
          res(new Uint8Array(resp.subarray(off, off + len)));
        },
      );
    });
  } finally {
    cli.close();
  }
}

const userSig = encodeUserSignatureEd25519(
  new Uint8Array(64),
  owner.publicKey.toBytes(),
);

// Read current epoch from coordinator
const [coordinatorPda] = PublicKey.findProgramAddressSync([COORDINATOR_SEED], IKA_PROGRAM);
const coordInfo = await conn.getAccountInfo(coordinatorPda);
if (!coordInfo) throw new Error('DWalletCoordinator not found');
const currentEpoch = coordInfo.data.readBigUInt64LE(34);
console.log('current epoch:', currentEpoch.toString());

// ── 1. Raw DKG (Secp256k1) ────────────────────────────────────
console.log('\n1. DKG (Secp256k1) via raw gRPC...');
const dkgBody = encodeDkgBody(CURVE_SECP256K1, owner.publicKey.toBytes());
const dkgSigned = encodeSignedRequestDataRaw(
  new Uint8Array(32), // session_identifier_preimage = zeros
  currentEpoch,
  0, // ChainId::Solana
  owner.publicKey.toBytes(),
  dkgBody,
);
const dkgResp = decodeTxResponse(await submit(userSig, dkgSigned));
if (dkgResp.kind === 'error') throw new Error('DKG: ' + dkgResp.message);
if (dkgResp.kind !== 'attestation') throw new Error('DKG: unexpected ' + dkgResp.kind);
const dwalletPk = decodeDkgPublicKey(dkgResp.attestationData);
console.log('   dwallet pk (' + dwalletPk.length + ' bytes):',
  Buffer.from(dwalletPk).toString('hex'));
if (dwalletPk.length !== 33) {
  throw new Error('expected 33-byte compressed Secp256k1 pubkey');
}

// Derive dWallet PDA — for Secp256k1, chunks = [32, 3] (curve u16 LE + 33 pk = 35 bytes)
function dwalletPdaSeeds(curveU16: number, pk: Uint8Array): Buffer[] {
  const payload = Buffer.alloc(2 + pk.length);
  payload.writeUInt16LE(curveU16, 0);
  Buffer.from(pk).copy(payload, 2);
  const seeds: Buffer[] = [DWALLET_SEED];
  for (let i = 0; i < payload.length; i += 32) {
    seeds.push(payload.subarray(i, Math.min(i + 32, payload.length)));
  }
  return seeds;
}
const dwalletSeeds = dwalletPdaSeeds(CURVE_SECP256K1, dwalletPk);
const [dwalletPda] = PublicKey.findProgramAddressSync(dwalletSeeds, IKA_PROGRAM);
console.log('   dwallet PDA:', dwalletPda.toBase58());

// Poll for CommitDWallet
console.log('   waiting for CommitDWallet...');
for (let i = 0; i < 60; i += 1) {
  const info = await conn.getAccountInfo(dwalletPda);
  if (info) break;
  await new Promise((r) => setTimeout(r, 1500));
}

// ── 2. approve_message (signer path) ──────────────────────────
console.log('\n2. approve_message...');
const message = Buffer.from(
  'polet-secp256k1-smoke-' + Date.now().toString(),
  'utf-8',
);
const messageDigest = Buffer.from(keccak_256(message));
console.log('   message :', message.toString());
console.log('   digest  :', messageDigest.toString('hex'));

const schemeLe = Buffer.alloc(2);
schemeLe.writeUInt16LE(SIGNATURE_SCHEME_ECDSA_KECCAK256, 0);
const maSeeds = [...dwalletSeeds, MESSAGE_APPROVAL_SEED, schemeLe, messageDigest];
const [messageApprovalPda, maBump] = PublicKey.findProgramAddressSync(maSeeds, IKA_PROGRAM);

const ixData = Buffer.alloc(100);
ixData[0] = 8; // IX_APPROVE_MESSAGE
ixData[1] = maBump;
messageDigest.copy(ixData, 2);
// meta_digest zeros @ 34
owner.publicKey.toBuffer().copy(ixData, 66);
ixData.writeUInt16LE(SIGNATURE_SCHEME_ECDSA_KECCAK256, 98);

const approveIx = new TransactionInstruction({
  programId: IKA_PROGRAM,
  keys: [
    { pubkey: coordinatorPda, isSigner: false, isWritable: false },
    { pubkey: messageApprovalPda, isSigner: false, isWritable: true },
    { pubkey: dwalletPda, isSigner: false, isWritable: false },
    { pubkey: owner.publicKey, isSigner: true, isWritable: false },
    { pubkey: owner.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: ixData,
});
const approveSig = await sendAndConfirmTransaction(
  conn,
  new Transaction().add(approveIx),
  [owner],
  { commitment: 'confirmed', skipPreflight: true },
);
console.log('   approve tx:', approveSig);
const approveTxInfo = await conn.getTransaction(approveSig, {
  maxSupportedTransactionVersion: 0,
});
const approveSlot = BigInt(approveTxInfo?.slot ?? 0);

// ── 3. Presign (Secp256k1 + ECDSA) ────────────────────────────
console.log('\n3. Presign via raw gRPC...');
const presignBody = encodePresignBody(CURVE_SECP256K1, SIGNATURE_ALGORITHM_ECDSA_SECP256K1);
const presignSigned = encodeSignedRequestDataRaw(
  new Uint8Array(32),
  currentEpoch,
  0,
  owner.publicKey.toBytes(),
  presignBody,
);
const presignResp = decodeTxResponse(await submit(userSig, presignSigned));
if (presignResp.kind === 'error') throw new Error('Presign: ' + presignResp.message);
if (presignResp.kind !== 'attestation') throw new Error('Presign: unexpected ' + presignResp.kind);
const presignId = decodePresignId(presignResp.attestationData);
console.log('   presign_session_identifier:', Buffer.from(presignId).toString('hex'));

// ── 4. Sign ───────────────────────────────────────────────────
console.log('\n4. Sign via raw gRPC...');
const signBody = encodeSignBody(
  new Uint8Array(message),
  presignId,
  dkgResp.attestationData,
  dkgResp.networkSignature,
  dkgResp.networkPubkey,
  currentEpoch,
  bs58.decode(approveSig),
  approveSlot,
);
const signSigned = encodeSignedRequestDataRaw(
  new Uint8Array(32),
  currentEpoch,
  0,
  owner.publicKey.toBytes(),
  signBody,
);
const signResp = decodeTxResponse(await submit(userSig, signSigned));
if (signResp.kind === 'error') {
  console.log('\n✗ Sign failed:', signResp.message);
  process.exit(1);
}
if (signResp.kind !== 'signature') {
  console.log('\n✗ Sign unexpected:', signResp.kind);
  process.exit(1);
}
const signature = signResp.signature;
console.log('   signature (' + signature.length + ' bytes):',
  Buffer.from(signature).toString('hex'));

// ── 5. Cryptographic signature verification ───────────────────
console.log('\n5. Cryptographic ECDSA-Keccak256 verification...');
const signingDigest = keccak_256(message); // signer hashes message with keccak256
try {
  // @noble/curves secp256k1: compact r||s signature verification.
  const ok = secp256k1.verify(signature, signingDigest, dwalletPk);
  if (!ok) throw new Error('ECDSA verify returned false');
  console.log('   ✓ signature verifies against dWallet pubkey over keccak256(message)');
} catch (err) {
  console.log('   ✗ ECDSA verify failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}

// ── 6. Poll MessageApproval for on-chain CommitSignature ──────
console.log('\n6. Polling MessageApproval for CommitSignature...');
const MA_STATUS_OFFSET = 172;
const MA_SIG_LEN_OFFSET = 173;
const MA_SIG_OFFSET = 175;
for (let i = 0; i < 60; i += 1) {
  await new Promise((r) => setTimeout(r, 2000));
  const info = await conn.getAccountInfo(messageApprovalPda);
  if (!info) continue;
  const status = info.data[MA_STATUS_OFFSET];
  const sigLen = info.data.readUInt16LE(MA_SIG_LEN_OFFSET);
  process.stdout.write(`   [${i}] status=${status} sigLen=${sigLen}   \r`);
  if (status === 1 && sigLen > 0) {
    const onChainSig = info.data.subarray(MA_SIG_OFFSET, MA_SIG_OFFSET + sigLen);
    console.log('\n\n✅ SECP256K1 LIFECYCLE SUCCEEDED');
    console.log('   dwallet PDA        :', dwalletPda.toBase58());
    console.log('   MessageApproval PDA:', messageApprovalPda.toBase58());
    console.log('   status             : Signed (1)');
    console.log('   signature (on-chain):', onChainSig.toString('hex'));
    console.log('   match gRPC response:',
      onChainSig.equals(Buffer.from(signature)) ? 'YES ✓' : 'NO ✗');
    console.log('   crypto verified    : YES ✓');
    console.log('\n   explorer (MA): https://explorer.solana.com/address/' +
      messageApprovalPda.toBase58() + '?cluster=devnet');
    console.log('   explorer (dW): https://explorer.solana.com/address/' +
      dwalletPda.toBase58() + '?cluster=devnet');
    console.log('   approve tx   : https://explorer.solana.com/tx/' +
      approveSig + '?cluster=devnet');
    process.exit(0);
  }
}
console.log('\n✗ Timed out waiting for on-chain CommitSignature');
process.exit(1);
