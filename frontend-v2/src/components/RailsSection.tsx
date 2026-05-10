import { useMemo } from 'react'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

type Rail = {
  id: 'encrypt' | 'ika' | 'jupiter'
  brand: string
  titleKey: TranslationKey
  bodyKey: TranslationKey
  refKey: TranslationKey
  /** Brand mark icon path served from /brand */
  iconSrc: string
}

const RAILS: Rail[] = [
  {
    id: 'encrypt',
    brand: 'Encrypt',
    titleKey: 'rail.encrypt.title',
    bodyKey: 'rail.encrypt.body',
    refKey: 'rail.encrypt.ref',
    iconSrc: '/brand/encrypt.svg',
  },
  {
    id: 'ika',
    brand: 'Ika',
    titleKey: 'rail.ika.title',
    bodyKey: 'rail.ika.body',
    refKey: 'rail.ika.ref',
    iconSrc: '/brand/ika.svg',
  },
  {
    id: 'jupiter',
    brand: 'Jupiter',
    titleKey: 'rail.jupiter.title',
    bodyKey: 'rail.jupiter.body',
    refKey: 'rail.jupiter.ref',
    iconSrc: '/brand/jupiter.svg',
  },
]

type ParticleLayerProps = {
  count: number
  seed: number
  sizeMin: number
  sizeMax: number
  opacityMin: number
  opacityMax: number
  twinkleRatio: number
  className: string
}

/**
 * Seeded particle field — one layer of tiny dots scattered across the
 * canvas. Stable seed = SSR-consistent positions.
 *
 * Two layers (foreground + background) compose a parallax dust field:
 *   - foreground: bigger / more opaque / faster drift
 *   - background: smaller / dimmer / slower drift, opposite direction
 * The opposing motion creates a "depth" feel without absurd movement.
 *
 * Color: 70% lagoon-bright, 30% white-ish. ~6% have a slow opacity
 * twinkle (SMIL-driven, staggered).
 */
function ParticleLayer({
  count,
  seed,
  sizeMin,
  sizeMax,
  opacityMin,
  opacityMax,
  twinkleRatio,
  className,
}: ParticleLayerProps) {
  const particles = useMemo(() => {
    let s = seed
    const rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
    return Array.from({ length: count }).map(() => {
      const isTeal = rng() < 0.7
      const isTwinkle = rng() < twinkleRatio
      return {
        cx: rng() * 100,
        cy: rng() * 60,
        r: sizeMin + rng() * (sizeMax - sizeMin),
        opacity: opacityMin + rng() * (opacityMax - opacityMin),
        color: isTeal ? 'rgb(45 212 191)' : 'rgb(255 255 255)',
        twinkle: isTwinkle
          ? {
              dur: 2.4 + rng() * 3.6, // 2.4-6s
              begin: -(rng() * 6), // negative offset = in-progress on mount
            }
          : null,
      }
    })
  }, [count, seed, sizeMin, sizeMax, opacityMin, opacityMax, twinkleRatio])

  return (
    <svg
      aria-hidden="true"
      className={`${className} pointer-events-none`}
      preserveAspectRatio="none"
      viewBox="0 0 100 60"
    >
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={p.color}
          opacity={p.twinkle ? undefined : p.opacity}
        >
          {p.twinkle ? (
            <animate
              attributeName="opacity"
              values={`${p.opacity};${(p.opacity * 0.1).toFixed(2)};${p.opacity}`}
              dur={`${p.twinkle.dur}s`}
              begin={`${p.twinkle.begin}s`}
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
      ))}
    </svg>
  )
}

/**
 * Composite particle field — 2 layers stacked (background + foreground)
 * for parallax depth.
 */
function ParticleField() {
  return (
    <>
      <ParticleLayer
        count={900}
        seed={37}
        sizeMin={0.025}
        sizeMax={0.08}
        opacityMin={0.10}
        opacityMax={0.35}
        twinkleRatio={0.04}
        className="pl-rails-particles-bg"
      />
      <ParticleLayer
        count={500}
        seed={7}
        sizeMin={0.04}
        sizeMax={0.11}
        opacityMin={0.20}
        opacityMax={0.55}
        twinkleRatio={0.08}
        className="pl-rails-particles-fg"
      />
    </>
  )
}

/**
 * Rails section — 3 integration rails (Encrypt / Ika / Jupiter) presented
 * as minimal editorial cards on top of a continuous particle dust field
 * with cursor-tracked teal glow. The dust connects the 3 cards visually
 * so they read as one canvas rather than three separate boxes.
 *
 * Anchor #rails so header nav scrolls here.
 */
export function RailsSection() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    target.style.setProperty('--cursor-x', `${x}%`)
    target.style.setProperty('--cursor-y', `${y}%`)
  }

  return (
    <section
      ref={containerRef}
      id="rails"
      className="border-t border-line bg-bg-base py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('rails.kicker')}
          </KickerLabel>
        </div>

        <h2
          className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center md:text-left"
          style={{ transitionDelay: '80ms' }}
        >
          <span className="block">{t('rails.headline.lead')}</span>
          <span className="block text-ink-soft">
            {t('rails.headline.rest')}
          </span>
        </h2>

        <p
          className="pl-reveal mt-6 max-w-3xl text-base md:text-lg text-ink-soft leading-relaxed text-center md:text-left mx-auto md:mx-0"
          style={{ transitionDelay: '160ms' }}
        >
          {t('rails.body')}
        </p>

        {/* 3 cards on continuous particle field */}
        <div
          onMouseMove={handleMouseMove}
          className="pl-rails-bg pl-reveal mt-14 md:mt-20 relative rounded-2xl border border-line bg-bg-deep overflow-hidden"
          style={{ transitionDelay: '240ms' }}
        >
          <ParticleField />

          <div className="relative z-[2] grid grid-cols-1 md:grid-cols-3">
            {RAILS.map((rail, i) => (
              <article
                key={rail.id}
                className="group relative flex flex-col p-8 md:p-10 hover:bg-surface/40 transition"
              >
                {/* Hairline divider between cards (desktop only, except last) */}
                {i < RAILS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:block absolute right-0 top-6 bottom-6 w-px bg-line"
                  />
                )}

                {/* Brand mark — Encrypt is a square logo so bump slightly
                    to match the visual weight of the wider Ika/Jupiter wordmarks. */}
                <img
                  src={rail.iconSrc}
                  alt=""
                  aria-hidden="true"
                  className={`${rail.id === 'encrypt' ? 'h-9' : 'h-7'} w-auto opacity-90`}
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
                <p className="mt-4 text-sm md:text-base text-ink-soft leading-relaxed flex-1">
                  {t(rail.bodyKey)}
                </p>

                {/* Reference link */}
                <div className="mt-8">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright group-hover:text-lagoon transition">
                    {t(rail.refKey)}
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
