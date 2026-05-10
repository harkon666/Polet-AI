import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { Logo } from './Logo'
import { LocaleToggle } from './LocaleToggle'

const GITHUB_URL = 'https://github.com/harkon666/Polet-AI'
const DOCS_URL = `${GITHUB_URL}#readme`
const DISCLAIMER_URL = `${GITHUB_URL}/blob/main/docs/prd.md`
const TWITTER_URL = 'https://x.com/'

const POLET_PROGRAM = 'F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p'
const IKA_PROGRAM = '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY'

/**
 * Footer — closes the page with brand, system facts, navigation cols,
 * program IDs (the "receipts"), and legal/copyright strip.
 *
 * Hosts the LocaleToggle pill (moved here from Header in Day 6 per the
 * compass — keeps the top nav clean and treats locale as a global page
 * preference rather than a navigation control).
 *
 * Layout (top → bottom):
 *   1. Brand row: logo + tagline + devnet-live badge | LocaleToggle
 *   2. 3 columns: System (metadata) · Rails (anchors) · Resources (external)
 *   3. Program IDs strip — verifiable receipts on devnet
 *   4. Copyright + devnet-only disclaimer
 *
 * Anchor #footer (semantic <footer>) so future TOC nav can target it.
 */
export function Footer() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  // Interpolate {year} in copyright template
  const year = new Date().getFullYear()
  const copyright = t('footer.bottom.copyright').replace('{year}', String(year))

  return (
    <footer
      ref={containerRef}
      className="border-t border-line bg-bg-base py-12 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Top: brand + LocaleToggle */}
        <div className="pl-reveal flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-10 border-b border-line">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-sm text-ink-soft leading-relaxed">
              {t('footer.brand.desc')}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft bg-surface">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-lagoon-bright animate-ping opacity-75" />
                <span className="relative size-1.5 rounded-full bg-lagoon-bright" />
              </span>
              {t('footer.badges.devnetLive')}
            </span>
          </div>
          <LocaleToggle />
        </div>

        {/* 3 columns: System / Rails / Resources */}
        <div
          className="pl-reveal grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10 py-10"
          style={{ transitionDelay: '80ms' }}
        >
          {/* System */}
          <FooterCol heading={t('footer.col.system.heading')}>
            <FooterMeta label={t('footer.col.system.network.label')} value="Devnet" />
            <FooterMeta label={t('footer.col.system.status.label')} value="Live" valueClass="text-palm" />
            <FooterMeta label={t('footer.col.system.version.label')} value="0.1.0" />
            <FooterMeta label={t('footer.col.system.build.label')} value="dev" />
          </FooterCol>

          {/* Rails — anchor links to landing sections */}
          <FooterCol heading={t('footer.col.rails.heading')}>
            <FooterAnchor href="#rails">{t('footer.col.rails.jupiter')}</FooterAnchor>
            <FooterAnchor href="#rails">{t('footer.col.rails.ika')}</FooterAnchor>
            <FooterAnchor href="#rails">{t('footer.col.rails.encrypt')}</FooterAnchor>
            <FooterAnchor href="#security">{t('footer.col.rails.smartwallet')}</FooterAnchor>
          </FooterCol>

          {/* Resources — external links */}
          <FooterCol heading={t('footer.col.resources.heading')}>
            <FooterLink href={DOCS_URL} external>
              {t('footer.col.resources.docs')}
            </FooterLink>
            <FooterLink href={GITHUB_URL} external>
              {t('footer.col.resources.github')}
            </FooterLink>
            <FooterLink href={TWITTER_URL} external>
              {t('footer.col.resources.twitter')}
            </FooterLink>
            <FooterLink href={DISCLAIMER_URL} external>
              {t('footer.col.resources.disclaimer')}
            </FooterLink>
          </FooterCol>
        </div>

        {/* Program IDs strip — receipts on devnet */}
        <div
          className="pl-reveal py-4 border-t border-line font-mono text-[11px] text-ink-mute leading-relaxed"
          style={{ transitionDelay: '160ms' }}
        >
          <div className="flex flex-col sm:flex-row sm:gap-3">
            <span className="text-ink-soft uppercase tracking-wider w-full sm:w-32 shrink-0">polet program</span>
            <span className="text-ink break-all">{POLET_PROGRAM}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-3 mt-1">
            <span className="text-ink-soft uppercase tracking-wider w-full sm:w-32 shrink-0">ika pre-alpha</span>
            <span className="text-ink break-all">{IKA_PROGRAM}</span>
          </div>
        </div>

        {/* Bottom: copyright + devnet disclaimer */}
        <div
          className="pl-reveal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-6 border-t border-line text-xs text-ink-mute"
          style={{ transitionDelay: '240ms' }}
        >
          <span>{copyright}</span>
          <span className="font-mono uppercase tracking-wider">
            {t('footer.bottom.devnet')}
          </span>
        </div>
      </div>
    </footer>
  )
}

/* ============================================
   Internal layout helpers
   ============================================ */

function FooterCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-3">
        {heading}
      </h3>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  )
}

function FooterMeta({
  label,
  value,
  valueClass = 'text-ink',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="font-mono text-xs uppercase tracking-wider text-ink-mute w-16 shrink-0">
        {label}
      </span>
      <span className={`font-mono text-xs ${valueClass}`}>{value}</span>
    </li>
  )
}

function FooterAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="text-ink-soft hover:text-lagoon-bright transition inline-flex items-center gap-1 group"
      >
        {children}
        <span aria-hidden="true" className="text-ink-mute group-hover:text-lagoon-bright transition">
          ↓
        </span>
      </a>
    </li>
  )
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: React.ReactNode
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-soft hover:text-lagoon-bright transition inline-flex items-center gap-1 group"
        >
          {children}
          <span aria-hidden="true" className="text-ink-mute group-hover:text-lagoon-bright transition">
            ↗
          </span>
        </a>
      </li>
    )
  }
  return (
    <li>
      <Link to={href} className="text-ink-soft hover:text-lagoon-bright transition">
        {children}
      </Link>
    </li>
  )
}
