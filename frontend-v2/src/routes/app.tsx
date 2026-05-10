import { createFileRoute } from '@tanstack/react-router'
import { ClientWalletProvider } from '#shared/components/ClientWalletProvider'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from '../components/primitives/KickerLabel'
import { AppHeader } from '../components/app/AppHeader'
import { SetupLedger } from '../components/app/SetupLedger'
import { TwoRailConsole } from '../components/app/TwoRailConsole'
import { WalletDashboard } from '../components/app/WalletDashboard'

/**
 * /app, the operational console for Polet's confidential control layer.
 *
 * Day 9 redesign — the page now reads as the operational counterpart of
 * the landing narrative ("Three rails. One gate.") rather than a second
 * marketing brochure. Page order, top → bottom:
 *
 *   1. <AppHeader />        (sticky console chrome — Day 8)
 *   2. <ConsoleThesis />    (kicker + tagline, no big marketing h1)
 *   3. <SetupLedger />      (4-row state ledger; POLICY uses EncryptedField)
 *   4. <TwoRailConsole />   (Jupiter + Ika parallel cards on ParticleField)
 *   5. <AdvancedFallback /> (cross-imported v1 WalletDashboard, temporary
 *                            bridge until Day 10 wires the rails to real
 *                            proxy actions and moves it into <details>)
 *
 * Wallet adapter still lives ONLY in this route's tree (Day 8 perf win),
 * so landing pages don't drag the ~1 MB wallet-adapter bundle.
 */
export const Route = createFileRoute('/app')({
  component: AppPage,
})

function AppPage() {
  return (
    <ClientWalletProvider>
      <AppHeader />
      <ConsoleThesis />
      <SetupLedger />
      <TwoRailConsole />
      <AdvancedFallback />
    </ClientWalletProvider>
  )
}

/**
 * Console thesis, the /app counterpart to the landing marketing hero.
 *
 * Reuses the established Polet phrasing rather than coining a new line:
 *   - kicker:   `rails.kicker`               → "Three rails. One gate."
 *   - h1:       `footer.brand.tagline`       → "Confidential smart wallet for AI agents on Solana."
 *   - subtitle: `footer.brand.subtagline`    → "Policy-gated. No unlimited authority."
 *
 * No 5xl marketing h1; this is operator chrome, not a brochure. Visual
 * weight is intentionally lighter than the Hero so the operational
 * sections below carry the page.
 */
function ConsoleThesis() {
  const containerRef = useScrollReveal()
  const { t } = useLocale()
  return (
    <section
      ref={containerRef}
      aria-label="Polet console thesis"
      className="border-b border-line bg-bg-base"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <KickerLabel tone="accent" className="pl-reveal">
          {t('rails.kicker')}
        </KickerLabel>
        <h1
          className="pl-reveal mt-4 font-sans font-bold text-ink tracking-tight leading-[1.15] text-2xl sm:text-3xl md:text-4xl max-w-3xl"
          style={{ transitionDelay: '80ms' }}
        >
          {t('footer.brand.tagline')}
        </h1>
        <p
          className="pl-reveal mt-3 text-base md:text-lg text-ink-soft leading-relaxed max-w-3xl"
          style={{ transitionDelay: '160ms' }}
        >
          {t('footer.brand.subtagline')}
        </p>
      </div>
    </section>
  )
}

/**
 * Temporary fallback for the cross-imported v1 WalletDashboard.
 *
 * Day 9 ships the structural redesign (chrome + ledger + rails frame)
 * with the legacy dashboard still mounted at the bottom so users can
 * actually init the wallet, save the policy, grant a session, etc.
 * Day 10 wires the new SetupLedger and TwoRailConsole to real proxy
 * actions and moves this fallback into the Advanced `<details>`
 * collapse, after which the redesign fully replaces the v1 surface.
 */
function AdvancedFallback() {
  const containerRef = useScrollReveal()
  return (
    <div
      ref={containerRef}
      className="pl-app-shell mx-auto max-w-6xl px-6 py-12 md:py-16"
    >
      <div className="pl-reveal">
        <WalletDashboard />
      </div>
    </div>
  )
}
