import type { ReactNode } from 'react'
import { PortalSidebar } from './PortalSidebar'
import { PortalMobileBar } from './PortalMobileBar'

/**
 * PortalShell, the top-level chrome for `/app/*`.
 *
 * Two-column grid at desktop (≥ 960px): a sticky 268px sidebar on the
 * left and a `<main>` slot on the right. Below 960px the sidebar is
 * hidden and a slim `<PortalMobileBar>` sits at the top so disconnected
 * users still see the brand and a `<WalletButton>`. Mobile drawer
 * (slide-in sidebar with focus trap) is parked for Phase 7
 * (issue 105) — Phase 1 only ships the sticky-sidebar/mobile-bar pair.
 *
 * Children render inside the `<main>` slot and own their own padding
 * rhythm (each route ships its own `<PageHead>` and content). The
 * shell is intentionally chrome-only: no `<Outlet />`, no router
 * wiring, no business logic. The route file owns the `<Outlet />`
 * decision so this primitive stays composable.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="pl-portal-ambient grid min-h-screen grid-cols-1 md:grid-cols-[268px_minmax(0,1fr)]">
      <PortalSidebar />
      <div className="flex min-w-0 flex-col">
        <PortalMobileBar />
        <main className="min-w-0 flex-1 px-5 py-12 md:px-12 md:py-20">
          {children}
        </main>
      </div>
    </div>
  )
}
