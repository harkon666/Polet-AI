/**
 * Example 01 — Hello Polet agent.
 *
 * The minimum code to take an AI agent idea (`swap 5 USDC to SUI`) and
 * execute it end-to-end through Polet's confidential policy gate, Ika
 * dWallet signing, and Sui devnet broadcast.
 *
 * Run:
 *   POLET_OWNER=... POLET_SESSION_KEY=... POLET_AGENT_KEYPAIR=... \
 *   POLET_PROXY_URL=http://localhost:3001 \
 *     bun run sdk/examples/01-hello-agent.ts
 *
 * Expected output (happy path):
 *   ✓ Executed sui trade <tx-hash>
 *   Explorer: https://suiscan.xyz/devnet/tx/<tx-hash>
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createPoletAgentKit } from '../src/index.js';

const {
  POLET_OWNER,
  POLET_SESSION_KEY,
  POLET_AGENT_KEYPAIR,
  POLET_PROXY_URL = 'http://localhost:3001',
  POLET_RPC_URL = 'https://api.devnet.solana.com',
} = process.env;

if (!POLET_OWNER || !POLET_SESSION_KEY || !POLET_AGENT_KEYPAIR) {
  throw new Error('Set POLET_OWNER, POLET_SESSION_KEY, and POLET_AGENT_KEYPAIR env vars');
}

const agentSigner = POLET_AGENT_KEYPAIR.trim().startsWith('[')
  ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(POLET_AGENT_KEYPAIR)))
  : Keypair.fromSecretKey(bs58.decode(POLET_AGENT_KEYPAIR.trim()));

const kit = createPoletAgentKit({
  owner: POLET_OWNER,
  sessionKey: POLET_SESSION_KEY,
  baseUrl: POLET_PROXY_URL,
  rpcUrl: POLET_RPC_URL,
  connection: new Connection(POLET_RPC_URL, 'confirmed'),
  agentSigner,
});

const result = await kit.execute({
  from: 'USDC',
  to: 'SUI',
  amount: 5,
  rail: 'ika',
});

switch (result.status) {
  case 'executed':
    console.log(`✓ Executed ${result.destinationChain} trade ${result.destinationTxHash}`);
    console.log(`Explorer: ${result.destinationExplorerUrl}`);
    break;
  case 'policy-blocked':
    console.log(`⛔ Policy blocked: ${result.reason}`);
    break;
  case 'session-revoked':
  case 'session-revoked-midflight':
    console.log(`🔒 Session revoked (${result.status})`);
    break;
  case 'gas-floor-underfunded':
    console.log(`⚠ Gas deposit underfunded: ${result.reason}`);
    break;
  case 'needs-approval':
    console.log(`👥 Multisig quorum pending: ${result.reason}`);
    break;
  case 'broadcast-disabled':
    console.log(`ℹ Signature committed but broadcast disabled: ${result.signatureHex.slice(0, 16)}…`);
    break;
  default:
    console.log(`Polet execute returned ${result.status}: ${result.message}`);
}
