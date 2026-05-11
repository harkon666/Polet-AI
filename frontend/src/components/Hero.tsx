import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import type { TranslationKey } from '#/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { Button } from './primitives/Button'
import { KickerLabel } from './primitives/KickerLabel'

const PROGRAM_ID_SHORT = 'F7Xd…rS99p'

/**
 * Cycling punchlines for the hero, each ends "Give your agent a budget."
 * with a different value-prop ending. Rotates every 4s with fade animation
 * (skipped when prefers-reduced-motion is on).
 */
const PUNCHLINE_KEYS: TranslationKey[] = [
  'hero.headline.line2.a', // "Not your keys.", session-key model
  'hero.headline.line2.b', // "Hide the limits.", confidential policy
  'hero.headline.line2.c', // "Skip the seed.", no seed exposure
]

const PUNCHLINE_INTERVAL_MS = 4000

/**
 * Polet v2 Hero section.
 *
 * Linear-inspired single-column type-driven hero. Uses brand asset PNG
 * (background-hero.png) with subtle dark overlay + slow drift pan +
 * cursor-tracked teal glow.
 *
 * Hierarchy split: small setup line (PP Mori Semibold, ink-soft) + GIANT
 * punchline (PP Mori Black 900, ink white). Punchline cycles through 3
 * value props (session keys / confidential limits / no seed) every 4s
 * with fade animation, paused for reduced-motion users.
 *
 * All copy via t(). Reveal animation via pl-reveal + IntersectionObserver
 * (useScrollReveal hook).
 */
export function Hero() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const [punchlineIndex, setPunchlineIndex] = useState(0)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) return

    const interval = setInterval(() => {
      setPunchlineIndex((i) => (i + 1) % PUNCHLINE_KEYS.length)
    }, PUNCHLINE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    target.style.setProperty('--cursor-x', `${x}%`)
    target.style.setProperty('--cursor-y', `${y}%`)
  }

  const currentPunchlineKey = PUNCHLINE_KEYS[punchlineIndex]!

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="pl-ambient-hero relative overflow-hidden -mt-16"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-6xl px-6 pt-36 pb-24 sm:pt-44 sm:pb-32 md:pt-52 md:pb-40">
        <div className="text-center space-y-8 md:space-y-10">
          {/* Kicker */}
          <KickerLabel className="pl-reveal">{t('hero.kicker')}</KickerLabel>

          {/* Headline, hierarchy split: small setup + GIANT punchline */}
          <h1
            id="hero-heading"
            className="pl-reveal font-sans"
            style={{ transitionDelay: '80ms' }}
          >
            <span className="block text-lg sm:text-xl md:text-2xl lg:text-3xl text-ink-soft font-semibold leading-snug mb-4 md:mb-5">
              {t('hero.headline.line1')}
            </span>
            <span
              key={currentPunchlineKey}
              className="pl-rotate-in block text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-ink font-black tracking-tighter leading-[0.9] min-h-[1em] text-balance"
            >
              {t(currentPunchlineKey)}
            </span>
          </h1>

          {/* Subhead */}
          <p
            className="pl-reveal font-sans text-base sm:text-lg md:text-xl text-ink-soft mx-auto max-w-2xl leading-relaxed"
            style={{ transitionDelay: '160ms' }}
          >
            {t('hero.subhead')}
          </p>

          {/* CTAs */}
          <div
            className="pl-reveal flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            style={{ transitionDelay: '240ms' }}
          >
            <Link to="/app" tabIndex={-1} aria-label={t('hero.cta.primary')}>
              <Button variant="primary" size="lg">
                {t('hero.cta.primary')}
              </Button>
            </Link>
            <a href="#demo" aria-label={t('hero.cta.secondary')}>
              <Button variant="ghost" size="lg">
                {t('hero.cta.secondary')}
              </Button>
            </a>
          </div>

          {/* Meta strip */}
          <div
            className="pl-reveal flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-6 font-mono text-xs text-ink-mute"
            style={{ transitionDelay: '320ms' }}
          >
            <MetaPill>
              <span className="size-1.5 rounded-full bg-palm animate-pulse" />
              {t('hero.meta.devnet')}
            </MetaPill>
            <MetaDot />
            <MetaPill>
              <span className="text-sunset font-semibold">α</span>
              {t('hero.meta.preAlpha')}
            </MetaPill>
            <MetaDot />
            <MetaPill>
              <span className="text-ink-mute uppercase tracking-wider">
                {t('hero.meta.programLabel')}
              </span>
              <code className="text-ink-soft">{PROGRAM_ID_SHORT}</code>
            </MetaPill>
            <MetaDot />
            <MetaPill>{t('hero.meta.testsPassing')}</MetaPill>
            <MetaDot />
            <MetaPill>{t('hero.meta.e2eVerified')}</MetaPill>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 bg-surface/40 backdrop-blur-sm whitespace-nowrap">
      {children}
    </span>
  )
}

function MetaDot() {
  return (
    <span aria-hidden="true" className="text-line-strong hidden sm:inline">
      ·
    </span>
  )
}
