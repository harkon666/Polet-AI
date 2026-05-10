import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { deriveIkaGasDepositPda, buildCreateDepositInstructionData } from '../proxy/src/lib/ika-gas-deposit';
import { IKA_DWALLET_PROGRAM_ID } from '../proxy/src/lib/ika-grpc-schema';

const OWNER_SECRET = '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie';
const INITIAL_IKA = 5_000_000_000n; // 5x floor
const INITIAL_SOL = 30_000_000n;     // 0.03 SOL (above 0.02 floor)

const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET));
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const { pda } = deriveIkaGasDepositPda(owner.publicKey);
const program = new PublicKey(IKA_DWALLET_PROGRAM_ID);

console.log(`owner: ${owner.publicKey.toBase58()}`);
console.log(`gas deposit pda: ${pda.toBase58()}`);

const ix = new TransactionInstruction({
  programId: program,
  keys: [
    { pubkey: pda, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: true, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: buildCreateDepositInstructionData({
    initialIkaBaseUnits: INITIAL_IKA,
    initialSolLamports: INITIAL_SOL,
    userPubkey: owner.publicKey,
  }),
});

const tx = new Transaction().add(ix);
try {
  const sig = await sendAndConfirmTransaction(conn, tx, [owner], { commitment: 'confirmed' });
  console.log(`\ncreate-deposit tx: ${sig}`);
  console.log(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  const info = await conn.getAccountInfo(pda);
  console.log(`account exists: ${!!info}, size: ${info?.data.length}`);
} catch (e: any) {
  console.log('failed:', e?.message);
  if (e?.transactionLogs) {
    console.log('logs:');
    e.transactionLogs.slice(0, 10).forEach((l: string) => console.log(' ', l));
  }
  if (e?.logs) {
    console.log('logs:');
    e.logs.slice(0, 10).forEach((l: string) => console.log(' ', l));
  }
}
