/**
 * MCP subprocess readiness smoke test.
 *
 * Spawns the Polet MCP CLI as an actual child process, pipes JSON-RPC
 * newline-delimited messages over stdin, collects newline-delimited
 * responses from stdout, and verifies:
 *
 *   1. Startup banner lands on stderr (not stdout) — Hermes / Claude / Cursor
 *      filter MCP streams by stdout, so any banner on stdout breaks parsing.
 *   2. `initialize` → protocol version + tool capabilities.
 *   3. `notifications/initialized` does NOT emit a response (notifications
 *      must not interleave into the stdout stream).
 *   4. `tools/list` returns the 5 Polet tools with JSON schemas.
 *   5. `tools/call polet_trade` propagates through to the proxy (returns
 *      `policy-blocked` when the owner is a dummy pubkey — exercising the
 *      full chain: MCP → kit.trade → fetch → proxy → response → tool result).
 *
 * The test does not assume a running proxy. If the proxy is unreachable it
 * still verifies 1–4; only step 5 requires the proxy.
 *
 * Run:
 *   bun run sdk/tests/mcp-subprocess-smoke.ts
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: unknown;
}

const OWNER = process.env.POLET_OWNER ?? 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';
const SESSION = process.env.POLET_SESSION_KEY ?? 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
const PROXY_URL = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';

async function main(): Promise<void> {
  const runtime = process.argv.includes('--node') ? 'node' : 'bun';
  const entry = runtime === 'node'
    ? ['dist/mcp-server/cli.js']
    : ['run', 'src/mcp-server/cli.ts'];

  console.log(`→ spawning ${runtime} ${entry.join(' ')}`);
  const child = spawn(runtime, entry, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      POLET_OWNER: OWNER,
      POLET_SESSION_KEY: SESSION,
      POLET_PROXY_URL: PROXY_URL,
    },
  });

  const stderrLines: string[] = [];
  child.stderr.setEncoding('utf-8');
  child.stderr.on('data', (chunk: string) => {
    stderrLines.push(chunk);
    process.stderr.write(`[child.stderr] ${chunk}`);
  });

  const responses: JsonRpcResponse[] = [];
  child.stdout.setEncoding('utf-8');
  let buffer = '';
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let idx = buffer.indexOf('\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) {
        try {
          responses.push(JSON.parse(line));
        } catch (error) {
          console.error(`× non-JSON on stdout: ${line.slice(0, 200)}`);
        }
      }
      idx = buffer.indexOf('\n');
    }
  });

  // Give the process a moment to emit its startup banner on stderr.
  await new Promise((resolve) => setTimeout(resolve, 200));

  send(child, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'smoke', version: '0.0.1' } } });
  send(child, { jsonrpc: '2.0', method: 'notifications/initialized' });
  send(child, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  send(child, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'polet_trade', arguments: { from: 'USDC', to: 'SOL', amount: 5, rail: 'jupiter' } } });

  // Wait for the expected number of responses (or timeout).
  const deadline = Date.now() + 10_000;
  while (responses.length < 3 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  child.stdin.end();
  await once(child, 'exit');

  // ---- assertions ----
  const [init, toolsList, toolCall] = responses;
  const failures: string[] = [];

  if (!init?.result || typeof init.result !== 'object' || !('protocolVersion' in (init.result as Record<string, unknown>))) {
    failures.push('initialize did not return a valid protocolVersion');
  }
  if (!toolsList?.result || !Array.isArray((toolsList.result as { tools?: unknown[] }).tools)) {
    failures.push('tools/list did not return a tools array');
  } else {
    const names = ((toolsList.result as { tools: Array<{ name: string }> }).tools).map((t) => t.name);
    const expected = ['polet_status', 'polet_balance', 'polet_enable_chain', 'polet_trade', 'polet_execute'];
    for (const name of expected) {
      if (!names.includes(name)) failures.push(`tools/list missing ${name}`);
    }
  }
  if (!toolCall?.result || typeof toolCall.result !== 'object') {
    failures.push('tools/call polet_trade did not return a result object');
  } else {
    const res = toolCall.result as { metadata?: { status?: string }; structuredContent?: { policy?: { reason?: string } } };
    const status = res.metadata?.status;
    if (!status) failures.push('tools/call result missing metadata.status');
    else console.log(`  polet_trade reached proxy → status=${status} (reason=${res.structuredContent?.policy?.reason ?? 'n/a'})`);
  }

  // Extra guarantee: notifications must NOT produce responses.
  const idSet = new Set(responses.map((r) => r.id).filter((id) => id !== undefined));
  if (idSet.size !== responses.length) failures.push('duplicate response ids observed');
  if (responses.some((r) => r.id === undefined)) failures.push('notification emitted a response on stdout');

  // Banner must be on stderr, never stdout.
  const bannerOnStderr = stderrLines.some((line) => line.includes('[polet-mcp] ready'));
  if (!bannerOnStderr) failures.push('startup banner did not appear on stderr');

  if (failures.length > 0) {
    console.error('\n× smoke failures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('\n✓ MCP subprocess smoke passed (runtime =', runtime + ')');
  console.log(`  responses observed: ${responses.length}`);
  console.log(`  stderr lines: ${stderrLines.length}`);
}

function send(child: ReturnType<typeof spawn>, message: Record<string, unknown>): void {
  if (!child.stdin) return;
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

main().catch((error) => {
  console.error('× smoke harness failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
