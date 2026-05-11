import type { ConsoleState } from '../use-console-actions'
import type { IkaManagedChain } from '#shared/lib/api'
import {
  getActiveIkaChain,
  hasActiveSession,
  isAgentGasFunded,
  isCustodyFunded,
} from '../selectors/console-selectors'

/**
 * Funds & Setup page selectors (issue 102).
 *
 * Pure derivations over `ConsoleState` consumed by `<FundsList>`,
 * `<QuickActions>`, and `<OwnerSetupList>`. Centralised here so the
 * left and right columns of the Funds page can't drift on balance
 * formatting or status interpretation.
 *
 * Rules: no React, no mutation, no `useConsole` calls — pure functions.
 */

export type CustodyBalances = {
  /** USDC custody balance as a stable display string (3 d.p.). */
  usdc: string
  /** Native SOL custody balance as a stable display string. */
  sol: string
  /** Tradable SOL after the proxy's reserve carve-out, for hints. */
  tradableSol: string
  /** True when USDC custody has positive balance (or a deposit receipt was seen). */
  hasUsdc: boolean
  /** Custody is registered AND funded — green/done state. */
  funded: boolean
}

function fmtNumber(s: string | undefined, fallback = '0.000'): string {
  const n = Number(s ?? '0')
  if (!Number.isFinite(n)) return fallback
  return n.toFixed(3)
}

/**
 * Collapses ConsoleData's custody fields into a stable shape. Hides
 * the raw `usdcBaseUnits` / lamports values; downstream UI only needs
 * the display strings + the funded flag.
 */
export function getCustodyBalances(
  state: ConsoleState | null | undefined,
): CustodyBalances {
  const b = state?.data?.custodyBalances
  return {
    usdc: fmtNumber(b?.usdcUi),
    sol: fmtNumber(b?.nativeSolUi),
    tradableSol: fmtNumber(b?.tradableNativeSolUi),
    hasUsdc: Number(b?.usdcUi ?? '0') > 0,
    funded: isCustodyFunded(state),
  }
}

/** Agent gas status — `done` when keypair + fund-gas receipt seen,
 * `needs` when session active but unfunded, `pending` otherwise. */
export type AgentGasStatus = 'done' | 'needs' | 'pending'

export function getAgentGasStatus(
  state: ConsoleState | null | undefined,
): AgentGasStatus {
  if (isAgentGasFunded(state)) return 'done'
  if (hasActiveSession(state)) return 'needs'
  return 'pending'
}

/** Ika dWallet status — currently mirrors `getActiveIkaChain`.
 * Returns the chain glyph + label for the funds list row, or null
 * when no managed chain is registered. */
export type IkaDwalletStatus =
  | { chain: IkaManagedChain; label: string }
  | null

export function getIkaDwalletStatus(
  state: ConsoleState | null | undefined,
): IkaDwalletStatus {
  const chain = getActiveIkaChain(state)
  if (!chain) return null
  return {
    chain,
    label: chain === 'sui' ? 'Sui · managed' : 'Ethereum · managed',
  }
}

/**
 * Owner authority placeholder — today this is always 'owner'. Future
 * recovery-authority + shared Ika quorum work introduces other states
 * (issue 045). Centralising here means the OwnerSetupList row doesn't
 * have to know the future shape.
 */
export type OwnerAuthority = 'owner'

export function getOwnerAuthority(
  _state: ConsoleState | null | undefined,
): OwnerAuthority {
  return 'owner'
}

/**
 * Helper for the OwnerSetupList session row: returns the active
 * session pubkey + expiry in milliseconds, or null when no session.
 */
export type ActiveSessionInfo = {
  pubkey: string | null
  expiresAtMs: number
}

export function getActiveSessionInfo(
  state: ConsoleState | null | undefined,
): ActiveSessionInfo | null {
  const list = state?.data?.temporalKeys ?? state?.data?.sessions ?? []
  const nowSec = Math.floor(Date.now() / 1000)
  const active = list.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s?.authorized && Number(s?.expiresAt ?? 0) > nowSec,
  )
  if (!active) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubkey = (active as any).pubkey ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiresAtMs = Number((active as any).expiresAt ?? 0) * 1000
  return { pubkey, expiresAtMs }
}
