#!/usr/bin/env bun
/**
 * 071-verify-encrypt-policy-allowed — Verify encrypted policy rules allow on-chain
 *
 * Strategy: FRESH wallet setup (like the successful E2E runner)
 * 1. Create fresh owner + session keys
 * 2. Initialize wallet
 * 3. Set policy: maxPerRun=10 USDC, dailyCap=20 USDC
 * 4. Grant session
 * 5. Create session deposit with gas
 * 6. Create 5 USDC execution ciphertexts
 * 7. Execute graph - should ALLOW (5 <= 10 max/run and 5 <= 20 daily cap)
 */

import { readFileSync } from 'node:fs';
import { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
import {
  Chain,
  DEVNET_PRE_ALPHA_GRPC_URL,
  createEncryptClient,
} from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';
import { pollCiphertextVerified, readBoolDecryptionRequest } from '../proxy/src/lib/encrypt-ciphertext-poller';

const RPC_URL = 'https://api.devnet.solana.com';
const ENCRYPT_PROGRAM_ID = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');
const POLET_PROGRAM_ID = new PublicKey('H6hT33LKBLnN1G55iRtjmMuNMmyJagxfxsvd7jTjw5oG');
const WALLET_SEED = 'polet_wallet';
const ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';
const ENCRYPT_CONFIG_SEED = 'encrypt_config';
const ENCRYPT_EVENT_AUTHORITY_SEED = '__event_authority';
const ENCRYPT_DEPOSIT_SEED = 'encrypt_deposit';
const FHE_UINT64 = 4;
const FHE_BOOL = 0;
const USDC_SCALE = 1_000_000n;
const IDL_PATH = '/home/harkon666/Dev/hackathon/Polet-AI/contract/target/idl/contract.json';
const OWNER_FUND_LAMPORTS = 18_000_000; // 0.018 SOL: wallet/deposit/request rent + tx fees
const SESSION_FUND_LAMPORTS = 4_000_000; // 0.004 SOL: rent + graph tx fee
const DEPOSIT_GAS_TOPUP_LAMPORTS = 50_000; // 0.00005 SOL per deposit PDA

function parseUsdcBaseUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * USDC_SCALE + BigInt(fraction.padEnd(6, '0'));
}

async function main() {
  console.log('=== 071: Verify Encrypt Policy On-Chain Allowed ===\n');
  console.log('Strategy: Fresh wallet like successful E2E runner\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const idl = JSON.parse(readFileSync(IDL_PATH, 'utf8')) as anchor.Idl;

  // Fresh keys (like successful E2E)
  const owner = Keypair.generate();
  const session = Keypair.generate();
  const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8'))));

  console.log('Owner:', owner.publicKey.toString());
  console.log('Session:', session.publicKey.toString());

  // Fund
  await sendAndConfirmTransaction(connection, new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: owner.publicKey, lamports: OWNER_FUND_LAMPORTS }),
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: session.publicKey, lamports: SESSION_FUND_LAMPORTS }),
  ), [payer]);
  console.log(`Funded owner=${OWNER_FUND_LAMPORTS / LAMPORTS_PER_SOL} SOL session=${SESSION_FUND_LAMPORTS / LAMPORTS_PER_SOL} SOL.\n`);

  // PDAs
  const [walletPda] = PublicKey.findProgramAddressSync([Buffer.from(WALLET_SEED), owner.publicKey.toBuffer()], POLET_PROGRAM_ID);
  const [cpiAuthority, cpiAuthorityBump] = PublicKey.findProgramAddressSync([Buffer.from(ENCRYPT_CPI_AUTHORITY_SEED)], POLET_PROGRAM_ID);
  const [config] = PublicKey.findProgramAddressSync([Buffer.from(ENCRYPT_CONFIG_SEED)], ENCRYPT_PROGRAM_ID);
  const [eventAuthority] = PublicKey.findProgramAddressSync([Buffer.from(ENCRYPT_EVENT_AUTHORITY_SEED)], ENCRYPT_PROGRAM_ID);
  const [ownerDeposit, ownerDepositBump] = PublicKey.findProgramAddressSync([Buffer.from(ENCRYPT_DEPOSIT_SEED), owner.publicKey.toBuffer()], ENCRYPT_PROGRAM_ID);
  const [sessionDeposit, sessionDepositBump] = PublicKey.findProgramAddressSync([Buffer.from(ENCRYPT_DEPOSIT_SEED), session.publicKey.toBuffer()], ENCRYPT_PROGRAM_ID);
  const [networkEncryptionKey] = PublicKey.findProgramAddressSync([Buffer.from('network_encryption_key'), Buffer.alloc(32, 0x55)], ENCRYPT_PROGRAM_ID);

  // Get config for vault
  const configInfo = await connection.getAccountInfo(config);
  if (!configInfo) throw new Error('Encrypt config not found');
  const encVault = new PublicKey(configInfo.data.slice(100, 132));
  console.log('   Config enc_vault:', encVault.toString());
  console.log('   Config encMint:', new PublicKey(configInfo.data.slice(68, 100)).toString());

  // If enc_vault is SystemProgram.programId, pre-alpha still expects encVault (not owner as vault)
  const useSystemVault = encVault.equals(SystemProgram.programId);
  console.log('   Using system vault (no SPL tokens):', useSystemVault);
  // NOTE: Pre-alpha devnet deposit creation requires encVault as vault, not owner
  const vault = encVault;

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(owner), { commitment: 'confirmed' });
  const program = new anchor.Program(idl as anchor.Idl, provider);

  // 1. Init wallet
  console.log('1. Initializing wallet...');
  await program.methods.initialize()
    .accounts({ wallet: walletPda, owner: owner.publicKey, systemProgram: SystemProgram.programId } as any)
    .rpc();
  console.log('   Wallet:', walletPda.toString());

  // 2. Create owner deposit
  console.log('\n2. Creating owner deposit...');
  try {
    const createDepositIx = new TransactionInstruction({
      programId: ENCRYPT_PROGRAM_ID,
      keys: [
        { pubkey: ownerDeposit, isSigner: false, isWritable: true },
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: false },
        { pubkey: owner.publicKey, isSigner: true, isWritable: true },
        { pubkey: owner.publicKey, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([14]), // create_deposit disc (pre-alpha uses 14, not 13)
        Buffer.from([ownerDepositBump]),
        Buffer.alloc(8), // initialEncAmount
        Buffer.alloc(8), // initialGasAmount = 0
      ]),
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(createDepositIx), [owner], { skipPreflight: true });
    console.log('   Owner deposit created.');
  } catch (e) {
    console.log('   Owner deposit failed (may already exist):', (e as Error).message.slice(0, 80));
  }

  // 2b. Fund deposit PDA directly with lamports (bypasses gas_balance field issue)
  console.log('\n2b. Funding deposit PDA with lamports...');
  const depositFunding = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: ownerDeposit,
      lamports: DEPOSIT_GAS_TOPUP_LAMPORTS,
    })
  );
  await sendAndConfirmTransaction(connection, depositFunding, [payer]);
  console.log(`   Owner deposit funded with ${DEPOSIT_GAS_TOPUP_LAMPORTS / LAMPORTS_PER_SOL} SOL`);

  // 3. Create session deposit with gas (using session as vault if needed)
  console.log('\n3. Creating session deposit with gas...');
  // NOTE: Pre-alpha devnet deposit creation requires encVault as vault
  const vaultForSession = encVault;
  try {
    const createDepositIx = new TransactionInstruction({
      programId: ENCRYPT_PROGRAM_ID,
      keys: [
        { pubkey: sessionDeposit, isSigner: false, isWritable: true },
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: session.publicKey, isSigner: true, isWritable: false },
        { pubkey: session.publicKey, isSigner: true, isWritable: true },
        { pubkey: session.publicKey, isSigner: false, isWritable: true },
        { pubkey: vaultForSession, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([14]), // create_deposit disc (pre-alpha uses 14, not 13)
        Buffer.from([sessionDepositBump]),
        Buffer.alloc(8), // initialEncAmount
        Buffer.alloc(8), // initialGasAmount = 0
      ]),
    });
    await sendAndConfirmTransaction(connection, new Transaction().add(createDepositIx), [session], { skipPreflight: true });
    console.log('   Session deposit created.');
  } catch (e) {
    console.log('   Session deposit failed (may already exist):', (e as Error).message.slice(0, 80));
  }

  // 3b. Fund session deposit PDA directly with lamports
  console.log('\n3b. Funding session deposit PDA with lamports...');
  const sessionDepositFunding = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: sessionDeposit,
      lamports: DEPOSIT_GAS_TOPUP_LAMPORTS,
    })
  );
  await sendAndConfirmTransaction(connection, sessionDepositFunding, [payer]);
  console.log(`   Session deposit funded with ${DEPOSIT_GAS_TOPUP_LAMPORTS / LAMPORTS_PER_SOL} SOL`);

  // 5. Set policy
  console.log('\n4. Setting policy (maxPerRun=10 USDC, dailyCap=20 USDC)...');
  const encClient = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL);
  const policyInputs = [
    { value: parseUsdcBaseUnits('10'), type: FHE_UINT64 },
    { value: parseUsdcBaseUnits('20'), type: FHE_UINT64 },
    { value: 0n, type: FHE_UINT64 },
  ];
  const policyCreated = await encClient.createInput({
    chain: Chain.Solana,
    inputs: policyInputs.map((i) => ({ ciphertextBytes: Buffer.from(encryptValue(i.value, i.type)), fheType: i.type })),
    proof: Buffer.alloc(64),
    authorized: Buffer.from(POLET_PROGRAM_ID.toBytes()),
    networkEncryptionPublicKey: Buffer.alloc(32, 0x55),
  });
  const [maxPerRunPub, dailyCapPub, dailySpentPub] = policyCreated.ciphertextIdentifiers.map((id: Uint8Array) => new PublicKey(id));

  const policyCommitment = Array(32).fill(0xee);
  await program.methods.setOfficialEncryptCiphertextPolicy(policyCommitment)
    .accounts({
      wallet: walletPda, owner: owner.publicKey,
      maxPerRunCiphertext: maxPerRunPub, dailyCapCiphertext: dailyCapPub, dailySpentCiphertext: dailySpentPub,
      encryptProgram: ENCRYPT_PROGRAM_ID, config, deposit: ownerDeposit, cpiAuthority,
      program: POLET_PROGRAM_ID, networkEncryptionKey, payer: owner.publicKey,
      eventAuthority, systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
  console.log('   Policy set.');

  // 5. Grant session
  console.log('\n5. Granting session key...');
  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
  await program.methods.grantTemporalKey(session.publicKey, expiresAt)
    .accounts({ wallet: walletPda, owner: owner.publicKey } as any)
    .rpc();
  console.log('   Session granted.');

  // 6. Create 5 USDC execution ciphertexts
  console.log('\n6. Creating 5 USDC execution ciphertexts...');
  const execInputs = [
    { value: parseUsdcBaseUnits('5'), type: FHE_UINT64 },
    { value: 0n, type: FHE_BOOL },
    { value: 0n, type: FHE_UINT64 },
  ];
  const execCreated = await encClient.createInput({
    chain: Chain.Solana,
    inputs: execInputs.map((i) => ({ ciphertextBytes: Buffer.from(encryptValue(i.value, i.type)), fheType: i.type })),
    proof: Buffer.alloc(64),
    authorized: Buffer.from(POLET_PROGRAM_ID.toBytes()),
    networkEncryptionPublicKey: Buffer.alloc(32, 0x55),
  });
  const [sourceAmountPub, allowedOutputPub, dailySpentOutputPub] = execCreated.ciphertextIdentifiers.map((id: Uint8Array) => new PublicKey(id));
  console.log('   sourceAmount:', sourceAmountPub.toString());
  console.log('   Policy: maxPerRun=10 USDC, dailyCap=20 USDC, sourceAmount=5 USDC');

  // Get fresh wallet state
  const freshWallet = await (program.account as any).wallet.fetch(walletPda);
  const enc2 = freshWallet.confidentialPolicy?.encryptCiphertexts;

  // 7. Execute graph (BROADCAST - not simulate)
  console.log('\n7. Executing policy graph (BROADCASTING - checking actual on-chain behavior)...');
  const currentSlot = await connection.getSlot('confirmed');
  const sessionProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(session), { commitment: 'confirmed' });
  const sessionProgram = new anchor.Program(idl as anchor.Idl, sessionProvider);

  try {
    const txSig = await sessionProgram.methods.executeEncryptPolicyGraphAsSession(
      new anchor.BN(currentSlot),
      new anchor.BN(freshWallet.policySeq),
      cpiAuthorityBump
    )
      .accounts({
        wallet: walletPda, sessionKey: session.publicKey,
        sourceAmountCiphertext: sourceAmountPub,
        maxPerRunCiphertext: maxPerRunPub,
        dailySpentCiphertext: dailySpentPub,
        dailyCapCiphertext: dailyCapPub,
        allowedOutputCiphertext: allowedOutputPub,
        dailySpentOutputCiphertext: dailySpentOutputPub,
        encryptProgram: ENCRYPT_PROGRAM_ID, config, deposit: ownerDeposit, cpiAuthority,
        program: POLET_PROGRAM_ID, networkEncryptionKey, payer: session.publicKey,
        eventAuthority, systemProgram: SystemProgram.programId,
      } as any)
      .rpc({ skipPreflight: true });

    console.log('   Tx:', txSig);

    // Poll for verification
    console.log('\n8. Polling output ciphertexts...');
    const allowedResult = await pollCiphertextVerified(connection, allowedOutputPub, 3000, 180000);
    console.log('   allowedOutput:', allowedResult.status, '(byte:', allowedResult.statusByte, ')');
    const allowedAccount = await connection.getAccountInfo(allowedOutputPub);
    if (allowedAccount) {
      console.log('   allowedOutput data length:', allowedAccount.data.length);
      console.log('   allowedOutput bytes[98..112):', Buffer.from(allowedAccount.data.slice(98, 112)).toString('hex'));
      console.log('   allowedOutput byte[99] status:', allowedAccount.data[99] ?? 'missing');
      console.log('   allowedOutput byte[107]:', allowedAccount.data[107] ?? 'missing');
    }

    console.log('\n=== HASIL ===');
    if (allowedResult.statusByte === 0) {
      console.log('PENDING: allowedOutput is not verified yet.');
      console.log('status byte 0 means Pending, not FALSE/BLOCKED.');
    } else if (allowedResult.statusByte === 1) {
      console.log('VERIFIED: graph output ciphertext was verified.');
      console.log('status byte 1 means Verified, not TRUE/ALLOWED.');

      console.log('\n9. Requesting allowedOutput decryption...');
      const request = Keypair.generate();
      await program.methods.requestPolicyValueDecryption(3, cpiAuthorityBump)
        .accounts({
          wallet: walletPda,
          owner: owner.publicKey,
          request: request.publicKey,
          ciphertext: allowedOutputPub,
          encryptProgram: ENCRYPT_PROGRAM_ID,
          config,
          deposit: ownerDeposit,
          cpiAuthority,
          program: POLET_PROGRAM_ID,
          networkEncryptionKey,
          payer: owner.publicKey,
          eventAuthority,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([request])
        .rpc({ skipPreflight: true });
      console.log('   decryptionRequest:', request.publicKey.toString());

      console.log('\n10. Polling decryption request...');
      let requestInfo = await readBoolDecryptionRequest(connection, request.publicKey);
      const startedAt = Date.now();
      while (requestInfo.status === 'pending' && Date.now() - startedAt < 180000) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        requestInfo = await readBoolDecryptionRequest(connection, request.publicKey);
      }
      console.log('   request status:', requestInfo.status);
      console.log('   request totalLen:', requestInfo.totalLen);
      console.log('   request bytesWritten:', requestInfo.bytesWritten);
      console.log('   request boolValue:', requestInfo.boolValue);
      console.log('   expected boolValue: true');
      const requestAccount = await connection.getAccountInfo(request.publicKey);
      if (requestAccount) {
        console.log('   request data length:', requestAccount.data.length);
        console.log('   request bytes[98..112):', Buffer.from(requestAccount.data.slice(98, 112)).toString('hex'));
        console.log('   request byte[107]:', requestAccount.data[107] ?? 'missing');
      }
    } else {
      console.log('Status byte:', allowedResult.statusByte);
    }

  } catch (e) {
    const error = e as any;
    const msg = error.message || '';
    console.log('   Graph error:', msg.slice(0, 200));

    if (error.transactionLogs) {
      const logs = error.transactionLogs;
      console.log('   Logs:');
      logs.slice(0, 8).forEach((l: string) => console.log('     ', l));
    }

    if (msg.includes('0x14')) {
      console.log('\n   === ANALISIS ===');
      console.log('   ERROR 0x14 = insufficient gas');
      console.log('   Deposit exists but gas balance = 0');
      console.log('   Graph execution reaches Encrypt program (ABI correct!)');
      console.log('   Policy evaluation started but failed at gas check');
    } else if (msg.includes('0x1')) {
      console.log('\n   ERROR 0x1 = ABI bug (should not happen after fix)');
    } else if (msg.includes('Deposit not found') || msg.includes('deposit') || msg.includes('0x0')) {
      console.log('\n   === ANALISIS ===');
      console.log('   Deposit account missing or invalid');
      console.log('   This is an infrastructure issue, NOT policy evaluation failure');
    }
  }

  encClient.close();
  console.log('\n=== Test Complete ===');
}

main().catch((err) => {
  console.error('\nScript error:', err);
  process.exit(1);
});
