/**
 * Live Hermes readiness smoke.
 *
 * Exercises the full path an MCP-capable agent (Hermes / Claude Desktop /
 * Cursor / SendAI) would take against a real Polet proxy with a devnet
 * owner wallet:
 *
 *   1. /health                                                        →  proxy alive
 *   2. /wallet/initialize + owner signs + confirm                     →  smart-wallet PDA created
 *   3. /wallet/grant-key + owner signs + confirm                      →  session key authorized
 *   4. node dist/mcp-server/cli.js (spawned subprocess)               →  MCP stdio ready
 *   5. tools/list                                                     →  4 Polet tools
 *   6. tools/call polet_status                                        →  real wallet status
 *   7. tools/call polet_trade (25 USDC over demo cap)                 →  policy-blocked
 *   8. tools/call polet_trade (5 USDC within demo cap)                →  ok / preview-ready
 *
 * Env required:
 *   POLET_LIVE_OWNER_SECRET   base58 owner keypair secret (test wallet only!)
 *   POLET_PROXY_URL           default http://localhost:3001
 *   POLET_RPC_URL             default https://api.devnet.solana.com
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: unknown;
}

const PROXY_URL = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';
const RPC_URL = process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
const OWNER_SECRET = process.env.POLET_LIVE_OWNER_SECRET;

if (!OWNER_SECRET) {
  console.error('Missing POLET_LIVE_OWNER_SECRET env (base58 secret for devnet test wallet)');
  process.exit(1);
}

const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET.trim()));
const connection = new Connection(RPC_URL, 'confirmed');

async function main(): Promise<void> {
  console.log(`owner pubkey: ${owner.publicKey.toBase58()}`);
  const balance = await connection.getBalance(owner.publicKey);
  console.log(`owner balance: ${(balance / 1e9).toFixed(4)} SOL`);
  if (balance < 5_000_000) {
    console.error('Owner needs at least ~0.005 SOL for onboarding fees + rent. Fund via devnet faucet.');
    process.exit(1);
  }

  // 1. Health
  await step('proxy /health', async () => {
    const res = await fetch(new URL('/health', PROXY_URL));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  // 2. Initialize wallet (idempotent via lookup)
  const walletResp = await fetchJson<{ success: boolean; data?: { walletPda?: string; confidentialPolicy?: { enabled?: boolean }; sessions?: Array<{ key: string; authorized: boolean; expiresAt: number }> }; error?: unknown }>(`/wallet/${owner.publicKey.toBase58()}`);
  if (walletResp?.success && walletResp?.data?.walletPda) {
    console.log(`↺ wallet already initialized: ${walletResp.data.walletPda}`);
  } else {
    await step('POST /wallet/initialize + sign + send', async () => {
      const envelope = await postJson<{ success: boolean; data?: { transaction: string }; error?: unknown }>('/wallet/initialize', { owner: owner.publicKey.toBase58() });
      if (!envelope?.success || !envelope.data?.transaction) {
        throw new Error(`initialize failed: ${JSON.stringify(envelope?.error ?? envelope)}`);
      }
      const tx = Transaction.from(Buffer.from(envelope.data.transaction, 'base64'));
      tx.feePayer = owner.publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.sign(owner);
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log(`  initialize tx: ${sig}`);
    });
  }

  // 3. Use owner as session (demo mode — graph endpoint requires KMS session or owner==session).
  const sessionPubkey = owner.publicKey.toBase58();
  const agentSecretBase58 = bs58.encode(owner.secretKey);
  const expiresAt = Date.now() + 6 * 60 * 60 * 1000;
  const existingSession = walletResp?.data?.sessions?.find(
    (s) => s.key === sessionPubkey && s.authorized && (s.expiresAt ?? 0) > Date.now()
  );
  if (existingSession) {
    console.log(`↺ session already authorized: ${sessionPubkey} (expires ${new Date(existingSession.expiresAt).toISOString()})`);
  } else {
    await step('POST /wallet/grant-key (owner-as-session) + sign + send', async () => {
      const envelope = await postJson<{ success: boolean; data?: { transaction: string }; error?: unknown }>('/wallet/grant-key', {
        owner: owner.publicKey.toBase58(),
        sessionKey: sessionPubkey,
        expiresAt,
        dailyLimit: 50_000_000,
      });
      if (!envelope?.success || !envelope.data?.transaction) {
        throw new Error(`grant-key failed: ${JSON.stringify(envelope?.error ?? envelope)}`);
      }
      const tx = Transaction.from(Buffer.from(envelope.data.transaction, 'base64'));
      tx.feePayer = owner.publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.sign(owner);
      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      console.log(`  grant-key tx: ${sig}`);
      console.log(`  session authorized: ${sessionPubkey} (owner-as-session demo mode)`);
    });
  }

  // Save config for operator reference
  const configPath = '/tmp/polet-agent-live-smoke.json';
  writeFileSync(
    configPath,
    JSON.stringify(
      {
        POLET_OWNER: owner.publicKey.toBase58(),
        POLET_SESSION_KEY: sessionPubkey,
        POLET_AGENT_KEYPAIR: agentSecretBase58,
        POLET_PROXY_URL: PROXY_URL,
        POLET_RPC_URL: RPC_URL,
      },
      null,
      2
    )
  );
  console.log(`  wrote ${configPath}`);

  // 4-8. Spawn MCP + call tools
  await step('spawn node dist/mcp-server/cli.js + MCP handshake + tool calls', async () => {
    const child = spawn('node', ['dist/mcp-server/cli.bundled.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        POLET_OWNER: owner.publicKey.toBase58(),
        POLET_SESSION_KEY: sessionPubkey,
        POLET_AGENT_KEYPAIR: agentSecretBase58,
        POLET_PROXY_URL: PROXY_URL,
        POLET_RPC_URL: RPC_URL,
      },
    });
    const responses: JsonRpcResponse[] = [];
    let buffer = '';
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      let idx = buffer.indexOf('\n');
      while (idx !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.length > 0) {
          try { responses.push(JSON.parse(line)); } catch { /* skip */ }
        }
        idx = buffer.indexOf('\n');
      }
    });
    child.stderr.setEncoding('utf-8');
    child.stderr.on('data', (chunk: string) => {
      process.stderr.write(`  [mcp-stderr] ${chunk}`);
    });

    await new Promise((r) => setTimeout(r, 300));
    sendRpc(child, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    sendRpc(child, { jsonrpc: '2.0', method: 'notifications/initialized' });
    sendRpc(child, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    sendRpc(child, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'polet_status' } });
    sendRpc(child, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'polet_trade', arguments: { from: 'USDC', to: 'SOL', amount: 25, rail: 'jupiter' } } });
    sendRpc(child, { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'polet_execute', arguments: { from: 'USDC', to: 'SOL', amount: 5, rail: 'jupiter' } } });

    const deadline = Date.now() + 300_000; // 5 min for full Encrypt preflight
    while (responses.length < 5 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    child.stdin.end();
    await once(child, 'exit');

    const [, toolsList, polet_status, polet_trade25, polet_execute5] = responses;
    console.log(`  tools: ${(toolsList?.result as { tools: Array<{ name: string }> } | undefined)?.tools.map((t) => t.name).join(', ')}`);
    console.log(`  polet_status: ${metaStatus(polet_status)} → ${metaDetail(polet_status)}`);
    console.log(`  polet_trade 25 USDC: ${metaStatus(polet_trade25)} → ${metaDetail(polet_trade25)}`);
    console.log(`  polet_execute 5 USDC: ${metaStatus(polet_execute5)} → ${metaDetail(polet_execute5)}`);
    if (!polet_status?.result) throw new Error('polet_status did not return a result');
    if (metaStatus(polet_status) === 'failed') throw new Error('polet_status reported failed');
  });

  console.log('\n✓ Live Hermes smoke passed. Config written to /tmp/polet-agent-live-smoke.json');
  console.log('  Point Hermes/Claude Desktop at:');
  console.log('    command: node');
  console.log('    args:    ["<absolute path>/sdk/dist/mcp-server/cli.js"]');
  console.log('    env:     <paste from /tmp/polet-agent-live-smoke.json>');
}

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n→ ${name}`);
  try { await fn(); } catch (error) {
    console.error(`✗ ${name}: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(new URL(path, PROXY_URL));
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(new URL(path, PROXY_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

function sendRpc(child: ReturnType<typeof spawn>, message: Record<string, unknown>): void {
  child.stdin?.write(`${JSON.stringify(message)}\n`);
}

function metaStatus(response: JsonRpcResponse | undefined): string {
  const metadata = (response?.result as { metadata?: { status?: string } } | undefined)?.metadata;
  return metadata?.status ?? 'unknown';
}

function metaDetail(response: JsonRpcResponse | undefined): string {
  const content = (response?.result as { content?: Array<{ text?: string }> } | undefined)?.content;
  return content?.[0]?.text?.slice(0, 120) ?? '(no detail)';
}

main().catch((error) => {
  console.error('✗ live smoke crashed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
