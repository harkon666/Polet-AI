/**
 * Reset the owner's Encrypt confidential policy to a higher cap so the live
 * smoke can demonstrate end-to-end Ika bridgeless trading without hitting
 * the accumulated dailySpent floor.
 *
 * Creates fresh policy ciphertexts (maxPerRun=100 USDC, dailyCap=500 USDC,
 * dailySpent=0 USDC) via Encrypt gRPC, waits for them to verify on-chain,
 * then submits `set-official-encrypt-ciphertext-policy` as the owner.
 */

import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Chain, createEncryptClient, DEVNET_PRE_ALPHA_GRPC_URL } from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';

const OWNER_SECRET = '2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie';
const POLET_PROGRAM_ID = '5hy6S8v1Z1ZLUonPai6wQKcnm8u5RdrNgspeuPYBsP9G';
const NEK = '2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur';
const DEPOSIT = 'A8BQhbgAD7GuQCG6jorUH52Kh6T3ijbdE58JqJqespBj';
const CONFIG = 'EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3';
const EVENT_AUTHORITY = '6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ';

const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET));
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');

console.log('creating fresh policy ciphertexts via Encrypt gRPC...');
const client = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL);
const result = await client.createInput({
  chain: Chain.Solana,
  inputs: [
    { ciphertextBytes: encryptValue(100_000_000n, 4), fheType: 4 }, // maxPerRun = 100 USDC
    { ciphertextBytes: encryptValue(500_000_000n, 4), fheType: 4 }, // dailyCap = 500 USDC
    { ciphertextBytes: encryptValue(0n, 4), fheType: 4 },           // dailySpent = 0
  ],
  authorized: Buffer.from(bs58.decode(POLET_PROGRAM_ID)),
  networkEncryptionPublicKey: Buffer.from(bs58.decode(NEK)),
});
const [maxPerRunCt, dailyCapCt, dailySpentCt] = result.ciphertextIdentifiers.map((id: Uint8Array) => bs58.encode(id));
console.log('  maxPerRun:', maxPerRunCt);
console.log('  dailyCap :', dailyCapCt);
console.log('  dailySpent:', dailySpentCt);

async function pollVerified(ct: string): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const r = await fetch(`http://localhost:3001/wallet/encrypt-ciphertext/${ct}`);
    const j: any = await r.json();
    if (j?.data?.status === 'verified') return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`ciphertext ${ct} did not verify`);
}
console.log('polling ciphertexts to verified...');
await Promise.all([pollVerified(maxPerRunCt), pollVerified(dailyCapCt), pollVerified(dailySpentCt)]);
console.log('  all verified ✓');

const commitment = Array.from(new Uint8Array(32).fill(0xab));

const body = {
  owner: owner.publicKey.toBase58(),
  maxPerRunCiphertext: maxPerRunCt,
  dailyCapCiphertext: dailyCapCt,
  dailySpentCiphertext: dailySpentCt,
  policyCommitment: commitment,
  encrypt: {
    config: CONFIG,
    deposit: DEPOSIT,
    networkEncryptionKey: NEK,
    eventAuthority: EVENT_AUTHORITY,
    payer: owner.publicKey.toBase58(),
  },
};

console.log('\nsubmitting set-official-encrypt-ciphertext-policy...');
const r = await fetch('http://localhost:3001/wallet/set-official-encrypt-ciphertext-policy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const env: any = await r.json();
if (!env.success) {
  console.log('ERROR:', env.error);
  console.log(JSON.stringify(env).slice(0, 1000));
  process.exit(1);
}

const tx = Transaction.from(Buffer.from(env.data.transaction, 'base64'));
tx.feePayer = owner.publicKey;
const { blockhash } = await conn.getLatestBlockhash('confirmed');
tx.recentBlockhash = blockhash;
tx.sign(owner);
const sig = await conn.sendRawTransaction(tx.serialize());
await conn.confirmTransaction(sig);
console.log('✓ policy reset tx:', sig);
console.log(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
client.close();
