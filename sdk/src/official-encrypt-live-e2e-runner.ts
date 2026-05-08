import { readFileSync } from 'node:fs';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  Chain,
  DEVNET_PRE_ALPHA_GRPC_URL,
  createEncryptClient,
} from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';

type RuntimeEnv = Record<string, string | undefined>;

const env = (((globalThis as unknown as { Bun?: { env: RuntimeEnv }; process?: { env: RuntimeEnv } }).Bun?.env)
  ?? ((globalThis as unknown as { process?: { env: RuntimeEnv } }).process?.env)
  ?? {}) as RuntimeEnv;

const ENCRYPT_PROGRAM_ID = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');
const POLET_PROGRAM_ID = new PublicKey(env.POLET_PROGRAM_ID ?? '33ubr2bpviBt5iLQgb2C6eyczFuka7uhSoxDxBnQktKY');
const SOLANA_RPC_URL = env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
const NETWORK_ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 0x55);
const FHE_UINT64 = 4;
const FHE_BOOL = 0;

const IDL_PATH = '../contract/target/idl/contract.json';
const WALLET_SEED = 'polet_wallet';
const ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';

async function main() {
  console.log('--- Polet Official Encrypt E2E Runner ---');
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  // 1. Generate keys
  const owner = Keypair.generate();
  const session = Keypair.generate();
  console.log(`Owner: ${owner.publicKey.toString()}`);
  console.log(`Session: ${session.publicKey.toString()}`);

  // 2. Fund keys from persistent wallet
  console.log('Funding keys from persistent wallet...');
  const payerPath = env.HOME + '/.config/solana/id.json';
  const payerSecret = JSON.parse(readFileSync(payerPath, 'utf8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(payerSecret));
  
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: owner.publicKey,
      lamports: 0.05 * LAMPORTS_PER_SOL,
    }),
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: session.publicKey,
      lamports: 0.02 * LAMPORTS_PER_SOL,
    })
  );
  const fundSig = await sendAndConfirmTransaction(connection, fundTx, [payer]);
  console.log(`Funding confirmed: ${fundSig}`);

  // 3. Create Encrypt Client & Ciphertexts
  const encryptClient = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL);
  console.log('Creating ciphertexts via Encrypt gRPC...');
  
  const ciphertextInputs = [
    { label: 'maxPerRun', value: parseUsdcBaseUnits('10'), type: FHE_UINT64 },
    { label: 'dailyCap', value: parseUsdcBaseUnits('20'), type: FHE_UINT64 },
    { label: 'dailySpent', value: parseUsdcBaseUnits('0'), type: FHE_UINT64 },
    { label: 'sourceAmount', value: parseUsdcBaseUnits('5'), type: FHE_UINT64 },
    { label: 'allowedOutput', value: 0n, type: FHE_BOOL },
    { label: 'dailySpentOutput', value: 0n, type: FHE_UINT64 },
  ];

  const created = await encryptClient.createInput({
    chain: Chain.Solana,
    inputs: ciphertextInputs.map((i) => ({
      ciphertextBytes: Buffer.from(encryptValue(i.value, i.type)),
      fheType: i.type,
    })),
    proof: Buffer.alloc(64), // Dummy proof
    authorized: Buffer.from(POLET_PROGRAM_ID.toBytes()),
    networkEncryptionPublicKey: NETWORK_ENCRYPTION_PUBLIC_KEY,
  });

  const cts = Object.fromEntries(
    ciphertextInputs.map((i, idx) => [i.label, new PublicKey(created.ciphertextIdentifiers[idx]!)])
  ) as Record<string, PublicKey>;

  console.log('Ciphertexts created:');
  Object.entries(cts).forEach(([label, pubkey]) => console.log(`  ${label}: ${pubkey.toString()}`));

  // 4. Initialize Anchor
  const idl = JSON.parse(readFileSync(IDL_PATH, 'utf8')) as anchor.Idl;
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(owner), { commitment: 'confirmed' });
  const program = new anchor.Program(idl as anchor.Idl & { accounts?: { name: 'Wallet' }[] }, provider);

  // Derive PDAs
  const [walletPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), owner.publicKey.toBuffer()],
    program.programId
  );
  const [cpiAuthority, cpiAuthorityBump] = PublicKey.findProgramAddressSync(
    [Buffer.from(ENCRYPT_CPI_AUTHORITY_SEED)],
    program.programId
  );
  const [config] = PublicKey.findProgramAddressSync([Buffer.from('encrypt_config')], ENCRYPT_PROGRAM_ID);
  const [eventAuthority] = PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], ENCRYPT_PROGRAM_ID);
  const [networkEncryptionKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('network_encryption_key'), NETWORK_ENCRYPTION_PUBLIC_KEY],
    ENCRYPT_PROGRAM_ID
  );
  const [ownerDeposit] = PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_deposit'), owner.publicKey.toBuffer()],
    ENCRYPT_PROGRAM_ID
  );
  const [sessionDeposit, sessionDepositBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_deposit'), session.publicKey.toBuffer()],
    ENCRYPT_PROGRAM_ID
  );

  // 5. Initialize Polet Wallet
  console.log('Initializing Polet wallet...');
  await program.methods.initialize()
    .accounts({
      wallet: walletPda,
      owner: owner.publicKey,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  // 6. Set Official Encrypt Policy
  console.log('Setting official Encrypt policy...');
  // We need the owner's deposit for this call
  const ownerDepositInfo = await connection.getAccountInfo(ownerDeposit);
  if (!ownerDepositInfo) {
    console.log('Creating owner deposit...');
    const [, ownerDepositBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('encrypt_deposit'), owner.publicKey.toBuffer()],
      ENCRYPT_PROGRAM_ID
    );
    const configInfo = await connection.getAccountInfo(config);
    if (!configInfo) throw new Error('Encrypt config account not found on devnet');
    const encVault = new PublicKey(configInfo.data.slice(100, 132));
    const vault = encVault.equals(SystemProgram.programId) ? owner.publicKey : encVault;
    
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
        Buffer.from([14]), // create_deposit discriminator used by current pre-alpha program.
        Buffer.from([ownerDepositBump]),
        Buffer.alloc(8), // initialEncAmount (0)
        Buffer.alloc(8), // initialGasAmount (0)
      ]),
    });
    const tx = new Transaction().add(createDepositIx);
    await sendAndConfirmTransaction(connection, tx, [owner]);
  }

  const policyCommitment = Array(32).fill(0xee);
  await program.methods.setOfficialEncryptCiphertextPolicy(policyCommitment)
    .accounts({
      wallet: walletPda,
      owner: owner.publicKey,
      maxPerRunCiphertext: cts.maxPerRun,
      dailyCapCiphertext: cts.dailyCap,
      dailySpentCiphertext: cts.dailySpent,
      encryptProgram: ENCRYPT_PROGRAM_ID,
      config,
      deposit: ownerDeposit,
      cpiAuthority,
      program: program.programId,
      networkEncryptionKey,
      payer: owner.publicKey,
      eventAuthority,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
  console.log('Policy set.');

  // 7. Grant Session Key
  console.log('Granting session key...');
  const expiresAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
  await program.methods.grantTemporalKey(session.publicKey, expiresAt)
    .accounts({
      wallet: walletPda,
      owner: owner.publicKey,
    } as any)
    .rpc();

  // 8. Execute Graph as Session
  console.log('Ensuring session deposit exists...');
  const sessionDepositInfo = await connection.getAccountInfo(sessionDeposit);
  if (!sessionDepositInfo) {
    const configInfo = await connection.getAccountInfo(config);
    if (!configInfo) throw new Error('Encrypt config account not found on devnet');
    const encVault = new PublicKey(configInfo.data.slice(100, 132));
    const vault = encVault.equals(SystemProgram.programId) ? session.publicKey : encVault;
    
    const createDepositIx = new TransactionInstruction({
      programId: ENCRYPT_PROGRAM_ID,
      keys: [
        { pubkey: sessionDeposit, isSigner: false, isWritable: true },
        { pubkey: config, isSigner: false, isWritable: false },
        { pubkey: session.publicKey, isSigner: true, isWritable: false },
        { pubkey: session.publicKey, isSigner: true, isWritable: true },
        { pubkey: session.publicKey, isSigner: false, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([14]), // create_deposit discriminator used by current pre-alpha program.
        Buffer.from([sessionDepositBump]),
        Buffer.alloc(8), // initialEncAmount (0)
        Buffer.alloc(8), // initialGasAmount (0)
      ]),
    });
    const tx = new Transaction().add(createDepositIx);
    await sendAndConfirmTransaction(connection, tx, [session]);
    console.log('Session deposit created.');
  }

  console.log('Executing policy graph as session...');
  const walletState = await (program.account as any).wallet.fetch(walletPda);
  const currentSlot = await connection.getSlot('confirmed');

  const sessionProvider = new anchor.AnchorProvider(connection, new anchor.Wallet(session), { commitment: 'confirmed' });
  const sessionProgram = new anchor.Program(idl, sessionProvider);

  await sessionProgram.methods.executeEncryptPolicyGraphAsSession(
    new anchor.BN(currentSlot),
    new anchor.BN(walletState.policySeq),
    cpiAuthorityBump
  )
    .accounts({
      wallet: walletPda,
      sessionKey: session.publicKey,
      sourceAmountCiphertext: cts.sourceAmount,
      maxPerRunCiphertext: cts.maxPerRun,
      dailySpentCiphertext: cts.dailySpent,
      dailyCapCiphertext: cts.dailyCap,
      allowedOutputCiphertext: cts.allowedOutput,
      dailySpentOutputCiphertext: cts.dailySpentOutput,
      encryptProgram: ENCRYPT_PROGRAM_ID,
      config,
      deposit: sessionDeposit,
      cpiAuthority,
      program: program.programId,
      networkEncryptionKey,
      payer: session.publicKey,
      eventAuthority,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();
  
  console.log('Graph execution successful!');

  // 9. Verify State
  const finalState = await (program.account as any).wallet.fetch(walletPda);
  console.log('Final Wallet State:');
  console.log(`  Pending: ${finalState.confidentialPolicy.encryptCiphertexts.pending}`);
  console.log(`  Pending Slot: ${finalState.confidentialPolicy.encryptCiphertexts.pendingSlot.toString()}`);

  encryptClient.close();
  console.log('--- Runner Completed Successfully ---');
}

function parseUsdcBaseUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

main().catch((err) => {
  console.error('Error during execution:');
  console.error(err);
  process.exit(1);
});
