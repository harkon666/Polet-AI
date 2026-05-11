import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Header } from '../components/Header'
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
} from '#/lib/config'

import appCss from '../styles.css?url'

// Locale init, runs before hydration to avoid FOUC.
// Reads localStorage 'polet.locale' first, falls back to navigator.language.
const LOCALE_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('polet.locale');var locale=(stored==='id'||stored==='en')?stored:((navigator.language||'en').toLowerCase().startsWith('id')?'id':'en');document.documentElement.setAttribute('lang',locale);}catch(e){}})();`

const PAGE_TITLE = `${SITE_NAME}, Confidential Solana control layer for AI agents`
const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`

// JSON-LD structured data for search engines.
const STRUCTURED_DATA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#000000' },
      { title: PAGE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'keywords', content: SITE_KEYWORDS },
      { name: 'robots', content: 'index,follow' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:image', content: OG_IMAGE_URL },
      { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
      { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
      { property: 'og:image:alt', content: `${SITE_NAME}, confidential Solana control layer` },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'id_ID' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: PAGE_TITLE },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE_URL },
      { name: 'twitter:image:alt', content: `${SITE_NAME}, confidential Solana control layer` },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'en', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'id', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'x-default', href: SITE_URL },
      // Modern SVG favicon — scales for any DPI, single source of truth.
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      // Apple touch icon falls back to the same SVG; iOS rasterises it.
      { rel: 'apple-touch-icon', href: '/favicon.svg' },
      // LCP candidate: Hero ambient PNG. Preloading lets the browser kick
      // off the request alongside CSS instead of waiting for paint.
      { rel: 'preload', as: 'image', href: '/background-hero.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }}
        />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="pl-skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
