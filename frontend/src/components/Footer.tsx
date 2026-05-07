import { Link } from '@tanstack/react-router';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-base)] text-[var(--sea-ink)]">
      {/* Main grid — brand + columns */}
      <div className="page-wrap grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
        {/* Brand block */}
        <div>
          <Link
            to="/"
            className="qe-wordmark"
            aria-label="Polet AI — home"
          >
            <span className="qe-wordmark__mark" aria-hidden="true">P</span>
            <span className="qe-wordmark__name">Polet</span>
            <span className="qe-wordmark__tag">/AI</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--sea-ink-soft)]">
            Confidential Solana control layer for AI agents. Private spending
            guardrails stay hidden, agents never receive unlimited wallet
            authority, and cross-chain signing requests cannot bypass on-chain
            policy.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="qe-pill qe-pill--accent">
              <span className="qe-status-dot" aria-hidden="true" />
              Devnet · Live
            </span>
            <span className="qe-badge qe-badge--alpha">Pre-Alpha</span>
          </div>
        </div>

        {/* SYSTEM column — mono technical stats */}
        <div>
          <h3 className="qe-col-heading">System</h3>
          <dl className="space-y-1">
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">Network</dt>
              <dd className="qe-stat-row__value">Devnet</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">Status</dt>
              <dd className="qe-stat-row__value text-[var(--palm)]">● Live</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">Version</dt>
              <dd className="qe-stat-row__value">v0.1.0</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">Build</dt>
              <dd className="qe-stat-row__value">Alpha</dd>
            </div>
          </dl>
        </div>

        {/* RAILS column */}
        <div>
          <h3 className="qe-col-heading">Rails</h3>
          <ul className="flex flex-col items-start gap-2.5">
            <li>
              <a className="qe-link" href="https://jup.ag" target="_blank" rel="noreferrer">
                Jupiter Strategy <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://docs.ika.xyz/" target="_blank" rel="noreferrer">
                Ika dWallet <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://github.com/dwallet-labs/encrypt-pre-alpha" target="_blank" rel="noreferrer">
                Encrypt Policy <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <Link className="qe-link" to="/about">
                Smart Wallet <span className="qe-link__arrow">→</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* RESOURCES column */}
        <div>
          <h3 className="qe-col-heading">Resources</h3>
          <ul className="flex flex-col items-start gap-2.5">
            <li>
              <Link className="qe-link" to="/about">
                Documentation <span className="qe-link__arrow">→</span>
              </Link>
            </li>
            <li>
              <a className="qe-link" href="https://github.com/harkon666/Polet-AI" target="_blank" rel="noreferrer">
                GitHub <span className="qe-link__arrow">↗</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://x.com/" target="_blank" rel="noreferrer">
                Twitter / X <span className="qe-link__arrow">↗</span>
              </a>
            </li>
            <li>
              <Link className="qe-link" to="/about">
                Pre-Alpha Disclaimer <span className="qe-link__arrow">→</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom strip — quiet meta line */}
      <div className="border-t border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap flex flex-col items-center justify-between gap-2 py-4 font-mono text-[11px] text-[var(--sea-ink-soft)] sm:flex-row">
          <span>
            © {year} Polet AI · All rights reserved
          </span>
          <span>
            Built for Superteam Frontier · Indonesia
          </span>
          <span className="hidden text-[var(--kicker)] sm:inline">
            Devnet only · No production claims
          </span>
        </div>
      </div>
    </footer>
  );
}
