/**
 * ARCHIVED — Phase 7 (issue 105) moved this file out of the active
 * Polet Portal tree on 2026-05-11. Replaced by the Polet Portal
 * surface (issues 099-105). Kept on disk so future contributors can
 * reference the previous shape.
 *
 * If you're looking for the new equivalent, see:
 *   - components/app/portal/    chrome (sidebar, mobile bar, drawer)
 *   - components/app/workspace/ /app/workspace
 *   - components/app/gate/      /app/gate
 *   - components/app/funds/     /app/funds
 *   - components/app/proof/     /app/proof
 *   - components/app/bridge/    /app/bridge
 *   - components/app/selectors/console-selectors.ts (shared state derivations)
 *
 * Do not import from this file in new code. Mounted by:
 *   git log --diff-filter=A -- frontend/src/components/app/TwoRailConsole.tsx
 */
import { useLocale } from '#/hooks/use-locale'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import { ParticleField } from '../primitives/ParticleField'
import { RailCard, type Rail } from './RailCard'
import { useConsole } from './use-console-actions'
import { ChainStatusStrip } from './ChainStatusStrip'

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
 * Day 11 wires action buttons (Try 25 USDC block / Run 5 USDC allow on
 * Jupiter, Try 25 USDC block / Approve 5 USDC allow on Ika) through
 * `useConsole()`. Buttons stay disabled until the Setup Ledger reaches
 * an active agent session — linear gating mirrors the demo script.
 *
 * Different particle seeds (31 / 71 vs landing default 37 / 7) give a
 * visibly distinct dust pattern so the operational console reads as
 * its own surface rather than a copy of the landing rails.
 */

const RAILS: Rail[] = [
  {
    id: 'jupiter',
    brand: 'Jupiter',
    iconSrc: '/brand/jupiter.svg',
    titleKey: 'rail.jupiter.title',
    bodyKey: 'rail.jupiter.body',
    disclaimerKey: 'app.rail.jupiter.disclaimer',
    blockActionKey: 'jupiter-block',
    blockActionLabelKey: 'app.rail.jupiter.action.block',
    blockActionLoadingKey: 'app.rail.jupiter.action.block.loading',
    blockHintKey: 'app.rail.action.block.hint',
    allowActionKey: 'jupiter-allow',
    allowActionLabelKey: 'app.rail.jupiter.action.allow',
    allowActionLoadingKey: 'app.rail.jupiter.action.allow.loading',
    allowHintKey: 'app.rail.action.allow.hint',
    // Phase 2 of PRD 098 — real on-chain Jupiter execution.
    executeActionKey: 'jupiter-execute',
    executeActionLabelKey: 'app.rail.jupiter.action.execute',
    executeActionLoadingKey: 'app.rail.jupiter.action.execute.loading',
    executeHintKey: 'app.rail.action.execute.hint',
  },
  {
    id: 'ika',
    brand: 'Ika',
    iconSrc: '/brand/ika.svg',
    titleKey: 'rail.ika.title',
    bodyKey: 'rail.ika.body',
    disclaimerKey: 'app.rail.ika.disclaimer',
    blockActionKey: 'ika-block',
    blockActionLabelKey: 'app.rail.ika.action.block',
    blockActionLoadingKey: 'app.rail.ika.action.block.loading',
    blockHintKey: 'app.rail.action.block.hint',
    allowActionKey: 'ika-allow',
    allowActionLabelKey: 'app.rail.ika.action.allow',
    allowActionLoadingKey: 'app.rail.ika.action.allow.loading',
    allowHintKey: 'app.rail.action.allow.hint',
    executeActionKey: 'ika-execute',
    executeActionLabelKey: 'app.rail.ika.action.execute',
    executeActionLoadingKey: 'app.rail.ika.action.execute.loading',
    executeHintKey: 'app.rail.action.execute.hint',
  },
]

export function TwoRailConsole() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const { state, actions } = useConsole()

  // Rails are enabled only when there's an active session, mirroring
  // the linear setup gating: wallet → custody → policy → session.
  const sessions = state.data?.temporalKeys ?? state.data?.sessions ?? []
  const enabled = sessions.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) =>
      s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    target.style.setProperty('--cursor-x', `${x}%`)
    target.style.setProperty('--cursor-y', `${y}%`)
  }

  const handlerFor = (rail: Rail, mode: 'block' | 'allow') => () => {
    if (rail.id === 'jupiter') {
      mode === 'block' ? actions.runJupiterBlock() : actions.runJupiterAllow()
    } else {
      mode === 'block' ? actions.runIkaBlock() : actions.runIkaAllow()
    }
  }

  return (
    <section
      ref={containerRef}
      aria-label="Polet operational rails"
      className="border-b border-line bg-bg-base py-10 md:py-14"
    >
      <div className="mx-auto max-w-6xl px-6">
        <KickerLabel tone="accent" className="pl-reveal">
          {t('app.console.rails.kicker')}
        </KickerLabel>

        <ChainStatusStrip />

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
                loading={state.loading}
                enabled={enabled}
                hasSessionKeypair={!!state.sessionKeypair}
                onBlock={handlerFor(rail, 'block')}
                onAllow={handlerFor(rail, 'allow')}
                onExecute={
                  rail.id === 'jupiter'
                    ? () => void actions.executeJupiter()
                    : () => void actions.executeIka()
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
