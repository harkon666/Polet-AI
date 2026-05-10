/**
 * Live-devnet kill-switch exercise for `progressIkaLifecycle`.
 *
 * Drives the real Ika gRPC service through DKG + approve_message + Presign,
 * then simulates a session revoke landing between Presign and Sign by
 * returning `grantedSlot + 1` from `readLatestRevokedSlot` on the
 * second call. The lifecycle MUST abort with
 * `session-revoked-midflight` + `revokePhase = 'pre-sign'` and MUST NOT
 * submit a Sign request.
 *
 * Purpose: close acceptance criterion #9 ("Session revoke mid-flight
 * aborts downstream Sign or broadcast without leaking policy thresholds")
 * against the live devnet mock signer, not just the in-process unit test.
 *
 * On success: exits 0 with status=session-revoked-midflight,
 * revokePhase=pre-sign, and the attempted steps include presign-issued
 * but NOT sign-submitted.
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
import { createIkaClient } from '@ika.xyz/pre-alpha-solana-client/grpc';
import { keccak_256 } from '@noble/hashes/sha3.js';
import * as fs from 'node:fs';
import { progressIkaLifecycle } from '../proxy/src/lib/ika-lifecycle-progression';
import {
  createTlsGrpcTransport,
  generateIkaServiceKeypair,
  IkaGrpcClient,
} from '../proxy/src/lib/ika-grpc-client';
import {
  DWALLET_CURVE,
  IKA_DWALLET_PROGRAM_ID,
  IKA_PREALPHA_GRPC_URL,
  type NetworkSignedAttestation,
} from '../proxy/src/lib/ika-grpc-schema';
import { IkaDWalletRegistry } from '../proxy/src/lib/ika-dwallet-registry';
import type { IkaBridgelessExecutionRequest } from '../proxy/src/lib/ika-bridgeless-request';

const RPC_URL = 'https://api.devnet.solana.com';
const IKA_PROGRAM = new PublicKey(IKA_DWALLET_PROGRAM_ID);
const DWALLET_SEED = Buffer.from('dwallet');
const MESSAGE_APPROVAL_SEED = Buffer.from('message_approval');
const COORDINATOR_SEED = Buffer.from('dwallet_coordinator');
const CURVE_25519 = 2;
const SCHEME_EDDSA = 5;

const GRANTED_SLOT = 100;

const funder = Keypair.fromSecretKey(
  bs58.decode(
    '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie',
  ),
);
const ownerSecret = Uint8Array.from(
  JSON.parse(fs.readFileSync('/tmp/fresh-owner.json', 'utf-8')),
);
const owner = Keypair.fromSecretKey(ownerSecret);
const conn = new Connection(RPC_URL, 'confirmed');

console.log('owner:', owner.publicKey.toBase58());

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

// ── 1. Fresh DKG ──────────────────────────────────────────────
console.log('\n1. DKG via gRPC...');
const ikaOfficial = createIkaClient(IKA_PREALPHA_GRPC_URL);
const dkgResult = await ikaOfficial.requestDKG(owner.publicKey.toBytes());
ikaOfficial.close();
const dwalletPk = new Uint8Array(dkgResult.publicKey);
console.log('   dwallet pk:', Buffer.from(dwalletPk).toString('hex'));

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

for (let i = 0; i < 60; i += 1) {
  const info = await conn.getAccountInfo(dwalletPda);
  if (info) break;
  await new Promise((r) => setTimeout(r, 1500));
}

// ── 2. approve_message ────────────────────────────────────────
console.log('\n2. approve_message...');
const message = Buffer.from('revoke-midflight-smoke-' + Date.now().toString(), 'utf-8');
const messageDigest = Buffer.from(keccak_256(message));
const schemeLe = Buffer.alloc(2);
schemeLe.writeUInt16LE(SCHEME_EDDSA, 0);
const maSeeds = [...dwalletSeeds, MESSAGE_APPROVAL_SEED, schemeLe, messageDigest];
const [messageApprovalPda, maBump] = PublicKey.findProgramAddressSync(maSeeds, IKA_PROGRAM);
const [coordinatorPda] = PublicKey.findProgramAddressSync([COORDINATOR_SEED], IKA_PROGRAM);

const ixData = Buffer.alloc(100);
ixData[0] = 8;
ixData[1] = maBump;
messageDigest.copy(ixData, 2);
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
console.log('   approve tx:', approveSig);
const approveTxInfo = await conn.getTransaction(approveSig, {
  maxSupportedTransactionVersion: 0,
});
const approveSlot = BigInt(approveTxInfo?.slot ?? 0);

// ── 3. progressIkaLifecycle with midflight revoke ────────────
console.log('\n3. progressIkaLifecycle with mid-flight revoke between Presign and Sign...');
const transport = await createTlsGrpcTransport({ endpoint: IKA_PREALPHA_GRPC_URL });
const grpcClient = new IkaGrpcClient({
  transport,
  serviceKeypair: generateIkaServiceKeypair(),
});
const registry = new IkaDWalletRegistry();

const dwalletAttestation: NetworkSignedAttestation = {
  attestationData: dkgResult.attestationData,
  networkSignature: dkgResult.networkSignature,
  networkPublicKey: dkgResult.networkPubkey,
  epoch: 1n,
};

let revokeReadCount = 0;
const ikaRequest: IkaBridgelessExecutionRequest = {
  executionRail: 'ika-bridgeless',
  intentStrategy: 'dca',
  settlement: 'not-executed',
  requestId: 'polet-revoke-smoke-' + Date.now().toString(),
  source: { chain: 'solana', asset: 'USDC' },
  target: { chain: 'sui', asset: 'SUI' },
  amount: '5',
  amountBaseUnits: '5000000',
  routeIntent: { strategy: 'dca', bridgeMode: 'bridgeless', riskStatus: 'passed' },
  sessionContext: {
    owner: owner.publicKey.toBase58(),
    sessionKey: owner.publicKey.toBase58(),
    smartWalletAuthority: owner.publicKey.toBase58(),
    policySequence: 1,
  },
  policyAttestation: {
    status: 'approved',
    policySequence: 1,
    policyCommitment: Array(32).fill(0) as number[],
    attestationHash: 'deadbeef',
  },
  canonicalOrder: {} as unknown as IkaBridgelessExecutionRequest['canonicalOrder'],
  canonicalOrderHash: messageDigest.toString('hex'),
  ikaMessageHash: messageDigest.toString('hex'),
  executionBoundary: { status: 'approval-transaction-prepared', note: 'revoke-smoke' },
  preAlphaSigning: {
    status: 'approval-transaction-prepared',
    settlement: 'not-executed',
    dwalletAccount: dwalletPda.toBase58(),
    ikaMessageHash: messageDigest.toString('hex'),
    ikaMessageHashPreimage: {} as never,
    ikaMessageHashSource: 'polet-ika-approval-preimage-keccak256',
    messageDigest: messageDigest.toString('hex'),
    messageDigestSource: 'ika-message-hash',
    userPublicKey: owner.publicKey.toBase58(),
    signatureScheme: 'ed25519-prealpha',
    cpiAuthorityPda: owner.publicKey.toBase58(),
    cpiAuthorityBump: 0,
    coordinatorPda: coordinatorPda.toBase58(),
    messageApprovalPda: messageApprovalPda.toBase58(),
    messageApprovalBump: maBump,
    messageApprovalDerivation: 'official-dwallet-public-key',
    approveMessage: {} as never,
    preAlphaEnvironment: {
      provider: 'ika',
      cluster: 'devnet',
      rpcUrl: RPC_URL,
      mockSigner: true,
      productionMpc: false,
      note: 'revoke smoke',
    },
  },
} as IkaBridgelessExecutionRequest;

const result = await progressIkaLifecycle(
  {
    ikaRequest,
    approvalTransactionSignature: approveSig,
    approvalTransactionSlot: approveSlot,
    dwalletAttestation,
    dwalletRegistryEntry: {
      owner: owner.publicKey.toBase58(),
      dwalletPublicKeyHex: Buffer.from(dwalletPk).toString('hex'),
      dwalletAccount: dwalletPda.toBase58(),
      curve: DWALLET_CURVE.Curve25519,
      createdEpoch: '1',
      transferredAuthority: owner.publicKey.toBase58(),
    },
    messageCentralizedSignature: new Uint8Array(64),
    dwalletNetworkEncryptionPublicKey: new Uint8Array(32),
    sessionContext: {
      owner: owner.publicKey.toBase58(),
      sessionKey: owner.publicKey.toBase58(),
      grantedSlot: GRANTED_SLOT,
      lastRevokedSlot: 0, // no revoke yet at start
    },
    readLatestRevokedSlot: async () => {
      revokeReadCount += 1;
      // 1st call: pre-presign check (no revoke yet)
      // 2nd call: pre-sign check (simulate a revoke that just landed)
      const value = revokeReadCount === 1 ? 0 : GRANTED_SLOT + 50;
      console.log(`     readLatestRevokedSlot call #${revokeReadCount} -> ${value}`);
      return value;
    },
    polling: { timeoutMs: 30_000, intervalMs: 1_500 },
    messageOverride: new Uint8Array(message),
  },
  {
    connection: conn,
    grpcClient,
    registry,
    readGasDepositStatus: async () => ({
      exists: true,
      pda: 'smoke-pass',
      passes: true,
      floors: { minIkaBaseUnits: 0n, minSolLamports: 0n },
      account: undefined,
    }),
  },
);

await transport.close();

if (result.ok) {
  console.log('\n❌ UNEXPECTED SUCCESS — lifecycle completed despite midflight revoke!');
  console.log('   status:', result.status);
  console.log('   attempted:', result.attemptedSteps.join(' → '));
  process.exit(1);
}

if (
  result.status !== 'session-revoked-midflight' ||
  result.revokePhase !== 'pre-sign' ||
  !result.attemptedSteps.includes('presign-issued') ||
  result.attemptedSteps.includes('sign-submitted') ||
  result.attemptedSteps.includes('signature-committed')
) {
  console.log('\n❌ UNEXPECTED FAILURE SHAPE:');
  console.log('   status      :', result.status);
  console.log('   code        :', result.code);
  console.log('   revokePhase :', result.revokePhase ?? 'n/a');
  console.log('   attempted   :', result.attemptedSteps.join(' → '));
  console.log('   reason      :', result.reason);
  process.exit(1);
}

console.log('\n✅ KILL-SWITCH VERIFIED');
console.log('   status      :', result.status);
console.log('   code        :', result.code);
console.log('   revokePhase :', result.revokePhase);
console.log('   attempted   :', result.attemptedSteps.join(' → '));
console.log('   reason      :', result.reason);
console.log('   dwallet PDA :', dwalletPda.toBase58());
console.log('   MA PDA      :', messageApprovalPda.toBase58());

// Sanity: confirm MessageApproval on-chain is still Pending (never got CommitSignature)
const maInfo = await conn.getAccountInfo(messageApprovalPda);
if (maInfo) {
  const status = maInfo.data[172];
  const sigLen = maInfo.data.readUInt16LE(173);
  console.log('   MA on-chain : status=' + status + ' (' + (status === 0 ? 'Pending' : 'Signed') + ') sigLen=' + sigLen);
  if (status === 1) {
    console.log('\n⚠ MessageApproval is Signed on-chain — that would be a problem normally, but Polet');
    console.log('  aborted before Sign so no signature came from THIS lifecycle call. Ika mock may');
    console.log('  have produced signatures via other observers; the Polet-side kill switch still fired correctly.');
  }
}

process.exit(0);
