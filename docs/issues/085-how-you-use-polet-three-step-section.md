# How You Use Polet 3-Step Section

Labels: `needs-triage`, `frontend`, `copy`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Insert a new "How you use Polet" section above the existing architecture
flow diagram. Three numbered steps grounding the abstract architecture in
the user's actual flow: 1) Deposit → 2) Set policy → 3) Grant agent
session.

The section sits between the manifesto and the flow diagram. It pairs with
the flow diagram — user reads the 3 steps as a story, then sees the
architecture that makes it work.

## Acceptance criteria

- [ ] New section inserted in `frontend/src/routes/index.tsx` between the
      manifesto and the architecture flow diagram.
- [ ] Three numbered steps, each with:
  - A kicker number (`01`, `02`, `03`)
  - A step title (3–5 words)
  - A 1–2 sentence description tying the step to what the demo shows later
- [ ] Layout: 3-column grid on `md+`, stacked single-column on mobile.
- [ ] Styling uses existing `qe-card` + token colors. No new one-off hex.
- [ ] Section kicker "How you use Polet" / "Cara memakai Polet".
- [ ] Section headline ("minute to first value" or similar) in both locales.
- [ ] All copy localized via new `howto.*` keys (EN + ID):
  - `howto.kicker`, `howto.headline`, `howto.body`
  - `howto.step.1.title`, `howto.step.1.desc`
  - `howto.step.2.title`, `howto.step.2.desc`
  - `howto.step.3.title`, `howto.step.3.desc`
- [ ] Flow diagram section (existing) is unchanged in copy and layout.
- [ ] `-index.test.tsx` asserts the three step titles render in both
      locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Suggested step content (EN draft — finalize during implementation):

1. **Deposit to your smart wallet.** USDC + SOL into a PDA the contract
   controls. No agent access yet.
2. **Save a confidential policy.** Max-per-run and daily-cap encrypted
   on-chain. The threshold never leaves the contract.
3. **Grant an agent session key.** Temporary signing authority with
   `expires_at`. Revoke any time.

Each step should map clearly to one of the three demo outcomes in
`docs/demo-script.md`, so the reader feels the continuity from "how it
works" → "try it yourself".

Positioning: step 3 should visibly end with "and then what?" — that
question is answered by the flow diagram right below and by the demo
widget further down.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
