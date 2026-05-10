/**
 * Drive Ika Pre-Alpha Presign + Sign directly against the existing MessageApproval
 * PDA that Polet's approve_ika_message CPI already created on devnet. Bypasses the
 * proxy's hand-rolled BCS schema; uses the official @ika.xyz/pre-alpha-solana-client.
 *
 * Verifies that after Sign the on-chain MessageApproval status flips to Signed
 * and `signature` field is populated — the "Signature stored on-chain" stage per
 * Ika docs.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { createIkaClient, defineBcsTypes } from '@ika.xyz/pre-alpha-solana-client/grpc';
import * as grpc from '@grpc/grpc-js';

const {
  SignedRequestData,
  TransactionResponseData,
  UserSignature,
  VersionedPresignDataAttestation,
} = defineBcsTypes();

const OWNER_SECRET = '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie';
// Latest Polet approve_ika_message tx from fresh smoke (Curve25519 + EdDSA)
const DWALLET_ACCOUNT = 'EQ51wKkStDfof8NSdEpY8bJLnKvDV8TQKZtT4qiiovAK';
const DWALLET_PUBLIC_KEY_HEX = 'bf4009a55f24048f9cb34c41d9d8605a30d987c99ebb85d147a30b5cb8d467c1';
const MESSAGE_APPROVAL_PDA = 'EahpddF6zSKfm9xuPuM4Fap2NPiB5TW2SgijFar5N2PQ';
const APPROVAL_TX_SIGNATURE = 'mUK9c3iHatkF5nzQXhhXu7Vt9NYTmB8rMqqJCbTwRoMnTKs12tBuyLKe7D4unCY3hG4Phep5rcUxcU12agXyT8C';
const PREIMAGE_JSON = '{"schema":"polet.ika.message-approval.v1","canonicalOrderHash":"dd4b54fef194d5699b25c3fd3e6d2bd85b70ef0378b8810a0e46be0b92ca8e1a","requestId":"ika-68a3015b198f3296fe732ccb","dwalletAccount":"EQ51wKkStDfof8NSdEpY8bJLnKvDV8TQKZtT4qiiovAK","destinationChain":"sui","destinationAsset":"SUI","destinationSigningDigest":"590ab9f0582e058f204ed725fba8eeedaf85c0c62d60482adc42c32492621e17","signatureScheme":"ed25519-prealpha","userPublicKey":"ECFFvJe8yPaTSH2qdXP1CkQTxWfWy5B3fZ7HEcCQPhSn","policySequence":2,"expiresAtUnix":1778408185}';
const GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';

const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET));
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

console.log('== Ika Presign + Sign direct driver ==');
console.log('owner:           ', owner.publicKey.toBase58());
console.log('dwallet:         ', DWALLET_ACCOUNT);
console.log('messageApproval: ', MESSAGE_APPROVAL_PDA);
console.log('approvalTx:      ', APPROVAL_TX_SIGNATURE);

// Read MessageApproval to get the message_digest that was approved
console.log('\n1. Reading MessageApproval PDA...');
const maInfo = await conn.getAccountInfo(new PublicKey(MESSAGE_APPROVAL_PDA));
if (!maInfo) throw new Error('MessageApproval not found');
const maData = maInfo.data;
const messageDigest = maData.subarray(34, 66);
const statusBefore = maData[172];
console.log(`  status before: ${statusBefore} (${statusBefore === 0 ? 'Pending' : 'Signed'})`);
console.log(`  message_digest: ${messageDigest.toString('hex')}`);
console.log(`  signature_len before: ${maData.readUInt16LE(173)}`);

const dwalletPublicKey = Buffer.from(DWALLET_PUBLIC_KEY_HEX, 'hex');
const senderPubkey = owner.publicKey.toBytes();

// Resolve approval tx slot (needed by ApprovalProof::Solana)
console.log('\n2. Fetching approval tx slot...');
const approvalTx = await conn.getTransaction(APPROVAL_TX_SIGNATURE, {
  maxSupportedTransactionVersion: 0,
});
if (!approvalTx) throw new Error('approval tx not found on devnet');
console.log(`  slot: ${approvalTx.slot}`);

const client = createIkaClient(GRPC_URL);

// Helper: raw SubmitTransaction via the client's grpc-js channel. The official
// `requestPresign()` is hardcoded to PresignForDWallet (only valid for imported
// ECDSA keys) so we submit a Presign variant manually for Curve25519 non-imported.
// Proper protobuf varint + bytes-field encoding for gRPC payload framing.
function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return bytes;
}
function encodeBytesField(fieldNumber: number, data: Uint8Array): Buffer {
  const tag = (fieldNumber << 3) | 2; // wire type 2 (length-delimited)
  return Buffer.concat([Buffer.from([tag, ...encodeVarint(data.length)]), Buffer.from(data)]);
}

async function submitTransaction(userSig: Uint8Array, signed: Uint8Array): Promise<Uint8Array> {
  const creds = grpc.credentials.createSsl();
  const target = GRPC_URL.replace(/^https?:\/\//, '');
  const raw = new grpc.Client(target, creds);
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const deadline = new Date(Date.now() + 60_000);
      const payload = Buffer.concat([encodeBytesField(1, userSig), encodeBytesField(2, signed)]);
      raw.makeUnaryRequest(
        '/ika.dwallet.v1.DWalletService/SubmitTransaction',
        (req: Buffer) => req,
        (buf: Buffer) => buf,
        payload,
        new grpc.Metadata(),
        { deadline },
        (err: any, resp: any) => {
          if (err) return reject(err);
          // Response is TransactionResponse { bytes response_data = 1 }. Extract.
          if (resp[0] !== 0x0a) return resolve(new Uint8Array(resp));
          let offset = 1, len = 0, shift = 0;
          while (resp[offset] & 0x80) {
            len |= (resp[offset] & 0x7f) << shift;
            shift += 7;
            offset += 1;
          }
          len |= resp[offset] << shift;
          offset += 1;
          resolve(new Uint8Array(resp.subarray(offset, offset + len)));
        },
      );
    });
  } finally {
    raw.close();
  }
}

function buildUserSig(pubkey: Uint8Array): Uint8Array {
  return UserSignature.serialize({
    Ed25519: { signature: Array.from(new Uint8Array(64)), public_key: Array.from(pubkey) },
  }).toBytes();
}

try {
  console.log('\n3. Presign (global, Curve25519 + EdDSA) via gRPC...');
  const presignRequestData = SignedRequestData.serialize({
    session_identifier_preimage: Array.from(new Uint8Array(32)),
    epoch: 1n,
    chain_id: { Solana: true },
    intended_chain_sender: Array.from(senderPubkey),
    request: { Presign: {
      dwallet_network_encryption_public_key: Array.from(new Uint8Array(32)),
      curve: { Curve25519: true },
      signature_algorithm: { EdDSA: true },
    }},
  }).toBytes();

  const presignResp = await submitTransaction(buildUserSig(senderPubkey), presignRequestData);
  const presignDecoded = TransactionResponseData.parse(new Uint8Array(presignResp));
  if (presignDecoded.Error) throw new Error(`Presign failed: ${presignDecoded.Error.message}`);
  if (!presignDecoded.Attestation) throw new Error(`Presign unexpected: ${JSON.stringify(presignDecoded)}`);
  const presignPayload = VersionedPresignDataAttestation.parse(new Uint8Array(presignDecoded.Attestation.attestation_data));
  if (!presignPayload.V1) throw new Error(`Presign payload: ${JSON.stringify(presignPayload)}`);
  const presignId = new Uint8Array(presignPayload.V1.presign_session_identifier);
  console.log(`  presign_session_identifier: ${Buffer.from(presignId).toString('hex').slice(0, 48)}...`);

  console.log('\n4. Sign via gRPC (with real DKG attestation + Solana ApprovalProof)...');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fixturePath = path.resolve('proxy/.polet/ika-managed-fixture.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const entry = fixture.dwallets.curve25519;
  const attestationBytes = Buffer.from(entry.dwalletAttestation.attestationDataHex, 'hex');
  const networkSignatureBytes = Buffer.from(entry.dwalletAttestation.networkSignatureHex, 'hex');
  const networkPubkeyBytes = Buffer.from(entry.dwalletAttestation.networkPublicKeyHex, 'hex');
  const attestationEpoch = BigInt(entry.dwalletAttestation.epoch);
  console.log(`  attestationData: ${attestationBytes.length} bytes`);
  console.log(`  networkSignature: ${networkSignatureBytes.length} bytes`);
  console.log(`  networkPubkey: ${networkPubkeyBytes.length} bytes`);

  const approvalSigBytes = bs58.decode(APPROVAL_TX_SIGNATURE);
  // Ika server applies keccak256 to `message` field itself and uses the
  // result as the MessageApproval PDA seed. Pass the raw JSON preimage bytes;
  // the on-chain MessageApproval was created with the same keccak256 digest.
  const messagePreimage = Buffer.from(PREIMAGE_JSON, 'utf8');
  console.log(`  message (preimage): ${messagePreimage.length} bytes`);
  const signRequestData = SignedRequestData.serialize({
    session_identifier_preimage: Array.from(dwalletPublicKey.slice(0, 32)),
    epoch: attestationEpoch,
    chain_id: { Solana: true },
    intended_chain_sender: Array.from(senderPubkey),
    request: { Sign: {
      message: Array.from(messagePreimage),
      message_metadata: [],
      presign_session_identifier: Array.from(presignId),
      message_centralized_signature: Array.from(new Uint8Array(64)),
      dwallet_attestation: {
        attestation_data: Array.from(attestationBytes),
        network_signature: Array.from(networkSignatureBytes),
        network_pubkey: Array.from(networkPubkeyBytes),
        epoch: attestationEpoch,
      },
      approval_proof: { Solana: {
        transaction_signature: Array.from(approvalSigBytes),
        slot: BigInt(approvalTx.slot),
      }},
    }},
  }).toBytes();

  const signResp = await submitTransaction(buildUserSig(senderPubkey), signRequestData);
  const signDecoded = TransactionResponseData.parse(new Uint8Array(signResp));
  if (signDecoded.Error) throw new Error(`Sign failed: ${signDecoded.Error.message}`);
  if (!signDecoded.Signature) throw new Error(`Sign unexpected: ${JSON.stringify(signDecoded)}`);
  const signature = new Uint8Array(signDecoded.Signature.signature);
  console.log(`  signature: ${Buffer.from(signature).toString('hex')}`);
  console.log(`  signature length: ${signature.length}`);

  // Poll MessageApproval for on-chain commit
  console.log('\n5. Polling MessageApproval for CommitSignature...');
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const info = await conn.getAccountInfo(new PublicKey(MESSAGE_APPROVAL_PDA));
    if (!info) continue;
    const status = info.data[172];
    const sigLen = info.data.readUInt16LE(173);
    process.stdout.write(`  [${i}] status=${status} sigLen=${sigLen}   \r`);
    if (status === 1 && sigLen > 0) {
      const onChainSig = info.data.subarray(175, 175 + sigLen);
      console.log('\n\n✓ Signature stored on-chain!');
      console.log(`  status: 1 (Signed)`);
      console.log(`  signature_len: ${sigLen}`);
      console.log(`  signature: ${onChainSig.toString('hex')}`);
      console.log(`  match gRPC response: ${onChainSig.equals(Buffer.from(signature)) ? 'YES' : 'NO'}`);
      console.log(`\nexplorer: https://explorer.solana.com/address/${MESSAGE_APPROVAL_PDA}?cluster=devnet`);
      process.exit(0);
    }
  }
  console.log('\n✗ Timed out waiting for on-chain commit');
} finally {
  client.close();
}
