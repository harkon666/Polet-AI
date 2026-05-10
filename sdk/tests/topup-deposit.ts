import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

const OWNER_SECRET = '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie';
const DEPOSIT = new PublicKey('A8BQhbgAD7GuQCG6jorUH52Kh6T3ijbdE58JqJqespBj');
const TOP_UP_LAMPORTS = 5_000_000;

const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET));
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

const before = await conn.getAccountInfo(DEPOSIT);
console.log(`before: ${before?.lamports} lamports`);

const tx = new Transaction().add(SystemProgram.transfer({
  fromPubkey: owner.publicKey,
  toPubkey: DEPOSIT,
  lamports: TOP_UP_LAMPORTS,
}));
const sig = await sendAndConfirmTransaction(conn, tx, [owner]);
console.log(`tx: ${sig}`);

const after = await conn.getAccountInfo(DEPOSIT);
console.log(`after:  ${after?.lamports} lamports (+${(after!.lamports - before!.lamports) / 1e9} SOL)`);
