# Landing upgrade compass

Working tracker for the Polet AI landing page upgrade, scoped to hackathon
(Colosseum Frontier × Solana). Keep this file in sync with reality — when a
slice moves to DONE, update the status column here and in the issue file.

- **Landing route**: `frontend/src/routes/index.tsx`
- **Layout**: `frontend/src/routes/__root.tsx` (`Header` + `Footer`)
- **Test**: `frontend/src/routes/-index.test.tsx`
- **Dictionary**: `frontend/src/locale/dictionary.ts`
- **Styles**: `frontend/src/styles.css`

## Goal

Two axes, in priority order:

1. **Profesional** — SEO, a11y ≥95, consistent design-system usage, no dead
   code, localized where target users expect ID, test coverage per section.
2. **Punya nyawa** — scenario-driven copy, product preview visible, audience-
   split CTAs, pre-alpha framed as transparency not caveat.

## Current landing structure (10 sections + header/footer)

| # | Section | Component(s) | i18n today | Status |
|---|---|---|---|---|
| 1 | Hero (Walrus type-driven, single CTA) | inline in `index.tsx` | ✅ | needs rewrite + visual |
| 2 | Trust strip (marquee) | `BrandLogo` | ❌ EN | needs i18n + Colosseum badge |
| 3 | Stats counter | `StatsCounter` | ❌ EN | needs dynamic source |
| 4 | Manifesto / 3 problems | inline | ✅ | needs scenario rewrite |
| 5 | Architecture flow diagram | `FlowDiagram` | ❌ EN | needs "How you use" intro |
| 6 | Rails ×3 (Encrypt, Ika, Jupiter) | `RailMockup` | ❌ EN | needs i18n + mockup differentiation |
| 7 | Security 4-quadrant | inline | ❌ EN | needs threat-model intro |
| 8 | Demo widget | `LandingDemoWidget` | ❌ EN | needs "simulation" badge + live deeplink |
| 9 | Honest disclaimer | inline | ❌ EN | needs "design principles" reframe |
| 10 | Final CTA | inline | ✅ | needs audience-split |

Header: context-aware (wallet button only on `/app`). Footer: EN-only, 4-column.

## Slice list (14 issues, 080–093)

| # | Issue | Title | Type | Blocked by | Labels (besides `needs-triage`, `frontend`) |
|---|---|---|---|---|---|
| 1 | `080` | Landing full i18n coverage (EN/ID) ✅ **DONE** | AFK | — | `i18n`, `copy` |
| 2 | `081` | Landing SEO + social metadata | AFK | — | `seo` |
| 3 | `082` | Hero: scenario-led copy + secondary CTA | AFK | `080` | `copy`, `design` |
| 4 | `083` | Hero: product-preview visual (mock console) | **HITL** | `082` | `design` |
| 5 | `084` | Manifesto: scenario rewrite | AFK | `080` | `copy`, `product` |
| 6 | `085` | "How you use Polet" 3-step section | AFK | `080` | `copy`, `design` |
| 7 | `086` | Rails: differentiated mockups + copy rewrite | AFK | `080` | `design`, `copy`, `jupiter`, `ika`, `encrypt` |
| 8 | `087` | Security: threat-model intro paragraph | AFK | `080` | `copy`, `design` |
| 9 | `088` | Demo widget: simulation badge + live deeplink | AFK | `080` | `copy`, `design` |
| 10 | `089` | Honest disclaimer: design-principles reframe | AFK | `080` | `copy`, `product` |
| 11 | `090` | Trust + stats: Colosseum badge + stats.json | **HITL** | — | `design`, `product` |
| 12 | `091` | Final CTA: audience-split 3-path | AFK | `080` | `copy`, `design` |
| 13 | `092` | Landing polish: sticky mini-CTA + a11y + tests + footer community signal | AFK | all content slices | `a11y`, `test`, `design` |

> **Change log**: originally 14 slices including `092 Footer localize + community signal`. Footer localization was done as part of `080` (foundation work). The remaining *community signal* scope folded into `092` (renumbered from the former `093`). Final count: 13 slices, `080`–`092`.

### Why these merges

- **`082` absorbs secondary CTA** (was a separate slice): hero copy +
  secondary CTA live in the same JSX block, no value in splitting.
- **`093` absorbs a11y + test coverage**: both are cross-cutting and easier
  to run once all content slices land than in one-off passes.
- **Security intro kept separate from manifesto**: different sections,
  different readers, different copy shape.

### Why these HITL markers

- **`083` (hero visual)**: design decision — what to show inside the frame
  (mock console static · screenshot of `/app` · terminal log animation).
  Recommended default for hackathon: **mock console static**, because it
  doesn't depend on `/app` being polish-ready to screenshot.
- **`090` (stats.json + Colosseum)**: Colosseum brand usage needs permission
  check; stats selection is a product decision (which numbers tell the story
  best).

## Dependency graph

```
080 ─┬─► 082 ─┬─► 083                   (hero chain)
     │       └─► 091                     (reuses hero-level copy tokens)
     ├─► 084                             (manifesto)
     ├─► 085                             (how-you-use)
     ├─► 086                             (rails)
     ├─► 087                             (security intro)
     ├─► 088                             (demo widget)
     ├─► 089                             (disclaimer)
     ├─► 091                             (final CTA)
     └─► 092                             (footer)

081 ──► (independent, can ship anytime)
090 ──► (independent, HITL — start whenever approvals land)

{082..092} ──► 093                       (polish + a11y + tests close it out)
```

## Definition of done (per slice)

Every landing slice must clear these gates before its acceptance criteria
checkbox is ticked:

- [ ] New or changed copy uses `t('section.key')` with keys in EN and ID.
- [ ] Section renders without layout shift at 375 / 768 / 1280 / 1920 viewport.
- [ ] No hard-coded hex colours — only CSS variable tokens.
- [ ] All motion respects `@media (prefers-reduced-motion: reduce)`.
- [ ] `frontend/src/routes/-index.test.tsx` has a content assertion for this
      section in **both** locales.
- [ ] `bun run test` green in `frontend/`.
- [ ] `bun run build` green in `frontend/`.
- [ ] No dead code left behind (moved to `_archived/` only if a design is
      explicitly superseded, else delete).

## i18n cheat-sheet

- **File**: `frontend/src/locale/dictionary.ts`.
- **Key shape**: flat, dot-namespaced, lowercase. Examples:
  - `hero.kicker`, `hero.headline.line1`, `hero.cta.primary`
  - `rail.encrypt.title`, `rail.encrypt.bullet.1`
  - `security.threat.intro`
  - `demo.widget.badge.simulation`
- **Add key in both `en` and `id`**. EN is canonical fallback.
- **TranslationKey type**: add the new key to the union type at the top of the
  file — compile will fail if a key is referenced without being declared.
- **In JSX**: `const { t } = useLocale(); t('your.key')`.
- **Never hard-code English** in JSX on landing or `/app`. If you see a
  string literal that should be localized, file an issue instead of leaving it.

## Design-token reference (abridged)

Full tokens live in `frontend/src/styles.css`. Common ones:

| Token | Use |
|---|---|
| `--lagoon` | primary accent (buttons, active links, rail highlight) |
| `--foam` | subtle alt background (section stripes) |
| `--sea-ink` | body text on light surfaces |
| `--sea-ink-soft` | muted body text, captions |
| `--coral` | block / destructive / warn |
| `--palm` | success / allow |
| `--sand` | disclaimer / cautious-info background |
| `--sunset` | pre-alpha / disclaimer kicker |
| `--line`, `--line-strong` | borders |
| `--bg-base`, `--surface` | page / card background |
| `--kicker` | uppercase micro-label colour |

Class prefix conventions:

- `qe-*` — landing-scoped components and primitives (`qe-hero`, `qe-card`,
  `qe-rail-section`, `qe-pill`, `qe-badge`, `qe-button`, `qe-quadrant`, etc.)
- `qe-reveal*` — scroll-reveal classes managed by `useScrollReveal()`
- `qe-tok-*` — terminal mockup syntax-highlight tokens
- Tailwind utilities OK for one-off spacing/layout tweaks; don't replace tokens.

## Anti-claim checklist (copy review)

Applies to every slice that changes user-facing copy:

- [ ] Does not claim production MPC (Ika Pre-Alpha uses a mock signer).
- [ ] Does not claim production-grade privacy (Encrypt is pre-alpha).
- [ ] Does not claim mainnet swap execution (Jupiter stays route/build preview).
- [ ] Does not claim bridgeless asset settlement (Ika stays at `approve_message`).
- [ ] "Devnet" is visible wherever a user could assume mainnet.

## Source-of-truth docs

Before writing copy:

- `docs/prd.md` — canonical product language.
- `README.md` — public narrative tone.
- `docs/demo-script.md` — the three required outcomes; any scenario copy must
  align (25 USDC blocked / 5 USDC Jupiter DCA / 5 USDC multi-chain Ika).
