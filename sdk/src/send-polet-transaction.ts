import { readFileSync } from 'node:fs';
import {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

const transactionBase64 = process.argv[2] ?? process.env.POLET_UNSIGNED_TRANSACTION;
const keypairPath = process.argv[3] ?? process.env.POLET_AGENT_KEYPAIR;
const rpcUrl = process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';

if (!transactionBase64 || !keypairPath) {
  console.error('Usage: bun run send:polet-tx <base64-unsigned-transaction> <agent-keypair.json>');
  console.error('Or set POLET_UNSIGNED_TRANSACTION and POLET_AGENT_KEYPAIR.');
  process.exit(1);
}

const agent = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(keypairPath, 'utf8')))
);
const connection = new Connection(rpcUrl, 'confirmed');
const bytes = Buffer.from(transactionBase64, 'base64');
const transaction = deserialize(bytes);

if (transaction instanceof VersionedTransaction) {
  transaction.sign([agent]);
} else {
  transaction.partialSign(agent);
}

const simulation = transaction instanceof VersionedTransaction
  ? await connection.simulateTransaction(transaction, {
      sigVerify: true,
      replaceRecentBlockhash: false,
    })
  : await connection.simulateTransaction(transaction, undefined, false);
if (simulation.value.err) {
  console.error('Simulation failed:', JSON.stringify(simulation.value.err));
  console.error(simulation.value.logs?.join('\n') ?? '');
  process.exit(1);
}

const signature = await connection.sendRawTransaction(transaction.serialize(), {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
});
const latestBlockhash = await connection.getLatestBlockhash();
const confirmation = await connection.confirmTransaction({
  signature,
  ...latestBlockhash,
}, 'confirmed');

if (confirmation.value.err) {
  console.error('Confirmation failed:', JSON.stringify(confirmation.value.err));
  process.exit(1);
}

console.log(`Polet transaction confirmed: ${signature}`);

function deserialize(bytes: Uint8Array): Transaction | VersionedTransaction {
  try {
    return Transaction.from(bytes);
  } catch {
    return VersionedTransaction.deserialize(bytes);
  }
}
