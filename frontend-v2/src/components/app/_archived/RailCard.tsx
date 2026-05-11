/**
 * ARCHIVED — Phase 7 (issue 105) moved this file out of the active
 * Polet Portal tree on 2026-05-11. Replaced by the Polet Portal
 * surface (issues 099-105). Kept on disk so future contributors can
 * reference the previous shape.
 *
 * If you're looking for the new equivalent, see:
 *   - components/app/portal/    chrome (sidebar, mobile bar, drawer)
 *   - components/app/workspace/ /app/workspace
 *   - components/app/gate/      /app/gate
 *   - components/app/funds/     /app/funds
 *   - components/app/proof/     /app/proof
 *   - components/app/bridge/    /app/bridge
 *   - components/app/selectors/console-selectors.ts (shared state derivations)
 *
 * Do not import from this file in new code. Mounted by:
 *   git log --diff-filter=A -- frontend-v2/src/components/app/RailCard.tsx
 */
import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { Spinner } from './Spinner'
import type { ActionKey } from './use-console-actions'

export type Rail = {
  id: 'jupiter' | 'ika'
  brand: string                  // 'Jupiter' | 'Ika'
  iconSrc: string                // /brand/jupiter.svg | /brand/ika.svg
  titleKey: TranslationKey
  bodyKey: TranslationKey
  disclaimerKey: TranslationKey
  /** Block scenario action ("Try 25 USDC") — calls runJupiter|IkaBlock. */
  blockActionKey: ActionKey
  blockActionLabelKey: TranslationKey
  blockActionLoadingKey: TranslationKey
  blockHintKey: TranslationKey
  /** Allow scenario action ("Run 5 USDC" / "Approve 5 USDC"). */
  allowActionKey: ActionKey
  allowActionLabelKey: TranslationKey
  allowActionLoadingKey: TranslationKey
  allowHintKey: TranslationKey
  /**
   * Optional execute scenario action (Phase 2 of PRD 098). When set,
   * the rail card renders a third button beneath the block/allow
   * pair that runs the policy verdict AND signs+broadcasts the
   * underlying smart-wallet tx with the BYO session keypair. Only
   * Jupiter rail wires this in Phase 2; Ika gets it in Phase 6 once
   * the lifecycle orchestrator lands.
   */
  executeActionKey?: ActionKey
  executeActionLabelKey?: TranslationKey
  executeActionLoadingKey?: TranslationKey
  executeHintKey?: TranslationKey
}

type RailCardProps = {
  rail: Rail
  index: number
  totalCount: number
  /** Currently loading action key from console state, or null. */
  loading: ActionKey | null
  /** True when prerequisites met (wallet + custody + policy + active session). */
  enabled: boolean
  /**
   * True when sessionKeypair is in memory (Phase 2 needs it to sign).
   * False if session was granted before the persistence fix or was
   * wiped on refresh. Drives the Execute button enabled state +
   * tooltip copy.
   */
  hasSessionKeypair: boolean
  onBlock: () => void
  onAllow: () => void
  onExecute?: () => void
}

/**
 * RailCard, one operational rail in the Two-Rail Console.
 *
 * Used by `<TwoRailConsole>` to render Jupiter + Ika as parallel cards
 * on a continuous particle-dust field. The card chrome intentionally
 * matches the landing's RailsSection so /app feels like the same
 * product, with two additions /app needs that the landing doesn't:
 *
 *   1. Action buttons — Try 25 USDC (block) + Run 5 USDC (allow) for
 *      Jupiter, or Approve 5 USDC for Ika. Disabled until the Setup
 *      Ledger reaches an active session. Result lands in the
 *      ReceiptLog below.
 *   2. Pre-alpha disclaimer foot strip in mono uppercase — explicit
 *      operational boundary on every rail card, not just in a footer
 *      footnote.
 *
 * Tier-1 redesign (Day 12): each action button is two-line — verdict
 * icon + label on top, italic confidential-cap hint underneath. The
 * pair is split by a vertical "policy gate intersect" rail with a
 * monospace `π` symbol at its centre, making explicit the moment the
 * intent passes through Polet's confidential gate before reaching the
 * downstream rail provider.
 *
 * `mt-auto` on the disclaimer pushes it to the bottom of the flex
 * card so disclaimers align across both cards regardless of body
 * length.
 */
export function RailCard({
  rail,
  index,
  totalCount,
  loading,
  enabled,
  hasSessionKeypair,
  onBlock,
  onAllow,
  onExecute,
}: RailCardProps) {
  const { t } = useLocale()
  const isLast = index >= totalCount - 1
  const blockLoading = loading === rail.blockActionKey
  const allowLoading = loading === rail.allowActionKey
  const executeLoading = !!rail.executeActionKey && loading === rail.executeActionKey
  const anyLoading = loading !== null
  const hasExecute =
    !!onExecute &&
    !!rail.executeActionKey &&
    !!rail.executeActionLabelKey &&
    !!rail.executeActionLoadingKey &&
    !!rail.executeHintKey
  const executeDisabled = !enabled || anyLoading || !hasSessionKeypair

  return (
    <article className="group relative flex flex-col p-8 md:p-10 hover:bg-surface/40 transition">
      {/* Hairline divider between cards (desktop only, except last) —
          upgrade from neutral line to a soft lagoon-bright vertical
          gradient so the divider reads as a brand-coloured gate edge,
          matching the per-card π intersect badge in the buttons grid. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="hidden md:block absolute right-0 top-6 bottom-6 w-px bg-gradient-to-b from-transparent via-lagoon-bright/30 to-transparent"
        />
      )}

      {/* Brand mark, h-7 like landing rails (Ika/Jupiter wordmarks) */}
      <img
        src={rail.iconSrc}
        alt=""
        aria-hidden="true"
        className="h-7 w-auto opacity-90"
      />

      {/* Brand name in mono uppercase kicker */}
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-ink-mute">
        {rail.brand}
      </p>

      {/* Title */}
      <h3 className="mt-2 font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
        {t(rail.titleKey)}
      </h3>

      {/* Body */}
      <p className="mt-4 text-sm md:text-base text-ink-soft leading-relaxed">
        {t(rail.bodyKey)}
      </p>

      {/* Action buttons with policy-gate intersect */}
      <div className="mt-6 relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onBlock}
          disabled={!enabled || anyLoading}
          className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-coral/40 bg-coral/5 px-3 py-3 hover:bg-coral/10 hover:border-coral transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-coral">
            {blockLoading ? (
              <Spinner size={11} />
            ) : (
              <span aria-hidden="true" className="font-mono">✗</span>
            )}
            {blockLoading
              ? t(rail.blockActionLoadingKey)
              : t(rail.blockActionLabelKey)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-coral/70">
            {t(rail.blockHintKey)}
          </span>
        </button>

        {/* Policy gate intersect — vertical lagoon rail with π badge */}
        <span
          aria-hidden="true"
          className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] h-[60%] w-px bg-gradient-to-b from-transparent via-lagoon-bright/40 to-transparent"
        />
        <span
          aria-hidden="true"
          title="policy gate intersect"
          className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] items-center justify-center h-6 w-6 rounded-full border border-lagoon-bright/40 bg-bg-deep font-mono text-[11px] text-lagoon-bright shadow-[0_0_12px_rgba(45,212,191,0.35)]"
        >
          π
        </span>

        <button
          type="button"
          onClick={onAllow}
          disabled={!enabled || anyLoading}
          className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-3 hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-lagoon-bright">
            {allowLoading ? (
              <Spinner size={11} />
            ) : (
              <span aria-hidden="true" className="font-mono">✓</span>
            )}
            {allowLoading
              ? t(rail.allowActionLoadingKey)
              : t(rail.allowActionLabelKey)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lagoon-bright/70">
            {t(rail.allowHintKey)}
          </span>
        </button>
      </div>

      {/* Phase 2 — Execute button (real on-chain broadcast).
          Rendered when the rail wires executeActionKey + onExecute.
          Disabled when prerequisites aren't met (session not active,
          sessionKeypair not in memory, or another action in flight).
          Coral-mid accent to distinguish from the preview pair —
          this is the "actually swap" CTA. */}
      {hasExecute ? (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={onExecute}
            disabled={executeDisabled}
            title={
              !enabled
                ? 'Complete setup ledger first'
                : !hasSessionKeypair
                  ? 'Session keypair not in memory — re-grant first'
                  : undefined
            }
            className="w-full flex flex-col items-center justify-center gap-0.5 rounded-lg border border-lagoon-bright bg-lagoon-bright/15 px-3 py-3 hover:bg-lagoon-bright/25 hover:border-lagoon-bright transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon-bright">
              {executeLoading ? (
                <Spinner size={11} />
              ) : (
                <span aria-hidden="true" className="font-mono">↗</span>
              )}
              {executeLoading
                ? t(rail.executeActionLoadingKey as TranslationKey)
                : t(rail.executeActionLabelKey as TranslationKey)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lagoon-bright/80">
              {t(rail.executeHintKey as TranslationKey)}
            </span>
          </button>
        </div>
      ) : null}

      {/* Pre-alpha disclaimer foot strip, NEW vs landing rails */}
      <p className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {t(rail.disclaimerKey)}
      </p>
    </article>
  )
}
