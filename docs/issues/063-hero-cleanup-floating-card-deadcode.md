# Cleanup Floating-Card Deadcode

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

After the hero visual is swapped to the single product frame (issue 042), remove the now-unused floating-card implementation: delete `frontend/src/components/HeroVisual.tsx` and remove its companion `.qe-hero-visual__*` CSS classes from `frontend/src/styles.css`. Keep design system tokens (`--lagoon-soft`, etc.) that are reused elsewhere.

This issue exists because dead code is a maintenance trap. Future contributors should not see a `HeroVisual.tsx` component and assume it is the canonical hero pattern when the actual hero is now a different component. Bundle size also shrinks slightly.

## Acceptance criteria

- [ ] `frontend/src/components/HeroVisual.tsx` deleted.
- [ ] Import of `HeroVisual` removed from `frontend/src/routes/index.tsx`.
- [ ] CSS classes prefixed `qe-hero-visual__` deleted from `frontend/src/styles.css`. The block is bounded — search for `.qe-hero-visual` and remove the contiguous block.
- [ ] `@keyframes qe-hero-float` keyframes removed.
- [ ] Mobile guard rules referencing `qe-hero-visual__card--*` removed.
- [ ] No orphaned references in any other file (`grep` confirms).
- [ ] All 33 existing tests still pass.
- [ ] Build size unchanged or smaller (no regression).

## Implementation notes

Search-and-verify steps:
```bash
grep -r "HeroVisual" frontend/src        # should return 0 hits after cleanup
grep -r "qe-hero-visual" frontend/src    # should return 0 hits after cleanup
grep -r "qe-hero-float" frontend/src     # should return 0 hits after cleanup
```

Tokens that stay (used elsewhere):
- `--lagoon-soft`, `--rail-jupiter` (used in CTA panel + rails)
- Generic `qe-card` class (used in feature cards)

## Blocked by

`docs/issues/042-hero-single-product-frame-mockup.md`
