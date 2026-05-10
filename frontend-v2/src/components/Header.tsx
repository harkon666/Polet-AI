import { Link } from '@tanstack/react-router'
import { Logo } from './Logo'
import { useLocale } from '#shared/hooks/use-locale'

const DOCS_URL = 'https://github.com/harkon666/Polet-AI'

/**
 * Polet v2 Header — premium dev tool pattern (Walrus / Lit / Linear).
 *
 * Anatomy (4 elements):
 *   1. Brand: logo + "Polet" wordmark (left, links home)
 *   2. Nav center: "How it works" + "Docs↗" (2 items, hidden on mobile)
 *   3. CTA right: "Open App →" ghost outline button
 *
 * Removed (was in earlier draft):
 *   - "Home" plain link (logo handles home)
 *   - "App" plain link (replaced by primary CTA button)
 *   - DEVNET pulse pill (redundant with hero meta strip)
 *   - LocaleToggle ID/EN (moves to Footer Day 5; locale still
 *     auto-detects via navigator.language + localStorage)
 */
export function Header() {
  const { t } = useLocale()

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
            <span className="font-sans text-lg font-bold tracking-tight">
              Polet
            </span>
          </Link>

          {/* Nav center */}
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <Link
              to="/about"
              className="text-ink-soft hover:text-ink transition"
              activeProps={{ className: 'text-ink' }}
            >
              {t('header.nav.howItWorks')}
            </Link>
            <a
              href="/#rails"
              className="text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.rails')}
            </a>
            <a
              href="/#demo"
              className="text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.demo')}
            </a>
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

          {/* CTA right */}
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line-strong text-ink hover:border-lagoon hover:bg-surface/50 transition text-sm font-medium"
          >
            {t('header.cta.openApp')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
