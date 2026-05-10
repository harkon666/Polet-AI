import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

type Problem = {
  titleKey: TranslationKey
  descKey: TranslationKey
}

const PROBLEMS: Problem[] = [
  { titleKey: 'manifesto.problem1.title', descKey: 'manifesto.problem1.desc' },
  { titleKey: 'manifesto.problem2.title', descKey: 'manifesto.problem2.desc' },
  { titleKey: 'manifesto.problem3.title', descKey: 'manifesto.problem3.desc' },
]

/**
 * Manifesto section — kicker + 2-line headline + intro paragraph + 3
 * problem cards. Establishes "the delegation problem" Polet solves.
 *
 * Layout: max-w-6xl centered. Kicker centered. Headline left-aligned at
 * desktop (sets a more authored tone), centered on mobile. 3 cards in
 * 1-col mobile / 3-col desktop grid.
 */
export function Manifesto() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  return (
    <section
      ref={containerRef}
      id="manifesto"
      className="border-t border-line bg-bg-deep py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Kicker */}
        <div className="text-center md:text-left">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('manifesto.kicker')}
          </KickerLabel>
        </div>

        {/* Headline */}
        <h2
          className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center md:text-left"
          style={{ transitionDelay: '80ms' }}
        >
          <span className="block">{t('manifesto.headlineLead')}</span>
          <span className="block text-ink-soft">{t('manifesto.headlineRest')}</span>
        </h2>

        {/* Body intro */}
        <p
          className="pl-reveal mt-6 max-w-3xl text-base md:text-lg text-ink-soft leading-relaxed text-center md:text-left mx-auto md:mx-0"
          style={{ transitionDelay: '160ms' }}
        >
          {t('manifesto.body')}
        </p>

        {/* 3 problem cards */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {PROBLEMS.map((problem, i) => (
            <article
              key={problem.titleKey}
              className="pl-reveal group relative rounded-2xl border border-line bg-surface p-6 md:p-7 hover:border-line-strong hover:bg-surface-raised transition"
              style={{ transitionDelay: `${240 + i * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 items-center justify-center rounded-full border border-line-strong bg-bg-base font-mono text-xs font-semibold text-lagoon-bright"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-sans text-lg md:text-xl font-bold text-ink leading-tight">
                  {t(problem.titleKey)}
                </h3>
              </div>
              <p className="mt-4 text-sm md:text-base text-ink-soft leading-relaxed">
                {t(problem.descKey)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
