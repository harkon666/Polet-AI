import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from './Logo'
import { useLocale } from '#shared/hooks/use-locale'

const DOCS_URL = 'https://github.com/harkon666/Polet-AI'

/**
 * Polet v2 Header.
 *
 * Anatomy (desktop ≥ md):
 *   1. Brand: logo + "Polet" wordmark (left, links home)
 *   2. Nav center: How it works · Rails · Demo · Docs↗ (4 items)
 *   3. CTA right: "Open App →" ghost button
 *
 * Mobile (< md): logo + Open App + hamburger toggle. Tapping the
 * hamburger expands a slide-down panel below the brand row with the
 * full nav list. Closing on Escape, on link click, and on toggle press.
 *
 * Header is `relative z-10` (not sticky), so it scrolls out with the
 * page. Background is intentionally transparent so the Hero ambient
 * PNG bleeds through the top of the page (same treatment as Footer).
 */
export function Header() {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  // Close mobile menu on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)
  const toggleMenu = () => setIsOpen((v) => !v)

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            aria-label={t('header.nav.home')}
            onClick={closeMenu}
            className="inline-flex items-center gap-2 text-ink hover:text-lagoon transition"
          >
            <Logo className="h-7 w-auto" />
            <span className="font-sans text-lg font-bold tracking-tight">
              Polet
            </span>
          </Link>

          {/* Desktop nav */}
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

          {/* Right cluster: CTA + mobile hamburger */}
          <div className="flex items-center gap-2">
            <Link
              to="/app"
              onClick={closeMenu}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line-strong text-ink hover:border-lagoon hover:bg-surface/50 transition text-sm font-medium"
            >
              {t('header.cta.openApp')}
              <span aria-hidden="true">→</span>
            </Link>

            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-controls="header-mobile-nav"
              aria-label={isOpen ? t('header.nav.menu.close') : t('header.nav.menu.open')}
              className="md:hidden inline-flex items-center justify-center size-9 rounded-lg border border-line-strong text-ink hover:border-lagoon transition touch-manipulation"
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down panel */}
        <nav
          id="header-mobile-nav"
          aria-hidden={!isOpen}
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            isOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col py-3 border-t border-line/60 mt-1 text-base">
            <Link
              to="/about"
              onClick={closeMenu}
              className="px-2 py-3 text-ink-soft hover:text-ink transition"
              activeProps={{ className: 'text-ink' }}
            >
              {t('header.nav.howItWorks')}
            </Link>
            <a
              href="/#rails"
              onClick={closeMenu}
              className="px-2 py-3 text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.rails')}
            </a>
            <a
              href="/#demo"
              onClick={closeMenu}
              className="px-2 py-3 text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.demo')}
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="inline-flex items-center gap-1 px-2 py-3 text-ink-soft hover:text-ink transition"
            >
              {t('header.nav.docs')}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}
