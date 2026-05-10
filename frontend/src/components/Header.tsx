import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { WalletButton } from './WalletButton';
import PreferencesMenu from './PreferencesMenu';
import { useLocale } from '../hooks/use-locale';

/**
 * Context-aware header.
 *
 * Layout (md+): three horizontal zones
 *   [ Logo + POLET + Devnet ]  [ ...nav centered... ]  [ MiniCTA? + Wallet? + Prefs ]
 *
 * Mobile (<md): nav wraps to a second full-width row below the logo/prefs row.
 *
 * Sticky mini-CTA: on landing routes, after the hero has scrolled past,
 * a small "Open /app →" pill fades into the right cluster. Respects
 * `prefers-reduced-motion` (no fade — just instant toggle).
 */
export default function Header() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const isAppRoute = pathname === '/app' || pathname.startsWith('/app/');
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    if (isAppRoute) {
      setShowStickyCta(false);
      return;
    }

    const THRESHOLD = 420; // approx hero height
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > THRESHOLD);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAppRoute]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md">
      <nav className="page-wrap flex flex-wrap items-center gap-y-3 gap-x-4 py-3 sm:py-4">
        {/* LEFT — logo + POLET wordmark + devnet pill */}
        <div className="order-1 flex items-center gap-3">
          <Link
            to="/"
            className="qe-wordmark qe-wordmark--condensed flex-shrink-0"
            aria-label="Polet AI — home"
          >
            <span className="qe-wordmark__mark" aria-hidden="true">
              <img
                src="/polet-logo.png"
                alt=""
                width={28}
                height={28}
                loading="eager"
                decoding="async"
              />
            </span>
            <span className="qe-wordmark__name">Polet</span>
            <span className="qe-wordmark__tag" aria-hidden="true">/AI</span>
          </Link>

          <span className="qe-pill qe-pill--accent">
            <span className="qe-status-dot" aria-hidden="true" />
            {t('header.devnetPill')}
          </span>
        </div>

        {/* RIGHT — sticky CTA (landing, post-hero) + wallet (on /app) + preferences */}
        <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
          {!isAppRoute && showStickyCta && (
            <Link to="/app" className="qe-header-cta">
              {t('hero.cta.primary')}
              <span aria-hidden="true">→</span>
            </Link>
          )}
          {isAppRoute && <WalletButton />}
          <PreferencesMenu />
        </div>

        {/* CENTER — nav links. Full-width wrap below on mobile, flex-1 centered on md+. */}
        <div className="order-3 flex w-full items-center justify-center gap-1 md:order-2 md:w-auto md:flex-1">
          <Link
            to="/"
            className="qe-nav-link"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'qe-nav-link is-active' }}
          >
            {t('header.nav.home')}
          </Link>
          <Link
            to="/app"
            className="qe-nav-link"
            activeProps={{ className: 'qe-nav-link is-active' }}
          >
            {t('header.nav.app')}
          </Link>
          <Link
            to="/about"
            className="qe-nav-link"
            activeProps={{ className: 'qe-nav-link is-active' }}
          >
            {t('header.nav.howItWorks')}
          </Link>
          <a
            href="https://github.com/harkon666/Polet-AI"
            target="_blank"
            rel="noreferrer"
            className="qe-nav-link"
          >
            <span>{t('header.nav.docs')}</span>
            <span className="ml-1 text-[var(--sea-ink-soft)]" aria-hidden="true">↗</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
