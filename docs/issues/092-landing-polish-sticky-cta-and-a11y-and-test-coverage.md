# Landing Polish: Sticky Mini-CTA, A11y, Test Coverage, Footer Community Signal

Labels: `needs-triage`, `frontend`, `a11y`, `test`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Closing-polish slice that ties the landing upgrade together after all
content slices land. Four concerns bundled because each is thin on its
own and they share the same review cycle:

1. **Sticky mini-CTA**: once the user scrolls past the hero, reveal a
   small "Open /app" pill in the header's right cluster.
2. **A11y sweep**: Lighthouse accessibility ≥ 95; skip-link added; all
   motion respects `prefers-reduced-motion`; every decorative icon has
   `aria-hidden`.
3. **Test coverage expansion**: every section has content assertions in
   both EN and ID, plus an optional Playwright visual snapshot at 375 /
   1280 / 1920 viewports.
4. **Footer community signal**: add a prominent "Follow / Join" cluster
   to the footer (X, GitHub, Discord/Telegram if available) alongside
   existing resources. Footer was localized in slice 080; this is the
   community-signal remainder.

## Acceptance criteria

### Sticky mini-CTA

- [ ] Header observes scroll position (IntersectionObserver on a hero
      sentinel is cleanest). When hero is fully off-screen, a
      `Open /app →` pill fades into the header right cluster.
- [ ] Disappears smoothly when user scrolls back into the hero.
- [ ] `prefers-reduced-motion` respected: show/hide is instant, no fade.
- [ ] Pill is not shown on `/app` routes (the wallet button already
      serves that audience).
- [ ] Mobile: pill shrinks or hides to keep header single-row at 375.
- [ ] Copy from `hero.cta.primary` (reuse the existing key).

### A11y

- [ ] Skip-link at the top of `<body>` jumping to `<main>` (keyboard
      users arrive past the header nav).
- [ ] Chrome DevTools → Lighthouse accessibility audit on `/` ≥ 95.
- [ ] All decorative SVGs, status dots, and icon-only elements have
      `aria-hidden="true"`.
- [ ] All motion (scroll reveal, sticky pill transition, pill animations)
      respects `@media (prefers-reduced-motion: reduce)`.
- [ ] Headings form a coherent outline (h1 → h2 → h3) — no level skips.
- [ ] Colour contrast: passes WCAG AA for all text-on-background pairs
      in both light and dark themes.

### Test coverage

- [ ] `-index.test.tsx` covers every landing section with content
      assertions in both EN and ID (many already covered as of 080;
      fill gaps for sections added by 083–091).
- [ ] Optional: `frontend/e2e/` Playwright visual snapshot test for
      `/` at 375, 1280, and 1920 viewports. Commit snapshots only if
      the CI environment can produce stable ones.
- [ ] `bun run test` and `bun run build` both green.

### Footer community signal

- [ ] New "Community" mini-cluster in the footer bottom strip OR folded
      into the existing Resources column with extra prominence.
- [ ] At least: X/Twitter, GitHub, and one chat link (Discord / Telegram
      / Slack). If some don't exist yet, use a placeholder `#` with a
      TODO comment and a visible "Coming soon" label.
- [ ] Copy localized via new `footer.community.*` keys (EN + ID).
- [ ] Icons lucide-react or matching simple inline SVG; `aria-hidden`
      with accessible link text.

## Implementation notes

This is a closing slice. Run it last. Every gap it finds in earlier
slices should be recorded (and fixed in those slices if still open) —
this slice doesn't itself rewrite content.

Dependencies explained:
- Blocks on 082+ because the sticky pill reads `hero.cta.primary`.
- Blocks on 083 because the hero preview visual is what the scroll
  sentinel attaches to.
- Blocks on 084–091 because test coverage needs the final section copy.

## Blocked by

- `docs/issues/082-hero-scenario-copy-and-secondary-cta.md`
- `docs/issues/083-hero-product-preview-visual.md`
- `docs/issues/084-manifesto-scenario-rewrite.md`
- `docs/issues/085-how-you-use-polet-three-step-section.md`
- `docs/issues/086-rails-differentiated-mockups-and-copy-rewrite.md`
- `docs/issues/087-security-threat-model-intro.md`
- `docs/issues/088-demo-widget-simulation-badge-and-live-deeplink.md`
- `docs/issues/089-honest-disclaimer-design-principles-reframe.md`
- `docs/issues/091-final-cta-audience-split-three-path.md`
