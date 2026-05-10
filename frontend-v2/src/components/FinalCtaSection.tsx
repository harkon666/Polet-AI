import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

/* ============================================
   Per-card hero patterns, Manifesto-style.
   Each card has an artistic visual that captures its intent:
     Build   → code editor (brackets + glyph lines + blinking cursor)
     Explore → compass rose + dashed trail to a bright destination

   Both use the same palette as Manifesto (bg rgb(4 16 12), lagoon
   accents, ink-mute scatter) so the page reads as a single design
   system rather than three separate styles.
   ============================================ */

function PatternBuild() {
  // "Developers / build" — curly brackets + glyph lines + cursor blink,
  // evokes a code editor / SDK snippet without committing to real code.
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <radialGradient id="pl-pat-build-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="rgb(45 212 191 / 0.16)" />
          <stop offset="55%" stopColor="rgb(45 212 191 / 0.03)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.4)" />
        </radialGradient>
        <pattern
          id="pl-pat-build-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgb(255 255 255 / 0.04)" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* Base + grid + central glow */}
      <rect width="320" height="180" fill="rgb(4 16 12)" />
      <rect width="320" height="180" fill="url(#pl-pat-build-grid)" />
      <rect width="320" height="180" fill="url(#pl-pat-build-glow)" />

      {/* Curly brackets left + right */}
      <g
        stroke="rgb(45 212 191 / 0.55)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 60 45 Q 42 45, 42 62 L 42 85 Q 42 92, 35 92 Q 42 92, 42 99 L 42 122 Q 42 138, 60 138" />
        <path d="M 260 45 Q 278 45, 278 62 L 278 85 Q 278 92, 285 92 Q 278 92, 278 99 L 278 122 Q 278 138, 260 138" />
      </g>

      {/* Code glyph lines, mono monospace dashes suggesting source rows */}
      <g fontFamily="ui-monospace, monospace" fontSize="8" fill="rgb(165 243 252 / 0.45)">
        <text x="78" y="65">━━━━ ─── ──</text>
        <text x="78" y="80">  ── ━━━━ ──</text>
        <text x="78" y="95">━━ ── ━━━━━━</text>
        <text x="78" y="110">   ─── ━━━ ──</text>
        <text x="78" y="125">━━━━━ ── ───</text>
      </g>

      {/* Blinking cursor on the last "line" */}
      <rect x="224" y="118" width="2.5" height="10" fill="rgb(45 212 191)">
        <animate
          attributeName="opacity"
          values="1;0.15;1"
          dur="1.1s"
          repeatCount="indefinite"
        />
      </rect>

      {/* Tag chips above the block, identifying SDK modules */}
      <g fontFamily="ui-monospace, monospace" fontSize="6.5">
        <g transform="translate(72, 32)">
          <rect width="26" height="10" rx="2" fill="rgb(45 212 191 / 0.14)" stroke="rgb(45 212 191 / 0.5)" strokeWidth="0.6" />
          <text x="13" y="7.5" fill="rgb(165 243 252 / 0.85)" textAnchor="middle">sdk</text>
        </g>
        <g transform="translate(104, 32)">
          <rect width="26" height="10" rx="2" fill="rgb(45 212 191 / 0.14)" stroke="rgb(45 212 191 / 0.5)" strokeWidth="0.6" />
          <text x="13" y="7.5" fill="rgb(165 243 252 / 0.85)" textAnchor="middle">pda</text>
        </g>
        <g transform="translate(136, 32)">
          <rect width="40" height="10" rx="2" fill="rgb(45 212 191 / 0.14)" stroke="rgb(45 212 191 / 0.5)" strokeWidth="0.6" />
          <text x="20" y="7.5" fill="rgb(165 243 252 / 0.85)" textAnchor="middle">session</text>
        </g>
      </g>

      {/* Scatter particles */}
      <g fill="rgb(166 196 189 / 0.35)">
        <circle cx="30" cy="25" r="0.8" />
        <circle cx="290" cy="22" r="0.6" />
        <circle cx="24" cy="160" r="0.5" />
        <circle cx="298" cy="160" r="0.7" />
        <circle cx="150" cy="22" r="0.4" />
        <circle cx="170" cy="162" r="0.5" />
      </g>

      {/* Corner labels */}
      <text
        x="20"
        y="170"
        fontSize="7"
        fill="rgb(166 196 189 / 0.5)"
        fontFamily="ui-monospace, monospace"
      >
        bun run dev
      </text>
      <text
        x="300"
        y="170"
        fontSize="7"
        fill="rgb(166 196 189 / 0.5)"
        fontFamily="ui-monospace, monospace"
        textAnchor="end"
      >
        ready
      </text>
    </svg>
  )
}

function PatternExplore() {
  // "Just curious / explore" — compass rose at left + dashed curved path
  // reaching toward a glowing destination marker on the right.
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <radialGradient id="pl-pat-explore-destGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(45 212 191 / 0.4)" />
          <stop offset="55%" stopColor="rgb(45 212 191 / 0.06)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0)" />
        </radialGradient>
        <radialGradient id="pl-pat-explore-vignette" cx="50%" cy="55%" r="70%">
          <stop offset="30%" stopColor="rgb(0 0 0 / 0)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.45)" />
        </radialGradient>
      </defs>

      {/* Night-sky base + vignette */}
      <rect width="320" height="180" fill="rgb(4 16 12)" />
      <rect width="320" height="180" fill="url(#pl-pat-explore-vignette)" />

      {/* Background stars, constellation-ish */}
      <g fill="rgb(166 196 189 / 0.45)">
        <circle cx="32" cy="28" r="0.7" />
        <circle cx="55" cy="58" r="0.5" />
        <circle cx="88" cy="22" r="0.8" />
        <circle cx="120" cy="48" r="0.6" />
        <circle cx="178" cy="32" r="0.9" />
        <circle cx="205" cy="58" r="0.5" />
        <circle cx="262" cy="42" r="0.7" />
        <circle cx="296" cy="62" r="0.5" />
        <circle cx="230" cy="132" r="0.7" />
        <circle cx="275" cy="128" r="0.5" />
        <circle cx="72" cy="142" r="0.6" />
        <circle cx="36" cy="152" r="0.8" />
        <circle cx="152" cy="158" r="0.5" />
      </g>

      {/* Faint constellation lines between some of the scatter stars */}
      <g stroke="rgb(166 196 189 / 0.2)" strokeWidth="0.5" fill="none">
        <path d="M 32 28 L 55 58 L 88 22" />
        <path d="M 178 32 L 205 58 L 262 42" />
        <path d="M 230 132 L 275 128" />
      </g>

      {/* Compass on the left — rose with 4 cardinal arrows + label */}
      <g transform="translate(85, 95)">
        {/* Outer ring */}
        <circle cx="0" cy="0" r="32" fill="none" stroke="rgb(45 212 191 / 0.4)" strokeWidth="1" />
        <circle cx="0" cy="0" r="24" fill="none" stroke="rgb(45 212 191 / 0.28)" strokeWidth="0.6" strokeDasharray="1.5,3" />

        {/* Tick marks every 15° */}
        <g stroke="rgb(45 212 191 / 0.45)" strokeWidth="0.6" strokeLinecap="round">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15 * Math.PI) / 180
            const isCardinal = i % 6 === 0
            const r1 = 32
            const r2 = isCardinal ? 27 : 29.5
            return (
              <line
                key={i}
                x1={Math.cos(angle) * r1}
                y1={Math.sin(angle) * r1}
                x2={Math.cos(angle) * r2}
                y2={Math.sin(angle) * r2}
              />
            )
          })}
        </g>

        {/* Cardinal arrows, N highlighted */}
        <g strokeLinecap="round" strokeLinejoin="round">
          <polygon
            points="0,-30 -4,-14 0,-18 4,-14"
            fill="rgb(45 212 191 / 0.45)"
            stroke="rgb(45 212 191)"
            strokeWidth="1"
          />
          <polygon
            points="0,30 -4,14 0,18 4,14"
            fill="none"
            stroke="rgb(45 212 191 / 0.6)"
            strokeWidth="1"
          />
          <polygon
            points="-30,0 -14,-4 -18,0 -14,4"
            fill="none"
            stroke="rgb(45 212 191 / 0.6)"
            strokeWidth="1"
          />
          <polygon
            points="30,0 14,-4 18,0 14,4"
            fill="none"
            stroke="rgb(45 212 191 / 0.6)"
            strokeWidth="1"
          />
        </g>

        {/* Center dot */}
        <circle cx="0" cy="0" r="2" fill="rgb(45 212 191)" />

        {/* N label */}
        <text
          x="0"
          y="-36"
          fontSize="7"
          fill="rgb(45 212 191 / 0.85)"
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
        >
          N
        </text>
      </g>

      {/* Dashed curved path from compass to destination */}
      <path
        d="M 118 95 Q 170 55, 250 65"
        stroke="rgb(45 212 191 / 0.65)"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4,4"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="16"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Destination halo + marker */}
      <rect x="190" y="20" width="130" height="90" fill="url(#pl-pat-explore-destGlow)" />
      <g transform="translate(250, 65)">
        <circle cx="0" cy="0" r="10" fill="rgb(45 212 191 / 0.15)" stroke="rgb(45 212 191 / 0.35)" strokeWidth="0.8">
          <animate
            attributeName="r"
            values="7;14;7"
            dur="2.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.12;0.6"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="0" cy="0" r="3" fill="rgb(45 212 191)" />
        <circle cx="0" cy="0" r="1" fill="rgb(255 255 255)" />
      </g>

      {/* Corner labels */}
      <text
        x="20"
        y="25"
        fontSize="7"
        fill="rgb(166 196 189 / 0.55)"
        fontFamily="ui-monospace, monospace"
      >
        pick a path
      </text>
      <text
        x="300"
        y="170"
        fontSize="7"
        fill="rgb(166 196 189 / 0.55)"
        fontFamily="ui-monospace, monospace"
        textAnchor="end"
      >
        /#demo
      </text>
    </svg>
  )
}

/* ============================================
   Data + component
   ============================================ */

type Path = {
  n: string
  titleKey: TranslationKey
  audienceKey: TranslationKey
  ctaKey: TranslationKey
  to?: string
  href?: string
  external?: boolean
  pattern: React.ReactNode
}

const PATHS: Path[] = [
  {
    n: '01',
    titleKey: 'cta.path.build.title',
    audienceKey: 'cta.path.build.audience',
    ctaKey: 'cta.path.build.cta',
    to: '/app',
    pattern: <PatternBuild />,
  },
  {
    n: '02',
    titleKey: 'cta.path.explore.title',
    audienceKey: 'cta.path.explore.audience',
    ctaKey: 'cta.path.explore.cta',
    href: '#demo',
    pattern: <PatternExplore />,
  },
]

/**
 * FinalCtaSection, last narrative beat before footer.
 *
 * Two path cards (Build / Explore) styled like the Manifesto cards:
 * large hero visual area (aspect 5/3) with a custom artistic SVG
 * pattern per card, pill overlay at the top, title + CTA below.
 *
 * Sits on a subtle aurora-radial backdrop consistent with the Demo
 * Widget's holographic vibe; section bg is `bg-bg-deep` so the
 * aurora reads against deep black.
 *
 * Routes:
 *   01 Build   → /app (TanStack Link)
 *   02 Explore → #demo anchor on this page
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

        {/* 2 path cards, Manifesto-style with hero visual */}
        <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
          {PATHS.map((p, i) => (
            <PathCard
              key={p.n}
              path={p}
              title={t(p.titleKey)}
              audience={t(p.audienceKey)}
              cta={t(p.ctaKey)}
              delayMs={240 + i * 80}
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
  delayMs,
}: {
  path: Path
  title: string
  audience: string
  cta: string
  delayMs: number
}) {
  const inner = (
    <article
      className="pl-reveal group relative rounded-2xl border border-line bg-surface overflow-hidden hover:border-line-strong transition flex flex-col h-full"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {/* Hero visual area, aspect 5/3, pattern + pills overlay */}
      <div className="relative aspect-[5/3] bg-bg-deep overflow-hidden">
        {path.pattern}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-lagoon-bright/15 text-lagoon-bright px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
            {audience}
          </span>
          <span className="inline-flex items-center rounded-full bg-bg-base/80 text-ink-soft px-3 py-1 text-xs font-mono backdrop-blur-sm">
            {path.n} / 02
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 md:p-7 flex flex-col">
        <h3 className="font-sans text-2xl md:text-3xl font-bold text-ink leading-tight">
          {title}
        </h3>
        <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright group-hover:text-lagoon transition">
          {cta}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </article>
  )

  if (path.to) {
    return (
      <Link to={path.to} className="group block rounded-2xl">
        {inner}
      </Link>
    )
  }

  if (path.href) {
    return (
      <a
        href={path.href}
        className="group block rounded-2xl"
        {...(path.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {inner}
      </a>
    )
  }

  return inner
}
