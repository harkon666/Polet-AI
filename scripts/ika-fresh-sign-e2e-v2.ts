/**
 * Fresh DKG + Presign + Sign smoke — V2, fixes the zero-attestation bug from v1.
 *
 * v1 threw away the real `dkgResult.attestationData` from the DKG response and
 * passed 32 zero bytes to Sign, producing "failed to decode dwallet_attestation".
 *
 * V2 properly threads the DKG NetworkSignedAttestation (attestation_data,
 * network_signature, network_pubkey, epoch) into the Sign request. This is the
 * combination the docs describe ("gRPC sign with ApprovalProof referencing the
 * on-chain approval") and the one the voting E2E demo claims succeeds end-to-end.
 *
 * If this Sign returns a signature AND the on-chain MessageApproval flips to
 * status=Signed, step 5 is achievable and the previous "upstream-blocked" claim
 * was wrong. If it still errors ("no key for dwallet" etc.), we have honest
 * evidence that the mock signer genuinely can't complete the flow for this
 * DKG mode.
 *
 *   1. gRPC DKG                → NetworkSignedAttestation + on-chain CommitDWallet
 *   2. Owner `approve_message` → MessageApproval PDA status=Pending
 *   3. gRPC Presign            → presign_session_identifier
 *   4. gRPC Sign (real attest.)→ 64-byte signature, network CommitSignature on-chain
 *   5. Read back signature from MessageApproval PDA
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
import {
  createIkaClient,
  defineBcsTypes,
} from '@ika.xyz/pre-alpha-solana-client/grpc';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as grpc from '@grpc/grpc-js';
import * as fs from 'node:fs';

const {
  SignedRequestData,
  TransactionResponseData,
  UserSignature,
  VersionedPresignDataAttestation,
} = defineBcsTypes();

const IKA_PROGRAM = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
const GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';
const DWALLET_SEED = Buffer.from('dwallet');
const MESSAGE_APPROVAL_SEED = Buffer.from('message_approval');
const COORDINATOR_SEED = Buffer.from('dwallet_coordinator');
const CURVE_25519 = 2;
const SCHEME_EDDSA = 5; // EddsaSha512 (u16)

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

// ── Fund owner if needed ──────────────────────────────────────
{
  const balance = await conn.getBalance(owner.publicKey);
  console.log(`owner balance: ${balance / 1e9} SOL`);
  if (balance < 50_000_000) {
    console.log('funding owner...');
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: owner.publicKey,
        lamports: 50_000_000,
      }),
    );
    const sig = await sendAndConfirmTransaction(conn, fundTx, [funder]);
    console.log('  fund tx:', sig);
  }
}

// ── Fetch current epoch from coordinator ──────────────────────
async function readCoordinatorEpoch(): Promise<bigint> {
  const [coord] = PublicKey.findProgramAddressSync([COORDINATOR_SEED], IKA_PROGRAM);
  const info = await conn.getAccountInfo(coord);
  if (!info) throw new Error('DWalletCoordinator not found');
  // Account layout: disc(1) + version(1) + authority(32) + epoch(u64 LE) @ offset 34
  return info.data.readBigUInt64LE(34);
}
const currentEpoch = await readCoordinatorEpoch();
console.log('current epoch:', currentEpoch.toString());

// ── 1. Fresh DKG ──────────────────────────────────────────────
console.log('\n1. DKG via gRPC...');
const ikaClient = createIkaClient(GRPC_URL);
const dkgResult = await ikaClient.requestDKG(owner.publicKey.toBytes());
const dwalletPk = new Uint8Array(dkgResult.publicKey);
console.log(
  `   dwallet public key: ${Buffer.from(dwalletPk).toString('hex')}`,
);
console.log(
  `   attestation_data : ${dkgResult.attestationData.length} bytes`,
);
console.log(
  `   network_signature: ${dkgResult.networkSignature.length} bytes`,
);
console.log(
  `   network_pubkey   : ${dkgResult.networkPubkey.length} bytes`,
);

// Derive dWallet PDA: ["dwallet", chunks(curve_u16_le || pk)]
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
const dwalletSeeds = dwalletPdaSeeds(CURVE_25519, dwalletPk);
const [dwalletPda] = PublicKey.findProgramAddressSync(dwalletSeeds, IKA_PROGRAM);
console.log(`   dwallet PDA: ${dwalletPda.toBase58()}`);

// Poll for CommitDWallet
console.log('   waiting for CommitDWallet on-chain...');
let dwalletData: Buffer | null = null;
for (let i = 0; i < 60; i += 1) {
  const info = await conn.getAccountInfo(dwalletPda, 'confirmed');
  if (info) {
    dwalletData = info.data;
    break;
  }
  await new Promise((r) => setTimeout(r, 1500));
}
if (!dwalletData) throw new Error('CommitDWallet never landed');
const authority = new PublicKey(dwalletData.subarray(2, 34));
console.log(`   ✓ dwallet active, authority: ${authority.toBase58()}`);
if (!authority.equals(owner.publicKey)) {
  throw new Error(
    `authority mismatch — expected ${owner.publicKey.toBase58()}, got ${authority.toBase58()}`,
  );
}

// ── 2. approve_message (owner as direct authority) ────────────
console.log('\n2. approve_message (signer path)...');
const message = Buffer.from('hello-ika-from-polet-hermes-v2', 'utf-8');
const messageDigest = Buffer.from(keccak_256(message));
console.log(`   message: ${message.toString()}`);
console.log(`   digest : ${messageDigest.toString('hex')}`);

const schemeLe = Buffer.alloc(2);
schemeLe.writeUInt16LE(SCHEME_EDDSA, 0);
const maSeeds = [...dwalletSeeds, MESSAGE_APPROVAL_SEED, schemeLe, messageDigest];
const [messageApprovalPda, maBump] = PublicKey.findProgramAddressSync(
  maSeeds,
  IKA_PROGRAM,
);
console.log(`   messageApproval PDA: ${messageApprovalPda.toBase58()}`);

const [coordinatorPda] = PublicKey.findProgramAddressSync(
  [COORDINATOR_SEED],
  IKA_PROGRAM,
);

// approve_message instruction data: disc(1) | bump(1) | msg_digest(32) |
// meta_digest(32) | user_pubkey(32) | scheme_u16_le(2) = 100 bytes
const ixData = Buffer.alloc(100);
ixData[0] = 8; // IX_APPROVE_MESSAGE
ixData[1] = maBump;
messageDigest.copy(ixData, 2);
// meta_digest zeros at offset 34
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
const approveSig = await sendAndConfirmTransaction(
  conn,
  new Transaction().add(approveIx),
  [owner],
  { commitment: 'confirmed', skipPreflight: true },
);
console.log(`   approve_message tx: ${approveSig}`);
const approveTxInfo = await conn.getTransaction(approveSig, {
  maxSupportedTransactionVersion: 0,
});
const approveSlot = BigInt(approveTxInfo?.slot ?? 0);
console.log(`   slot: ${approveSlot.toString()}`);

// Verify MessageApproval on-chain before proceeding
{
  const info = await conn.getAccountInfo(messageApprovalPda);
  if (!info) throw new Error('MessageApproval PDA not found after approve');
  const status = info.data[172];
  console.log(`   MA status: ${status} (${status === 0 ? 'Pending' : 'Signed'})`);
}

// ── Raw gRPC helper (needed because official client doesn't expose
//    the dwallet_attestation arg for Sign)
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
async function submit(
  userSig: Uint8Array,
  signed: Uint8Array,
): Promise<Uint8Array> {
  const cli = new grpc.Client(GRPC_URL, grpc.credentials.createSsl());
  try {
    return await new Promise<Uint8Array>((res, rej) => {
      cli.makeUnaryRequest(
        '/ika.dwallet.v1.DWalletService/SubmitTransaction',
        (b) => b,
        (b) => b,
        Buffer.concat([
          encodeBytesField(1, userSig),
          encodeBytesField(2, signed),
        ]),
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

const userSig = UserSignature.serialize({
  Ed25519: {
    signature: Array.from(new Uint8Array(64)),
    public_key: Array.from(owner.publicKey.toBytes()),
  },
}).toBytes();

// ── 3. Presign (global) — preimage=zeros matches DKG ─────────
console.log('\n3. Presign (global) via gRPC...');
// Server uses session_identifier_preimage directly as the dWallet key
// lookup ID. DKG used 32 zeros, so Presign+Sign must match.
const presignRequest = SignedRequestData.serialize({
  session_identifier_preimage: Array.from(new Uint8Array(32)),
  epoch: currentEpoch,
  chain_id: { Solana: true },
  intended_chain_sender: Array.from(owner.publicKey.toBytes()),
  request: {
    Presign: {
      dwallet_network_encryption_public_key: Array.from(new Uint8Array(32)),
      curve: { Curve25519: true },
      signature_algorithm: { EdDSA: true },
    },
  },
}).toBytes();
const presignResp = await submit(userSig, presignRequest);
const presignDecoded = TransactionResponseData.parse(presignResp);
if (presignDecoded.Error) throw new Error(`Presign: ${presignDecoded.Error.message}`);
if (!presignDecoded.Attestation) {
  throw new Error(`Presign unexpected: ${JSON.stringify(presignDecoded)}`);
}
const presignPayload = VersionedPresignDataAttestation.parse(
  new Uint8Array(presignDecoded.Attestation.attestation_data),
);
if (!presignPayload.V1) throw new Error('Presign V1 missing');
const presignId = new Uint8Array(presignPayload.V1.presign_session_identifier);
console.log(
  `   presign_session_identifier: ${Buffer.from(presignId).toString('hex')}`,
);

// ── 4. Sign — preimage=zeros matches DKG ─────────────────────
console.log('\n4. Sign via gRPC (session_identifier_preimage = DKG zeros)...');
const signRequest = SignedRequestData.serialize({
  session_identifier_preimage: Array.from(new Uint8Array(32)),
  epoch: currentEpoch,
  chain_id: { Solana: true },
  intended_chain_sender: Array.from(owner.publicKey.toBytes()),
  request: {
    Sign: {
      message: Array.from(message),
      message_metadata: [],
      presign_session_identifier: Array.from(presignId),
      message_centralized_signature: Array.from(new Uint8Array(64)),
      dwallet_attestation: {
        attestation_data: Array.from(dkgResult.attestationData),
        network_signature: Array.from(dkgResult.networkSignature),
        network_pubkey: Array.from(dkgResult.networkPubkey),
        epoch: currentEpoch,
      },
      approval_proof: {
        Solana: {
          transaction_signature: Array.from(bs58.decode(approveSig)),
          slot: approveSlot,
        },
      },
    },
  },
}).toBytes();
const signResp = await submit(userSig, signRequest);
const signDecoded = TransactionResponseData.parse(signResp);
console.log('   raw Sign response:', JSON.stringify(signDecoded, null, 2).slice(0, 500));

if (signDecoded.Error) {
  console.log(`\n✗ Sign failed: ${signDecoded.Error.message}`);
  ikaClient.close();
  process.exit(1);
}
if (!signDecoded.Signature) {
  console.log(`\n✗ Sign unexpected variant: ${JSON.stringify(signDecoded)}`);
  ikaClient.close();
  process.exit(1);
}
const signature = new Uint8Array(signDecoded.Signature.signature);
console.log(
  `   ✓ signature (${signature.length} bytes): ${Buffer.from(signature).toString('hex')}`,
);

// ── 4b. Cryptographic Ed25519 verification ───────────────────
console.log('\n4b. Cryptographic Ed25519 verification...');
{
  // @ts-expect-error — runtime-resolved via proxy/node_modules
  const { ed25519 } = await import('../proxy/node_modules/@noble/curves/ed25519');
  try {
    const ok = ed25519.verify(signature, message, dwalletPk);
    if (!ok) throw new Error('Ed25519 verify returned false');
    console.log('   ✓ signature verifies against dWallet pubkey over raw message (Ed25519 prehashes with SHA-512 internally)');
  } catch (err) {
    console.log('   ✗ Ed25519 verify failed:', err instanceof Error ? err.message : err);
    ikaClient.close();
    process.exit(1);
  }
}

// ── 5. Poll MessageApproval for CommitSignature on-chain ─────
console.log('\n5. Polling MessageApproval for CommitSignature...');
for (let i = 0; i < 60; i += 1) {
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
    console.log(`   dwallet PDA        : ${dwalletPda.toBase58()}`);
    console.log(`   status             : 1 (Signed)`);
    console.log(`   signature_len      : ${sigLen}`);
    console.log(`   signature          : ${onChainSig.toString('hex')}`);
    console.log(
      `   match gRPC         : ${onChainSig.equals(Buffer.from(signature)) ? 'YES ✓' : 'NO ✗'}`,
    );
    console.log(
      `\n   explorer (MA): https://explorer.solana.com/address/${messageApprovalPda.toBase58()}?cluster=devnet`,
    );
    console.log(
      `   explorer (dW): https://explorer.solana.com/address/${dwalletPda.toBase58()}?cluster=devnet`,
    );
    console.log(
      `   approve tx   : https://explorer.solana.com/tx/${approveSig}?cluster=devnet`,
    );
    ikaClient.close();
    process.exit(0);
  }
}
console.log('\n✗ Timed out waiting for on-chain CommitSignature');
ikaClient.close();
process.exit(1);
