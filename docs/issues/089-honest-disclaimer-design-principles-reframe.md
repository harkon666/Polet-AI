# Honest Disclaimer Design-Principles Reframe

Labels: `needs-triage`, `frontend`, `copy`, `product`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Reframe the honest-disclaimer section so pre-alpha transparency reads as a
design principle rather than a defensive caveat list. The current section
is structurally correct (2-column Real vs Not-Claimed grid, Pre-Alpha
badge) but tonally reads "here are our limits". Shift it to read "here is
how we prove our claims — every one is verifiable on devnet".

## Acceptance criteria

- [ ] Intro paragraph added above the Real / Not-Claimed columns:
      one-sentence framing that positions transparency as a design
      choice (e.g. "Every claim on this page is verifiable on devnet.
      Here's exactly what that means.").
- [ ] Left column heading reframed: `Real in this build` →
      `Verified on devnet` (or similar stronger verb). Localized.
- [ ] Right column heading reframed: `Not claimed in this build` →
      `Not claimed (yet)` or `Deliberately out of scope`. Localized.
- [ ] Item copy stays factually the same; tone sharpened where useful.
      No new claims added. Anti-claim checklist re-passed.
- [ ] Background / badge styling unchanged (dashed border, sand
      background, Pre-Alpha badge). This slice is copy, not design.
- [ ] All new / changed copy in both EN and ID:
  - `disclaimer.intro` (new)
  - `disclaimer.real.heading` (updated)
  - `disclaimer.notclaimed.heading` (updated)
  - Item copy as needed
- [ ] `-index.test.tsx` assertions updated to the new headings in both
      locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Tone target: the disclaimer should sound confident, not apologetic. Read
it alongside Stripe / Linear / Mercury "trust page" copy for reference —
they position constraints as deliberate, not as failures.

Dimensional check:
- "Pre-alpha" as a term must still be clearly present — removing it would
  overclaim production readiness.
- The 5 + 5 bullet structure is fine; don't expand or contract.
- Link to `docs/demo-script.md` or `docs/prd.md` from one of the items
  is welcome if it reinforces verifiability. Use an internal Router link
  once a /docs route exists; for now, external GitHub link is ok.

Out of scope:
- Adding new "real" or "not-claimed" items — 5 each is sufficient.
- Moving the disclaimer to a different page. It stays on landing.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
