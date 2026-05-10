import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import { ParticleField } from '../primitives/ParticleField'
import { RailCard, type Rail } from './RailCard'

/**
 * TwoRailConsole, /app's parallel rail cards.
 *
 * The landing's RailsSection presents THREE rails — Encrypt / Ika /
 * Jupiter — under the kicker "Three rails. One gate." In /app, Encrypt
 * collapses into the SetupLedger's POLICY row (sealed ciphertext,
 * sibling component), and the operational console exposes the two
 * actual EXECUTION rails:
 *
 *   - Jupiter DCA       Solana strategy rail
 *   - Ika dWallet       bridgeless cross-chain signing rail
 *
 * Both rails pass through the same on-chain policy gate; that gate is
 * implicit in the SetupLedger's POLICY row and the page-level "Three
 * rails. One gate." thesis. The chrome (`pl-rails-bg` container with
 * cursor-tracked teal glow + ParticleField dust) is reused verbatim
 * from the landing so the two surfaces visually rhyme.
 *
 * Different particle seeds (31 / 71 vs the landing default 37 / 7)
 * give a visibly distinct dust pattern so the operational console
 * reads as its own surface rather than a copy of the landing rails.
 *
 * Day 9 = display only. Day 10 wires Try 25 / Run 5 (or Approve 5)
 * buttons inside each `<RailCard>` to real proxy handlers.
 */
const RAILS: Rail[] = [
  {
    id: 'jupiter',
    brand: 'Jupiter',
    iconSrc: '/brand/jupiter.svg',
    titleKey: 'rail.jupiter.title',
    bodyKey: 'rail.jupiter.body',
    disclaimerKey: 'app.rail.jupiter.disclaimer',
  },
  {
    id: 'ika',
    brand: 'Ika',
    iconSrc: '/brand/ika.svg',
    titleKey: 'rail.ika.title',
    bodyKey: 'rail.ika.body',
    disclaimerKey: 'app.rail.ika.disclaimer',
  },
]

export function TwoRailConsole() {
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
      aria-label="Polet operational rails"
      className="border-b border-line bg-bg-base py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <KickerLabel tone="accent" className="pl-reveal">
          {t('app.console.rails.kicker')}
        </KickerLabel>

        <div
          onMouseMove={handleMouseMove}
          className="pl-rails-bg pl-reveal mt-8 md:mt-10 relative rounded-2xl border border-line bg-bg-deep overflow-hidden"
          style={{ transitionDelay: '160ms' }}
        >
          <ParticleField seedBg={31} seedFg={71} />

          <div className="relative z-[2] grid grid-cols-1 md:grid-cols-2">
            {RAILS.map((rail, i) => (
              <RailCard
                key={rail.id}
                rail={rail}
                index={i}
                totalCount={RAILS.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
