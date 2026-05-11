/**
 * Shared types + small helpers for the Policy Gate page (issue 101).
 *
 * `Rail` is the operational execution rail. Jupiter routes USDC swaps
 * on Solana, Ika handles bridgeless dWallet signing on Sui devnet.
 * Ethereum support for Ika is parked (Phase 4+ work) so the rail
 * selector only exposes "Ika · Sui".
 *
 * `Scenario` is the active demo chip on `<ScenarioRow>`:
 *   - `allow-jupiter` → "Allow Jupiter 5 USDC" (allow path)
 *   - `block-25`      → "Block 25 USDC" (blocked path, same rail)
 *   - `ika`           → "Ika Sui approval" (Ika allow path)
 *
 * Switching scenarios drives both the composer's visible amount and
 * (for the cross-rail scenarios) the rail selector. The parent route
 * owns the state machine — these helpers stay pure so they can be
 * tested + reused by the `/app/gate-preview` dev route.
 */

export type Rail = 'jupiter' | 'ika'
export type Scenario = 'allow-jupiter' | 'block-25' | 'ika'

/** Visible amount in the composer for each scenario chip. */
export function amountForScenario(scenario: Scenario): 5 | 25 {
  return scenario === 'block-25' ? 25 : 5
}

/** Rail implied by a scenario chip. `block-25` stays on the current
 * rail (mirrors the existing `<TwoRailConsole>` behaviour where the
 * blocked demo path uses whichever rail is active). */
export function railForScenario(
  scenario: Scenario,
  fallback: Rail,
): Rail {
  if (scenario === 'allow-jupiter') return 'jupiter'
  if (scenario === 'ika') return 'ika'
  return fallback
}

/** Scenario implied by a rail switch. When the operator flips the
 * rail dropdown, we nudge the scenario chip to match so amount + rail
 * stay consistent. The blocked scenario is preserved when active. */
export function scenarioForRail(
  rail: Rail,
  current: Scenario,
): Scenario {
  if (current === 'block-25') return 'block-25'
  return rail === 'ika' ? 'ika' : 'allow-jupiter'
}
