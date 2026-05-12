import type { ReactNode } from 'react'
import { PortalSidebar } from './PortalSidebar'
import { PortalMobileBar } from './PortalMobileBar'
import { PortalDrawer } from './PortalDrawer'
import { PortalDrawerProvider } from './PortalDrawerContext'

/**
 * PortalShell, the top-level chrome for `/app/*`.
 *
 * Two-column grid at desktop (≥ md): sticky 268px sidebar on the left
 * and a `<main>` slot on the right. Below md the sidebar collapses
 * into the `<PortalMobileBar>` hamburger which toggles the
 * `<PortalDrawer>` slide-in modal (Phase 7 / issue 105).
 *
 * Drawer state lives in `<PortalDrawerProvider>` so the bar's toggle
 * and the drawer overlay share one source of truth without prop
 * drilling. Route changes + ESC auto-close (handled inside the
 * provider).
 *
 * The shell stays chrome-only (no `<Outlet />`, no router wiring,
 * no business logic). The route file owns the `<Outlet />` decision
 * so this primitive remains composable.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <PortalDrawerProvider>
      <PortalDrawer />
      <div className="pl-portal-ambient grid min-h-screen grid-cols-1 md:grid-cols-[268px_minmax(0,1fr)]">
        <PortalSidebar />
        <div
          data-testid="portal-shell-main"
          className="flex min-w-0 flex-col"
        >
          <PortalMobileBar />
          <main className="min-w-0 flex-1 px-5 py-6 md:px-12 md:py-20">
            {children}
          </main>
        </div>
      </div>
    </PortalDrawerProvider>
  )
}
