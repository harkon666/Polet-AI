# Landing v2 compass

Working tracker for the v2 rebuild. **Cutover is complete**: the rebuilt
landing + Portal now live in the canonical `frontend/` workspace.

- **Frontend root**: `frontend/` (port `3000`)
- **Import alias**: `#/*` and `@/*` → `./src/*`; the temporary cross-import
  alias used during the rebuild is retired.
- **Active routes**: `/` landing, `/app` Portal, `/about` internal redirect to
  `/#how-it-works`.
- **Test**: `frontend/src/routes/-index.test.tsx` plus `-*.test.*` route tests.
- **Styles**: `frontend/src/styles.css`

## Goal

Replace the legacy frontend with a polished, dark-canonical, type-driven
landing experience plus a multi-page Polet Portal. The canonical workspace is
now `frontend/`.

## Decision book

Locked-in decisions from the grill-me session, in priority order:

| # | Decision | Choice | Rationale (one-line) |
|---|---|---|---|
| 1 | Sharing model | **Self-contained mirror** — copy the tested runtime surface into canonical `frontend/src/` | Tested SDK code is the most valuable asset; don't fork behaviour. |
| 2 | Fate of v1 | **Replace total** — no permanent coexist | Hackathon scope; coexist permanen = workspace overhead with no payoff. |
| 3 | Theme canonical | **Dark only**, no toggle | Brand assets demand it; logo + bg lose magic on light surface; dev audience defaults to dark. |
| 4 | Visual north star | **Linear (dark)** + 3 adjustments: teal accent, ID-friendly type, scroll-driven motion (no hover-reveal) | Asset DNA matches Linear's silk-gradient marketing; density pattern fits Polet's 10 sections; juris already familiar. |
| 5 | Tooling stack | **Tailwind v4 utility + `pl-*` custom class hybrid**, rule of three | Stack already paid; pure utility breaks for ambient gradients & motion; pure CSS-vars wastes Tailwind utility productivity. |
| 6 | Build order | **Token → Header → Hero → outward** vertical slice | Visible progress Day 1; primitives extracted by-need not speculative. |
| 7a | Logo format | **SVG inline**, traced from PNG via potrace Day 0 | Crisp at all sizes; `currentColor` controllable. |
| 7b | Hero bg | **CSS gradient replication** (3-layer radial+linear, 20s drift) | Zero image weight; responsive native; respects reduced-motion. |
| 7c | Font | **`@fontsource-variable/geist` + `geist-mono`** | Variable font, self-hosted, ~60KB total, font-display swap built-in. |
| 8a | i18n | **Local canonical dictionary** in `frontend/src/locale/dictionary.ts` | Single source of truth for landing + Portal. |
| 8b | Routing v2 | **Canonical routes** `/app` is the Portal; `/about` redirects internally to `/#how-it-works` | No permanent v1 coexistence. |
| 8c | Test stack | **Vitest only** Day 1-3, Playwright at Day 6 | Hackathon ROI on e2e is end-of-cycle. |
| 8d | Lint | **`tsc --noEmit` only** | No Biome/ESLint config drift; format via editor. |

## Day 0–7 timeline

```
DAY 0 — Pre-code
├── Trace polet-logo.png → SVG paths (DONE: /tmp/logo.svg, 2 paths, viewBox 376.6×577.6)
├── Write this compass doc (THIS FILE)
└── Inventory v1 cross-import surface (lib/, hooks/, data/, locale/, ClientWalletProvider)

DAY 1 AM — Project scaffold
├── Scaffold temporary rebuild workspace, copy package.json + vite.config.ts + tsconfig.json
├── Strip from package.json: @tailwindcss/typography, e2e/playwright deps (Day 6)
├── Add: @fontsource-variable/geist, @fontsource-variable/geist-mono
├── Initial temporary shared alias for v1 runtime surface
├── vite.config.ts: server.port = 3000
├── frontend/src/styles.css — @import "tailwindcss" + @theme tokens + base pl-* classes
├── frontend/src/{router.tsx, routes/__root.tsx, routes/index.tsx} (placeholder)
├── App route wraps `ClientWalletProvider`
└── Smoke: bun run dev → http://localhost:3000 dark canvas + Geist visible

DAY 1 PM — Header vertical slice
├── components/Logo.tsx (inline SVG, currentColor)
├── components/primitives/{Button.tsx, KickerLabel.tsx}
├── components/LocaleToggle.tsx (re-skinned, `useLocale`)
├── components/Header.tsx (Logo + nav links + LocaleToggle)
├── routes/{app.tsx, about.tsx}
└── Smoke: header render, locale toggle works, nav links navigate

DAY 2 — Hero section
├── components/Hero.tsx — kicker + 2-line headline + subhead + 1 CTA + meta strip
├── primitives/Reveal.tsx (or className pl-reveal pattern)
├── styles.css: .pl-ambient-hero (3-layer gradient, 20s drift, reduced-motion)
├── Mobile responsive 375/768/1280/1920
├── Test: hero renders all i18n keys
└── Smoke: hero looks shippable, scroll reveal on

DAY 3 — Stats counter + Manifesto (3 problem cards)
├── components/StatsCounter.tsx (port logic, redesign visual)
├── Manifesto inline section in routes/index.tsx
├── primitives/Card.tsx (extract on 2nd usage = problem cards)
└── Test: content assertions both locales

DAY 4 — Demo widget + Rails skeleton
├── components/LandingDemoWidget.tsx (UI baru, logic from local runtime lib)
├── Rails section placeholder (3 cards: Encrypt, Ika, Jupiter)
└── Test: demo widget renders

DAY 5 — Rails detail + Security 4-quadrant + Final CTA + Footer
├── components/RailMockup.tsx ×3 differentiated (terminal/code style)
├── Security inline section
├── components/Footer.tsx
└── Test: every section has assertion

DAY 6 — Polish
├── routes/-index.test.tsx coverage all sections both locales
├── Lighthouse pass ≥95 a11y, ≥90 perf
├── Mobile audit 375/768/1280/1920
├── Reduced-motion fallback verify
├── Playwright e2e for hero CTA + locale toggle
└── bun run build green

DAY 7 — Buffer / cutover prep
├── Copy still-needed runtime surface into canonical frontend/src/
├── Remove temporary cross-import alias, normalise to #/*
├── Move rebuilt workspace to canonical frontend/
├── Route /about internally to /#how-it-works
└── Update README + AGENTS.md
```

## Retired cross-import surface

During the pre-cutover rebuild these paths were addressed through a temporary
shared alias. Cutover copied the still-needed runtime surface into
`frontend/src/` and normalized imports to `#/*`.

```
#/lib/program.ts                  ← Anchor IDL bindings, program ID
#/lib/solana-transaction.ts       ← TX construction + send
#/lib/api.ts                      ← Proxy bridge fetch
#/lib/official-encrypt-client.ts  ← Encrypt pre-alpha SDK wrapper
#/lib/config.ts                   ← Env config
#/lib/i18n.ts                     ← legacy i18n helper for copied fallback flows

#/hooks/use-locale.ts             ← Locale state + custom event sync
#/locale/dictionary.ts            ← EN+ID translation, single source

#/components/ClientWalletProvider.tsx ← Pure context, no styling
```

NOT cross-imported (rebuilt in v2):
- `frontend/src/components/{Header, Footer, Hero*, BrandLogo, FlowDiagram,
  RailMockup, StatsCounter, LandingDemoWidget, ProductFrameMockup,
  LocaleToggle, ThemeToggle, ActivityCard, DemoTab, SimpleDemoTab,
  PolicyConfigurator, TemporalKeyManager, WalletDashboard, WalletButton,
  PreferencesMenu}.tsx`
- `frontend/src/styles.css` (2299 LOC of `qe-*` legacy)
- `frontend/src/routes/*` (rebuilt fresh)

## Style system

### Token reference

```css
@theme {
  /* Surfaces — true black with subtle teal undertone */
  --color-bg-base:        #000000;
  --color-bg-deep:        #04100c;
  --color-surface:        #0a1a16;
  --color-surface-raised: #0e2520;
  --color-line:           rgb(30 184 164 / 0.10);
  --color-line-strong:    rgb(30 184 164 / 0.22);

  /* Ink — match white logomark */
  --color-ink:            #ffffff;
  --color-ink-soft:       #a6c4bd;
  --color-ink-mute:       #5a7c75;

  /* Accent — aurora-glow teal in 3 registers */
  --color-lagoon:         #1eb8a4;  /* primary accent (the bright glow ridge) */
  --color-lagoon-bright:  #2dd4bf;  /* hover/CTA highlight (mint apex) */
  --color-lagoon-deep:    #0d7d77;  /* mid-tone, secondary accent */

  /* Status — kept minimal monochromatic */
  --color-coral:          #f87171;  /* danger/block */
  --color-palm:           #34d399;  /* success */
  --color-sunset:         #fbbf24;  /* pre-alpha warning kicker */

  /* Type */
  --font-sans: "Geist Variable", "Inter", system-ui, sans-serif;
  --font-mono: "Geist Mono Variable", "JetBrains Mono", monospace;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
}
```

### Class prefix convention

| Prefix | Use |
|---|---|
| `pl-*` | Polet v2 custom classes (only for **Rule 3** cases below) |
| Tailwind utility | Default for layout, spacing, typography, colors via tokens |

### Rule of three (hybrid discipline)

```
Rule 1 — Tokens: only in @theme. NEVER hardcode hex in JSX or inline style.

Rule 2 — JSX uses Tailwind utility for:
  - Layout: flex, grid, gap, padding, margin, width, height
  - Typography: font-size, font-weight, line-height, letter-spacing, align
  - Color: bg-bg-base, text-ink, border-line (read from tokens)
  - State: hover:, focus:, active:

Rule 3 — Custom pl-* class ONLY for:
  - Multi-layer or reused gradients (pl-ambient-hero, pl-glow-button)
  - State-driven animations (pl-reveal, pl-glow-pulse)
  - Composition >10 utility chain (pl-mockup-frame)
  - Section ambient backgrounds

DEFAULT to utility. Custom class = exception, not default.
```

### Reusable pl-* classes (target list, ≤300 LOC styles.css total)

```
.pl-ambient-hero     — hero section ambient bg (3-layer gradient + drift)
.pl-ambient-section  — subtle glow for section transitions
.pl-glow-button      — button hover glow (lagoon shadow)
.pl-reveal           — scroll-reveal initial state
.pl-reveal--in       — scroll-reveal active state
.pl-mockup-frame     — product preview frame composition
.pl-kicker           — uppercase micro-label (if utility chain too long)
```

## Definition of done (per slice)

Every v2 section must clear before slice marked done:

- [ ] Copy uses `t('section.key')` from `#/locale/dictionary.ts`.
- [ ] No hardcoded hex; all colors via tokens.
- [ ] Renders without layout shift at 375/768/1280/1920.
- [ ] All motion respects `prefers-reduced-motion: reduce`.
- [ ] `-index.test.tsx` has content assertion in **both** locales.
- [ ] `bun run test` green in `frontend/`.
- [ ] `bun run build` green in `frontend/`.
- [ ] No dead code; no `_archived/` folder unless truly necessary.

## Brand asset catalogue

| Asset | Source | Output | Status |
|---|---|---|---|
| Polet logomark | `frontend/public/polet-logo.png` (1170×1170, JPEG-in-PNG, 56KB) | Inline SVG in `Logo.tsx`, viewBox 376.6×577.6, currentColor fill | DONE Day 0 (traced via potrace) |
| Hero bg | `frontend/public/background-hero.png` (1366×768, PNG, 209KB) | CSS gradient `.pl-ambient-hero` (replication, not file) | Day 2 |
| Solana logomark | `frontend/public/brand/solana-logomark.svg` | Cross-copy as-is (footer) | Day 5 |
| Colosseum mark | `frontend/public/brand/colosseum-symbol.svg` | Cross-copy as-is (trust strip) | Day 4 |
| OG image | `frontend/public/og-image.png` (= same content as polet-logo) | Replace with v2-branded OG: dark bg + white wordmark + tagline | Day 6 |
| Favicon | `frontend/public/favicon.ico` | Replace with mini logomark @ 16×16, 32×32 | Day 6 |

## Anti-claim checklist (carries over from v1)

For every copy slice — same product-truth gates as v1:

- [ ] Does not claim production MPC (Ika Pre-Alpha = mock signer)
- [ ] Does not claim production-grade privacy (Encrypt = pre-alpha)
- [ ] Does not claim mainnet swap execution (Jupiter = route/build preview)
- [ ] Does not claim bridgeless settlement (Ika = `approve_message` only)
- [ ] "Devnet" visible wherever user could assume mainnet

## References when stuck

- `docs/prd.md` — canonical product language
- `docs/demo-script.md` — three required outcomes (25 USDC blocked / 5 USDC
  Jupiter DCA / 5 USDC Ika multi-chain)
- `docs/landing-upgrade-compass.md` — v1 upgrade compass (this file
  supersedes for v2)
- [linear.app](https://linear.app) — visual north star (dark mode)
- [vercel.com](https://vercel.com) — type stack reference (Geist)
