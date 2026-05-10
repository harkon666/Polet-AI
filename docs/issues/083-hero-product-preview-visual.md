# Hero Product Preview Visual

Labels: `needs-triage`, `frontend`, `design`

Type: `HITL`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Add a single framed product preview visual to the hero section. Current hero
is text-only (Walrus-pattern) — a reviewer never sees what the product looks
like before committing to `/app`. A quiet, static "mini-console" preview
anchors the abstract copy in something concrete.

This issue is **HITL** because it requires a design decision before
implementation: what exactly to show inside the frame. See the three options
below — pick one, then the implementer executes against that choice.

## Options (pick one before implementing)

1. **Static mock console** (recommended for hackathon) — a stylized
   reproduction of the `/app` confidential policy card showing masked
   numeric values, an active session pill, and a "25 USDC blocked" badge.
   No dependency on `/app` being screenshot-ready.
2. **Screenshot of `/app`** — real captured image of the working console.
   Requires `/app` to be visually polished. Can look dated if `/app`
   changes.
3. **Terminal-log animation** — short looping snippet of policy gate log
   output (approve / block). Risks competing with the `RailMockup`
   terminals further down the page.

## Acceptance criteria

- [ ] New component `frontend/src/components/HeroPreview.tsx` renders a
      single framed element inside the hero section.
- [ ] Frame is a macOS-style window chrome: 3 traffic-light dots, URL bar
      showing `polet.ai/app`, content viewport below.
- [ ] Content inside the frame matches the chosen option above. If option 1,
      content shows at minimum: "Confidential Policy" header, a masked
      value row (e.g. `••• USDC/run`), a session pill with expiry, and a
      "Blocked — 25 USDC" status row.
- [ ] All copy inside the frame is localized via new `hero.preview.*` i18n
      keys (EN + ID).
- [ ] No floating/rotation animation. One static drop-shadow. Optional
      single fade-in on initial paint, gated by
      `@media (prefers-reduced-motion: no-preference)`.
- [ ] Hero grid adjusts to pair the text column with the preview column on
      `md+` viewports. Mobile stacks preview below text.
- [ ] Preview `max-width: min(400px, 100%)` on mobile; doesn't cause
      horizontal scroll at 375px.
- [ ] `role="img"` with a single `aria-label` summarizing the preview —
      internal mock text is `aria-hidden` so SR doesn't read fake values.
- [ ] Existing hero copy + CTAs (from slice 082) remain unchanged and
      readable; preview does not crowd them.
- [ ] `-index.test.tsx` asserts the preview component renders with the
      expected aria-label in both locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Reference patterns from modern SaaS landings:
- Linear uses one app screenshot in a frame.
- Phantom uses one tilted iPhone mockup.
- Mercury uses one dashboard screenshot.

All share: **one focal visual, cleanly framed, no floating composition**.

The archived `frontend/src/components/_archived/ProductFrameMockup.tsx`
shows a previous attempt at this pattern — do not import or revive it
(components and dependencies have shifted). Build fresh.

## Blocked by

- `docs/issues/082-hero-scenario-copy-and-secondary-cta.md`
