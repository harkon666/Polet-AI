import { Link } from '@tanstack/react-router'
import { Logo } from './Logo'
import { LocaleToggle } from './LocaleToggle'
import { useLocale } from '#shared/hooks/use-locale'

const DOCS_URL = 'https://github.com/harkon666/Polet-AI'

/**
 * Polet v2 Header.
 *
 * - Sticky, blurred backdrop on scroll.
 * - Logo links home.
 * - Nav: Home · App · How It Works · Docs↗
 * - Right cluster: LocaleToggle.
 *
 * Theme toggle removed (dark canonical).
 * Wallet button only on `/app` (handled inside the route, not here).
 */
export function Header() {
  const { t } = useLocale()

  const navItems: { to: string; key: 'header.nav.home' | 'header.nav.app' | 'header.nav.howItWorks' }[] = [
    { to: '/', key: 'header.nav.home' },
    { to: '/app', key: 'header.nav.app' },
    { to: '/about', key: 'header.nav.howItWorks' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line backdrop-blur-md bg-bg-base/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Brand */}
          <Link
            to="/"
            aria-label={t('header.nav.home')}
            className="inline-flex items-center gap-2 text-ink hover:text-lagoon transition"
          >
            <Logo className="h-7 w-auto" />
            <span className="font-sans text-lg font-semibold tracking-tight">
              Polet
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {navItems.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className="text-ink-soft hover:text-ink transition"
                activeProps={{ className: 'text-ink' }}
              >
                {t(key)}
              </Link>
            ))}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.docs')}
              <span aria-hidden="true">↗</span>
            </a>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-ink-mute">
              <span className="size-1.5 rounded-full bg-palm animate-pulse" />
              {t('header.devnetPill')}
            </span>
            <LocaleToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
