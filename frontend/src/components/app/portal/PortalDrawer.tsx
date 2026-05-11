import { useEffect, useRef } from 'react'
import { useLocale } from '#/hooks/use-locale'
import { PortalSidebar } from './PortalSidebar'
import { usePortalDrawer } from './PortalDrawerContext'

/**
 * PortalDrawer, the mobile slide-in modal that hosts `<PortalSidebar>`.
 *
 * Visible only at `< md`. The drawer slides in from the left over a
 * dimmed backdrop. Tapping the backdrop, hitting ESC, or navigating
 * via any link closes it (ESC + route change wired in
 * `<PortalDrawerProvider>`; the backdrop handler lives here).
 *
 * Focus management:
 *   - When the drawer opens, focus moves to its container (so screen
 *     readers + keyboard users don't get stranded on the hamburger).
 *   - The main content gets `inert` while the drawer is open, which
 *     traps focus inside the drawer without a custom handler.
 *
 * Motion:
 *   - The slide animation is handled in CSS (`.pl-portal-drawer`) so
 *     `@media (prefers-reduced-motion: reduce)` users get an instant
 *     snap instead of a sliding panel.
 *
 * The drawer renders the same `<PortalSidebar>` used at desktop —
 * passed `variant="drawer"` so its outer classes drop the
 * `sticky` / `hidden md:flex` rules that don't make sense in a
 * fixed-position modal.
 */
export function PortalDrawer() {
  const { t } = useLocale()
  const { isOpen, close } = usePortalDrawer()
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus the drawer container when it opens.
  useEffect(() => {
    if (!isOpen) return
    containerRef.current?.focus()
  }, [isOpen])

  // While the drawer is open, mark the main app shell as inert so the
  // browser keeps tab focus inside the drawer. The shell's container
  // is found by its data-attribute hook.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(
      '[data-testid="portal-shell-main"]',
    )
    if (!shell) return
    if (isOpen) shell.setAttribute('inert', '')
    else shell.removeAttribute('inert')
    return () => shell.removeAttribute('inert')
  }, [isOpen])

  return (
    <div
      data-testid="portal-drawer-root"
      data-state={isOpen ? 'open' : 'closed'}
      aria-hidden={!isOpen}
      className={`pl-portal-drawer-root md:hidden ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <button
        type="button"
        data-testid="portal-drawer-backdrop"
        aria-label={t('portal.drawer.backdrop')}
        tabIndex={isOpen ? 0 : -1}
        onClick={close}
        className={`pl-portal-drawer-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('portal.brand.name')}
        tabIndex={-1}
        data-testid="portal-drawer-panel"
        className={`pl-portal-drawer fixed inset-y-0 left-0 z-50 w-[85%] max-w-[280px] outline-none transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <PortalSidebar variant="drawer" />
      </div>
    </div>
  )
}
