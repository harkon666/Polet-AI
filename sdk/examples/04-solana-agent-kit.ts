/**
 * Example 04 — Solana Agent Kit (SendAI) plugin.
 *
 * Packages Polet tools as Solana Agent Kit `actions` so the SendAI-style
 * orchestrator can discover and invoke them alongside native Solana
 * actions (swap, transfer, etc.). Polet tools preserve the confidential
 * policy boundary: the orchestrator sees allow/block outcomes but never
 * the private thresholds.
 *
 *   import { SolanaAgentKit } from 'solana-agent-kit';
 *   import { createPoletSolanaAgentKitActions } from '@polet-ai/sdk/adapters/solana-agent-kit';
 *
 *   const agent = new SolanaAgentKit(privateKey, rpcUrl, { OPENAI_API_KEY: ... });
 *   const poletActions = createPoletSolanaAgentKitActions(poletKit);
 *   for (const action of poletActions) agent.actions[action.name] = action;
 *
 * This example only prints the action descriptors so reviewers can verify
 * the shape without needing the full Solana Agent Kit dependency.
 */

import { createPoletAgentKit } from '../src/index.js';
import { createPoletSolanaAgentKitActions } from '../src/adapters/solana-agent-kit.js';

const env = process.env;
const kit = createPoletAgentKit({
  owner: env.POLET_OWNER ?? '11111111111111111111111111111111',
  sessionKey: env.POLET_SESSION_KEY ?? '11111111111111111111111111111111',
  baseUrl: env.POLET_PROXY_URL ?? 'http://localhost:3001',
});

const actions = createPoletSolanaAgentKitActions(kit);
for (const action of actions) {
  console.log(`\n— ${action.name}`);
  console.log(`  similes: ${action.similes.join(', ')}`);
  console.log(`  description: ${action.description}`);
  console.log(`  schema: ${JSON.stringify(action.schema)}`);
  console.log(`  examples: ${JSON.stringify(action.examples.length)} scenario(s)`);
}
