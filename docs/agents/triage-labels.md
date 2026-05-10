# Triage labels

The skills speak in terms of five canonical triage roles. This file maps
those roles to the label strings used in `docs/issues/*.md` for this repo.

## Triage state labels

| Canonical role | Label in this repo | Meaning |
|---|---|---|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, AFK agent can pick it up |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

**Default on a new issue**: `needs-triage`. The `/triage` skill promotes it
from there.

**Current practice** (as of hackathon sprint): most issues sit at
`needs-triage` until an operator picks them up; `Status: TODO|IN-PROGRESS|DONE`
is tracked in-file instead of a separate progress label. Keep it simple.

## Type labels

Every issue should declare its type on a `Type:` line near the top.

| Type | Meaning |
|---|---|
| `AFK` | Away-from-keyboard. An agent can complete this from the spec alone. Default. |
| `HITL` | Human-in-the-loop. Requires a human decision, approval, design review, or external dependency before it can be merged. |

Prefer `AFK` whenever the spec is complete enough for an agent to finish
without asking questions.

## Category labels

Used in addition to the triage state. Apply the ones that fit; don't invent
new ones unless the work genuinely falls outside these buckets.

### Surface

- `frontend` — touches `frontend/src/`
- `contract` — touches `contract/programs/`
- `proxy` — touches `proxy/src/`
- `sdk` — touches `sdk/src/`
- `docs` — touches `docs/` or `README.md`

### Domain

- `smart-wallet` — PDA custody, session keys, policy enforcement core
- `policy` — confidential numeric policy semantics
- `encrypt` — Encrypt Pre-Alpha integration (ciphertext, graph, witness)
- `ika` — Ika dWallet Pre-Alpha integration (CPI, MessageApproval)
- `jupiter` — Jupiter Tokens v2, Price v3, Swap v2 integration
- `agent-runtime` — agent session signer, intent submission runtime
- `custody` — deposits, withdrawals, agent gas funding
- `product` — product copy, demo narrative, landing positioning

### Landing-page work (current focus, issues 080–093)

- `copy` — user-facing string changes only
- `i18n` — locale dictionary work, locale coverage
- `seo` — meta tags, OG cards, structured data
- `a11y` — accessibility — aria, reduced-motion, Lighthouse ≥95
- `design` — visual composition, layout, motion choices
- `test` — adding or expanding Vitest / Playwright coverage

## How skills apply labels

- **`/to-issues`**: every new issue starts with `needs-triage` plus the
  relevant surface + domain + landing-work labels.
- **`/triage`**: promotes issues through the five canonical states, never
  leaves a file in two mutually-exclusive states.
- **Other skills**: read labels to know what they're allowed to pick up
  (`ready-for-agent` for AFK work, `ready-for-human` to skip).
