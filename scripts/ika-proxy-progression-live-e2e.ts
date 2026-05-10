/**
 * Live-devnet smoke test for the refactored `progressIkaLifecycle`.
 *
 * Unlike `scripts/ika-fresh-sign-e2e-v2.ts` which bypasses the proxy and
 * talks to Ika gRPC directly, this script exercises the PROXY code path:
 *   1. Fresh DKG via @ika.xyz/pre-alpha-solana-client (same as managed fixture)
 *   2. approve_message via direct signer path (owner is dWallet authority)
 *   3. Call `progressIkaLifecycle` with real deps (Polet IkaGrpcClient,
 *      real Connection, real registry) — the function now uses the local
 *      hand-rolled BCS presign+sign path with session_identifier_preimage=0s
 *      and real attestation.
 *   4. Poll MessageApproval for CommitSignature on-chain.
 *
 * If this prints "signature-committed" we have proof the Polet proxy can
 * complete the full Ika lifecycle (step 5 of Ika docs) in production code,
 * not just a one-off script.
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
  bytesToHex,
  DWALLET_CURVE,
  IKA_DWALLET_PROGRAM_ID,
  IKA_PREALPHA_GRPC_URL,
  MESSAGE_APPROVAL_LAYOUT,
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

console.log('funder:', funder.publicKey.toBase58());
console.log('owner :', owner.publicKey.toBase58());

// ── Fund owner if needed ──────────────────────────────────────
{
  const balance = await conn.getBalance(owner.publicKey);
  if (balance < 50_000_000) {
    console.log('funding owner...');
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

// ── 1. Fresh DKG via official client (matches managed fixture path) ──
console.log('\n1. DKG via gRPC...');
const ikaOfficialClient = createIkaClient(IKA_PREALPHA_GRPC_URL);
const dkgResult = await ikaOfficialClient.requestDKG(owner.publicKey.toBytes());
ikaOfficialClient.close();
const dwalletPk = new Uint8Array(dkgResult.publicKey);
console.log('   dwallet pk:', Buffer.from(dwalletPk).toString('hex'));

// Derive dWallet PDA
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
console.log('   dwallet PDA:', dwalletPda.toBase58());

// Poll for CommitDWallet
for (let i = 0; i < 60; i += 1) {
  const info = await conn.getAccountInfo(dwalletPda);
  if (info) break;
  await new Promise((r) => setTimeout(r, 1500));
}

// ── 2. approve_message (signer path — owner = authority) ──────
console.log('\n2. approve_message...');
const message = Buffer.from(
  'polet-proxy-lifecycle-smoke-' + Date.now().toString(),
  'utf-8',
);
const messageDigest = Buffer.from(keccak_256(message));
const schemeLe = Buffer.alloc(2);
schemeLe.writeUInt16LE(SCHEME_EDDSA, 0);
const maSeeds = [...dwalletSeeds, MESSAGE_APPROVAL_SEED, schemeLe, messageDigest];
const [messageApprovalPda, maBump] = PublicKey.findProgramAddressSync(
  maSeeds,
  IKA_PROGRAM,
);
const [coordinatorPda] = PublicKey.findProgramAddressSync(
  [COORDINATOR_SEED],
  IKA_PROGRAM,
);

const ixData = Buffer.alloc(100);
ixData[0] = 8; // IX_APPROVE_MESSAGE
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

// ── 3. progressIkaLifecycle via PROXY code path ───────────────
console.log('\n3. progressIkaLifecycle (production code path)...');
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

// Minimal synthetic IkaBridgelessExecutionRequest. The progression function
// only reads a subset of fields: preAlphaSigning.messageApprovalPda,
// ikaMessageHash, target.chain, sessionContext.owner.
const ikaRequest: IkaBridgelessExecutionRequest = {
  executionRail: 'ika-bridgeless',
  intentStrategy: 'dca',
  settlement: 'not-executed',
  requestId: 'polet-proxy-smoke-' + Date.now().toString(),
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
  executionBoundary: { status: 'approval-transaction-prepared', note: 'smoke' },
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
      note: 'Polet proxy smoke',
    },
  },
} as IkaBridgelessExecutionRequest;

const result = await progressIkaLifecycle(
  {
    ikaRequest,
    approvalTransactionSignature: approveSig, // base58 string, now properly decoded
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
      grantedSlot: 0,
      lastRevokedSlot: 0,
    },
    readLatestRevokedSlot: async () => 0,
    polling: { timeoutMs: 60_000, intervalMs: 2_000 },
    messageOverride: new Uint8Array(message),
  },
  {
    connection: conn,
    grpcClient,
    registry,
    // Bypass the gas-deposit floor gate for the smoke test. Production uses
    // the real `readIkaGasDepositStatus` which reads the GasDeposit PDA.
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
  console.log('\n✅ LIFECYCLE SUCCEEDED');
  console.log('   status         :', result.lifecycleStatus);
  console.log('   dwallet PDA    :', result.produced.dwalletAccount);
  console.log('   MA PDA         :', result.produced.messageApprovalPda);
  console.log('   signature      :', result.produced.signatureHex);
  console.log('   messageDigest  :', result.produced.messageDigestHex);
  console.log('   attempted steps:', result.attemptedSteps.join(' → '));
  console.log(
    '\n   explorer (MA): https://explorer.solana.com/address/' +
      result.produced.messageApprovalPda +
      '?cluster=devnet',
  );
  console.log(
    '   explorer (dW): https://explorer.solana.com/address/' +
      result.produced.dwalletAccount +
      '?cluster=devnet',
  );
  console.log(
    '   approve tx   : https://explorer.solana.com/tx/' + approveSig + '?cluster=devnet',
  );
  process.exit(0);
} else {
  console.log('\n❌ LIFECYCLE FAILED');
  console.log('   status :', result.status);
  console.log('   code   :', result.code);
  console.log('   reason :', result.reason);
  console.log('   steps  :', result.attemptedSteps.join(' → '));
  process.exit(1);
}

void bytesToHex;
void MESSAGE_APPROVAL_LAYOUT;
