#!/usr/bin/env bun
/**
 * 066-debug-deposit — Verify Encrypt Deposit State
 *
 * Usage:
 *   bun run scripts/066-debug-deposit.ts <wallet_owner_pubkey>
 *
 * What this does:
 *   1. Derives all Encrypt PDAs for the given owner
 *   2. Checks deposit account exists and data length
 *   3. Verifies config and event_authority
 *   4. Reports blockers if any
 *
 * Example:
 *   bun run scripts/066-debug-deposit.ts 4v9ZgtMNYKvKxBRewpXQPcPPHnCHDC1ZWDL2jac3YWWt
 */

import { Connection, PublicKey } from '@solana/web3.js';

// ─── Constants ──────────────────────────────────────────────────────
const RPC_URL = 'https://api.devnet.solana.com';
const ENCRYPT_PROGRAM_ID = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');

// Encrypt PDA seeds
const ENCRYPT_CONFIG_SEED = 'encrypt_config';
const ENCRYPT_EVENT_AUTHORITY_SEED = '__event_authority';
const ENCRYPT_DEPOSIT_SEED = 'encrypt_deposit';

// Polet CPI authority (for cross-check)
const POLET_PROGRAM_ID = new PublicKey('H6hT33LKBLnN1G55iRtjmMuNMmyJagxfxsvd7jTjw5oG');
const POLET_ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';

// ─── Helpers ────────────────────────────────────────────────────────
function deriveEncryptConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_CONFIG_SEED)],
    ENCRYPT_PROGRAM_ID
  );
}

function deriveEncryptEventAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_EVENT_AUTHORITY_SEED)],
    ENCRYPT_PROGRAM_ID
  );
}

function deriveEncryptDepositPda(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_DEPOSIT_SEED), ownerPubkey.toBuffer()],
    ENCRYPT_PROGRAM_ID
  );
}

function derivePoletEncryptCpiAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POLET_ENCRYPT_CPI_AUTHORITY_SEED)],
    POLET_PROGRAM_ID
  );
}

function log(label: string, value: any) {
  console.log(`  ${label}: ${value}`);
}

function logResult(label: string, value: any, status: 'ok' | 'warn' | 'error') {
  const symbol = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
  console.log(`  ${symbol} ${label}: ${value}`);
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const ownerArg = process.argv[2];
  if (!ownerArg) {
    console.error('Usage: bun run scripts/066-debug-deposit.ts <wallet_owner_pubkey>');
    console.error('  Example: bun run scripts/066-debug-deposit.ts 4v9ZgtMNYKvKxBRewpXQPcPPHnCHDC1ZWDL2jac3YWWt');
    process.exit(1);
  }

  console.log('\n=== Encrypt Deposit State Verification ===\n');

  let ownerPubkey: PublicKey;
  try {
    ownerPubkey = new PublicKey(ownerArg);
  } catch {
    console.error(`Invalid public key: ${ownerArg}`);
    process.exit(1);
  }

  console.log(`Owner: ${ownerPubkey.toString()}\n`);

  // Derive PDAs
  const [configPda] = deriveEncryptConfigPda();
  const [eventAuthorityPda] = deriveEncryptEventAuthorityPda();
  const [depositPda, depositBump] = deriveEncryptDepositPda(ownerPubkey);
  const [poletCpiAuthority] = derivePoletEncryptCpiAuthorityPda();

  console.log('Derived PDAs:');
  log('Config', configPda.toString());
  log('Event Authority', eventAuthorityPda.toString());
  log('Deposit', depositPda.toString());
  log('Deposit bump', depositBump);
  log('Polet CPI Authority', poletCpiAuthority.toString());
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check all accounts in parallel
  console.log('Checking accounts on-chain...\n');

  const [configInfo, eventAuthorityInfo, depositInfo, ownerInfo] = await Promise.all([
    connection.getAccountInfo(configPda),
    connection.getAccountInfo(eventAuthorityPda),
    connection.getAccountInfo(depositPda),
    connection.getAccountInfo(ownerPubkey),
  ]);

  // Verify config
  console.log('── Config Account ──');
  if (!configInfo) {
    logResult('Config', 'NOT FOUND on-chain', 'error');
  } else {
    logResult('Config', 'exists', 'ok');
    log('  Owner', configInfo.owner.toString());
    log('  Data length', configInfo.data.length);

    // Read encVault from config (bytes 100-132)
    if (configInfo.data.length >= 132) {
      const encVault = new PublicKey(configInfo.data.slice(100, 132));
      log('  encVault (bytes 100-132)', encVault.toString());
    } else {
      logResult('Config data', `too short (${configInfo.data.length} bytes, expected >=132)`, 'warn');
    }
  }

  // Verify event authority
  console.log('\n── Event Authority Account ──');
  if (!eventAuthorityInfo) {
    logResult('Event Authority', 'NOT FOUND on-chain', 'error');
  } else {
    logResult('Event Authority', 'exists', 'ok');
    log('  Owner', eventAuthorityInfo.owner.toString());
    log('  Data length', eventAuthorityInfo.data.length);
    log('  executable', eventAuthorityInfo.executable);
  }

  // Verify deposit
  console.log('\n── Deposit Account ──');
  if (!depositInfo) {
    logResult('Deposit', 'NOT FOUND on-chain', 'error');
    console.log('\n  ⚠ ACTION NEEDED: Create deposit first!');
    console.log('    Run: curl -X POST http://localhost:3000/api/wallet/create-encrypt-deposit');
    console.log('    Or use frontend to create deposit for this owner');
  } else {
    logResult('Deposit', 'exists', 'ok');
    log('  Owner', depositInfo.owner.toString());
    log('  Data length', depositInfo.data.length);
    log('  Lamports', depositInfo.lamports);

    // Verify deposit is owned by encrypt program
    if (depositInfo.owner.toString() === ENCRYPT_PROGRAM_ID.toString()) {
      logResult('Deposit owner', 'correct (Encrypt program)', 'ok');
    } else {
      logResult('Deposit owner', `WRONG (expected: ${ENCRYPT_PROGRAM_ID})`, 'error');
    }

    // Check if deposit has correct data length (deposit accounts typically have specific size)
    if (depositInfo.data.length > 0) {
      logResult('Deposit data', `initialized (${depositInfo.data.length} bytes)`, 'ok');

      // Try to read deposit bump (first byte if available)
      if (depositInfo.data.length >= 1) {
        log('  Stored bump', depositInfo.data[0]);
        if (depositInfo.data[0] === depositBump) {
          logResult('Bump match', 'correct', 'ok');
        } else {
          logResult('Bump match', `mismatch (stored: ${depositInfo.data[0]}, derived: ${depositBump})`, 'warn');
        }
      }
    } else {
      logResult('Deposit data', 'EMPTY (may need re-creation)', 'warn');
    }
  }

  // Verify owner account exists
  console.log('\n── Owner Account ──');
  if (!ownerInfo) {
    logResult('Owner', 'NOT FOUND on-chain', 'error');
  } else {
    logResult('Owner', 'exists', 'ok');
    log('  Lamports', ownerInfo.lamports);
    log('  executable', ownerInfo.executable);
    if (ownerInfo.lamports < 1000000) {
      logResult('Owner balance', `LOW (${ownerInfo.lamports / 1e9} SOL)`, 'warn');
    }
  }

  // Summary and recommendations
  console.log('\n=== Summary ===\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!configInfo) issues.push('Config account missing');
  if (!eventAuthorityInfo) issues.push('Event Authority missing');
  if (!depositInfo) issues.push('Deposit account missing');
  if (depositInfo && depositInfo.owner.toString() !== ENCRYPT_PROGRAM_ID.toString()) {
    issues.push('Deposit owned by wrong program');
  }
  if (ownerInfo && ownerInfo.lamports < 1000000) {
    warnings.push('Owner balance low');
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('  ✓ All accounts verified successfully!');
    console.log('\n  If you still get requesterMismatch error:');
    console.log('    1. The issue may be in the Encrypt program (devnet version mismatch)');
    console.log('    2. Try creating a NEW deposit (close old one first if possible)');
    console.log('    3. Or use mock_encrypt for development');
  } else {
    if (issues.length > 0) {
      console.log('  ✗ Issues found:');
      issues.forEach((issue) => console.log(`    - ${issue}`));
    }
    if (warnings.length > 0) {
      console.log('  ⚠ Warnings:');
      warnings.forEach((warn) => console.log(`    - ${warn}`));
    }

    console.log('\n  Recommended actions:');
    if (!depositInfo) {
      console.log('    1. Create deposit via frontend or proxy API');
      console.log('    2. Then retry the policy reveal');
    }
  }

  // Debug: Show what the decrypt request account would look like
  console.log('\n=== Debug Info ===\n');
  console.log('When calling requestPolicyValueDecryption:');
  console.log(`  Request account will be created at a new keypair pubkey`);
  console.log(`  Deposit PDA: ${depositPda.toString()}`);
  console.log(`  Owner (signer): ${ownerPubkey.toString()}`);
  console.log(`  CPI Authority: ${poletCpiAuthority.toString()}`);
  console.log('');
  console.log('If requesterMismatch persists, it means the Encrypt program');
  console.log('is rejecting the request — likely due to internal validation');
  console.log('that the request account has wrong requester pubkey.');
  console.log('');
  console.log('This could happen if:');
  console.log('  1. The encrypt deposit has incorrect state');
  console.log('  2. Config/event_authority mismatch between Polet and Encrypt devnet');
  console.log('  3. Encrypt program version on devnet expects different data format');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});