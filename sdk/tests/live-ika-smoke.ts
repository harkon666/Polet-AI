/**
 * Hermes Ika-rail simulation smoke.
 *
 * Drives `polet_execute` with the multi-chain Ika rail to prove how far
 * the SDK + proxy + contract flow gets when a Hermes-style agent asks for
 * "5 USDC → SUI via Polet". The script prints every step so the operator
 * can see exactly where the flow stops in the current environment:
 *
 *   1. Wallet / policy / session ready ?
 *   2. Encrypt preflight (FHE policy graph + decryption) passes ?
 *   3. Polet approval transaction signed + landed on Solana devnet ?
 *   4. Ika managed fixture present + dWallet registered + gas deposit passes floor ?
 *   5. Presign / Sign / CommitSignature + Sui devnet broadcast ?
 *
 * Fails gracefully at step (4) when the operator has not run
 * `scripts/ika-setup-dwallet.ts`. That still proves steps 1–3 end-to-end.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const OWNER_SECRET = process.env.POLET_LIVE_OWNER_SECRET;
const PROXY_URL = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';
const RPC_URL = process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
if (!OWNER_SECRET) {
  console.error('Set POLET_LIVE_OWNER_SECRET');
  process.exit(1);
}
const owner = Keypair.fromSecretKey(bs58.decode(OWNER_SECRET.trim()));
const connection = new Connection(RPC_URL, 'confirmed');

async function main(): Promise<void> {
  console.log(`Owner: ${owner.publicKey.toBase58()}`);
  console.log(`Balance: ${((await connection.getBalance(owner.publicKey)) / 1e9).toFixed(4)} SOL`);

  const child = spawn('node', ['dist/mcp-server/cli.bundled.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      POLET_OWNER: owner.publicKey.toBase58(),
      POLET_SESSION_KEY: owner.publicKey.toBase58(), // owner-as-session demo
      POLET_AGENT_KEYPAIR: bs58.encode(owner.secretKey),
      POLET_PROXY_URL: PROXY_URL,
      POLET_RPC_URL: RPC_URL,
    },
  });
  const responses: unknown[] = [];
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
  child.stderr.on('data', (chunk: string) => process.stderr.write(`[mcp-stderr] ${chunk}`));

  await new Promise((r) => setTimeout(r, 300));

  function send(message: Record<string, unknown>) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'polet_status' } });
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'polet_execute',
      arguments: {
        from: 'USDC',
        to: 'SUI',
        amount: 1,
        rail: 'ika',
      },
    },
  });

  const deadline = Date.now() + 600_000;
  while (responses.length < 3 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 300));
  child.stdin.end();
  await once(child, 'exit');

  const [, status, execute] = responses as Array<{ id: number; result?: unknown; error?: unknown }>;
  console.log('\n── polet_status ────────────────────────────────────────────');
  console.log(JSON.stringify(status, null, 2).slice(0, 400), '…');
  console.log('\n── polet_execute (USDC → SUI via Ika) ──────────────────────');
  console.log(JSON.stringify(execute, null, 2).slice(0, 4000));
}

main().catch((err) => {
  console.error('✗ live Ika smoke crashed:', err);
  process.exit(1);
});
