# Landing v2 compass

Working tracker for the **frontend-v2** rebuild — full visual redesign on top
of shared lib/hooks/data/locale from `frontend/`. Replacement target for
`frontend/` after hackathon. Keep this file in sync with reality.

- **v2 root**: `frontend-v2/` (sibling to `frontend/`, port `3001`)
- **Cross-import alias**: `#shared/*` → `../frontend/src/*`
- **Active route**: `/` (landing). `/app` and `/about` are stub redirects to
  v1 port `3000` until cutover.
- **Test**: `frontend-v2/src/routes/-index.test.tsx`
- **Styles**: `frontend-v2/src/styles.css`

## Goal

Replace `frontend/` with a polished, dark-canonical, type-driven landing
experience that matches the new brand direction (deep teal aurora bg + white
"P" glyph mark + Linear-class motion design). Ship in 5–7 days; cutover after
landing stabilises.

## Decision book

Locked-in decisions from the grill-me session, in priority order:

| # | Decision | Choice | Rationale (one-line) |
|---|---|---|---|
| 1 | Sharing model | **Mirror tipis** — cross-import lib/hooks/data/locale + ClientWalletProvider | Tested SDK code is the most valuable asset; don't fork. |
| 2 | Fate of v1 | **Replace total** — delete `frontend/` after cutover, no permanent coexist | Hackathon scope; coexist permanen = workspace overhead with no payoff. |
| 3 | Theme canonical | **Dark only**, no toggle | Brand assets demand it; logo + bg lose magic on light surface; dev audience defaults to dark. |
| 4 | Visual north star | **Linear (dark)** + 3 adjustments: teal accent, ID-friendly type, scroll-driven motion (no hover-reveal) | Asset DNA matches Linear's silk-gradient marketing; density pattern fits Polet's 10 sections; juris already familiar. |
| 5 | Tooling stack | **Tailwind v4 utility + `pl-*` custom class hybrid**, rule of three | Stack already paid; pure utility breaks for ambient gradients & motion; pure CSS-vars wastes Tailwind utility productivity. |
| 6 | Build order | **Token → Header → Hero → outward** vertical slice | Visible progress Day 1; primitives extracted by-need not speculative. |
| 7a | Logo format | **SVG inline**, traced from PNG via potrace Day 0 | Crisp at all sizes; `currentColor` controllable. |
| 7b | Hero bg | **CSS gradient replication** (3-layer radial+linear, 20s drift) | Zero image weight; responsive native; respects reduced-motion. |
| 7c | Font | **`@fontsource-variable/geist` + `geist-mono`** | Variable font, self-hosted, ~60KB total, font-display swap built-in. |
| 8a | i18n | **Cross-import dictionary** from v1 | Single source of truth; cutover trivial. |
| 8b | Routing v2 | **Stub redirect** `/app` `/about` to v1 port 3000 | Header link continuity without rebuild scope; cut after cutover. |
| 8c | Test stack | **Vitest only** Day 1-3, Playwright at Day 6 | Hackathon ROI on e2e is end-of-cycle. |
| 8d | Lint | **`tsc --noEmit` only** | No Biome/ESLint config drift; format via editor. |

## Day 0–7 timeline

```
DAY 0 — Pre-code
├── Trace polet-logo.png → SVG paths (DONE: /tmp/logo.svg, 2 paths, viewBox 376.6×577.6)
├── Write this compass doc (THIS FILE)
└── Inventory v1 cross-import surface (lib/, hooks/, data/, locale/, ClientWalletProvider)

DAY 1 AM — Project scaffold
├── mkdir frontend-v2/, copy package.json + vite.config.ts + tsconfig.json from frontend/
├── Strip from package.json: @tailwindcss/typography, e2e/playwright deps (Day 6)
├── Add: @fontsource-variable/geist, @fontsource-variable/geist-mono
├── tsconfig paths: "#/*": ["./src/*"], "#shared/*": ["../frontend/src/*"]
├── vite.config.ts: server.port = 3001
├── frontend-v2/src/styles.css — @import "tailwindcss" + @theme tokens + base pl-* classes
├── frontend-v2/src/{router.tsx, routes/__root.tsx, routes/index.tsx} (placeholder)
├── frontend-v2/src/main.tsx — wrap ClientWalletProvider from #shared
└── Smoke: bun run dev → http://localhost:3001 dark canvas + Geist visible

DAY 1 PM — Header vertical slice
├── components/Logo.tsx (inline SVG, currentColor)
├── components/primitives/{Button.tsx, KickerLabel.tsx}
├── components/LocaleToggle.tsx (re-skinned, useLocale from #shared)
├── components/Header.tsx (Logo + nav links + LocaleToggle)
├── routes/{app.tsx, about.tsx} (stub redirect to localhost:3000)
└── Smoke: header render, locale toggle works, nav links navigate

DAY 2 — Hero section
├── components/Hero.tsx — kicker + 2-line headline + subhead + 1 CTA + meta strip
├── primitives/Reveal.tsx (or className pl-reveal pattern)
├── styles.css: .pl-ambient-hero (3-layer gradient, 20s drift, reduced-motion)
├── Mobile responsive 375/768/1280/1920
├── Test: hero renders all i18n keys
└── Smoke: hero looks shippable, scroll reveal on

DAY 3 — Stats counter + Manifesto (3 problem cards)
├── components/StatsCounter.tsx (port logic from v1 #shared, redesign visual)
├── Manifesto inline section in routes/index.tsx
├── primitives/Card.tsx (extract on 2nd usage = problem cards)
└── Test: content assertions both locales

DAY 4 — Demo widget + Rails skeleton
├── components/LandingDemoWidget.tsx (UI baru, logic from #shared/lib)
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
├── Copy frontend/src/{lib, hooks, data, locale} → frontend-v2/src/
├── Remove cross-import alias, normalise to #/*
├── Mv frontend → frontend-legacy (or delete)
├── Mv frontend-v2 → frontend
└── Update root scripts + AGENTS.md
```

## Cross-import surface from v1

These paths are addressed via `#shared/*` alias in v2. They live in
`frontend/src/` until cutover.

```
#shared/lib/program.ts                  ← Anchor IDL bindings, program ID
#shared/lib/solana-transaction.ts       ← TX construction + send
#shared/lib/api.ts                      ← Proxy bridge fetch
#shared/lib/official-encrypt-client.ts  ← Encrypt pre-alpha SDK wrapper
#shared/lib/policy-templates.ts         ← Policy bytecode templates
#shared/lib/config.ts                   ← Env config
#shared/lib/i18n.ts                     ← (legacy, may merge into use-locale)

#shared/hooks/use-wallet.ts             ← Solana wallet adapter wrapper
#shared/hooks/use-custody-manager.ts    ← Custody account state
#shared/hooks/use-policy-manager.ts     ← Policy bytecode state
#shared/hooks/use-ika-approval-manager.ts ← Ika dWallet approval flow
#shared/hooks/use-locale.ts             ← Locale state + custom event sync
#shared/hooks/use-activity-log.ts       ← Activity log state
#shared/hooks/useScrollReveal.ts        ← Scroll reveal hook

#shared/data/                           ← Demo dataset (if any)
#shared/locale/dictionary.ts            ← EN+ID translation, single source

#shared/components/ClientWalletProvider.tsx ← Pure context, no styling
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

- [ ] Copy uses `t('section.key')` from `#shared/locale/dictionary.ts`.
- [ ] No hardcoded hex; all colors via tokens.
- [ ] Renders without layout shift at 375/768/1280/1920.
- [ ] All motion respects `prefers-reduced-motion: reduce`.
- [ ] `-index.test.tsx` has content assertion in **both** locales.
- [ ] `bun run test` green in `frontend-v2/`.
- [ ] `bun run build` green in `frontend-v2/`.
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
