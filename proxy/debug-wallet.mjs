import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from './src/lib/idl.json' with { type: "json" };

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const dummyWallet = {
  publicKey: new PublicKey('ECFFvJe8yPaTSH2qdXP1CkQTxWfWy5B3fZ7HEcCQPhSn'),
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
};
const provider = new anchor.AnchorProvider(conn, dummyWallet, { commitment: 'confirmed' });
const program = new anchor.Program(idl, provider);

try {
  const accountData = await program.account.wallet.fetch(new PublicKey('57jHJxBxpFRm9yTJ9rRPXVJk2VEJdAys9r7UFqL2hzur'));
  console.log('Owner:', accountData.owner.toBase58());
  console.log('Proxy PK:', accountData.proxyPk.toBase58());
  console.log('Policy Seq:', accountData.policySeq.toNumber());
  console.log('Policy Hash:', Array.from(accountData.policyHash));
  console.log('Policy Data length:', accountData.policyData?.length || 0);
  console.log('Daily Limit:', accountData.dailyLimit.toNumber());
  console.log('Merkle Root:', Array.from(accountData.merkleRoot));
} catch (e) {
  console.error('Error:', e.message);
}