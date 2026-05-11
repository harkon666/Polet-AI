import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ClientWalletProvider } from '#/components/ClientWalletProvider'
import { ConsoleStateProvider } from '../components/app/use-console-actions'
import { PortalShell } from '../components/app/portal/PortalShell'
import { PortalRedirector } from '../components/app/portal/PortalRedirector'

/**
 * /app, the layout route for **Polet Portal**.
 *
 * Phase 1 (issue 099) cuts the old single-page console (AppHeader,
 * MissionRibbon, StatStrip, SetupLedger, TwoRailConsole, ReceiptLog,
 * AgentIntegrationPanel, AdvancedFallback) and re-mounts the same
 * `<ConsoleStateProvider>` + 17 actions inside a multi-page sidebar
 * portal. Sub-routes — workspace, gate, funds, proof, bridge — are
 * placeholders this phase; phases 2–6 fill them in.
 *
 * Routing model:
 *   - This file is the **layout route**: its component renders the
 *     portal chrome (`<PortalShell>`) and an `<Outlet />` for child
 *     routes. The provider tree mounts ONCE here so sub-routes share
 *     a single `<ConsoleStateProvider>` and a single Solana wallet
 *     adapter context.
 *   - `app.index.tsx` is the **default child** at `/app`, rendering
 *     the disconnected/connect-first screen.
 *   - `app.{workspace,gate,funds,proof,bridge}.tsx` are the named
 *     sub-routes.
 *   - `<PortalRedirector>` watches wallet `connected` state and
 *     bounces between `/app` and `/app/workspace` as appropriate.
 *
 * Wallet adapter still lives ONLY in this route's tree (Day 8 perf
 * win), so landing pages don't drag the ~1 MB wallet-adapter bundle.
 *
 * The legacy single-page composition stays archived in
 * `components/app/_archived/` (Phase 7 / issue 105) for reference.
 */
export const Route = createFileRoute('/app')({
  component: AppLayout,
})

export function AppLayout() {
  return (
    <ClientWalletProvider>
      <ConsoleStateProvider>
        <PortalShell>
          <PortalRedirector />
          <Outlet />
        </PortalShell>
      </ConsoleStateProvider>
    </ClientWalletProvider>
  )
}
