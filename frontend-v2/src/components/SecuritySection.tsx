import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'
import { ParticleField } from './primitives/ParticleField'

type SecurityFact = {
  n: string
  /** Short uppercase label after the number, mono caps. */
  label: string
  titleKey: TranslationKey
  descKey: TranslationKey
  icon: React.ReactNode
}

/**
 * SecuritySection, 2×2 quadrant grid showing Polet's defensive
 * primitives: smart-wallet PDA · session keys · anti-replay
 * (`policy_seq`) · multisig + recovery.
 *
 * Layout uses the `gap-px + bg-line` trick: a 1-px gap rendered against
 * a teal-tinted line color forms the cross divider between cells with no
 * extra DOM. Each quadrant has an inline SVG icon, mono index/label
 * (e.g. `01 / PDA`), title, and concrete description sourced from the
 * v1 dictionary (cross-imported).
 *
 * A small "assume agent compromised…" threat narrative sits above the
 * grid to set the stakes.
 *
 * Anchor #security so future nav links can scroll here.
 */
export function SecuritySection() {
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

  const facts: SecurityFact[] = [
    {
      n: '01',
      label: 'PDA',
      titleKey: 'security.fact.pda.title',
      descKey: 'security.fact.pda.desc',
      icon: <LockIcon />,
    },
    {
      n: '02',
      label: 'SESSION',
      titleKey: 'security.fact.session.title',
      descKey: 'security.fact.session.desc',
      icon: <KeyIcon />,
    },
    {
      n: '03',
      label: 'REPLAY',
      titleKey: 'security.fact.replay.title',
      descKey: 'security.fact.replay.desc',
      icon: <SequenceIcon />,
    },
    {
      n: '04',
      label: 'QUORUM',
      titleKey: 'security.fact.quorum.title',
      descKey: 'security.fact.quorum.desc',
      icon: <GroupIcon />,
    },
  ]

  return (
    <section
      ref={containerRef}
      id="security"
      className="border-t border-line bg-bg-base py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('security.kicker')}
          </KickerLabel>
        </div>

        <h2
          className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center md:text-left text-balance"
          style={{ transitionDelay: '80ms' }}
        >
          {t('security.headline')}
        </h2>

        <p
          className="pl-reveal mt-6 max-w-3xl text-base md:text-lg text-ink-soft leading-relaxed text-center md:text-left mx-auto md:mx-0"
          style={{ transitionDelay: '160ms' }}
        >
          {t('security.body')}
        </p>

        {/* Threat narrative, strong defensive framing */}
        <div
          className="pl-reveal mt-10 max-w-3xl rounded-lg border border-line bg-bg-deep px-5 py-4 mx-auto md:mx-0"
          style={{ transitionDelay: '240ms' }}
        >
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
              threat model
            </span>
            <span className="flex-1 h-px bg-line" />
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            {t('security.threat.intro')}
          </p>
        </div>

        {/* 2×2 quadrant card on continuous particle field (same treatment
            as Rails). Hairline dividers live on each quadrant so the
            cells can stay transparent and particles show through fully. */}
        <div
          onMouseMove={handleMouseMove}
          className="pl-rails-bg pl-reveal mt-12 md:mt-16 relative rounded-2xl border border-line bg-bg-deep overflow-hidden"
          style={{ transitionDelay: '320ms' }}
        >
          <ParticleField seedBg={19} seedFg={113} />

          <div className="relative z-[2] grid grid-cols-1 md:grid-cols-2">
            {facts.map((f, i) => (
              <FactQuadrant
                key={f.n}
                fact={f}
                title={t(f.titleKey)}
                desc={t(f.descKey)}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FactQuadrant({
  fact,
  title,
  desc,
  index,
}: {
  fact: SecurityFact
  title: string
  desc: string
  index: number
}) {
  // Hairline dividers form the cross on desktop and a vertical stack on
  // mobile. `isLast` skips the mobile bottom border on the last card.
  const isFirstRow = index < 2
  const isFirstCol = index % 2 === 0
  const isLast = index === 3

  const dividerClasses = [
    !isLast ? 'border-b border-line' : '',
    isFirstRow ? 'md:border-b md:border-line' : 'md:border-b-0',
    isFirstCol ? 'md:border-r md:border-line' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`group relative p-6 md:p-8 lg:p-10 transition-colors hover:bg-surface/40 ${dividerClasses}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-9 rounded-md bg-bg-deep/80 border border-line text-lagoon-bright transition-colors group-hover:border-lagoon group-hover:text-lagoon">
          {fact.icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          <span className="text-lagoon-bright">{fact.n}</span> / {fact.label}
        </span>
      </div>
      <h3 className="mt-5 font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
        {title}
      </h3>
      <p className="mt-3 text-sm md:text-base text-ink-soft leading-relaxed">{desc}</p>
    </div>
  )
}

/* ============================================
   Inline SVG icons, small, line-style, lagoon
   ============================================ */

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
      <line x1="10" y1="13" x2="10" y2="14.5" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="14" r="2.5" />
      <line x1="8" y1="12" x2="17" y2="3" />
      <line x1="14" y1="6" x2="16" y2="8" />
      <line x1="12" y1="8" x2="14" y2="10" />
    </svg>
  )
}

function SequenceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h12l-2-2m2 2l-2 2" />
      <path d="M17 13H5l2-2m-2 2l2 2" />
    </svg>
  )
}

function GroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="14" cy="7" r="2.5" />
      <path d="M2 16c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
      <path d="M11.5 11.5c2.5 0 4.5 2 4.5 4.5h-3" />
    </svg>
  )
}
