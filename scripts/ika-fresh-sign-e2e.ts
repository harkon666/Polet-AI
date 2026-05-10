/**
 * Fresh DKG + Presign + Sign smoke using the owner's key directly (no Polet CPI,
 * no managed fixture, no staleness from prior runs). Proves the raw Ika lifecycle
 * end-to-end:
 *
 *   1. gRPC DKG       → NetworkSignedAttestation + on-chain CommitDWallet
 *   2. Owner calls `approve_message` directly (authority=owner, signer path)
 *   3. gRPC Presign   → presign_session_identifier
 *   4. gRPC Sign      → 64-byte Ed25519 signature, network CommitSignature on-chain
 *   5. Read back signature from MessageApproval PDA
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { createIkaClient, defineBcsTypes } from '@ika.xyz/pre-alpha-solana-client/grpc';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as grpc from '@grpc/grpc-js';
import * as fs from 'node:fs';

const { SignedRequestData, TransactionResponseData, UserSignature,
        VersionedDWalletDataAttestation, VersionedPresignDataAttestation } = defineBcsTypes();

const IKA_PROGRAM = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
const GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';
const DWALLET_SEED = Buffer.from('dwallet');
const MESSAGE_APPROVAL_SEED = Buffer.from('message_approval');
const CURVE_25519 = 2;
const SCHEME_EDDSA = 5; // EddsaSha512

// Owner funded from the big testing wallet
const funder = Keypair.fromSecretKey(bs58.decode('2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie'));
const ownerSecret = Uint8Array.from(JSON.parse(fs.readFileSync('/tmp/fresh-owner.json', 'utf-8')));
const owner = Keypair.fromSecretKey(ownerSecret);
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

console.log('funder:', funder.publicKey.toBase58());
console.log('owner:', owner.publicKey.toBase58());

// Fund owner if needed
const balance = await conn.getBalance(owner.publicKey);
console.log(`owner balance: ${balance / 1e9} SOL`);
if (balance < 50_000_000) {
  console.log('funding owner...');
  const fundTx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: funder.publicKey, toPubkey: owner.publicKey, lamports: 50_000_000,
  }));
  const sig = await sendAndConfirmTransaction(conn, fundTx, [funder]);
  console.log('  fund tx:', sig);
}

// ── 1. Fresh DKG ─────────────────────────────────────────────
console.log('\n1. DKG via gRPC...');
const ikaClient = createIkaClient(GRPC_URL);
const dkgResult = await ikaClient.requestDKG(owner.publicKey.toBytes());
const dwalletPk = new Uint8Array(dkgResult.publicKey);
console.log(`   dwallet public key: ${Buffer.from(dwalletPk).toString('hex').slice(0, 32)}...`);
console.log(`   attestation: ${dkgResult.attestationData.length} bytes`);

// Derive dWallet PDA
function dwalletPdaSeeds(curveU16: number, pk: Uint8Array): Buffer[] {
  const payload = Buffer.alloc(2 + pk.length);
  payload.writeUInt16LE(curveU16, 0);
  Buffer.from(pk).copy(payload, 2);
  const seeds: Buffer[] = [DWALLET_SEED];
  for (let i = 0; i < payload.length; i += 32) seeds.push(payload.subarray(i, Math.min(i + 32, payload.length)));
  return seeds;
}
const dwalletSeeds = dwalletPdaSeeds(CURVE_25519, dwalletPk);
const [dwalletPda] = PublicKey.findProgramAddressSync(dwalletSeeds, IKA_PROGRAM);
console.log(`   dwallet PDA: ${dwalletPda.toBase58()}`);

// Poll for CommitDWallet
console.log('   waiting for CommitDWallet on-chain...');
let dwalletData: Buffer | null = null;
for (let i = 0; i < 60; i += 1) {
  const info = await conn.getAccountInfo(dwalletPda, 'confirmed');
  if (info) { dwalletData = info.data; break; }
  await new Promise((r) => setTimeout(r, 1500));
}
if (!dwalletData) throw new Error('CommitDWallet never landed');
console.log(`   ✓ dwallet active, authority: ${new PublicKey(dwalletData.subarray(2, 34)).toBase58()}`);

// ── 2. approve_message (owner as direct authority) ─────────────
console.log('\n2. approve_message (signer path)...');
const message = Buffer.from('hello-ika-from-polet-hermes', 'utf-8');
const messageDigest = Buffer.from(keccak_256(message));
console.log(`   message: ${message.toString()}`);
console.log(`   digest:  ${messageDigest.toString('hex')}`);

// MessageApproval PDA seeds: ["dwallet", chunks..., "message_approval", scheme_u16_le, message_digest]
const schemeLe = Buffer.alloc(2);
schemeLe.writeUInt16LE(SCHEME_EDDSA, 0);
const maSeeds = [...dwalletSeeds, MESSAGE_APPROVAL_SEED, schemeLe, messageDigest];
const [messageApprovalPda, maBump] = PublicKey.findProgramAddressSync(maSeeds, IKA_PROGRAM);
console.log(`   messageApproval PDA: ${messageApprovalPda.toBase58()}`);

// Coordinator PDA
const [coordinatorPda] = PublicKey.findProgramAddressSync([Buffer.from('dwallet_coordinator')], IKA_PROGRAM);

// approve_message instruction (signer path)
// Accounts (signer path, per docs):
//   0 coordinator
//   1 message_approval (W)
//   2 dwallet
//   3 authority (S)
//   4 payer (W, S)
//   5 system_program
// Data (100 bytes): disc(1) | bump(1) | msg_digest(32) | meta_digest(32) | user_pubkey(32) | scheme(2)
const ixData = Buffer.alloc(100);
ixData[0] = 8; // IX_APPROVE_MESSAGE
ixData[1] = maBump;
messageDigest.copy(ixData, 2);
// meta_digest all zeros at offset 34
owner.publicKey.toBuffer().copy(ixData, 66);
ixData.writeUInt16LE(SCHEME_EDDSA, 98);

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
const approveTx = new Transaction().add(approveIx);
const approveSig = await sendAndConfirmTransaction(conn, approveTx, [owner], { commitment: 'confirmed', skipPreflight: true });
console.log(`   approve_message tx: ${approveSig}`);
const approveTxInfo = await conn.getTransaction(approveSig, { maxSupportedTransactionVersion: 0 });

// ── 3. Presign ──────────────────────────────────────────────
console.log('\n3. Presign (Curve25519 + EdDSA)...');
function encodeBytesField(field: number, data: Uint8Array): Buffer {
  const tag = (field << 3) | 2;
  const lenBytes: number[] = [];
  let v = data.length;
  while (v > 0x7f) { lenBytes.push((v & 0x7f) | 0x80); v >>>= 7; }
  lenBytes.push(v);
  return Buffer.concat([Buffer.from([tag, ...lenBytes]), Buffer.from(data)]);
}
async function submit(userSig: Uint8Array, signed: Uint8Array): Promise<Uint8Array> {
  const cli = new grpc.Client(GRPC_URL, grpc.credentials.createSsl());
  try {
    return await new Promise<Uint8Array>((res, rej) => {
      cli.makeUnaryRequest(
        '/ika.dwallet.v1.DWalletService/SubmitTransaction',
        (b) => b, (b) => b,
        Buffer.concat([encodeBytesField(1, userSig), encodeBytesField(2, signed)]),
        new grpc.Metadata(), { deadline: new Date(Date.now() + 60_000) },
        (err: any, resp: any) => {
          if (err) return rej(err);
          if (resp[0] !== 0x0a) return res(new Uint8Array(resp));
          let off = 1, len = 0, shift = 0;
          while (resp[off] & 0x80) { len |= (resp[off] & 0x7f) << shift; shift += 7; off += 1; }
          len |= resp[off] << shift; off += 1;
          res(new Uint8Array(resp.subarray(off, off + len)));
        },
      );
    });
  } finally { cli.close(); }
}
const userSig = UserSignature.serialize({
  Ed25519: { signature: Array.from(new Uint8Array(64)), public_key: Array.from(owner.publicKey.toBytes()) },
}).toBytes();
const presignRequest = SignedRequestData.serialize({
  session_identifier_preimage: Array.from(new Uint8Array(32)),
  epoch: 1n, chain_id: { Solana: true },
  intended_chain_sender: Array.from(owner.publicKey.toBytes()),
  request: { Presign: {
    dwallet_network_encryption_public_key: Array.from(new Uint8Array(32)),
    curve: { Curve25519: true },
    signature_algorithm: { EdDSA: true },
  }},
}).toBytes();
const presignResp = await submit(userSig, presignRequest);
const presignDecoded = TransactionResponseData.parse(presignResp);
if (presignDecoded.Error) throw new Error(`Presign: ${presignDecoded.Error.message}`);
const presignPayload = VersionedPresignDataAttestation.parse(new Uint8Array(presignDecoded.Attestation.attestation_data));
const presignId = new Uint8Array(presignPayload.V1.presign_session_identifier);
console.log(`   presign_session_identifier: ${Buffer.from(presignId).toString('hex').slice(0, 32)}...`);

// ── 4. Sign ─────────────────────────────────────────────────
console.log('\n4. Sign (pass raw message, server will keccak256 to match MessageApproval)...');
const signRequest = SignedRequestData.serialize({
  session_identifier_preimage: Array.from(owner.publicKey.toBytes()),
  epoch: 1n,
  chain_id: { Solana: true },
  intended_chain_sender: Array.from(owner.publicKey.toBytes()),
  request: { Sign: {
    message: Array.from(message),
    message_metadata: [],
    presign_session_identifier: Array.from(presignId),
    message_centralized_signature: Array.from(new Uint8Array(64)),
    dwallet_attestation: {
      attestation_data: Array.from(new Uint8Array(32)),
      network_signature: Array.from(new Uint8Array(64)),
      network_pubkey: Array.from(new Uint8Array(32)),
      epoch: 1n,
    },
    approval_proof: { Solana: {
      transaction_signature: Array.from(bs58.decode(approveSig)),
      slot: BigInt(approveTxInfo?.slot ?? 0),
    }},
  }},
}).toBytes();
const signResp = await submit(userSig, signRequest);
const signDecoded = TransactionResponseData.parse(signResp);
if (signDecoded.Error) throw new Error(`Sign: ${signDecoded.Error.message}`);
if (!signDecoded.Signature) throw new Error(`Sign unexpected: ${JSON.stringify(signDecoded)}`);
const signature = new Uint8Array(signDecoded.Signature.signature);
console.log(`   signature (${signature.length} bytes): ${Buffer.from(signature).toString('hex')}`);

// ── 5. Poll MessageApproval for on-chain commit ────────────
console.log('\n5. Polling MessageApproval for CommitSignature...');
for (let i = 0; i < 40; i += 1) {
  await new Promise((r) => setTimeout(r, 2000));
  const info = await conn.getAccountInfo(messageApprovalPda);
  if (!info) continue;
  const status = info.data[172];
  const sigLen = info.data.readUInt16LE(173);
  process.stdout.write(`   [${i}] status=${status} sigLen=${sigLen}   \r`);
  if (status === 1 && sigLen > 0) {
    const onChainSig = info.data.subarray(175, 175 + sigLen);
    console.log('\n\n✅ SIGNATURE STORED ON-CHAIN!');
    console.log(`   MessageApproval PDA: ${messageApprovalPda.toBase58()}`);
    console.log(`   status: 1 (Signed)`);
    console.log(`   signature: ${onChainSig.toString('hex')}`);
    console.log(`   match gRPC: ${onChainSig.equals(Buffer.from(signature)) ? 'YES ✓' : 'NO ✗'}`);
    console.log(`\n   explorer: https://explorer.solana.com/address/${messageApprovalPda.toBase58()}?cluster=devnet`);
    console.log(`   approve tx: https://explorer.solana.com/tx/${approveSig}?cluster=devnet`);
    ikaClient.close();
    process.exit(0);
  }
}
console.log('\n✗ timeout waiting for on-chain commit');
ikaClient.close();
