import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { Logo } from '../../Logo'
import { WalletButton } from '../WalletButton'

/**
 * PortalMobileBar, slim sticky top bar for `/app/*` below 960px.
 *
 * Phase 1 (issue 099) ships a minimum-viable mobile chrome:
 *   - Brand block (Logo + "Polet · Portal")
 *   - `<WalletButton>` reused
 *
 * The drawer-style sidebar (hamburger toggle + slide-in modal +
 * focus trap + ESC close) is parked for Phase 7 (issue 105) so this
 * phase doesn't ship interaction we can't fully test yet. Mobile
 * users still get to connect/disconnect their wallet from this bar.
 *
 * Hidden at desktop widths because `<PortalSidebar>` covers ≥ 960px.
 */
export function PortalMobileBar() {
  const { t } = useLocale()

  return (
    <header
      aria-label="Polet Portal mobile chrome"
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg-deep/85 px-4 py-3 backdrop-blur-md md:hidden"
    >
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
      <WalletButton />
    </header>
  )
}
