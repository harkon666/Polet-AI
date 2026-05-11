import { createFileRoute } from '@tanstack/react-router'
import { ClientWalletProvider } from '#shared/components/ClientWalletProvider'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { AppHeader } from '../components/app/AppHeader'
import { MissionRibbon } from '../components/app/MissionRibbon'
import { StatStrip } from '../components/app/StatStrip'
import { SetupLedger } from '../components/app/SetupLedger'
import { TwoRailConsole } from '../components/app/TwoRailConsole'
import { ReceiptLog } from '../components/app/ReceiptLog'
import { AgentIntegrationPanel } from '../components/app/AgentIntegrationPanel'
import { ConsoleStateProvider } from '../components/app/use-console-actions'
import { WalletDashboard } from '../components/app/WalletDashboard'

/**
 * /app, the operational console for Polet's confidential control layer.
 *
 * Day 11 wires real proxy actions on every operational surface. Page
 * order, top to bottom:
 *
 *   1. <AppHeader />         sticky console chrome (Day 8)
 *   2. <MissionRibbon />     one-line "Three rails · One gate" strip
 *   3. <StatStrip />         4 live tiles (PDA / SOL / Policy / Sessions),
 *                            hidden when wallet not connected
 *   4. <SetupLedger />       state-aware: onboarding wizard when
 *                            disconnected, dense table with inline
 *                            action buttons when connected
 *   5. <TwoRailConsole />    Jupiter + Ika parallel cards on
 *                            ParticleField with Try 25 / Run 5 (or
 *                            Approve 5) action buttons
 *   6. <ReceiptLog />        append-only feed of every action with
 *                            timestamps + Solana Explorer links +
 *                            π_constraint refs (pi_numeric_limit, etc.)
 *   7. <AdvancedFallback />  legacy v1 WalletDashboard hidden behind
 *                            <details> collapse
 *
 * `<ConsoleStateProvider>` wraps everything inside `<ClientWalletProvider>`
 * so all child sections share one set of state + handlers. State =
 * { connected, publicKey, data, solBalance, receipts, loading, error }.
 * Actions = { initializeWallet, registerCustody, saveConfidentialPolicy,
 * grantAgentSession, runJupiterBlock/Allow, runIkaBlock/Allow, refresh }.
 *
 * Wallet adapter still lives ONLY in this route's tree (Day 8 perf
 * win), so landing pages don't drag the ~1 MB wallet-adapter bundle.
 */
export const Route = createFileRoute('/app')({
  component: AppPage,
})

function AppPage() {
  return (
    <ClientWalletProvider>
      <ConsoleStateProvider>
        <AppHeader />
        <MissionRibbon />
        <StatStrip />
        <SetupLedger />
        <TwoRailConsole />
        <ReceiptLog />
        <AgentIntegrationPanel />
        <AdvancedFallback />
      </ConsoleStateProvider>
    </ClientWalletProvider>
  )
}

/**
 * Legacy v1 WalletDashboard, collapsed behind `<details>`.
 *
 * Day 9 mounted this dashboard visibly at the bottom, which produced
 * a duplicate "Connect a devnet wallet" Shield prompt next to the
 * SetupLedger empty state. Day 10 hides it behind a single mono
 * uppercase summary so it's available for power users (full session
 * manager, demo / simple / agent-access tabs) without polluting the
 * primary console flow.
 *
 * Day 11 ships native action wiring across SetupLedger and
 * TwoRailConsole, so the legacy fallback is now redundant for the
 * primary demo flow. It remains available behind the collapse for
 * advanced surfaces (recovery, shared quorum, Encrypt graph)
 * not yet ported to the new console.
 */
function AdvancedFallback() {
  const containerRef = useScrollReveal()
  const { t } = useLocale()
  return (
    <section
      ref={containerRef}
      className="border-t border-line bg-bg-base py-6 md:py-8"
    >
      <div className="mx-auto max-w-6xl px-6">
        <details className="pl-reveal group">
          <summary className="cursor-pointer flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em] text-ink-mute hover:text-ink transition py-3 list-none [&::-webkit-details-marker]:hidden">
            <span>{t('app.advanced.label')}</span>
            <span
              aria-hidden="true"
              className="text-ink-mute group-open:rotate-180 transition"
            >
              ▾
            </span>
          </summary>
          <div className="pl-app-shell mt-6">
            <WalletDashboard />
          </div>
        </details>
      </div>
    </section>
  )
}
