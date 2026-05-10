import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'

export type Rail = {
  id: 'jupiter' | 'ika'
  brand: string                  // 'Jupiter' | 'Ika'
  iconSrc: string                // /brand/jupiter.svg | /brand/ika.svg
  titleKey: TranslationKey
  bodyKey: TranslationKey
  disclaimerKey: TranslationKey
}

type RailCardProps = {
  rail: Rail
  index: number
  totalCount: number
}

/**
 * RailCard, one operational rail in the Two-Rail Console.
 *
 * Used by `<TwoRailConsole>` to render Jupiter + Ika as parallel cards
 * on a continuous particle-dust field. The card chrome intentionally
 * matches the landing's RailsSection so /app feels like the same
 * product, with two additions /app needs that the landing doesn't:
 *
 *   1. An action slot — Day 10 wires the Try 25 / Run 5 (or Approve 5)
 *      buttons. Day 9 leaves it empty so the chrome is honest about
 *      functionality that isn't connected yet.
 *   2. A pre-alpha disclaimer foot strip in mono uppercase — explicit
 *      operational boundary on every rail card, not just in a footer
 *      footnote.
 *
 * `mt-auto` on the disclaimer pushes it to the bottom of the flex
 * card so disclaimers align across both cards regardless of body
 * length.
 */
export function RailCard({ rail, index, totalCount }: RailCardProps) {
  const { t } = useLocale()
  const isLast = index >= totalCount - 1

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

      {/* Action slot — Day 10 fills with Try 25 USDC / Run 5 USDC
          (Jupiter) or Approve 5 USDC (Ika) buttons. Day 9 keeps this
          empty so users don't see disabled buttons that imply broken
          wiring. */}

      {/* Pre-alpha disclaimer foot strip, NEW vs landing rails */}
      <p className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {t(rail.disclaimerKey)}
      </p>
    </article>
  )
}
