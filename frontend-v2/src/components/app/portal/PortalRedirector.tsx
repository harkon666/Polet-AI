import { useEffect } from 'react'
import { useLocation, useRouter } from '@tanstack/react-router'
import { useWallet } from '@solana/wallet-adapter-react'

/**
 * PortalRedirector, the connect-first cutover effect.
 *
 * Renders nothing. Lives inside `<ClientWalletProvider>` so it can read
 * `useWallet()`, and inside the TanStack Router tree so it can call
 * `router.navigate()`.
 *
 * Two redirect rules:
 *   1. Connected user at `/app` → bounce to `/app/workspace`
 *      (so the disconnected screen never lingers post-connect).
 *   2. Disconnected user at any `/app/*` sub-route → bounce to `/app`
 *      (so mid-portal screens never render with no wallet context).
 *
 * Both use `replace: true` so the browser history doesn't fill up
 * with the bounced path.
 *
 * Path-matching note: TanStack Router exposes the canonical pathname
 * via `useLocation().pathname`. We treat `/app` and `/app/` as the
 * index, and anything else under `/app/...` as a sub-route.
 */
export function PortalRedirector() {
  const { connected } = useWallet()
  const router = useRouter()
  const { pathname } = useLocation()

  useEffect(() => {
    const isIndex = pathname === '/app' || pathname === '/app/'
    const isSubRoute = pathname.startsWith('/app/') && !isIndex

    // The dev-only `/app/workspace-preview` route renders the workspace
    // against fake state for visual review. It must stay reachable
    // without a connected wallet, so we exempt it from the disconnect
    // bounce. (It's also not in the sidebar nav, so production users
    // won't accidentally land here.)
    const isPreviewRoute = pathname.startsWith('/app/workspace-preview')

    if (connected && isIndex) {
      router.navigate({ to: '/app/workspace', replace: true })
      return
    }

    if (!connected && isSubRoute && !isPreviewRoute) {
      router.navigate({ to: '/app', replace: true })
    }
  }, [connected, pathname, router])

  return null
}
