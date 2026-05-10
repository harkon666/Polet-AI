import { useEffect, useRef, useState } from 'react'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { KickerLabel } from './primitives/KickerLabel'

/**
 * Stats counter — 4 metrics row that count up from 0 to target on first
 * scroll into view. Static values for hackathon simplicity (mirror v1's
 * landing-stats.json structure but inlined).
 */

type Stat = {
  value: number
  suffix?: string
  labelKey: TranslationKey
  subKey: TranslationKey
}

const STATS: Stat[] = [
  { value: 49, suffix: '+', labelKey: 'stats.1.label', subKey: 'stats.1.sub' },
  { value: 8, labelKey: 'stats.2.label', subKey: 'stats.2.sub' },
  { value: 2, labelKey: 'stats.3.label', subKey: 'stats.3.sub' },
  { value: 1, labelKey: 'stats.4.label', subKey: 'stats.4.sub' },
]

const COUNTUP_DURATION_MS = 1500

/**
 * Count-up number — animates from 0 to `value` over `durationMs` once the
 * element scrolls into view. Respects prefers-reduced-motion (renders
 * the target value immediately, no animation).
 */
function CountUp({
  value,
  suffix = '',
  durationMs = COUNTUP_DURATION_MS,
}: {
  value: number
  suffix?: string
  durationMs?: number
}) {
  const [current, setCurrent] = useState(0)
  const elRef = useRef<HTMLSpanElement | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setCurrent(value)
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      setCurrent(value)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting || startedRef.current) return
        startedRef.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1)
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3)
          setCurrent(Math.round(value * eased))
          if (t < 1) requestAnimationFrame(tick)
          else setCurrent(value)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, durationMs])

  return (
    <span ref={elRef} className="tabular-nums">
      {current}
      {suffix}
    </span>
  )
}

/**
 * Stats section — 4-column grid (1 col mobile, 2 col tablet, 4 col desktop).
 * Each stat: BIG number (PP Mori Black, count-up) + label + Geist Mono sub.
 */
export function StatsCounter() {
  const { t } = useLocale()

  return (
    <section
      aria-label="Polet stats"
      className="border-t border-line bg-bg-base py-16 md:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <KickerLabel className="pl-reveal">{t('stats.kicker')}</KickerLabel>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="pl-reveal flex flex-col items-center text-center"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="font-sans font-black text-ink leading-none text-5xl sm:text-6xl md:text-7xl tracking-tighter">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-4 text-sm md:text-base font-semibold text-ink-soft">
                {t(stat.labelKey)}
              </p>
              <p className="mt-1.5 text-xs font-mono text-ink-mute uppercase tracking-wider">
                {t(stat.subKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
