# Shared Constraint-Ref Vocabulary Module

Labels: `needs-triage`, `sdk`, `frontend`, `docs`, `protocol`

Type: `AFK`

Status: `TODO`

## What to build

Extract the constraint-ref vocabulary (`pi_numeric_limit`,
`pi_max_per_run`, `pi_daily_cap`, etc.) into a single source of truth
consumed by:

- Frontend-v2 `ReceiptLog` tooltips (`pi_numeric_limit ✗` shows a
  description on hover)
- SDK runner stdout receipts (issue 096 added the
  `constraintRefs[]` field to the `ReceiptEntry` schema)
- Future MCP server tool descriptions / adapters

Today the constraint names exist in two places:

1. Frontend-v2 dictionary keys
   (`frontend/src/locale/dictionary.ts → app.constraint.numericLimit.tooltip`
   etc., added Day 11.5)
2. Implicitly in the SDK runner stdout (string concatenation per
   scenario).

This slice unifies them so adding a new constraint requires one edit,
not two. The shared module also documents what each constraint means
in plain language — which is the same string used for `/app`'s
hover tooltips.

## Acceptance criteria

- [ ] New shared module at `protocol/constraints.ts` (or wherever the
      ADR in issue 094 settles on for shared types).
- [ ] The module exports:
      - `CONSTRAINT_REFS` — readonly object keyed by constraint name
        (`pi_numeric_limit`, `pi_max_per_run`, `pi_daily_cap`,
        `pi_session_window`, etc.) with:
        - `code` — the wire-format string used in
          `ReceiptEntry.constraintRefs[]`
        - `label` — short human label (≤ 4 words)
        - `description` — plain-English explanation (used in /app
          tooltips and SDK adapter descriptions)
        - `category` — which Polet rail it gates (jupiter, ika, both)
      - `formatConstraintRef(code, outcome)` helper that returns
        `"pi_numeric_limit ✓"` / `"pi_numeric_limit ✗"` format used
        by `ReceiptEntry.constraintRefs[]`.
- [ ] Frontend-v2 `ReceiptLog` reads tooltip descriptions from this
      module instead of dictionary keys. (Optionally, keep i18n
      wrapper that translates the description via dictionary.)
- [ ] SDK runner uses the same module to format
      `ReceiptEntry.constraintRefs[]` and to emit a human description
      to stderr when narrating each outcome.
- [ ] No content drift: if a constraint exists in /app it MUST exist
      in this module and vice versa. CI / unit test fails if any
      `constraintRefs[]` string in `ReceiptEntry` doesn't have a
      corresponding entry in `CONSTRAINT_REFS`.
- [ ] Adding a new constraint to the module requires zero changes to
      either /app or SDK source — both pick it up automatically.
- [ ] Both EN and ID versions covered. /app pulls the localized
      version through the existing locale dictionary, but the
      constraint code stays English on the wire.
- [ ] Unit tests in BOTH workspaces verifying the constraint codes
      match between SDK output and /app rendering.
- [ ] `bun run build` and `bun run test` pass in both workspaces.

## Implementation notes

- The current `/app` tooltip strings are in `dictionary.ts` as
  `app.constraint.numericLimit.tooltip`, etc. After this slice, those
  dictionary keys become THIN wrappers around the shared module, OR
  go away entirely (descriptions live in the module).
- Decision: do we keep English-only descriptions in the module and
  localize via dictionary, or duplicate in EN+ID inside the module?
  Probably keep wire format English, descriptions go through
  `dictionary.ts` for i18n. ADR 094 decides exact placement.
- The constraint vocabulary surface is small today (5-ish constraints).
  Extracting it now keeps it cheap. After the hackathon there will be
  more constraints (chain allowlist, slippage caps, asset allowlist
  per issue 038-039) — having a shared module makes those additions
  trivial.
- This slice does NOT require a new workspace if the ADR decides
  against extracting `protocol/`. In that case, the module lives in
  `sdk/src/protocol/constraints.ts` and frontend-v2 imports it via
  `@polet-ai/sdk/protocol/constraints`. Either path is acceptable;
  ADR 094 picks.

## Blocked by

- `docs/issues/096-sdk-runner-receipt-entry-shape.md`
