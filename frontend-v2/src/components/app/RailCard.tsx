import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
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
  /** Allow scenario action ("Run 5 USDC" / "Approve 5 USDC"). */
  allowActionKey: ActionKey
  allowActionLabelKey: TranslationKey
  allowActionLoadingKey: TranslationKey
}

type RailCardProps = {
  rail: Rail
  index: number
  totalCount: number
  /** Currently loading action key from console state, or null. */
  loading: ActionKey | null
  /** True when prerequisites met (wallet + custody + policy + active session). */
  enabled: boolean
  onBlock: () => void
  onAllow: () => void
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
  onBlock,
  onAllow,
}: RailCardProps) {
  const { t } = useLocale()
  const isLast = index >= totalCount - 1
  const blockLoading = loading === rail.blockActionKey
  const allowLoading = loading === rail.allowActionKey
  const anyLoading = loading !== null

  return (
    <article className="group relative flex flex-col p-8 md:p-10 hover:bg-surface/40 transition">
      {/* Hairline divider between cards (desktop only, except last) */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="hidden md:block absolute right-0 top-6 bottom-6 w-px bg-line"
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

      {/* Action buttons */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onBlock}
          disabled={!enabled || anyLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-coral/40 bg-coral/5 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/10 hover:border-coral transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {blockLoading
            ? t(rail.blockActionLoadingKey)
            : t(rail.blockActionLabelKey)}
        </button>
        <button
          type="button"
          onClick={onAllow}
          disabled={!enabled || anyLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-2 text-xs font-medium text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allowLoading
            ? t(rail.allowActionLoadingKey)
            : t(rail.allowActionLabelKey)}
        </button>
      </div>

      {/* Pre-alpha disclaimer foot strip, NEW vs landing rails */}
      <p className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {t(rail.disclaimerKey)}
      </p>
    </article>
  )
}
