# Trust And Stats Colosseum Badge And Dynamic Source

Labels: `needs-triage`, `frontend`, `design`, `product`

Type: `HITL`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Two paired upgrades to the trust strip and stats counter section:

1. **Colosseum Frontier badge** surfaced in the trust strip as a distinct
   "participating in" visual cue, separate from the tech "built on"
   partner logos.
2. **Stats source refactored** from hard-coded `49 / 8 / 2 / 1` in the
   route file to a checked-in `frontend/public/landing-stats.json` that
   can be regenerated per-release (manually or via a simple script).

This issue is **HITL** because it requires two humans-in-loop decisions:

- Is the Colosseum brand allowed to be used prominently as a badge?
  (Default answer for hackathon participation: yes. Confirm before
  shipping.)
- Which stats tell the right story for the current release? The current
  numbers may already be stale.

## Acceptance criteria

### Colosseum badge

- [ ] A new visually distinct badge element added to the trust strip (or
      immediately adjacent) showing the Colosseum Frontier logo + label
      "Participating in Colosseum Frontier" (or localized equivalent).
- [ ] Logo sourced from `frontend/public/brand/colosseum-symbol.svg`
      (already present).
- [ ] Visually separated from the marquee partners — not another marquee
      entry.
- [ ] External link to https://colosseum.com/frontier with `rel="noreferrer"`.
- [ ] Copy localized via `trust.colosseum.label`.

### Stats source

- [ ] `frontend/public/landing-stats.json` created with the current values
      + a `lastUpdated` ISO date field.
- [ ] `routes/index.tsx` imports / fetches that JSON and renders the
      stats from it instead of the inline `STATS` constant.
- [ ] Each stat entry in the JSON maps 1:1 to one i18n `stats.N.label` /
      `stats.N.sub` key so copy updates still go through the dictionary.
- [ ] Stats selection confirmed by product owner before merge. Record the
      reasoning in a short `// comments` section of the JSON.
- [ ] `StatsCounter` component unchanged (it already accepts `target`).
- [ ] SSR-safe: the JSON must load synchronously at build or via a
      TanStack Router loader — not a client-only fetch that would flash
      zeros during hydration.

### Shared

- [ ] Mobile: trust strip + badge cluster still wraps cleanly at 375.
- [ ] `-index.test.tsx` asserts the Colosseum label renders and that
      stats values render from the JSON source.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

- Current STATS in `routes/index.tsx` is `[{ value: 49, ... }, { value: 8, ... }, ...]`. Preserve the shape; just move `value` to JSON.
- Current footer already has `colosseum-symbol.svg` and a link — the
  badge in this slice is a DIFFERENT placement (upper in the page,
  prominent). Footer stays as-is.
- Regeneration: a short script under `scripts/` or `frontend/scripts/`
  could update `landing-stats.json` by reading repo state (e.g. test
  count from Vitest output). Out of scope for this slice to automate —
  documentation in the JSON of "update manually" is fine.

## Blocked by

None - can start immediately. (Not blocked by 080 because the stats are
already numeric values, not translated copy; labels come from 080's
dictionary.)
