# Hero Accessibility Pass

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Audit the redesigned hero section (after issues 042-045 land) for accessibility regressions. Specifically: the new product frame mockup is decorative and must not pollute the screen-reader experience; any subtle motion (fade-in, status pulse) must respect `prefers-reduced-motion`; the headline rotor must remain accessible to non-visual users.

This issue exists because visual-heavy hero sections often introduce accessibility regressions: floating animations, decorative SVGs without alt text, motion that triggers vestibular discomfort, and screen-reader noise from cosmetic mockup content.

## Acceptance criteria

- [ ] `<ProductFrameMockup>` has `role="img"` and a single `aria-label` describing the visual at a high level (e.g., "Polet wallet console preview showing confidential policy, active session, and three demo scenarios"). Internal text content is `aria-hidden="true"` so screen readers do not read every fake mock value.
- [ ] All animation in the hero respects `@media (prefers-reduced-motion: reduce)`: rotor crossfade, status dot pulse, any frame fade-in.
- [ ] `<HeroAnimatedHeadline>` already has `aria-live="polite"` and `aria-atomic="true"`; verify still in place after rebalance.
- [ ] No new aria warnings from automated tools (Lighthouse, axe-core).
- [ ] Lighthouse accessibility score for `/` route ≥ 95 (current baseline; do not regress).
- [ ] All decorative icons (status dots, frame chrome dots) have `aria-hidden="true"`.
- [ ] Headline still reads coherently when rotor word is detected by SR (verified manually with VoiceOver or NVDA simulation).

## Implementation notes

Tooling for verification:
- Chrome Lighthouse → Accessibility audit on `/`
- `axe DevTools` browser extension
- Manual screen reader test (macOS VoiceOver, Cmd+F5)

Common pitfalls:
- Decorative SVG icons missing `aria-hidden`
- Mock content (e.g., `ECFFv…QPhSn` session key) being read by SR as if it were real data
- Animations that ignore reduced-motion

The ProductFrameMockup should be treated as a single decorative illustration. Screen reader users get the value via the headline + subhead, not by hearing a fake session key.

## Blocked by

`docs/issues/042-hero-single-product-frame-mockup.md`
