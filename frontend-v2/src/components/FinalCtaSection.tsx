import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

const GITHUB_URL = 'https://github.com/harkon666/Polet-AI'
const DEMO_SCRIPT_URL = `${GITHUB_URL}/blob/main/docs/demo-script.md`

type Path = {
  n: string
  titleKey: TranslationKey
  audienceKey: TranslationKey
  ctaKey: TranslationKey
  /** Either internal route via TanStack Link or external/anchor href */
  to?: string
  href?: string
  external?: boolean
}

const PATHS: Path[] = [
  {
    n: '01',
    titleKey: 'cta.path.build.title',
    audienceKey: 'cta.path.build.audience',
    ctaKey: 'cta.path.build.cta',
    to: '/app',
  },
  {
    n: '02',
    titleKey: 'cta.path.review.title',
    audienceKey: 'cta.path.review.audience',
    ctaKey: 'cta.path.review.cta',
    href: DEMO_SCRIPT_URL,
    external: true,
  },
  {
    n: '03',
    titleKey: 'cta.path.explore.title',
    audienceKey: 'cta.path.explore.audience',
    ctaKey: 'cta.path.explore.cta',
    href: '#demo',
  },
]

/**
 * FinalCtaSection — last narrative beat before footer.
 *
 * Three path cards (build / review / explore) route different audiences
 * to the right next step. Sits on a subtle aurora-radial backdrop
 * consistent with the Demo Widget's holographic vibe. Section bg is
 * `bg-bg-deep` so the aurora reads against deep black.
 *
 * Routes:
 *   01 build   → /app (TanStack Link)
 *   02 review  → external GitHub demo-script.md
 *   03 explore → #demo anchor on this page
 *
 * Anchor #cta so future nav links can scroll here.
 */
export function FinalCtaSection() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  return (
    <section
      ref={containerRef}
      id="cta"
      className="pl-cta-aurora relative border-t border-line bg-bg-deep py-20 md:py-28 lg:py-32 overflow-hidden"
    >
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('cta.kicker')}
          </KickerLabel>

          <h2
            className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-balance"
            style={{ transitionDelay: '80ms' }}
          >
            {t('cta.heading')}
          </h2>

          <p
            className="pl-reveal mt-6 text-base md:text-lg text-ink-soft leading-relaxed"
            style={{ transitionDelay: '160ms' }}
          >
            {t('cta.body')}
          </p>
        </div>

        {/* 3 path cards */}
        <div
          className="pl-reveal mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ transitionDelay: '240ms' }}
        >
          {PATHS.map((p) => (
            <PathCard
              key={p.n}
              path={p}
              title={t(p.titleKey)}
              audience={t(p.audienceKey)}
              cta={t(p.ctaKey)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function PathCard({
  path,
  title,
  audience,
  cta,
}: {
  path: Path
  title: string
  audience: string
  cta: string
}) {
  const inner = (
    <div className="pl-glass-card pl-cta-card relative rounded-xl px-6 py-7 h-full flex flex-col transition-all">
      {/* Top row: index + audience kicker */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
          {path.n}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          {audience}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-6 font-sans text-2xl md:text-3xl font-bold text-ink leading-tight">
        {title}
      </h3>

      {/* CTA arrow */}
      <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright group-hover:text-lagoon transition">
        {cta}
      </span>
    </div>
  )

  if (path.to) {
    return (
      <Link to={path.to} className="group block h-full focus:outline-none focus-visible:outline-none">
        {inner}
      </Link>
    )
  }

  if (path.href) {
    return (
      <a
        href={path.href}
        className="group block h-full focus:outline-none focus-visible:outline-none"
        {...(path.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {inner}
      </a>
    )
  }

  return inner
}
