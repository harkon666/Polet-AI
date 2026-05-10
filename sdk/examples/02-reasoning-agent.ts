/**
 * Example 02 — Policy-aware reasoning agent.
 *
 * Shows the Polet agent pattern when a naive amount is blocked by the
 * confidential policy: the agent sees `status: "policy-blocked"` with a
 * reason, halves the amount, and retries until it fits. The private
 * thresholds are never exposed — the agent only sees allow/block + a hint
 * that the request is `recoverable`.
 *
 * Run:
 *   POLET_OWNER=... POLET_SESSION_KEY=... POLET_AGENT_KEYPAIR=... \
 *     bun run sdk/examples/02-reasoning-agent.ts
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createPoletAgentKit, type PoletExecutionResult } from '../src/index.js';

const env = process.env;
if (!env.POLET_OWNER || !env.POLET_SESSION_KEY || !env.POLET_AGENT_KEYPAIR) {
  throw new Error('Set POLET_OWNER, POLET_SESSION_KEY, POLET_AGENT_KEYPAIR');
}

const kit = createPoletAgentKit({
  owner: env.POLET_OWNER,
  sessionKey: env.POLET_SESSION_KEY,
  baseUrl: env.POLET_PROXY_URL ?? 'http://localhost:3001',
  rpcUrl: env.POLET_RPC_URL ?? 'https://api.devnet.solana.com',
  connection: new Connection(env.POLET_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed'),
  agentSigner: env.POLET_AGENT_KEYPAIR.trim().startsWith('[')
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.POLET_AGENT_KEYPAIR)))
    : Keypair.fromSecretKey(bs58.decode(env.POLET_AGENT_KEYPAIR.trim())),
});

const goal = { from: 'USDC', to: 'SUI', rail: 'ika' as const };
const maxAttempts = 4;
let amount = 25; // deliberately over the demo cap

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`\n[attempt ${attempt}] proposing ${amount} ${goal.from} → ${goal.to}`);
  const result: PoletExecutionResult = await kit.execute({ ...goal, amount });

  if (result.ok && result.status === 'executed') {
    console.log(`✓ Success on attempt ${attempt}: tx ${result.destinationTxHash}`);
    break;
  }

  if (result.status === 'policy-blocked' && result.recoverable) {
    const nextAmount = Math.max(1, Math.floor(amount / 2));
    console.log(`… policy blocked (${result.reason}); replan amount ${amount} → ${nextAmount}`);
    amount = nextAmount;
    continue;
  }

  if (result.status === 'needs-approval') {
    console.log(`… waiting for shared quorum approvers; abort demo.`);
    break;
  }

  if (result.status === 'gas-floor-underfunded') {
    console.log(`… gas deposit underfunded; ask operator to top up, then retry.`);
    break;
  }

  console.log(`× terminal status ${result.status}: ${result.message}`);
  break;
}
