/**
 * Example 03 — Run the Polet MCP server in-process.
 *
 * Production setup uses `bun x @polet-ai/sdk mcp-server` spawned by the
 * MCP client (Claude Desktop, Cursor, Hermes, OpenClaw). This example
 * drives the same server programmatically for smoke-testing.
 *
 * Run:
 *   POLET_OWNER=... POLET_SESSION_KEY=... POLET_AGENT_KEYPAIR=... \
 *     bun run sdk/examples/03-mcp-server-example.ts
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createPoletAgentKit } from '../src/index.js';
import { PoletMcpServer } from '../src/mcp-server/server.js';

const env = process.env;
if (!env.POLET_OWNER || !env.POLET_SESSION_KEY) {
  throw new Error('Set POLET_OWNER, POLET_SESSION_KEY');
}

const kit = createPoletAgentKit({
  owner: env.POLET_OWNER,
  sessionKey: env.POLET_SESSION_KEY,
  baseUrl: env.POLET_PROXY_URL ?? 'http://localhost:3001',
  rpcUrl: env.POLET_RPC_URL ?? 'https://api.devnet.solana.com',
  connection: new Connection(env.POLET_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed'),
  ...(env.POLET_AGENT_KEYPAIR && {
    agentSigner: env.POLET_AGENT_KEYPAIR.trim().startsWith('[')
      ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(env.POLET_AGENT_KEYPAIR)))
      : Keypair.fromSecretKey(bs58.decode(env.POLET_AGENT_KEYPAIR.trim())),
  }),
});

const server = new PoletMcpServer({ kit });

async function call(method: string, params?: unknown): Promise<void> {
  const request = JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1_000_000), method, params });
  const response = await server.handle(request);
  console.log(`\n→ ${method}`);
  console.log(response);
}

await call('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'example', version: '0.0.1' } });
await call('tools/list');
await call('tools/call', { name: 'polet_status' });
await call('tools/call', { name: 'polet_trade', arguments: { from: 'USDC', to: 'SOL', amount: 5, rail: 'jupiter' } });
