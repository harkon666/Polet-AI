# Landing SEO And Social Metadata

Labels: `needs-triage`, `frontend`, `seo`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Add SEO and social-sharing metadata to the landing route. Currently
`frontend/src/routes/__root.tsx` sets only `<title>`, charset, and viewport.
For a hackathon-facing landing page, missing metadata is a direct hit on
perceived professionalism: no rich preview when the URL is shared on X /
Discord / Telegram, no structured data for search engines, no canonical URL.

Add: meta description, keywords, Open Graph tags, Twitter card tags, a
canonical link, per-locale `lang` + `hreflang` hints, and a JSON-LD
`SoftwareApplication` block. Commit a 1200×630 OG image placeholder at
`frontend/public/og-image.png`.

## Acceptance criteria

- [ ] `<meta name="description">` present on `/`, concise (≤ 160 chars),
      summarizing "confidential Solana control layer for AI agents — private
      spending limits, policy-gated execution, devnet pre-alpha".
- [ ] `<meta name="keywords">` with 5–10 terms: solana, ai agent, confidential
      wallet, jupiter, ika dwallet, encrypt, defi, policy gate, pre-alpha.
- [ ] Open Graph tags: `og:type=website`, `og:title`, `og:description`,
      `og:url`, `og:site_name=Polet AI`, `og:image`, `og:image:width=1200`,
      `og:image:height=630`, `og:locale=en_US`, `og:locale:alternate=id_ID`.
- [ ] Twitter card tags: `twitter:card=summary_large_image`, `twitter:title`,
      `twitter:description`, `twitter:image`.
- [ ] Canonical link: `<link rel="canonical" href="…">`. Use a constant
      `SITE_URL` — default to a placeholder like
      `https://polet-ai.example.com` if no real deploy URL is pinned yet,
      and document the constant so it's easy to update.
- [ ] `hreflang` links: `<link rel="alternate" hreflang="en" href="…">` and
      `hreflang="id"` pointing at the same URL (single-URL multilingual is
      acceptable until a proper `/en` / `/id` path split exists).
- [ ] `<html lang>` already reflects the active locale via the
      `LOCALE_INIT_SCRIPT` — verify this still works after the change and
      add a test assertion if missing.
- [ ] JSON-LD `<script type="application/ld+json">` with
      `"@type": "SoftwareApplication"`, name, description, applicationCategory,
      operatingSystem, url, and an `offers` block with `price: 0`.
- [ ] `frontend/public/og-image.png` committed at exactly 1200×630 pixels.
      Content: Polet wordmark + the hero headline copy + "Devnet · Pre-Alpha"
      badge on the repo's lagoon/foam background. Weight ≤ 200KB.
- [ ] `frontend/public/favicon.ico` and `apple-touch-icon.png` exist (or
      confirm they do); if missing, add them as part of this slice since
      browsers request them alongside SEO crawl.
- [ ] Lighthouse SEO score for `/` is ≥ 95 (run with DevTools or
      `bun run lighthouse` if wired up).
- [ ] `cd frontend && bun run build` passes. The OG image is included in
      the build output.
- [ ] A new test in `-index.test.tsx` (or a new `__root.test.tsx`) asserts
      that the rendered document includes `<meta name="description">`,
      `og:title`, `twitter:card`, and the JSON-LD script.

## Implementation notes

### TanStack Router meta API

`createRootRoute` already uses the `head()` function pattern. Extend it:

```ts
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Polet AI — Confidential wallet layer for AI agents on Solana' },
      { name: 'description', content: '…' },
      { name: 'keywords', content: '…' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: '…' },
      { property: 'og:description', content: '…' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'Polet AI' },
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'id_ID' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: '…' },
      { name: 'twitter:description', content: '…' },
      { name: 'twitter:image', content: `${SITE_URL}/og-image.png` },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'en', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'id', href: SITE_URL },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Polet AI',
          description: '…',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          url: SITE_URL,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }),
      },
    ],
  }),
  shellComponent: RootDocument,
});
```

Check TanStack Router's current version docs for exact `scripts` support —
if JSON-LD via the `head()` API isn't first-class, fall back to
`dangerouslySetInnerHTML` in `RootDocument`.

### SITE_URL constant

Create `frontend/src/lib/config.ts`:

```ts
// TODO: replace with real deploy URL when public deployment is configured.
// README § "Program And URLs" currently says "Public deployment links: not
// configured in this repo yet."
export const SITE_URL = 'https://polet-ai.example.com';
```

Document in a comment that updating this constant when a real deploy lands
will propagate through all SEO tags.

### OG image

A 1200×630 PNG that reads as Polet even at small preview sizes.
Recommended layout:

- Background: `--foam` (off-white) with a subtle `--lagoon` accent stripe
- Polet wordmark top-left (~60px tall)
- Hero headline centered
- Bottom strip: "Devnet · Pre-Alpha · Colosseum Frontier" in mono
- No screenshot of UI (too small to read at preview size)

If a design tool isn't available, a handcrafted SVG → PNG via `@resvg/resvg`
or CLI imagemagick works. Alternatively, a minimal HTML+CSS page screenshotted
at 1200×630 with Playwright is reasonable.

### Description copy drafts

EN: *"Polet AI is a confidential Solana control layer for AI agents.
Private spending limits, policy-gated Jupiter DCA, and Ika dWallet approvals
— devnet pre-alpha."* (~170 chars — trim to 160)

Decide final wording during implementation, but it must: (1) name "Solana",
(2) mention "AI agent" or equivalent, (3) surface "confidential", (4) say
"devnet" or "pre-alpha" somewhere. Do not claim production, mainnet, or
privacy guarantees (see `docs/agents/domain.md` anti-claim checklist).

## Verification

```bash
cd frontend
bun run test
bun run build
```

Manual:

1. `bun run dev`, then open `http://localhost:3000/`.
2. View source: confirm meta description, OG tags, Twitter card, canonical,
   hreflang, and JSON-LD all render.
3. Open DevTools → Lighthouse → run SEO audit on `/` → confirm ≥ 95.
4. Paste `http://localhost:3000/` into https://metatags.io/ or
   https://www.opengraph.xyz/ and confirm the preview card renders with the
   OG image.

## Blocked by

None - can start immediately.
