# Hero Mobile Polish

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Audit and fix the hero section at mobile breakpoints (375px iPhone SE, 414px iPhone Plus, 393px Pixel). The single product frame from issue 042 must stack cleanly below the text content, scale down to fit the viewport, and keep its content readable without horizontal scrolling.

This issue exists because mobile is the highest-risk breakpoint for any layout that works at desktop. Dense hero compositions almost always break on small screens unless explicitly tested and tuned.

## Acceptance criteria

- [ ] Hero text content stacks above the product frame on mobile (single-column grid below `md`).
- [ ] Product frame max-width of `min(360px, 100%)` on mobile; centered horizontally.
- [ ] Frame content scales down: button row stays on one line OR wraps cleanly, status cards readable, no clipped text.
- [ ] No horizontal scrolling on `body` at 375px viewport.
- [ ] Hero badge strip (Devnet · Pre-Alpha · v0.1.0) wraps cleanly on small screens.
- [ ] Headline `font-size: 2.25rem` on mobile remains readable (already in place).
- [ ] CTAs stack vertically on small screens if they don't fit on one row, or stay inline if they do.
- [ ] Trust strip (`built on · integrated with`) below the hero wraps without overflow on 375px.

## Implementation notes

Test viewports:
- 375×812 (iPhone SE 2nd gen)
- 393×852 (Pixel 7)
- 414×896 (iPhone Plus)

Verification approach: use Chrome DevTools device toolbar OR Playwright with viewport emulation. Manual verification on browser is sufficient for hackathon scope; e2e mobile testing is not required.

Common mobile failure modes to check:
- Frame URL bar `polet.ai/app` overflow
- Status card pubkey `ECFFv...QPhSn` overflow
- Scenario button row breaking awkwardly
- Hero meta strip "32 tests passing · NO_DNA=1 anchor build ✓" wrapping or overflowing

## Blocked by

`docs/issues/042-hero-single-product-frame-mockup.md`
`docs/issues/043-hero-typography-layout-rebalance.md`
