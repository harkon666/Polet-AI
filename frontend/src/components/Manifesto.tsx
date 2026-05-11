import { useLocale } from '#/hooks/use-locale'
import type { TranslationKey } from '#/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

type Problem = {
  titleKey: TranslationKey
  descKey: TranslationKey
  /** Inline SVG pattern element rendered as the card's hero visual */
  pattern: React.ReactNode
}

/* ============================================
   Per-card hero patterns, diagrammatic, engineering-blueprint feel.
   Each visualises the problem with concrete domain elements (block-explorer
   data, server topology, multi-chain fan-out) rather than abstract noise.
   Colors: white/ink for primary, coral for failure markers, lagoon-bright
   for accent, ink-mute for supporting elements. All in Geist Mono.
   ============================================ */

/* ============================================
   Per-card hero patterns, artistic, identity-driven visuals.
   Each card has a distinct visual fingerprint that captures the problem
   feeling (not just diagrams). Premium magazine/editorial aesthetic.
     - 01 Voronoi-style hex grid + one cell exposed (coral)
     - 02 Radiating cracks from a failure origin
     - 03 360° particle starburst with bright core
   All patterns dominate the hero area + subtle continuous motion.
   ============================================ */

function Pattern01() {
  // "Your limits are public", dense hex grid, one cell exposed in coral.
  // Every cell = data point on-chain. One cell highlighted = your limit.
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <pattern
          id="pl-pat-01-hex"
          width="32"
          height="27.7"
          patternUnits="userSpaceOnUse"
        >
          <polygon
            points="16,0.8 31.2,9.3 31.2,26.4 16,34.9 0.8,26.4 0.8,9.3"
            fill="none"
            stroke="rgb(255 255 255 / 0.08)"
            strokeWidth="0.8"
          />
        </pattern>
        <radialGradient id="pl-pat-01-vignette" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="rgb(248 113 113 / 0.06)" />
          <stop offset="60%" stopColor="rgb(0 0 0 / 0)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.5)" />
        </radialGradient>
      </defs>

      {/* Base + hex grid */}
      <rect width="320" height="180" fill="rgb(4 16 12)" />
      <rect width="320" height="180" fill="url(#pl-pat-01-hex)" />
      <rect width="320" height="180" fill="url(#pl-pat-01-vignette)" />

      {/* Highlighted hex, "your data is exposed" */}
      <g transform="translate(160, 90)">
        <polygon
          points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5"
          fill="rgb(248 113 113 / 0.22)"
          stroke="rgb(248 113 113)"
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="3"
          fontSize="8"
          fill="rgb(255 255 255)"
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          25.00
        </text>
        {/* Pulse halo */}
        <circle cx="0" cy="0" r="20" fill="none" stroke="rgb(248 113 113)" strokeWidth="1">
          <animate
            attributeName="r"
            values="14;30;14"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.7;0;0.7"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* Subtle scatter dots, surrounding "data points" */}
      <g fill="rgb(166 196 189 / 0.35)">
        <circle cx="40" cy="30" r="0.8" />
        <circle cx="80" cy="20" r="0.6" />
        <circle cx="280" cy="40" r="0.7" />
        <circle cx="100" cy="155" r="0.5" />
        <circle cx="240" cy="160" r="0.8" />
        <circle cx="60" cy="120" r="0.5" />
      </g>

      {/* Corner annotation, "256 records visible" */}
      <text
        x="280"
        y="170"
        fontSize="8"
        fill="rgb(166 196 189 / 0.50)"
        fontFamily="ui-monospace, monospace"
        textAnchor="end"
      >
        256 records · all readable
      </text>
    </svg>
  )
}

function Pattern02() {
  // "Off-chain rules are bypass-able", cracks radiating from a failure
  // origin. Single fracture point shatters the entire surface.
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <radialGradient id="pl-pat-02-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(248 113 113 / 0.30)" />
          <stop offset="40%" stopColor="rgb(248 113 113 / 0.06)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0)" />
        </radialGradient>
      </defs>

      {/* Dark base */}
      <rect width="320" height="180" fill="rgb(4 16 12)" />

      {/* Crack origin glow */}
      <circle cx="160" cy="90" r="90" fill="url(#pl-pat-02-glow)" />

      {/* Main cracks radiating from center */}
      <g stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M 160 90 L 60 28 M 95 50 L 80 35 M 120 65 L 105 55" />
        <path d="M 160 90 L 250 22 M 200 58 L 215 45 M 222 49 L 230 40" />
        <path d="M 160 90 L 30 130 M 80 110 L 65 125 M 100 100 L 85 110" />
        <path d="M 160 90 L 290 150 M 220 120 L 240 135 M 250 130 L 265 142" />
        <path d="M 160 90 L 110 180 M 140 140 L 125 160 M 145 130 L 130 145" />
        <path d="M 160 90 L 220 180 M 185 130 L 200 155 M 195 140 L 207 162" />
      </g>

      {/* Secondary fine cracks */}
      <g stroke="rgb(255 255 255 / 0.25)" strokeWidth="0.6" fill="none" strokeLinecap="round">
        <path d="M 160 90 L 0 90" />
        <path d="M 160 90 L 320 90" />
        <path d="M 160 90 L 30 30" />
        <path d="M 160 90 L 290 30" />
        <path d="M 160 90 L 60 165" />
        <path d="M 160 90 L 280 175" />
      </g>

      {/* Failure origin core */}
      <circle cx="160" cy="90" r="4" fill="rgb(248 113 113)" />
      <circle cx="160" cy="90" r="8" fill="none" stroke="rgb(248 113 113)" strokeWidth="1.5">
        <animate attributeName="r" values="5;14;5" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Center label */}
      <text
        x="160"
        y="74"
        fontSize="8"
        fill="rgb(248 113 113)"
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        fontWeight="600"
      >
        SINGLE POINT
      </text>

      {/* Debris particles */}
      <g fill="rgb(255 255 255 / 0.4)">
        <circle cx="50" cy="50" r="0.8" />
        <circle cx="270" cy="40" r="0.6" />
        <circle cx="80" cy="160" r="0.7" />
        <circle cx="285" cy="155" r="0.8" />
        <circle cx="120" cy="35" r="0.5" />
        <circle cx="240" cy="170" r="0.6" />
      </g>
    </svg>
  )
}

function Pattern03() {
  // "Cross-chain signing has no gate", 360° particle starburst with bright
  // core. Lines fan out in every direction = signing without containment.
  return (
    <svg
      viewBox="0 0 320 180"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <radialGradient id="pl-pat-03-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgb(45 212 191 / 0.30)" />
          <stop offset="40%" stopColor="rgb(45 212 191 / 0.06)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0)" />
        </radialGradient>
      </defs>

      {/* Dark base + radial glow */}
      <rect width="320" height="180" fill="rgb(4 16 12)" />
      <rect width="320" height="180" fill="url(#pl-pat-03-glow)" />

      {/* Background star field */}
      <g fill="rgb(255 255 255 / 0.45)">
        <circle cx="40" cy="20" r="0.8" />
        <circle cx="80" cy="55" r="0.5" />
        <circle cx="280" cy="35" r="1" />
        <circle cx="50" cy="150" r="0.6" />
        <circle cx="290" cy="160" r="0.8" />
        <circle cx="200" cy="25" r="0.5" />
        <circle cx="100" cy="170" r="0.4" />
        <circle cx="240" cy="50" r="0.7" />
        <circle cx="180" cy="160" r="0.5" />
        <circle cx="20" cy="90" r="0.6" />
        <circle cx="305" cy="90" r="0.7" />
      </g>

      {/* Radial trails fanning out (24 lines, 15° apart) */}
      <g stroke="rgb(45 212 191)" fill="none" strokeLinecap="round">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180
          const length = 90 + (i % 4) * 20
          const x = 160 + Math.cos(angle) * length
          const y = 90 + Math.sin(angle) * length
          const opacity = 0.15 + (i % 3) * 0.12
          return (
            <line
              key={i}
              x1="160"
              y1="90"
              x2={x}
              y2={y}
              strokeWidth={i % 6 === 0 ? 1 : 0.6}
              strokeDasharray="3 5"
              opacity={opacity}
            />
          )
        })}
      </g>

      {/* Core orb, bright glowing dot */}
      <g transform="translate(160, 90)">
        <circle cx="0" cy="0" r="12" fill="rgb(45 212 191 / 0.20)">
          <animate attributeName="r" values="10;16;10" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="0" cy="0" r="6" fill="rgb(45 212 191)">
          <animate
            attributeName="opacity"
            values="1;0.7;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="0" cy="0" r="2.5" fill="rgb(255 255 255)" />
      </g>

      {/* 4 chain anchors at compass points (subtle) */}
      <g
        fill="rgb(166 196 189 / 0.65)"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        fontWeight="600"
        textAnchor="middle"
      >
        <text x="160" y="20">SOL</text>
        <text x="290" y="94">BTC</text>
        <text x="160" y="172">ETH</text>
        <text x="30" y="94">ARB</text>
      </g>
    </svg>
  )
}

const PROBLEMS: Problem[] = [
  { titleKey: 'manifesto.problem1.title', descKey: 'manifesto.problem1.desc', pattern: <Pattern01 /> },
  { titleKey: 'manifesto.problem2.title', descKey: 'manifesto.problem2.desc', pattern: <Pattern02 /> },
  { titleKey: 'manifesto.problem3.title', descKey: 'manifesto.problem3.desc', pattern: <Pattern03 /> },
]

/**
 * Manifesto section, kicker + 2-line headline + intro paragraph + 3
 * problem cards (Gitcoin-inspired card pattern: hero visual + pills +
 * title + desc + learn-more link).
 *
 * Each card's hero visual is a unique inline-SVG pattern that captures
 * the problem visually:
 *   - 01 "Your limits are public" → exposed dot grid + coral highlight row
 *   - 02 "Off-chain bypass-able"  → diagonal hash with broken segment
 *   - 03 "Cross-chain no gate"    → concentric waves overlapping freely
 *
 * Layout: max-w-6xl. Headline left-aligned at desktop, centered mobile.
 * 3 cards in 1-col mobile / 3-col desktop grid.
 */
export function Manifesto() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  return (
    <section
      ref={containerRef}
      id="how-it-works"
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

        {/* 3 problem cards, Gitcoin-style with hero visual */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {PROBLEMS.map((problem, i) => (
            <article
              key={problem.titleKey}
              className="pl-reveal group relative rounded-2xl border border-line bg-surface overflow-hidden hover:border-line-strong transition flex flex-col"
              style={{ transitionDelay: `${240 + i * 80}ms` }}
            >
              {/* Hero visual area, aspect 5/3, pattern + pills overlay */}
              <div className="relative aspect-[5/3] bg-bg-deep overflow-hidden">
                {problem.pattern}
                {/* Pills overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-coral/15 text-coral px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                    Risk
                  </span>
                  <span className="inline-flex items-center rounded-full bg-bg-base/80 text-ink-soft px-3 py-1 text-xs font-mono backdrop-blur-sm">
                    {String(i + 1).padStart(2, '0')} / 03
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 md:p-7 flex flex-col">
                <h3 className="font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
                  {t(problem.titleKey)}
                </h3>
                <p className="mt-3 text-sm md:text-base text-ink-soft leading-relaxed flex-1">
                  {t(problem.descKey)}
                </p>
                <a
                  href="/#security"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright hover:text-lagoon transition self-start"
                >
                  Learn more
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
