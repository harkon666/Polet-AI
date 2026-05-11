import type { IkaManagedChain } from '#shared/lib/api'
import type {
  ConsoleData,
  ConsoleState,
  ReceiptEntry,
} from '../use-console-actions'

/**
 * Polet Portal — shared console selectors.
 *
 * Pure derivations over `ConsoleState` / `ConsoleData`, consumed by the
 * Workspace / Gate / Funds / Proof / Bridge pages so each page reads
 * the same canonical shape instead of recomputing inline. Keeping the
 * derivations centralised prevents drift between, e.g., the
 * Workspace readiness strip and the Funds page setup list.
 *
 * Rules:
 *   - No React hooks. No state mutation. Pure functions only.
 *   - Inputs come from `useConsole().state`. Callers pass `state` (or
 *     `state.data`) — selectors never call `useConsole` themselves.
 *   - Return values are plain JS objects, safe to render directly.
 *
 * Phase 2 (issue 100) seeds this module with the selectors needed by
 * the Workspace home. Phases 3–6 extend with rail-verdict + funds
 * helpers as they're needed.
 */

/* ─────────────────────────── Readiness ─────────────────────────── */

/**
 * The five readiness slots tracked across the portal. Each becomes a
 * pill on the Workspace home and a row on the Funds & Setup page.
 *
 *   wallet   — smart-wallet PDA initialized?
 *   custody  — PDA custody token accounts registered AND funded with
 *              demo USDC? (Two-step: `'pending'` (not registered),
 *              `'needs'` (registered but unfunded), `'done'`).
 *   policy   — confidential numeric policy sealed?
 *   session  — agent session key authorized and not expired?
 *   gas      — session keypair present + at least one fund-gas receipt
 *              seen? (Heuristic until Phase 4 surfaces a live agent
 *              gas balance from `connection.getBalance(sessionKey)`.)
 */
export type ReadinessSlot = 'wallet' | 'custody' | 'policy' | 'session' | 'gas'
export type ReadinessValue = 'done' | 'pending' | 'needs'

export type Readiness = Record<ReadinessSlot, ReadinessValue>

/** Order in which the Workspace home asks the operator to act. */
export const READINESS_ORDER: ReadinessSlot[] = [
  'wallet',
  'custody',
  'policy',
  'session',
  'gas',
]

/** Pull the receipts array off `ConsoleState`, defensively. */
function receipts(state: ConsoleState | null | undefined): ReceiptEntry[] {
  return state?.receipts ?? []
}

/**
 * isCustodyFunded — heuristic combining two signals:
 *   1. Live `state.data.custodyBalances.usdcUi` parses to > 0.
 *   2. The receipt log has a `USDC DEPOSITED` entry (covers the
 *      moment after deposit before `refresh()` lands).
 */
export function isCustodyFunded(state: ConsoleState | null | undefined): boolean {
  const usdcUi = Number(state?.data?.custodyBalances?.usdcUi ?? '0')
  if (Number.isFinite(usdcUi) && usdcUi > 0) return true
  return receipts(state).some((r) => r.action.includes('USDC DEPOSITED'))
}

/**
 * hasActiveSession — true when at least one entry in `temporalKeys`
 * (legacy: `sessions`) is `authorized` and its `expiresAt` epoch hasn't
 * passed. Mirrors the find-active-session logic in
 * `use-console-actions.tsx` so Workspace + Gate + Funds agree on what
 * "session active" means.
 */
export function hasActiveSession(state: ConsoleState | null | undefined): boolean {
  const list =
    state?.data?.temporalKeys ?? state?.data?.sessions ?? []
  return list.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) =>
      s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
  )
}

/**
 * isAgentGasFunded — heuristic until Phase 4 surfaces a live balance:
 *   - session keypair is in memory (so the agent can sign), AND
 *   - the receipt log has a `SOL FUNDED TO AGENT` entry.
 *
 * Returns false when no session keypair exists even if the receipt
 * is there, because the secret key is what actually drives broadcast.
 */
export function isAgentGasFunded(
  state: ConsoleState | null | undefined,
): boolean {
  if (!state?.sessionKeypair) return false
  return receipts(state).some((r) => r.action.includes('SOL FUNDED TO AGENT'))
}

/**
 * deriveReadiness — five slots, three states each.
 *
 * Slot rules:
 *   - wallet: walletPda present → 'done'; else 'pending'.
 *   - custody: not registered → 'pending'; registered + unfunded →
 *     'needs'; registered + funded → 'done'.
 *   - policy: usdcDcaPolicy.enabled OR policySeq > 0 → 'done'; else 'pending'.
 *   - session: hasActiveSession → 'done'; else 'pending'.
 *   - gas: isAgentGasFunded → 'done'; session active but unfunded →
 *     'needs'; no session → 'pending'.
 */
export function deriveReadiness(
  state: ConsoleState | null | undefined,
): Readiness {
  const data: ConsoleData | null = state?.data ?? null

  const wallet: ReadinessValue = data?.walletPda ? 'done' : 'pending'

  const custodyRegistered = Boolean(data?.demoCustody?.configured)
  const custodyFunded = isCustodyFunded(state)
  const custody: ReadinessValue = !custodyRegistered
    ? 'pending'
    : custodyFunded
      ? 'done'
      : 'needs'

  const policySealed = Boolean(
    data?.usdcDcaPolicy?.enabled || (data?.policySeq ?? 0) > 0,
  )
  const policy: ReadinessValue = policySealed ? 'done' : 'pending'

  const sessionActive = hasActiveSession(state)
  const session: ReadinessValue = sessionActive ? 'done' : 'pending'

  const gas: ReadinessValue = isAgentGasFunded(state)
    ? 'done'
    : sessionActive
      ? 'needs'
      : 'pending'

  return { wallet, custody, policy, session, gas }
}

/* ────────────────────────── Blocking step ────────────────────────── */

/**
 * nextBlockingStep — the first slot in canonical order whose value
 * isn't `'done'`. Drives the Workspace home title + primary CTA. When
 * everything is `'done'`, returns `null` (operator is ready to execute).
 *
 * Order: wallet → custody → policy → session → gas.
 */
export function nextBlockingStep(
  state: ConsoleState | null | undefined,
): ReadinessSlot | null {
  const r = deriveReadiness(state)
  for (const slot of READINESS_ORDER) {
    if (r[slot] !== 'done') return slot
  }
  return null
}

/* ─────────────────────────── Receipts ─────────────────────────── */

/** latestReceipt — head of the append-prepended receipts feed, or null. */
export function latestReceipt(
  state: ConsoleState | null | undefined,
): ReceiptEntry | null {
  return receipts(state)[0] ?? null
}

/**
 * Latest rail-related receipt for a specific rail, used by the Gate
 * page's live verdict + the Workspace activity line when the operator
 * has just run a rail.
 */
export function latestRailVerdict(
  state: ConsoleState | null | undefined,
  rail: 'jupiter' | 'ika',
): { rail: 'jupiter' | 'ika'; entry: ReceiptEntry } | null {
  const needle = rail === 'jupiter' ? 'JUPITER' : 'IKA'
  const found = receipts(state).find((r) => r.action.includes(needle))
  return found ? { rail, entry: found } : null
}

/**
 * Gate-page verdict pill state, derived from the latest rail receipt
 * and the in-flight action key. Drives:
 *   - The hero verdict pill (READY / ALLOWED / BLOCKED / EVALUATING)
 *   - The `<GateOrb>`'s centered word
 *   - The `<FlowCanvas>` node-3 verdict line tone (palm vs coral)
 *
 * Resolution order:
 *   1. If `state.loading` is one of the rail's action keys, return
 *      'evaluating' (covers the moment between user click and proxy
 *      response).
 *   2. Otherwise look at the latest rail receipt's `status`:
 *      `allowed` → 'allowed', `blocked` or `error` → 'blocked'.
 *   3. Anything else (info, pending, no receipts) → 'ready'.
 */
export type GatePillState = 'ready' | 'allowed' | 'blocked' | 'evaluating'

const JUPITER_ACTION_KEYS = new Set([
  'jupiter-allow',
  'jupiter-block',
  'jupiter-execute',
])

const IKA_ACTION_KEYS = new Set(['ika-allow', 'ika-block', 'ika-execute'])

export function getGatePillState(
  state: ConsoleState | null | undefined,
  rail: 'jupiter' | 'ika',
): GatePillState {
  const loading = state?.loading
  const railKeys = rail === 'jupiter' ? JUPITER_ACTION_KEYS : IKA_ACTION_KEYS
  if (loading && railKeys.has(loading)) return 'evaluating'

  const verdict = latestRailVerdict(state, rail)
  if (!verdict) return 'ready'
  const s = verdict.entry.status
  if (s === 'allowed') return 'allowed'
  if (s === 'blocked' || s === 'error') return 'blocked'
  return 'ready'
}

/* ─────────────────────────── Ika chain ─────────────────────────── */

/**
 * getActiveIkaChain — derive the currently active managed Ika chain
 * from the on-chain registration label/curve, mirroring the private
 * helper in `use-console-actions.tsx` so Workspace / Funds / Gate
 * agree on Ika reachability.
 */
export function getActiveIkaChain(
  state: ConsoleState | null | undefined,
): IkaManagedChain | null {
  const registration = state?.data?.ikaManaged?.registration
  if (!registration) return null
  if (registration.label === 'managed-curve25519' || registration.curve === 2) {
    return 'sui'
  }
  if (registration.label === 'managed-secp256k1' || registration.curve === 0) {
    return 'ethereum'
  }
  return null
}

/* ────────────────────────── Readiness pills ────────────────────────── */

/**
 * Render shape for `<ReadinessStrip>` — the Workspace home's
 * 5-pill row. One entry per slot, in canonical order. The component
 * uses `slot` to pick its label key
 * (`portal.readiness.label.<slot>`) and `value` for tone (palm if
 * `'done'`, sunset otherwise).
 */
export type ReadinessPill = {
  slot: ReadinessSlot
  value: ReadinessValue
}

export function getReadinessPills(
  state: ConsoleState | null | undefined,
): ReadinessPill[] {
  const r = deriveReadiness(state)
  return READINESS_ORDER.map((slot) => ({ slot, value: r[slot] }))
}
