import { Link } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import { Logo } from '../../Logo'
import { WalletButton } from '../WalletButton'
import { usePortalDrawer } from './PortalDrawerContext'

/**
 * PortalMobileBar, slim sticky top bar for `/app/*` below md.
 *
 * Phase 7 (issue 105) wires the hamburger toggle that opens the
 * `<PortalDrawer>` modal. Layout, left-to-right:
 *   - hamburger button (toggles drawer)
 *   - brand block (Polet · Portal, links to /)
 *   - `<WalletButton>` (compact)
 *
 * The hamburger flips its glyph based on `usePortalDrawer().isOpen`
 * so the same tap closes the drawer without showing a separate ✕.
 *
 * Hidden at desktop widths because `<PortalSidebar>` covers ≥ md.
 */
export function PortalMobileBar() {
  const { t } = useLocale()
  const { isOpen, toggle } = usePortalDrawer()

  return (
    <header
      aria-label="Polet Portal mobile chrome"
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg-deep/85 px-4 py-3 backdrop-blur-md md:hidden"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="portal-mobile-hamburger"
          onClick={toggle}
          aria-controls="portal-drawer-panel"
          aria-expanded={isOpen}
          aria-label={
            isOpen ? t('portal.drawer.close') : t('portal.drawer.open')
          }
          className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface/40 text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink"
        >
          <span aria-hidden="true" className="font-mono text-lg leading-none">
            {isOpen ? '✕' : '≡'}
          </span>
        </button>
        <Link
          to="/"
          className="flex items-center gap-2"
          aria-label="Polet — back to landing"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-line-strong bg-lagoon-bright/10 text-lagoon-bright shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
            <Logo className="h-4 w-auto text-ink" />
          </span>
          <span className="font-sans text-sm font-bold text-ink">
            {t('portal.brand.name')}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            {t('portal.brand.kicker')}
          </span>
        </Link>
      </div>
      <WalletButton />
    </header>
  )
}
