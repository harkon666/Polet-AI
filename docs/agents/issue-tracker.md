# Issue tracker: local markdown

Issues and PRDs for this repo live as markdown files in `docs/issues/`.

## Conventions

- **Flat directory**: every issue is a single file directly under `docs/issues/`.
  No per-feature subdirectories.
- **Filename**: `NNN-kebab-slug.md`, where `NNN` is a zero-padded sequence
  number starting from `001` and the slug is kebab-case.
  - Next free number: check the highest-numbered file in `docs/issues/`, add 1,
    zero-pad to three digits.
  - Example: if `079-production-copy-and-docs-alignment.md` is the latest, the
    next issue is `080-<your-slug>.md`.
- **No renumbering**: once published, an issue keeps its number. Dependencies
  reference files by name, so renumbering breaks links.

## File template

```markdown
# <Human-readable title>

Labels: `needs-triage`, `<category>`, `<category>`

Type: `AFK` | `HITL`

Status: `TODO` | `IN-PROGRESS` | `DONE`

## Parent

`docs/issues/<parent-issue>.md` or `docs/prd.md` or omit if this is root work.

## What to build

Concise description of the vertical slice. Describe end-to-end behaviour,
not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation notes

Optional. Reference research, pseudocode, gotchas.

## Verification

Optional but recommended. Concrete commands: `bun run test ...`, `bun run build`.

## Blocked by

- `docs/issues/<blocking-issue>.md`

Or `None - can start immediately` if no blockers.
```

## Metadata conventions

- **Labels** (first line after title): comma-separated, always include
  `needs-triage` on a new issue. Category labels come from
  [`triage-labels.md`](./triage-labels.md).
- **Type**: `AFK` if an agent can pick it up with no human context. `HITL` if
  it needs a human decision (design choice, approval, external dependency).
- **Status**: evolves as work progresses. Keep it in sync with reality so
  `/triage` and humans reading the tracker know what's in flight.

## When a skill says "publish to the issue tracker"

Write a new file at `docs/issues/<next-number>-<slug>.md` using the template
above. Publish in dependency order so the "Blocked by" references point at
real files.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the
filename (e.g. `issue 078` or `docs/issues/078-frontend-production-readiness-command-center.md`).

## Existing ranges (as of 2026-05-10)

| Range | Theme |
|---|---|
| 001–022 | Smart wallet core, custody, policy, Jupiter strategy, consumer demo |
| 023–049 | Frontend visual refresh, Ika dWallet rails, recovery authority |
| 050–059 | Official Encrypt lifecycle (CPI, devnet e2e) |
| 060–064 | **Obsolete** — hero floating-card / ProductFrameMockup work, superseded by current Walrus-pattern hero (components archived). Do not extend. |
| 065–069 | Official Encrypt policy graph frontend integration |
| 070–079 | Production smart-wallet agent trading, command center, docs alignment |
| 080–093 | **Landing page upgrade for hackathon** (see `docs/landing-upgrade-compass.md`) |
