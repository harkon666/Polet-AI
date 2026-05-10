#!/usr/bin/env bun
/**
 * Polet MCP CLI — spins up a stdio MCP server for MCP-capable agent runtimes.
 *
 * Configuration is read from environment variables so it can be declared
 * directly in an MCP client's config (e.g. `mcp.json`):
 *
 *   POLET_OWNER            Solana owner public key of the Polet smart wallet.
 *   POLET_SESSION_KEY      Session key public key granted to this agent.
 *   POLET_AGENT_KEYPAIR    Base58 OR JSON-array secret key for the session signer.
 *   POLET_PROXY_URL        Polet proxy base URL (default http://localhost:3001).
 *   POLET_RPC_URL          Solana RPC URL (default https://api.devnet.solana.com).
 *
 * Logs go to stderr so they never mix with the MCP JSON stream on stdout.
 */

import { Connection, Keypair, type Signer } from '@solana/web3.js';
import { createPoletAgentKit, type PoletAgentKit } from '../index.js';
import { PoletMcpServer } from './server.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`[polet-mcp] missing required env ${name}\n`);
    process.exit(1);
  }
  return value;
}

function resolveAgentSigner(): Signer | undefined {
  const raw = process.env.POLET_AGENT_KEYPAIR;
  if (!raw) return undefined;
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
    }
    // base58 fallback via dynamic import so the dep only loads when needed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bs58 = (globalThis as unknown as { bs58?: { decode: (s: string) => Uint8Array } }).bs58
      ?? (require('bs58') as { decode: (s: string) => Uint8Array });
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch (error) {
    process.stderr.write(`[polet-mcp] invalid POLET_AGENT_KEYPAIR: ${(error as Error).message}\n`);
    process.exit(1);
  }
}

function buildKit(): PoletAgentKit {
  const owner = requireEnv('POLET_OWNER');
  const sessionKey = requireEnv('POLET_SESSION_KEY');
  const baseUrl = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';
  const rpcUrl = process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const signer = resolveAgentSigner();

  const kit = createPoletAgentKit({
    owner,
    sessionKey,
    baseUrl,
    rpcUrl,
    connection,
    ...(signer && { agentSigner: signer }),
  });
  return kit;
}

async function main(): Promise<void> {
  const kit = buildKit();
  const server = new PoletMcpServer({ kit });
  process.stderr.write('[polet-mcp] ready (stdio). Awaiting MCP client messages...\n');
  await server.run();
}

main().catch((error) => {
  process.stderr.write(`[polet-mcp] fatal: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
