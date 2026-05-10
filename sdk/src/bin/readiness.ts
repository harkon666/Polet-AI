#!/usr/bin/env node
/**
 * polet-readiness — Pre-Hermes sanity check.
 *
 * Verifies that the Polet stack is ready for an MCP-capable agent to trade:
 *
 *   1. Proxy reachable (`GET /health`).
 *   2. Owner wallet exists on-chain and is initialized.
 *   3. Session key is authorized and not revoked.
 *   4. Confidential policy is configured.
 *   5. (Optional) Managed Ika fixture is loaded so `polet_execute` on the Ika rail can progress.
 *
 * Usage:
 *   node dist/bin/readiness.js
 *     POLET_OWNER=... POLET_SESSION_KEY=... POLET_PROXY_URL=...
 *
 * Exit codes:
 *   0 — all good
 *   1 — required config missing
 *   2 — proxy unreachable
 *   3 — wallet/policy/session not ready
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`[polet-readiness] missing env ${name}\n`);
    process.exit(1);
  }
  return value;
}

interface HealthEnvelope {
  success?: boolean;
  data?: { status?: string; version?: string };
}

interface WalletEnvelope {
  success?: boolean;
  data?: {
    walletPda?: string;
    policyConfigured?: boolean;
    confidentialPolicy?: { enabled?: boolean };
    sessions?: Array<{ key: string; authorized?: boolean; expiresAt?: number }>;
  };
  error?: unknown;
}

interface FixtureEnvelope {
  success?: boolean;
  data?: { version?: number; disclosure?: string; entries?: unknown[] };
}

async function main(): Promise<void> {
  const owner = requireEnv('POLET_OWNER');
  const sessionKey = requireEnv('POLET_SESSION_KEY');
  const baseUrl = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';

  console.log(`→ Polet readiness check`);
  console.log(`  owner:       ${owner}`);
  console.log(`  session key: ${sessionKey}`);
  console.log(`  proxy url:   ${baseUrl}`);

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  // 1. Proxy health
  let health: HealthEnvelope | null = null;
  try {
    const res = await fetch(new URL('/health', normalize(baseUrl)));
    health = (await res.json()) as HealthEnvelope;
    checks.push({
      name: 'proxy /health',
      ok: res.ok && health?.success === true,
      detail: health?.data?.status ?? `HTTP ${res.status}`,
    });
  } catch (error) {
    console.error(`\n✗ Proxy unreachable at ${baseUrl}: ${(error as Error).message}`);
    process.exit(2);
  }

  // 2-4. Wallet + policy + session
  const res = await fetch(new URL(`/wallet/${owner}`, normalize(baseUrl)));
  const envelope = (await res.json().catch(() => ({}))) as WalletEnvelope;
  const wallet = envelope?.data;
  checks.push({
    name: 'wallet registered',
    ok: Boolean(wallet?.walletPda),
    detail: wallet?.walletPda ?? 'missing',
  });
  checks.push({
    name: 'confidential policy enabled',
    ok: wallet?.confidentialPolicy?.enabled === true,
    detail: wallet?.confidentialPolicy?.enabled === true ? 'enabled' : 'not set',
  });
  const session = wallet?.sessions?.find((s) => s.key === sessionKey);
  const sessionOk = Boolean(session?.authorized) && (session?.expiresAt ?? 0) > Date.now();
  checks.push({
    name: 'session authorized',
    ok: sessionOk,
    detail: session
      ? session.authorized
        ? `expires ${new Date(session.expiresAt ?? 0).toISOString()}`
        : 'revoked'
      : 'not granted',
  });

  // 5. Optional managed fixture
  try {
    const fixtureRes = await fetch(new URL('/ika/managed-fixture/status', normalize(baseUrl)));
    if (fixtureRes.status === 503) {
      checks.push({ name: 'ika managed fixture (optional)', ok: false, detail: 'not configured' });
    } else {
      const fixture = (await fixtureRes.json()) as FixtureEnvelope;
      checks.push({
        name: 'ika managed fixture (optional)',
        ok: fixture?.success === true,
        detail: `${fixture?.data?.entries?.length ?? 0} entries`,
      });
    }
  } catch (error) {
    checks.push({ name: 'ika managed fixture (optional)', ok: false, detail: 'unreachable' });
  }

  console.log('\nChecks:');
  for (const check of checks) {
    const symbol = check.ok ? '✓' : '✗';
    console.log(`  ${symbol} ${check.name}: ${check.detail}`);
  }

  const requiredFails = checks.filter((c) => !c.ok && !c.name.includes('optional'));
  if (requiredFails.length > 0) {
    console.error(`\n✗ ${requiredFails.length} required check(s) failed. See docs/hermes-quickstart.md.`);
    process.exit(3);
  }
  console.log('\n✓ Polet stack is ready for Hermes / Claude / Cursor / SendAI trading.');
}

function normalize(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

main().catch((error) => {
  console.error(`✗ readiness check crashed: ${(error as Error).message}`);
  process.exit(1);
});
