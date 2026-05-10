import { createFileRoute } from '@tanstack/react-router'
import { ClientWalletProvider } from '#shared/components/ClientWalletProvider'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from '../components/primitives/KickerLabel'
import { AppHeader } from '../components/app/AppHeader'
import { WalletDashboard } from '../components/app/WalletDashboard'

/**
 * /app, the confidential DCA control panel.
 *
 * v2 port (Day 8). Wallet adapter lives ONLY in this route's tree, not in
 * the global root, so landing pages don't drag the ~1 MB wallet-adapter
 * bundle. TanStack Start file routing splits each route into its own
 * lazy-loaded chunk, so the cost is paid only when a user actually
 * navigates here.
 *
 * Chrome:
 *   - `<AppHeader />` (sticky) replaces the landing marketing nav and
 *     hosts the WalletButton on the right.
 *   - `<AppShell />` is the operational page body (page hero,
 *     WalletDashboard, feature deck), wrapped in `.pl-app-shell` to
 *     map v1 CSS vars onto v2 dark tokens for cross-imported demo tabs.
 */
export const Route = createFileRoute('/app')({
  component: AppPage,
})

function AppPage() {
  return (
    <ClientWalletProvider>
      <AppHeader />
      <AppShell />
    </ClientWalletProvider>
  )
}

const FEATURES: Array<{ title: string; desc: string }> = [
  {
    title: 'PDA custody',
    desc: 'Deposit demo funds into a Polet smart wallet controlled by program policy. The agent never holds the keys.',
  },
  {
    title: 'Confidential policy',
    desc: 'Set private max-per-run and daily-cap rules. Limits stay encrypted on-chain; only the gate sees them.',
  },
  {
    title: 'Jupiter preview',
    desc: 'See route + build estimates for in-band USDC to SOL runs. Devnet preview only — no production swap claims.',
  },
  {
    title: 'Safe blocks',
    desc: 'Watch over-limit agent actions get blocked without ever revealing the threshold value to the agent or the log.',
  },
]

function AppShell() {
  const containerRef = useScrollReveal()

  return (
    <div
      ref={containerRef}
      className="pl-app-shell mx-auto max-w-6xl px-6 py-12 md:py-16 lg:py-20"
    >
      {/* Page hero. WalletButton moved into AppHeader, so this collapses
          to a single text column. */}
      <div className="max-w-3xl">
        <KickerLabel tone="accent" className="pl-reveal">
          Wallet console
        </KickerLabel>
        <h1
          className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.05] text-3xl sm:text-4xl md:text-5xl"
          style={{ transitionDelay: '80ms' }}
        >
          Confidential DCA control panel
        </h1>
        <p
          className="pl-reveal mt-5 text-base md:text-lg text-ink-soft leading-relaxed"
          style={{ transitionDelay: '160ms' }}
        >
          Run the guarded USDC to SOL demo from one operational workflow.
          Set up custody, save a private policy, test the 25 USDC block,
          then preview the 5 USDC Jupiter route.
        </p>
      </div>

      {/* Dashboard, full state machine: not-connected → init → tabs */}
      <div
        className="pl-reveal mt-10 md:mt-12"
        style={{ transitionDelay: '240ms' }}
      >
        <WalletDashboard />
      </div>

      {/* Feature deck — what /app does once wired up */}
      <div
        className="pl-reveal mt-12 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        style={{ transitionDelay: '320ms' }}
      >
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="rounded-xl border border-line bg-surface/40 p-5 transition hover:border-line-strong"
          >
            <h2 className="font-sans text-base font-semibold text-ink leading-tight">
              {f.title}
            </h2>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              {f.desc}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
