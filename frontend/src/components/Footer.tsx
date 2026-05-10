import { Link } from '@tanstack/react-router';
import { useLocale } from '../hooks/use-locale';

export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--bg-base)] text-[var(--sea-ink)]">
      <div className="page-wrap grid gap-10 py-14 md:grid-cols-[1.6fr_repeat(3,1fr)] md:gap-10">
        {/* Brand block */}
        <div>
          <Link
            to="/"
            className="qe-wordmark qe-wordmark--lg"
            aria-label="Polet AI — home"
          >
            <span className="qe-wordmark__mark" aria-hidden="true">
              <img
                src="/polet-logo.png"
                alt=""
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="qe-wordmark__name">Polet</span>
            <span className="qe-wordmark__tag">/AI</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--sea-ink-soft)]">
            {t('footer.brand.desc')}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="qe-pill qe-pill--accent">
              <span className="qe-status-dot" aria-hidden="true" />
              {t('footer.badges.devnetLive')}
            </span>
            <span className="qe-badge qe-badge--alpha">{t('disclaimer.badge')}</span>
          </div>
        </div>

        {/* SYSTEM column */}
        <div>
          <h3 className="qe-col-heading">{t('footer.col.system.heading')}</h3>
          <dl className="space-y-1">
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">{t('footer.col.system.network.label')}</dt>
              <dd className="qe-stat-row__value">Devnet</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">{t('footer.col.system.status.label')}</dt>
              <dd className="qe-stat-row__value text-[var(--palm)]">● Live</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">{t('footer.col.system.version.label')}</dt>
              <dd className="qe-stat-row__value">v0.1.0</dd>
            </div>
            <div className="qe-stat-row">
              <dt className="qe-stat-row__label">{t('footer.col.system.build.label')}</dt>
              <dd className="qe-stat-row__value">Alpha</dd>
            </div>
          </dl>
        </div>

        {/* RAILS column */}
        <div>
          <h3 className="qe-col-heading">{t('footer.col.rails.heading')}</h3>
          <ul className="flex flex-col items-start gap-2.5">
            <li>
              <a className="qe-link" href="https://jup.ag" target="_blank" rel="noreferrer">
                {t('footer.col.rails.jupiter')} <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://docs.ika.xyz/" target="_blank" rel="noreferrer">
                {t('footer.col.rails.ika')} <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://github.com/dwallet-labs/encrypt-pre-alpha" target="_blank" rel="noreferrer">
                {t('footer.col.rails.encrypt')} <span className="qe-link__arrow">→</span>
              </a>
            </li>
            <li>
              <Link className="qe-link" to="/about">
                {t('footer.col.rails.smartwallet')} <span className="qe-link__arrow">→</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* RESOURCES column */}
        <div>
          <h3 className="qe-col-heading">{t('footer.col.resources.heading')}</h3>
          <ul className="flex flex-col items-start gap-2.5">
            <li>
              <Link className="qe-link" to="/about">
                {t('footer.col.resources.docs')} <span className="qe-link__arrow">→</span>
              </Link>
            </li>
            <li>
              <a className="qe-link" href="https://github.com/harkon666/Polet-AI" target="_blank" rel="noreferrer">
                {t('footer.col.resources.github')} <span className="qe-link__arrow">↗</span>
              </a>
            </li>
            <li>
              <a className="qe-link" href="https://x.com/" target="_blank" rel="noreferrer">
                {t('footer.col.resources.twitter')} <span className="qe-link__arrow">↗</span>
              </a>
            </li>
            <li>
              <Link className="qe-link" to="/about">
                {t('footer.col.resources.disclaimer')} <span className="qe-link__arrow">→</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Community signal — prominent join/follow cluster */}
      <div className="border-t border-[var(--line)]">
        <div className="page-wrap flex flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:gap-6">
          <h3 className="qe-col-heading m-0 sm:mr-2">{t('footer.community.heading')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://x.com/"
              target="_blank"
              rel="noreferrer"
              className="qe-community-chip"
            >
              <span aria-hidden="true">𝕏</span>
              {t('footer.community.x')}
            </a>
            <a
              href="https://github.com/harkon666/Polet-AI"
              target="_blank"
              rel="noreferrer"
              className="qe-community-chip"
            >
              <span aria-hidden="true">◯</span>
              {t('footer.community.github')}
            </a>
            <span className="qe-community-chip qe-community-chip--soon" aria-disabled="true">
              <span aria-hidden="true">💬</span>
              {t('footer.community.discord')}
              <span className="qe-community-chip__soon">· {t('footer.community.discordSoon')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-[var(--line)] bg-[var(--foam)]">
        <div className="page-wrap flex flex-col items-center justify-between gap-3 py-4 font-mono text-[11px] text-[var(--sea-ink-soft)] sm:flex-row">
          <span>{t('footer.bottom.copyright').replace('{year}', String(year))}</span>
          <span className="flex items-center gap-2">
            <img src="/brand/colosseum-symbol.svg" alt="" width={14} height={14} className="opacity-70" aria-hidden="true" />
            <a href="https://colosseum.com/frontier" target="_blank" rel="noreferrer" className="font-semibold text-[var(--sea-ink)] hover:text-[var(--lagoon)] transition-colors">Colosseum Frontier</a>
            <span>×</span>
            <img src="/brand/solana-logomark.svg" alt="" width={14} height={14} className="opacity-70" aria-hidden="true" />
            <a href="https://solana.com/" target="_blank" rel="noreferrer" className="font-semibold text-[var(--sea-ink)] hover:text-[var(--lagoon)] transition-colors">Solana</a>
          </span>
          <span className="hidden text-[var(--kicker)] sm:inline">
            {t('footer.bottom.devnet')}
          </span>
        </div>
      </div>
    </footer>
  );
}
