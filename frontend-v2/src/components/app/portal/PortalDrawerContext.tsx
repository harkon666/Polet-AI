import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from '@tanstack/react-router'

/**
 * PortalDrawerContext, the mobile drawer state for `/app/*`.
 *
 * The portal sidebar is pinned at desktop widths (≥ md). On mobile,
 * tapping the hamburger in `<PortalMobileBar>` opens the same nav as
 * a slide-in modal drawer over the main content. This context owns
 * the boolean state so the bar's toggle and the drawer overlay can
 * agree without prop drilling.
 *
 * Behaviour locked here so callers can't accidentally diverge:
 *   - Route changes auto-close (so navigating from a drawer link
 *     dismisses the drawer without manual cleanup).
 *   - ESC closes the drawer (keyboard escape hatch).
 *   - The provider hooks both effects directly; consumers don't have
 *     to remember to wire them.
 */
type PortalDrawerValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const PortalDrawerContext = createContext<PortalDrawerValue | null>(null)

export function PortalDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  // Auto-close on route change so a drawer-link click never leaves
  // the drawer covering the destination page.
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // ESC closes the drawer.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  )

  return (
    <PortalDrawerContext.Provider value={value}>
      {children}
    </PortalDrawerContext.Provider>
  )
}

export function usePortalDrawer(): PortalDrawerValue {
  const ctx = useContext(PortalDrawerContext)
  if (!ctx) {
    throw new Error(
      'usePortalDrawer must be used inside <PortalDrawerProvider> (mounted by <PortalShell>).',
    )
  }
  return ctx
}
