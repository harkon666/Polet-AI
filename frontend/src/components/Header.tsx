import { Link, useLocation } from '@tanstack/react-router';
import { WalletButton } from './WalletButton';
import ThemeToggle from './ThemeToggle';

/**
 * Context-aware header.
 *
 * - Landing routes (`/`, `/about`): right cluster shows "Open App →" CTA.
 *   No wallet adapter — visitor evaluates the product before connecting.
 * - App route (`/app`, `/app/*`): right cluster shows the WalletButton
 *   (Connect Wallet → wallet pill once connected).
 *
 * Brand wordmark, devnet pill, nav links, and theme toggle stay consistent
 * across all routes.
 */
export default function Header() {
  const { pathname } = useLocation();
  const isAppRoute = pathname === '/app' || pathname.startsWith('/app/');

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-3 py-3 sm:py-4">
        {/* Wordmark + devnet pill */}
        <Link
          to="/"
          className="qe-wordmark group flex-shrink-0"
          aria-label="Polet AI — home"
        >
          <span className="qe-wordmark__mark" aria-hidden="true">P</span>
          <span className="qe-wordmark__name">Polet</span>
          <span className="qe-wordmark__tag">/AI</span>
        </Link>

        <span className="qe-pill qe-pill--accent hidden md:inline-flex">
          <span className="qe-status-dot" aria-hidden="true" />
          Devnet
        </span>

        {/* Nav links — same across all routes (no separate App link;
            the route-aware right cluster handles the conversion CTA) */}
        <div className="order-3 -ml-2 flex w-full flex-wrap items-center gap-x-1 sm:order-2 sm:ml-3 sm:w-auto">
          <Link
            to="/"
            className="qe-nav-link"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'qe-nav-link is-active' }}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="qe-nav-link"
            activeProps={{ className: 'qe-nav-link is-active' }}
          >
            How It Works
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="qe-nav-link"
          >
            <span>Docs</span>
            <span className="ml-1 text-[var(--sea-ink-soft)]" aria-hidden="true">↗</span>
          </a>
        </div>

        {/* Right cluster — route-aware
            Landing/About → "Open App →" CTA (no wallet adapter)
            /app → WalletButton (Connect Wallet / wallet pill) */}
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          {isAppRoute ? (
            <WalletButton />
          ) : (
            <Link
              to="/app"
              className="qe-button qe-button--primary"
              aria-label="Open the wallet console app"
            >
              Open App
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
