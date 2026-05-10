# ADR: SDK ↔ /app Product Boundaries

Labels: `needs-triage`, `docs`, `architecture`, `sdk`, `frontend`

Type: `HITL`

Status: `TODO`

## What to build

A new Architecture Decision Record at `docs/adr/00X-sdk-and-app-boundaries.md`
that codifies what `/app` and the SDK are responsible for, how they
relate, and where they intentionally diverge.

Both surfaces today:

- Hit identical proxy endpoints (`/intent/dca/run`,
  `/intent/multichain/run`, `/wallet/data`, etc.).
- Hold a BYO session keypair (`/app` mints client-side and persists
  in `sessionStorage`; SDK accepts via `POLET_AGENT_KEYPAIR` env or
  `polet-agent.json` once issue 093 lands).
- Emit "receipts" for each rail outcome.
- Reference the same on-chain `policyCommitment` and
  `constraintRefs[]`.

But they target different audiences with different ergonomics:

- `/app` is the **operator console** (HITL): humans set up custody,
  inspect policy state, grant sessions, watch receipts render with
  Jupiter / Ika proof grids.
- SDK is the **agent rail** (AFK): AI agents (LangChain, OpenAI,
  Solana Agent Kit, MCP clients) consume the same policy gate
  programmatically via adapters.

The ADR makes these boundaries explicit so future contributors don't
duplicate logic or accidentally cross the lines.

## Acceptance criteria

- [ ] New file `docs/adr/00X-sdk-and-app-boundaries.md` (or next-free
      ADR number — check `docs/adr/` for the highest existing).
- [ ] Sections:
      - **Status** (Accepted on date)
      - **Context** — why both products exist, what gap each fills
      - **Decision** — who owns what
      - **Consequences** — what it implies for new features
      - **Parity targets** — what MUST stay in sync
      - **Intentional divergences** — what is allowed to differ
- [ ] Codifies the **BYO keypair flow**:
      1. `/app` mints `Keypair.generate()` client-side on Grant Session
      2. Persists to `sessionStorage` (issue: Day 11.5 session-persist)
      3. Operator downloads `polet-agent.json`
      4. SDK CLI consumes via `--config` (issue 093) or env vars
      5. SDK + `/app` co-sign rail-run transactions with the same key
- [ ] Codifies **parity targets**:
      - Env var schema (`POLET_OWNER`, `POLET_SESSION_KEY`,
        `POLET_AGENT_KEYPAIR`, `POLET_PROXY_URL`, `POLET_RPC_URL`)
      - Proxy intent endpoints + request shapes
      - `constraintRefs[]` vocabulary (issue 097 makes this shared)
      - Receipt schema (issue 096 brings SDK in line)
- [ ] Codifies **intentional divergences**:
      - `/app` ReceiptLog renders proof grids (Jupiter route, Ika
        approval); SDK emits structured JSON for agent consumption
      - `/app` has tooltips / icons / motion; SDK has stderr logs
      - `/app` requires wallet adapter; SDK is headless
- [ ] Lists **what one product MUST NOT do**:
      - SDK MUST NOT import from `frontend-v2/`
      - `/app` MAY import from `@polet-ai/sdk` for shared types
        (decision left to ADR — pick a side)
- [ ] PR includes a link from `README.md` and from `AGENTS.md` to the
      new ADR so future agents find it.
- [ ] HITL review — operator sign-off needed before merge.

## Implementation notes

This ADR is the design contract that issues 093, 095, 096, 097 will
reference. Without it, those slices risk drifting in inconsistent
directions.

The current state (as of Day 11):

- Frontend-v2 has ZERO imports from `@polet-ai/sdk` (verified via
  `rg "from '@polet" frontend-v2/src` → no matches).
- SDK exports `kit.exportConfig()` at `sdk/src/index.ts:1228` that
  returns the SAME shape as the `/app` `polet-agent.json` download
  (`frontend-v2/src/components/app/SetupLedger.tsx:365-372`).
- Both compute the same `policyCommitment` from the same proxy.

The ADR should decide: do we extract a `protocol/` workspace that
both consume? Or do we let `/app` import `@polet-ai/sdk` for shared
types and helpers? Or do we keep them disjoint forever and pay the
cost of dual schema maintenance?

The cheapest answer for the hackathon: keep them disjoint, document
parity targets, accept manual sync. The most-correct answer
long-term: extract `protocol/` or have `/app` consume SDK types. The
ADR should call this out and pick the next move.

## Blocked by

None - can start immediately.
