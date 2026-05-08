#!/usr/bin/env bun
/**
 * 059 — Official Encrypt Devnet Ciphertext Graph E2E
 *
 * Usage:
 *   bun run scripts/059-encrypt-devnet-e2e.ts <path-to-dev-wallet-keypair.json>
 *
 * What this does:
 *   1. Loads your dev wallet (for paying fees)
 *   2. Generates throwaway owner + session keypairs (never saved)
 *   3. Transfers minimal SOL from dev wallet → owner + session
 *   4. Initializes Polet wallet PDA
 *   5. Registers official Encrypt ciphertext policy using live devnet ciphertext IDs
 *   6. Grants session key
 *   7. Executes polet_policy_guardrail_graph
 *   8. Polls output ciphertexts for PENDING → VERIFIED
 *   9. Captures evidence to docs/evidence/059-official-encrypt-devnet-e2e-result.json
 *  10. Recovers remaining SOL back to dev wallet
 *
 * Safety:
 *   - Devnet only, no mainnet
 *   - Throwaway keys are never printed or saved
 *   - No private keys in evidence output
 *   - All transactions are clearly labeled
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  readCiphertextStatus,
  readEncryptInfraStatus,
  pollCiphertextVerified,
} from '../proxy/src/lib/encrypt-ciphertext-poller';

// ─── Constants ──────────────────────────────────────────────────────
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('33ubr2bpviBt5iLQgb2C6eyczFuka7uhSoxDxBnQktKY');
const WALLET_SEED = 'polet_wallet';
const ENCRYPT_PROGRAM_ID = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');
const ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';
const ENCRYPT_GRPC_URL = 'https://pre-alpha-dev-1.encrypt.ika-network.net:443';

// Live ciphertext IDs from previous evidence
const CIPHERTEXTS = {
  maxPerRun: new PublicKey('hiVdhhKSpVoN8rMf5rXtaU43LTXRH97Xc2E3odhbqmd'),
  dailyCap: new PublicKey('C1p8HE5Pn9CUd4S3ui15XPGGSCc2c8A6mQsJhpp9yrLi'),
  dailySpent: new PublicKey('AX9BKeQgSDXJcWh9EBEZnYJCr7wjwt7sM2pv945NNCVt'),
  sourceAmount: new PublicKey('4vMEY1JVHg1CGA5vTSL8o8XuRJPdwRhrG93Faf1ox5jC'),
  allowedOutput: new PublicKey('4L9sWzsiDv5VjVhUD8NQwgazjpyarAhsaBdptvQvhGPR'),
  dailySpentOutput: new PublicKey('DfBdLUx5Ut1TdWSk7GmTHENYHJisFc5YtfiyT8aT34J5'),
};

// Encrypt PDAs
const ENCRYPT_CONFIG = new PublicKey('EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3');
const ENCRYPT_NETWORK_KEY = new PublicKey('2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur');
const ENCRYPT_EVENT_AUTHORITY = new PublicKey('6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ');

// Anchor discriminators (from IDL)
const DISC_INITIALIZE = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
const DISC_GRANT_TEMPORAL_KEY = Buffer.from([152, 158, 145, 25, 124, 67, 115, 196]);
const DISC_SET_OFFICIAL_ENCRYPT = Buffer.from([46, 133, 123, 44, 247, 184, 6, 250]);
const DISC_EXECUTE_ENCRYPT_GRAPH = Buffer.from([37, 34, 20, 39, 19, 43, 189, 171]);

// SOL budget — very conservative, recovers leftovers
const OWNER_SOL = 0.015 * LAMPORTS_PER_SOL; // ~0.015 SOL for wallet PDA rent + fees
const SESSION_SOL = 0.012 * LAMPORTS_PER_SOL; // ~0.012 SOL for graph execution + encrypt deposit

// ─── Helpers ────────────────────────────────────────────────────────
function deriveWalletPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), owner.toBuffer()],
    PROGRAM_ID
  );
}

function deriveEncryptCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_CPI_AUTHORITY_SEED)],
    PROGRAM_ID
  );
}

function deriveEncryptDeposit(payer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_deposit'), payer.toBuffer()],
    ENCRYPT_PROGRAM_ID
  )[0];
}

function log(msg: string) {
  console.log(`[059-e2e] ${msg}`);
}

function encodeU64LE(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function encodeI64LE(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

// ─── Instruction Builders ───────────────────────────────────────────
function buildInitializeIx(owner: PublicKey, walletPda: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: DISC_INITIALIZE,
  });
}

function buildGrantTemporalKeyIx(
  walletPda: PublicKey,
  owner: PublicKey,
  sessionKey: PublicKey,
  expiresAt: bigint
): TransactionInstruction {
  const data = Buffer.alloc(8 + 32 + 8);
  DISC_GRANT_TEMPORAL_KEY.copy(data, 0);
  sessionKey.toBuffer().copy(data, 8);
  data.writeBigInt64LE(expiresAt, 40);
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function buildSetOfficialEncryptCiphertextPolicyIx(
  walletPda: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  policyCommitment: Buffer
): TransactionInstruction {
  const data = Buffer.alloc(8 + 32);
  DISC_SET_OFFICIAL_ENCRYPT.copy(data, 0);
  policyCommitment.copy(data, 8);

  const [cpiAuthority] = deriveEncryptCpiAuthority();
  const deposit = deriveEncryptDeposit(payer);

  return new TransactionInstruction({
    keys: [
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: CIPHERTEXTS.maxPerRun, isSigner: false, isWritable: false },
      { pubkey: CIPHERTEXTS.dailyCap, isSigner: false, isWritable: false },
      { pubkey: CIPHERTEXTS.dailySpent, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_CONFIG, isSigner: false, isWritable: false },
      { pubkey: deposit, isSigner: false, isWritable: true },
      { pubkey: cpiAuthority, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_NETWORK_KEY, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ENCRYPT_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

function buildExecuteEncryptPolicyGraphIx(
  walletPda: PublicKey,
  sessionKey: PublicKey,
  payer: PublicKey,
  attestationSlot: bigint,
  attestationPolicySeq: bigint
): TransactionInstruction {
  const [cpiAuthority, cpiAuthorityBump] = deriveEncryptCpiAuthority();
  const deposit = deriveEncryptDeposit(payer);

  const data = Buffer.alloc(8 + 8 + 8 + 1);
  DISC_EXECUTE_ENCRYPT_GRAPH.copy(data, 0);
  data.writeBigUInt64LE(attestationSlot, 8);
  data.writeBigUInt64LE(attestationPolicySeq, 16);
  data.writeUInt8(cpiAuthorityBump, 24);

  return new TransactionInstruction({
    keys: [
      { pubkey: walletPda, isSigner: false, isWritable: true },
      { pubkey: sessionKey, isSigner: true, isWritable: false },
      { pubkey: CIPHERTEXTS.sourceAmount, isSigner: false, isWritable: true },
      { pubkey: CIPHERTEXTS.maxPerRun, isSigner: false, isWritable: true },
      { pubkey: CIPHERTEXTS.dailySpent, isSigner: false, isWritable: true },
      { pubkey: CIPHERTEXTS.dailyCap, isSigner: false, isWritable: true },
      { pubkey: CIPHERTEXTS.allowedOutput, isSigner: false, isWritable: true },
      { pubkey: CIPHERTEXTS.dailySpentOutput, isSigner: false, isWritable: true },
      { pubkey: ENCRYPT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_CONFIG, isSigner: false, isWritable: true },
      { pubkey: deposit, isSigner: false, isWritable: true },
      { pubkey: cpiAuthority, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ENCRYPT_NETWORK_KEY, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ENCRYPT_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  const keypairPath = process.argv[2];
  if (!keypairPath) {
    console.error('Usage: bun run scripts/059-encrypt-devnet-e2e.ts <path-to-dev-wallet-keypair.json>');
    console.error('  The keypair file should be a JSON array of 64 bytes (Solana CLI format).');
    process.exit(1);
  }

  // Load dev wallet
  const devKeypairBytes = JSON.parse(readFileSync(resolve(keypairPath), 'utf-8'));
  const devWallet = Keypair.fromSecretKey(Uint8Array.from(devKeypairBytes));
  log(`Dev wallet: ${devWallet.publicKey.toString()}`);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check dev wallet balance
  const devBalance = await connection.getBalance(devWallet.publicKey);
  const totalNeeded = OWNER_SOL + SESSION_SOL;
  log(`Dev wallet balance: ${devBalance / LAMPORTS_PER_SOL} SOL`);
  log(`Total SOL needed:   ${totalNeeded / LAMPORTS_PER_SOL} SOL (will recover leftovers)`);

  if (devBalance < totalNeeded + 5000) {
    console.error(`Insufficient balance. Need at least ${(totalNeeded + 5000) / LAMPORTS_PER_SOL} SOL.`);
    process.exit(1);
  }

  // Generate throwaway keypairs
  const owner = Keypair.generate();
  const session = Keypair.generate();
  const [walletPda] = deriveWalletPda(owner.publicKey);
  log(`Throwaway owner:   ${owner.publicKey.toString()}`);
  log(`Throwaway session:  ${session.publicKey.toString()}`);
  log(`Wallet PDA:         ${walletPda.toString()}`);

  const evidence: Record<string, any> = {
    issue: '059-official-encrypt-devnet-ciphertext-graph-e2e',
    startedAt: new Date().toISOString(),
    cluster: 'devnet',
    solanaRpc: RPC_URL,
    encryptGrpc: ENCRYPT_GRPC_URL,
    encryptProgramId: ENCRYPT_PROGRAM_ID.toString(),
    poletProgramId: PROGRAM_ID.toString(),
    graph: 'polet_policy_guardrail_graph',
    devWallet: devWallet.publicKey.toString(),
    walletPda: walletPda.toString(),
    owner: owner.publicKey.toString(),
    sessionKey: session.publicKey.toString(),
    solBudget: { ownerLamports: OWNER_SOL, sessionLamports: SESSION_SOL, totalSol: totalNeeded / LAMPORTS_PER_SOL },
    steps: {} as Record<string, any>,
    safety: {
      noPrivateKeysIncluded: true,
      noSeedPhrasesIncluded: true,
      noWitnessBytesIncluded: true,
      noPlaintextThresholdsIncluded: true,
      devnetOnly: true,
    },
  };

  const writeEvidence = () => {
    const outPath = resolve(import.meta.dir, '../docs/evidence/059-official-encrypt-devnet-e2e-result.json');
    writeFileSync(outPath, JSON.stringify(evidence, null, 2) + '\n');
    log(`Evidence written to ${outPath}`);
  };

  try {
    // ─── Step 1: Fund throwaway keys ────────────────────────────
    log('\n=== Step 1: Funding throwaway keys ===');
    const fundTx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: devWallet.publicKey, toPubkey: owner.publicKey, lamports: OWNER_SOL }),
      SystemProgram.transfer({ fromPubkey: devWallet.publicKey, toPubkey: session.publicKey, lamports: SESSION_SOL }),
    );
    const fundSig = await sendAndConfirmTransaction(connection, fundTx, [devWallet], { commitment: 'confirmed' });
    log(`Funded. tx: ${fundSig}`);
    evidence.steps.fund = { status: 'ok', signature: fundSig, ownerSol: OWNER_SOL / LAMPORTS_PER_SOL, sessionSol: SESSION_SOL / LAMPORTS_PER_SOL };

    // ─── Step 2: Verify ciphertext accounts still exist ─────────
    log('\n=== Step 2: Verifying ciphertext accounts ===');
    const ctChecks: Record<string, any> = {};
    for (const [name, pubkey] of Object.entries(CIPHERTEXTS)) {
      const info = await readCiphertextStatus(connection, pubkey);
      ctChecks[name] = { address: info.address, exists: info.exists, owner: info.owner, status: info.status, dataLength: info.dataLength };
      log(`  ${name}: ${info.exists ? 'exists' : 'MISSING'} | owner=${info.owner} | status=${info.status}`);
      if (!info.exists) {
        evidence.steps.ciphertextCheck = { status: 'blocker', reason: `Ciphertext ${name} (${pubkey.toString()}) no longer exists on devnet`, ...ctChecks };
        evidence.status = 'blocked-ciphertext-missing';
        evidence.retryAction = 'Re-create ciphertext inputs via Encrypt gRPC client, then re-run.';
        writeEvidence();
        process.exit(1);
      }
    }
    evidence.steps.ciphertextCheck = { status: 'ok', ...ctChecks };

    // ─── Step 3: Check Encrypt infrastructure accounts ───────────
    log('\n=== Step 3: Checking Encrypt infrastructure ===');
    const ownerInfra = await readEncryptInfraStatus(connection, owner.publicKey, ENCRYPT_PROGRAM_ID);
    const sessionInfra = await readEncryptInfraStatus(connection, session.publicKey, ENCRYPT_PROGRAM_ID);
    evidence.steps.encryptInfrastructure = {
      status: ownerInfra.readyForGraphCpi && sessionInfra.readyForGraphCpi ? 'ok' : 'warning',
      ownerPayer: ownerInfra,
      sessionPayer: sessionInfra,
    };
    for (const [label, infra] of Object.entries({ owner: ownerInfra, session: sessionInfra })) {
      log(`  ${label} config enc_mint configured: ${infra.config.encMintConfigured}`);
      log(`  ${label} event_authority exists: ${infra.eventAuthority.exists}`);
      log(`  ${label} deposit exists: ${infra.deposit.exists} (${infra.deposit.address})`);
      if (infra.blockers.length > 0) {
        log(`  ${label} blockers: ${infra.blockers.join(', ')}`);
      }
    }

    // ─── Step 4: Initialize Polet wallet ────────────────────────
    log('\n=== Step 4: Initializing Polet wallet ===');
    try {
      const initIx = buildInitializeIx(owner.publicKey, walletPda);
      const initTx = new Transaction().add(initIx);
      const initSig = await sendAndConfirmTransaction(connection, initTx, [owner], { commitment: 'confirmed' });
      log(`Wallet initialized. tx: ${initSig}`);
      evidence.steps.initialize = { status: 'ok', signature: initSig };
    } catch (err: any) {
      log(`Initialize failed: ${err.message}`);
      evidence.steps.initialize = { status: 'failed', error: err.message };
      evidence.status = 'blocked-initialize-failed';
      evidence.retryAction = 'Check Polet program deployment and account size. Re-run after fix.';
      evidence.completedAt = new Date().toISOString();
      writeEvidence();
      await recoverSol(connection, [owner, session], devWallet);
      process.exit(1);
    }

    // ─── Step 5: Set official Encrypt ciphertext policy ─────────
    log('\n=== Step 5: Registering official Encrypt ciphertext policy ===');
    try {
      // Build a deterministic non-zero policy commitment (SHA-256 of ciphertext pubkeys)
      const { createHash } = await import('node:crypto');
      const policyCommitment = createHash('sha256')
        .update(CIPHERTEXTS.maxPerRun.toBuffer())
        .update(CIPHERTEXTS.dailyCap.toBuffer())
        .update(CIPHERTEXTS.dailySpent.toBuffer())
        .digest();
      const policyIx = buildSetOfficialEncryptCiphertextPolicyIx(walletPda, owner.publicKey, owner.publicKey, policyCommitment);
      const policyTx = new Transaction().add(policyIx);
      const policySig = await sendAndConfirmTransaction(connection, policyTx, [owner], { commitment: 'confirmed' });
      log(`Policy registered. tx: ${policySig}`);
      evidence.steps.setPolicy = {
        status: 'ok',
        signature: policySig,
        ciphertexts: {
          maxPerRun: CIPHERTEXTS.maxPerRun.toString(),
          dailyCap: CIPHERTEXTS.dailyCap.toString(),
          dailySpent: CIPHERTEXTS.dailySpent.toString(),
        },
      };
    } catch (err: any) {
      log(`Set policy failed: ${err.message}`);
      evidence.steps.setPolicy = { status: 'failed', error: err.message };
      evidence.status = 'blocked-set-policy-failed';
      evidence.retryAction = 'Check Encrypt config, event_authority, and owner deposit PDA. Re-run after Encrypt infra is configured.';
      evidence.completedAt = new Date().toISOString();
      writeEvidence();
      await recoverSol(connection, [owner, session], devWallet);
      process.exit(1);
    }

    // ─── Step 6: Grant session key ──────────────────────────────
    log('\n=== Step 6: Granting session key ===');
    try {
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
      const grantIx = buildGrantTemporalKeyIx(walletPda, owner.publicKey, session.publicKey, expiresAt);
      const grantTx = new Transaction().add(grantIx);
      const grantSig = await sendAndConfirmTransaction(connection, grantTx, [owner], { commitment: 'confirmed' });
      log(`Session granted. tx: ${grantSig}`);
      evidence.steps.grantSession = { status: 'ok', signature: grantSig, expiresAt: Number(expiresAt) };
    } catch (err: any) {
      log(`Grant session failed: ${err.message}`);
      evidence.steps.grantSession = { status: 'failed', error: err.message };
      evidence.status = 'blocked-grant-session-failed';
      evidence.completedAt = new Date().toISOString();
      writeEvidence();
      await recoverSol(connection, [owner, session], devWallet);
      process.exit(1);
    }

    // ─── Step 7: Execute policy guardrail graph ─────────────────
    log('\n=== Step 7: Executing polet_policy_guardrail_graph ===');
    let graphSig = '';
    try {
      const currentSlot = await connection.getSlot();
      const graphIx = buildExecuteEncryptPolicyGraphIx(
        walletPda,
        session.publicKey,
        session.publicKey, // session pays encrypt fees
        BigInt(currentSlot),
        1n, // policy sequence = 1 (first policy)
      );
      const graphTx = new Transaction().add(graphIx);
      graphSig = await sendAndConfirmTransaction(connection, graphTx, [session], { commitment: 'confirmed' });
      log(`Graph executed. tx: ${graphSig}`);
      evidence.steps.executeGraph = {
        status: 'ok',
        signature: graphSig,
        graphStatus: 'pending-encrypt-execution',
        inputCiphertexts: {
          sourceAmount: CIPHERTEXTS.sourceAmount.toString(),
          maxPerRun: CIPHERTEXTS.maxPerRun.toString(),
          dailySpent: CIPHERTEXTS.dailySpent.toString(),
          dailyCap: CIPHERTEXTS.dailyCap.toString(),
        },
        pendingOutputCiphertexts: {
          allowedOutput: CIPHERTEXTS.allowedOutput.toString(),
          dailySpentOutput: CIPHERTEXTS.dailySpentOutput.toString(),
        },
      };
    } catch (err: any) {
      log(`Graph execution failed: ${err.message}`);
      // Try to extract logs
      let logs: string[] = [];
      if (err.logs) logs = err.logs;
      evidence.steps.executeGraph = {
        status: 'failed',
        error: err.message,
        logs: logs.length > 0 ? logs : undefined,
      };
      evidence.status = 'blocked-graph-execution-failed';
      const graphInfra = await readEncryptInfraStatus(connection, session.publicKey, ENCRYPT_PROGRAM_ID);
      evidence.steps.executeGraphInfraAtFailure = graphInfra;
      evidence.retryAction = graphInfra.blockers.length > 0
        ? `Fix Encrypt infra blockers for session payer: ${graphInfra.blockers.join(', ')}. Then re-run this script.`
        : 'Encrypt infrastructure preflight passed; inspect transaction logs and Encrypt program error mapping before retrying.';
      evidence.completedAt = new Date().toISOString();
      writeEvidence();
      await recoverSol(connection, [owner, session], devWallet);
      process.exit(1);
    }

    // ─── Step 8: Poll for executor verification ─────────────────
    log('\n=== Step 8: Polling for executor verification (up to 120s) ===');
    const [allowedResult, dailySpentResult] = await Promise.all([
      pollCiphertextVerified(connection, CIPHERTEXTS.allowedOutput, 5_000, 120_000),
      pollCiphertextVerified(connection, CIPHERTEXTS.dailySpentOutput, 5_000, 120_000),
    ]);

    evidence.steps.executorVerification = {
      allowedOutput: {
        address: allowedResult.address,
        status: allowedResult.status,
        timedOut: allowedResult.timedOut,
        pollDurationMs: allowedResult.pollDurationMs,
        digest: allowedResult.digest,
      },
      dailySpentOutput: {
        address: dailySpentResult.address,
        status: dailySpentResult.status,
        timedOut: dailySpentResult.timedOut,
        pollDurationMs: dailySpentResult.pollDurationMs,
        digest: dailySpentResult.digest,
      },
    };

    if (allowedResult.status === 'verified' && dailySpentResult.status === 'verified') {
      log('✅ Both outputs verified by executor!');
      evidence.status = 'encrypt-verified-complete';
      evidence.lifecycle = 'encrypt-verified-allowed'; // 5 USDC scenario = allowed
    } else if (allowedResult.timedOut || dailySpentResult.timedOut) {
      log('⏳ Executor verification timed out (120s). Recording as pending.');
      evidence.status = 'executor-verification-pending';
      evidence.retryAction = 'The off-chain executor may be delayed or down. Re-poll output ciphertext accounts later, or re-run the graph.';
    } else {
      log(`Output statuses: allowed=${allowedResult.status}, dailySpent=${dailySpentResult.status}`);
      evidence.status = 'partial-verification';
    }

    evidence.completedAt = new Date().toISOString();
    evidence.graphSignature = graphSig;
    evidence.explorerUrl = `https://explorer.solana.com/tx/${graphSig}?cluster=devnet`;

  } catch (err: any) {
    log(`Unexpected error: ${err.message}`);
    evidence.status = 'unexpected-error';
    evidence.error = err.message;
    evidence.completedAt = new Date().toISOString();
  }

  writeEvidence();

  // ─── Step 9: Recover SOL ──────────────────────────────────────
  log('\n=== Step 9: Recovering SOL to dev wallet ===');
  await recoverSol(connection, [owner, session], devWallet);

  log('\n=== Done ===');
  log(`Final status: ${evidence.status}`);
}

async function recoverSol(connection: Connection, sources: Keypair[], destination: Keypair) {
  for (const source of sources) {
    try {
      const balance = await connection.getBalance(source.publicKey);
      if (balance <= 5000) {
        log(`  ${source.publicKey.toString().slice(0, 8)}... balance too low to recover (${balance} lamports)`);
        continue;
      }
      const recoverAmount = balance - 5000; // leave 5000 lamports for tx fee
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: source.publicKey,
          toPubkey: destination.publicKey,
          lamports: recoverAmount,
        })
      );
      const sig = await sendAndConfirmTransaction(connection, tx, [source], { commitment: 'confirmed' });
      log(`  Recovered ${recoverAmount / LAMPORTS_PER_SOL} SOL from ${source.publicKey.toString().slice(0, 8)}... tx: ${sig}`);
    } catch (err: any) {
      log(`  Recovery from ${source.publicKey.toString().slice(0, 8)}... failed: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
