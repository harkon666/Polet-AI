import { Link, useLocation } from '@tanstack/react-router'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { Logo } from '../../Logo'
import { WalletButton } from '../WalletButton'
import { useConsole } from '../use-console-actions'
import { hasActiveSession } from '../selectors/console-selectors'

/**
 * PortalSidebar, the left-rail navigation chrome for `/app/*`.
 *
 * Phase 1 (issue 099) shipped the layout and the nav items. Phase 2
 * (issue 100) now wires the bottom runtime block to live state:
 *   - Devnet: static "online" (devnet-only build, OK to hard-code).
 *   - Proxy:  placeholder "—" — live proxy ping lands in a later phase.
 *   - Policy: renders `enc #<seq>` when the confidential USDC DCA policy
 *     is enabled, or "—" when it isn't yet sealed.
 *   - Session: renders `<N>m` or `<N>h` remaining when at least one
 *     authorized session key hasn't expired, otherwise "—".
 *
 * Active-route highlight is computed from `useLocation()` against
 * each link's `to` prop so the highlight tracks client-side navigation.
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

/**
 * formatSessionRemaining — compact "time-left" glyph for the
 * sidebar's Session row. Returns null when no authorized session
 * exists or the soonest expiry has already passed. Format is
 * `<N>m` under an hour, `<N>h` otherwise, matching the presence
 * indicator style in `SetupLedger`.
 */
function formatSessionRemaining(state: ReturnType<typeof useConsole>['state']): string | null {
  if (!hasActiveSession(state)) return null
  const list = state.data?.temporalKeys ?? state.data?.sessions ?? []
  const nowSec = Math.floor(Date.now() / 1000)
  const earliest = list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((s: any) => s?.authorized)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => Number(s?.expiresAt ?? 0))
    .filter((t) => t > nowSec)
    .sort((a, b) => a - b)[0]
  if (!earliest) return null
  const leftSec = earliest - nowSec
  if (leftSec < 60) return `${leftSec}s`
  const min = Math.floor(leftSec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  return `${hr}h`
}

export function PortalSidebar() {
  const { t } = useLocale()
  const { pathname } = useLocation()
  const { state } = useConsole()

  const policyEnabled = Boolean(state.data?.usdcDcaPolicy?.enabled)
  const policySeq = Number(state.data?.policySeq ?? 0)
  const policyLabel = policyEnabled
    ? `enc #${policySeq}`
    : t('portal.sidebar.runtime.placeholder')

  const sessionRemaining = formatSessionRemaining(state)
  const sessionLabel =
    sessionRemaining ?? t('portal.sidebar.runtime.placeholder')

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

      {/* Runtime block — wired to live console state in Phase 2.
          Devnet stays static ("online"), Proxy stays a placeholder
          until a later phase adds a live health ping. Policy + Session
          are now derived from ConsoleState. */}
      <div className="mt-auto border-t border-line pt-4" data-testid="sidebar-runtime">
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
          <li
            className="flex items-center justify-between gap-2"
            data-testid="sidebar-runtime-proxy"
          >
            <span className="text-ink-mute">
              {t('portal.sidebar.runtime.proxy')}
            </span>
            <strong className="font-mono text-ink-mute">
              {t('portal.sidebar.runtime.placeholder')}
            </strong>
          </li>
          <li
            className="flex items-center justify-between gap-2"
            data-testid="sidebar-runtime-policy"
            data-state={policyEnabled ? 'sealed' : 'empty'}
          >
            <span className="text-ink-mute">
              {t('portal.sidebar.runtime.policy')}
            </span>
            <strong
              className={`font-mono ${policyEnabled ? 'text-ink' : 'text-ink-mute'}`}
            >
              {policyLabel}
            </strong>
          </li>
          <li
            className="flex items-center justify-between gap-2"
            data-testid="sidebar-runtime-session"
            data-state={sessionRemaining ? 'active' : 'empty'}
          >
            <span className="text-ink-mute">
              {t('portal.sidebar.runtime.session')}
            </span>
            <strong
              className={`font-mono ${sessionRemaining ? 'text-ink' : 'text-ink-mute'}`}
            >
              {sessionLabel}
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
