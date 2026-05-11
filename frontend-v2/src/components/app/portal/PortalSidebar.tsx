import { Link, useLocation } from '@tanstack/react-router'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { Logo } from '../../Logo'
import { WalletButton } from '../WalletButton'

/**
 * PortalSidebar, the left-rail navigation chrome for `/app/*`.
 *
 * Phase 1 (issue 099) ships:
 *   - Brand block (Logo + "Polet" + "Portal" kicker), links back to `/`
 *   - 5 nav links to portal pages (workspace, gate, funds, proof, bridge)
 *   - Runtime block at the bottom with static placeholder rows; Phase 2
 *     wires these to live console state (devnet, proxy, policy seq,
 *     active session expiry).
 *   - `<WalletButton>` reused unchanged.
 *
 * Active-route highlight is computed from `useLocation()` against each
 * link's `to` prop so the highlight tracks client-side navigation.
 *
 * Sticky positioning (`sticky top-0 h-screen`) keeps the sidebar
 * pinned while sub-pages scroll independently. Hidden below 960px;
 * `<PortalMobileBar>` covers that range.
 */

type NavItem = {
  to: '/app/workspace' | '/app/gate' | '/app/funds' | '/app/proof' | '/app/bridge'
  glyph: string
  labelKey: TranslationKey
  meta: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/workspace', glyph: '◎',   labelKey: 'portal.nav.workspace', meta: 'home'  },
  { to: '/app/gate',      glyph: 'π',   labelKey: 'portal.nav.gate',      meta: '#42'   },
  { to: '/app/funds',     glyph: '$',   labelKey: 'portal.nav.funds',     meta: 'PDA'   },
  { to: '/app/proof',     glyph: '↗',   labelKey: 'portal.nav.proof',     meta: 'log'   },
  { to: '/app/bridge',    glyph: '{ }', labelKey: 'portal.nav.bridge',    meta: 'MCP'   },
]

export function PortalSidebar() {
  const { t } = useLocale()
  const { pathname } = useLocation()

  return (
    <aside
      aria-label="Polet Portal navigation"
      className="sticky top-0 z-30 hidden h-screen flex-col border-r border-line bg-bg-deep/65 px-4 py-6 backdrop-blur-md md:flex"
    >
      {/* Brand */}
      <Link
        to="/"
        className="flex items-center gap-3 px-2 pb-5"
        aria-label="Polet — back to landing"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-line-strong bg-lagoon-bright/10 text-lagoon-bright shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
          <Logo className="h-5 w-auto text-ink" />
        </span>
        <span className="leading-tight">
          <span className="block font-sans text-base font-bold text-ink">
            {t('portal.brand.name')}
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {t('portal.brand.kicker')}
          </span>
        </span>
      </Link>

      <p className="px-2 pb-2 pt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {t('portal.sidebar.section.pages')}
      </p>

      <nav className="grid gap-px" aria-label="Portal pages">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                active
                  ? 'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-ink shadow-[inset_2px_0_0_var(--color-lagoon-bright)] bg-gradient-to-r from-lagoon-bright/10 to-transparent'
                  : 'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-ink-soft hover:bg-lagoon-bright/[0.04] hover:text-ink transition'
              }
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-center font-mono text-[11px] text-lagoon-bright">
                {item.glyph}
              </span>
              <span className="font-sans text-[13px] font-semibold">
                {t(item.labelKey)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {item.meta}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Runtime block — Phase 1 shows Devnet only (real). The
          Proxy / Policy / Session rows are hidden until Phase 2 wires
          them to live console state, so the sidebar never displays an
          unfinished column of "—" placeholders. */}
      <div className="mt-auto border-t border-line pt-4">
        <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.sidebar.section.runtime')}
        </p>
        <ul className="mb-3 grid gap-1.5 px-2 font-sans text-[11px] text-ink-soft">
          <li className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-palm shadow-[0_0_12px_rgba(52,211,153,0.55)]" aria-hidden="true" />
              {t('portal.sidebar.runtime.devnet')}
            </span>
            <strong className="font-mono text-ink">
              {t('portal.sidebar.runtime.online')}
            </strong>
          </li>
        </ul>
        <div className="px-2">
          <WalletButton />
        </div>
      </div>
    </aside>
  )
}
