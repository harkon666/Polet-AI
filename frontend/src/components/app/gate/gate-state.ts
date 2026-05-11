/**
 * Shared types + small helpers for the Policy Gate page.
 *
 * `Rail` is the operational execution rail. Jupiter routes USDC swaps
 * on Solana, Ika handles bridgeless dWallet signing on Sui devnet.
 * Ethereum support for Ika is parked (Phase 4+ work) so the rail
 * selector only exposes "Ika · Sui".
 *
 * `Scenario` is the active demo chip on `<ScenarioRow>`. Post
 * BYO-redesign the scenarios are PRESETS that set the composer
 * amount + rail; operators can then edit the amount input to any
 * value. When the amount matches a preset, that chip lights up.
 *
 *   - `allow-jupiter` → 5 USDC on Jupiter (green-path demo)
 *   - `block-25`      → 25 USDC (policy-rejection demo, rail preserved)
 *   - `ika`           → 5 USDC on Ika · Sui (cross-chain demo)
 */

export type Rail = 'jupiter' | 'ika'
export type Scenario = 'allow-jupiter' | 'block-25' | 'ika'

/**
 * Match the current composer (amount, rail) pair against a canonical
 * scenario preset. Returns `null` when the values don't line up with
 * any preset, leaving all chips inactive until the operator clicks
 * one again.
 */
export function matchScenarioFromInputs(
  amount: string,
  rail: Rail,
): Scenario | null {
  const num = Number(amount)
  if (!Number.isFinite(num)) return null
  if (num === 5 && rail === 'jupiter') return 'allow-jupiter'
  if (num === 5 && rail === 'ika') return 'ika'
  if (num === 25) return 'block-25'
  return null
}
