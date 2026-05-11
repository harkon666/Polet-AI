#!/usr/bin/env bun
/**
 * Polet smoke test — Phase 1 baseline.
 *
 * Verifies that all current /app capabilities work end-to-end against
 * devnet without writing new state. Read-only (preview-only) so it's
 * safe to run repeatedly and idempotent across runs.
 *
 * Sequence (per PRD 098 Phase 1):
 *   1. Proxy health        GET  /health
 *   2. Wallet state        GET  /wallet/:owner
 *   3. Jupiter block       POST /intent/dca/run        amount=25
 *   4. Jupiter allow       POST /intent/dca/run        amount=5
 *   5. Ika block           POST /intent/multichain/run amount=25
 *   6. Ika allow           POST /intent/multichain/run amount=5
 *
 * Each step records elapsed ms + pass/fail. Exit code 0 on full pass,
 * 1 on any failure. Output is a single NDJSON-friendly summary block
 * at the end so CI can parse the result.
 *
 * Usage:
 *   POLET_OWNER=...
 *   POLET_SESSION_KEY=...
 *   POLET_PROXY_URL=http://localhost:3001
 *   bun run scripts/smoke-test.ts
 */

type Env = Record<string, string | undefined>
const env = (((globalThis as unknown as { Bun?: { env: Env }; process?: { env: Env } }).Bun?.env)
  ?? ((globalThis as unknown as { process?: { env: Env } }).process?.env)
  ?? {}) as Env

function requireEnv(name: string): string {
  const value = env[name]
  if (!value) {
    process.stderr.write(`[polet-smoke] missing env ${name}\n`)
    process.exit(1)
  }
  return value
}

const OWNER = requireEnv('POLET_OWNER')
const SESSION_KEY = requireEnv('POLET_SESSION_KEY')
const PROXY_URL = env.POLET_PROXY_URL?.replace(/\/$/, '') ?? 'http://localhost:3001'

// 32-byte all-7s witness fixture, matches frontend-v2 useConsole.ts
// + sdk/local-agent-runner.ts default. Required by /intent/*/run when
// the policy is sealed under the official Encrypt path.
const WITNESS_FIXTURE = Array.from({ length: 32 }, () => 7)

const BLOCK_AMOUNT_USDC = '25'
const ALLOW_AMOUNT_USDC = '5'

type StepResult = {
  name: string
  ok: boolean
  ms: number
  details?: Record<string, unknown>
  error?: string
}

async function timed<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result?: T; step: StepResult }> {
  const start = performance.now()
  try {
    const result = await fn()
    return {
      result,
      step: { name, ok: true, ms: Math.round(performance.now() - start) },
    }
  } catch (err) {
    return {
      step: {
        name,
        ok: false,
        ms: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
  }
  const body = (await res.json()) as { success?: boolean; data?: T; error?: { message?: string } }
  if (body.success === false) {
    throw new Error(body.error?.message ?? `proxy returned success=false at ${url}`)
  }
  return (body.data ?? body) as T
}

// ─── Step 1 — proxy health ──────────────────────────────────────────
async function step1Health(): Promise<{ ok: true }> {
  await fetchJson(`${PROXY_URL}/health`)
  return { ok: true }
}

// ─── Step 2 — wallet state ──────────────────────────────────────────
type WalletData = {
  walletPda?: string
  policySeq?: number
  policyCommitment?: number[]
  usdcDcaPolicy?: { enabled?: boolean }
  sessions?: Array<{ key: string; authorized?: boolean; expiresAt?: number }>
  temporalKeys?: Array<{ key: string; authorized?: boolean; expiresAt?: number }>
}

async function step2WalletState(): Promise<{
  walletPda: string
  policySealed: boolean
  policySeq: number
  sessionActive: boolean
}> {
  const data = await fetchJson<WalletData>(`${PROXY_URL}/wallet/${OWNER}`)
  if (!data?.walletPda) {
    throw new Error('wallet not initialized — run /app setup row 01 first')
  }
  if (!data?.usdcDcaPolicy?.enabled) {
    throw new Error('confidential policy not sealed — run /app setup row 03 first')
  }
  const sessions = data.temporalKeys ?? data.sessions ?? []
  const matching = sessions.find(
    (s) =>
      s &&
      s.authorized === true &&
      String(s.key) === SESSION_KEY &&
      Number(s.expiresAt ?? 0) * 1000 > Date.now(),
  )
  if (!matching) {
    throw new Error(
      `session ${SESSION_KEY.slice(0, 4)}…${SESSION_KEY.slice(-4)} not authorized for owner ${OWNER.slice(0, 4)}…${OWNER.slice(-4)}`,
    )
  }
  return {
    walletPda: data.walletPda,
    policySealed: true,
    policySeq: data.policySeq ?? 0,
    sessionActive: true,
  }
}

// ─── Step 3+4 — Jupiter preview ─────────────────────────────────────
type IntentResult = {
  allowed: boolean
  code: string
  reason?: string
}

async function jupiterPreview(amountUsdc: string): Promise<IntentResult> {
  return fetchJson<IntentResult>(`${PROXY_URL}/intent/dca/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner: OWNER,
      sessionKey: SESSION_KEY,
      amountUsdc,
      slippageBps: 100,
      maskedWitnessDevFixture: WITNESS_FIXTURE,
    }),
  })
}

async function step3JupiterBlock(): Promise<{
  allowed: boolean
  code: string
  reason: string | undefined
}> {
  const result = await jupiterPreview(BLOCK_AMOUNT_USDC)
  if (result.allowed !== false) {
    throw new Error(
      `expected allowed=false at amount=${BLOCK_AMOUNT_USDC} but got allowed=${result.allowed}`,
    )
  }
  return { allowed: result.allowed, code: result.code, reason: result.reason }
}

async function step4JupiterAllow(): Promise<{
  allowed: boolean
  code: string
  reason: string | undefined
}> {
  const result = await jupiterPreview(ALLOW_AMOUNT_USDC)
  if (result.allowed !== true) {
    throw new Error(
      `expected allowed=true at amount=${ALLOW_AMOUNT_USDC} but got allowed=${result.allowed} (${result.reason ?? result.code})`,
    )
  }
  return { allowed: result.allowed, code: result.code, reason: result.reason }
}

// ─── Step 5+6 — Ika preview ─────────────────────────────────────────
async function ikaPreview(amount: string): Promise<IntentResult> {
  return fetchJson<IntentResult>(`${PROXY_URL}/intent/multichain/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: `polet-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      owner: OWNER,
      sessionKey: SESSION_KEY,
      action: 'multichain-strategy',
      params: {
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: 'sui',
        targetAsset: 'SUI',
        amount,
        executionRail: 'ika',
        strategy: 'dca',
        slippageBps: 150,
        maskedWitnessDevFixture: WITNESS_FIXTURE,
      },
      timestamp: Math.floor(Date.now() / 1000),
    }),
  })
}

async function step5IkaBlock(): Promise<{
  allowed: boolean
  code: string
  reason: string | undefined
}> {
  const result = await ikaPreview(BLOCK_AMOUNT_USDC)
  if (result.allowed !== false) {
    throw new Error(
      `expected allowed=false at amount=${BLOCK_AMOUNT_USDC} but got allowed=${result.allowed}`,
    )
  }
  return { allowed: result.allowed, code: result.code, reason: result.reason }
}

async function step6IkaAllow(): Promise<{
  allowed: boolean
  code: string
  reason: string | undefined
}> {
  const result = await ikaPreview(ALLOW_AMOUNT_USDC)
  if (result.allowed !== true) {
    throw new Error(
      `expected allowed=true at amount=${ALLOW_AMOUNT_USDC} but got allowed=${result.allowed} (${result.reason ?? result.code})`,
    )
  }
  return { allowed: result.allowed, code: result.code, reason: result.reason }
}

// ─── Run all steps ──────────────────────────────────────────────────
async function main(): Promise<void> {
  const steps: StepResult[] = []

  process.stderr.write(`[polet-smoke] proxy=${PROXY_URL} owner=${OWNER.slice(0, 4)}…${OWNER.slice(-4)} session=${SESSION_KEY.slice(0, 4)}…${SESSION_KEY.slice(-4)}\n`)

  const r1 = await timed('proxy.health', step1Health)
  steps.push(r1.step)
  process.stderr.write(`[polet-smoke] 1 ${r1.step.ok ? 'OK' : 'FAIL'} proxy.health (${r1.step.ms}ms)${r1.step.error ? ' — ' + r1.step.error : ''}\n`)
  if (!r1.step.ok) return finish(steps)

  const r2 = await timed('wallet.state', step2WalletState)
  if (r2.result) r2.step.details = r2.result as unknown as Record<string, unknown>
  steps.push(r2.step)
  process.stderr.write(`[polet-smoke] 2 ${r2.step.ok ? 'OK' : 'FAIL'} wallet.state (${r2.step.ms}ms)${r2.step.error ? ' — ' + r2.step.error : ''}\n`)
  if (!r2.step.ok) return finish(steps)

  const r3 = await timed('jupiter.block', step3JupiterBlock)
  if (r3.result) r3.step.details = r3.result as unknown as Record<string, unknown>
  steps.push(r3.step)
  process.stderr.write(`[polet-smoke] 3 ${r3.step.ok ? 'OK' : 'FAIL'} jupiter.block (${r3.step.ms}ms)${r3.step.error ? ' — ' + r3.step.error : ''}\n`)

  const r4 = await timed('jupiter.allow', step4JupiterAllow)
  if (r4.result) r4.step.details = r4.result as unknown as Record<string, unknown>
  steps.push(r4.step)
  process.stderr.write(`[polet-smoke] 4 ${r4.step.ok ? 'OK' : 'FAIL'} jupiter.allow (${r4.step.ms}ms)${r4.step.error ? ' — ' + r4.step.error : ''}\n`)

  const r5 = await timed('ika.block', step5IkaBlock)
  if (r5.result) r5.step.details = r5.result as unknown as Record<string, unknown>
  steps.push(r5.step)
  process.stderr.write(`[polet-smoke] 5 ${r5.step.ok ? 'OK' : 'FAIL'} ika.block (${r5.step.ms}ms)${r5.step.error ? ' — ' + r5.step.error : ''}\n`)

  const r6 = await timed('ika.allow', step6IkaAllow)
  if (r6.result) r6.step.details = r6.result as unknown as Record<string, unknown>
  steps.push(r6.step)
  process.stderr.write(`[polet-smoke] 6 ${r6.step.ok ? 'OK' : 'FAIL'} ika.allow (${r6.step.ms}ms)${r6.step.error ? ' — ' + r6.step.error : ''}\n`)

  finish(steps)
}

function finish(steps: StepResult[]): void {
  const passed = steps.filter((s) => s.ok).length
  const failed = steps.length - passed
  const totalMs = steps.reduce((acc, s) => acc + s.ms, 0)

  console.log(
    JSON.stringify(
      {
        runtime: 'polet-smoke',
        phase: 'baseline',
        owner: OWNER,
        sessionKey: SESSION_KEY,
        proxyUrl: PROXY_URL,
        steps,
        summary: {
          total: steps.length,
          passed,
          failed,
          totalMs,
        },
      },
      null,
      2,
    ),
  )

  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  process.stderr.write(`[polet-smoke] uncaught: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
