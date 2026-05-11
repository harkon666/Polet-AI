import { useLocale } from '#/hooks/use-locale'
import type { TranslationKey } from '#/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'
import { ParticleField } from './primitives/ParticleField'

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

/**
 * Rails section, 3 integration rails (Encrypt / Ika / Jupiter) presented
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

                {/* Brand mark, Encrypt is a square logo so bump slightly
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
