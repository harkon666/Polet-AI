import { Connection, Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Chain, createEncryptClient, DEVNET_PRE_ALPHA_GRPC_URL } from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';

const owner = Keypair.fromSecretKey(bs58.decode('2B2AvNGmpwSpZpnNj8m5RdaZnFTxbdGkTuUNLnZ1JTm1brcayfqTV5wT1mpfaqpVudfNevo6mqa1PmwCtnaeywie'));
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const client = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL);

const result = await client.createInput({
  chain: Chain.Solana,
  inputs: [
    { ciphertextBytes: encryptValue(5000000n, 4), fheType: 4 },
    { ciphertextBytes: encryptValue(0n, 0), fheType: 0 },
    { ciphertextBytes: encryptValue(0n, 4), fheType: 4 },
  ],
  authorized: Buffer.from(bs58.decode('9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc')),
  networkEncryptionPublicKey: Buffer.from(bs58.decode('2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur')),
});
const [srcCt, allowCt, dailyCt] = result.ciphertextIdentifiers.map((id: Uint8Array) => bs58.encode(id));
console.log('ciphertexts:', { srcCt, allowCt, dailyCt });
await new Promise((r) => setTimeout(r, 12000));

async function poll(ct: string) {
  for (let i = 0; i < 40; i += 1) {
    const r = await fetch(`http://localhost:3001/wallet/encrypt-ciphertext/${ct}`);
    const j: any = await r.json();
    if (j?.data?.status === 'verified') return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`ciphertext ${ct} did not verify`);
}
await poll(srcCt);
await poll(allowCt);
await poll(dailyCt);
console.log('all ciphertexts verified');

const body = {
  owner: owner.publicKey.toBase58(),
  wallet: 'DYoumo8xa2wH3qnzDJUHr5tCPit3MxqyudqDiiLuRd33',
  sessionKey: owner.publicKey.toBase58(),
  sourceAmountCiphertext: srcCt,
  maxPerRunCiphertext: 'AeCq7dZvKcx7616KJU313x17JF8XRHXauk9Hs73JsS1Z',
  dailySpentCiphertext: 'EepsUbCuYaANy1XWF65paTcegVFHDLcLyXxVWo33Af4u',
  dailyCapCiphertext: 'Ex5ZdQDaQ4W97rg8phhy8fQyY1Y6TadmyUyuSjqcxbbE',
  allowedOutputCiphertext: allowCt,
  dailySpentOutputCiphertext: dailyCt,
  attestationSlot: 1,
  attestationPolicySeq: 1,
  encrypt: {
    encryptProgram: '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8',
    config: 'EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3',
    deposit: 'A8BQhbgAD7GuQCG6jorUH52Kh6T3ijbdE58JqJqespBj',
    networkEncryptionKey: '2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur',
    eventAuthority: '6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ',
    payer: owner.publicKey.toBase58(),
  },
};
const r = await fetch('http://localhost:3001/wallet/execute-encrypt-policy-graph', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const env: any = await r.json();
console.log('envelope success:', env.success, 'error:', env.error);
if (!env.data?.transaction) process.exit(1);

const tx = Transaction.from(Buffer.from(env.data.transaction, 'base64'));
console.log('tx instructions:', tx.instructions.length);
for (let i = 0; i < tx.instructions.length; i += 1) {
  console.log(`  ix[${i}] programId: ${tx.instructions[i].programId.toBase58()}`);
}
console.log('feePayer (pre):', tx.feePayer?.toBase58());
tx.feePayer = owner.publicKey;
const { blockhash } = await conn.getLatestBlockhash('confirmed');
tx.recentBlockhash = blockhash;
tx.sign(owner);

const sim = await conn.simulateTransaction(tx);
console.log('\nsimulation err:', JSON.stringify(sim.value.err));
console.log('\nsimulation logs:');
(sim.value.logs ?? []).forEach((line) => console.log(' ', line));
