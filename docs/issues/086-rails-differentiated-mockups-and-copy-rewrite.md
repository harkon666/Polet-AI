# Rails Differentiated Mockups And Copy Rewrite

Labels: `needs-triage`, `frontend`, `design`, `copy`, `jupiter`, `ika`, `encrypt`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Differentiate the three rail section mockups (Encrypt / Ika / Jupiter).
Currently all three render `RailMockup` as terminal/code style — visually
indistinguishable. Three identical-looking rails dilute the "one policy,
two rails" story.

Split the mockups so each rail gets a visual that matches what it actually
does:

- **Encrypt** — keep code mockup (already apt; it IS contract code).
- **Ika** — convert to sequence-flow diagram: "intent → policy → CPI →
  MessageApproval". Shows the multi-chain signing flow.
- **Jupiter** — convert to compact route-preview table: input / route /
  output / tx preview. Reads like actual Jupiter UI.

Also tighten the body copy on each rail so the visual and text reinforce
each other instead of repeating tech-spec bullets.

## Acceptance criteria

- [ ] `RailMockup` refactored (or split) so each variant renders the
      appropriate visual format:
  - `encrypt` → code terminal (existing behaviour)
  - `ika` → new sequence-flow SVG with 4 steps
  - `jupiter` → new route-preview table
- [ ] All visual content (node labels, row headers, sample values) sourced
      from i18n keys in `rail.*.mock.*`. Identifiers (hashes, endpoints)
      stay literal.
- [ ] Rail body copy refined for each rail (EN + ID keys updated): each
      body ≤ 3 sentences, anchored to one concrete outcome the user sees
      in the demo.
- [ ] All three rails use the same visual height on `md+` viewports so
      alternating layout (left/right) stays balanced.
- [ ] Mobile: all three variants render without horizontal overflow at
      375 viewport.
- [ ] ARIA labels on each mockup describe the visual at a high level;
      internal text inside SVG/table is `aria-hidden` to avoid SR noise.
- [ ] Respects `prefers-reduced-motion` — no auto-animating sequence.
- [ ] `-index.test.tsx` asserts each rail title renders in both locales
      (already partially covered by 080 tests).
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

### Ika sequence-flow skeleton

4 boxes connected by arrows:
```
  Agent intent
       ↓
  Polet policy gate
       ↓
  CPI approve_message
       ↓
  MessageApproval PDA (Pending → Signed)
```

Token: `--lagoon` for the policy gate accent, `--sea-ink-soft` for
inactive edges.

### Jupiter route-preview skeleton

```
┌──────────────────────────────────┐
│ input      │ 5 USDC              │
│ output     │ ~0.05938 SOL        │
│ route      │ HumidiFi            │
│ tx preview │ swap-build-fallback │
└──────────────────────────────────┘
```

Same tokens as the existing rail-mockup mono palette.

### Rails that stay the same

- The outer alternating left/right rail-section layout in `index.tsx`.
- `rail.*.title` (already localized in 080).
- `rail.*.bullet.*` — keep 4 bullets per rail, tighten wording if helpful.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
