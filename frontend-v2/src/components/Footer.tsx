import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { Logo } from './Logo'
import { LocaleToggle } from './LocaleToggle'

const GITHUB_URL = 'https://github.com/harkon666/Polet-AI'
const DOCS_URL = `${GITHUB_URL}#readme`
const DISCLAIMER_URL = `${GITHUB_URL}/blob/main/docs/prd.md`
const TWITTER_URL = 'https://x.com/poletxyz'

const POLET_PROGRAM = 'F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p'
const IKA_PROGRAM = '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY'

/**
 * Footer, closes the page with brand wordmark, navigation columns,
 * program IDs (the "receipts"), and legal/copyright strip.
 *
 * Hosts the LocaleToggle pill (moved here from Header in Day 6 per the
 * compass, locale is a global page preference, not a navigation control).
 *
 * Layout (top → bottom):
 *   1. Brand row: logo + Polet wordmark | LocaleToggle
 *   2. 2 columns: Rails (anchor links) · Resources (external)
 *   3. Program IDs strip, verifiable receipts on devnet
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

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    target.style.setProperty('--cursor-x', `${x}%`)
    target.style.setProperty('--cursor-y', `${y}%`)
  }

  return (
    <footer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="pl-ambient-hero relative border-t border-line py-12 md:py-16 overflow-hidden"
    >
      <div className="relative z-[2] mx-auto max-w-6xl px-6">
        {/* Brand row: logo + LocaleToggle stay horizontal at every breakpoint;
            tagline / subtagline stack below. */}
        <div className="pl-reveal pb-8 border-b border-line">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-ink">
              <Logo className="h-8 w-auto" />
              <span className="font-sans text-lg font-bold tracking-tight">
                Polet
              </span>
            </div>
            <LocaleToggle />
          </div>
          <div className="mt-3 max-w-md">
            <p className="text-sm text-ink-soft leading-relaxed">
              {t('footer.brand.tagline')}
            </p>
            <p className="mt-1 text-sm text-ink-mute leading-relaxed">
              {t('footer.brand.subtagline')}
            </p>
          </div>
        </div>

        {/* 2 columns: Rails / Resources */}
        <div
          className="pl-reveal grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10 py-10"
          style={{ transitionDelay: '80ms' }}
        >
          {/* Rails, anchor links to landing sections */}
          <FooterCol heading={t('footer.col.rails.heading')}>
            <FooterAnchor href="#rails">{t('footer.col.rails.jupiter')}</FooterAnchor>
            <FooterAnchor href="#rails">{t('footer.col.rails.ika')}</FooterAnchor>
            <FooterAnchor href="#rails">{t('footer.col.rails.encrypt')}</FooterAnchor>
          </FooterCol>

          {/* Resources, external links */}
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

        {/* Program IDs strip, receipts on devnet */}
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

        {/* Bottom: copyright */}
        <div
          className="pl-reveal pt-6 border-t border-line text-xs text-ink-mute"
          style={{ transitionDelay: '240ms' }}
        >
          {copyright}
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
