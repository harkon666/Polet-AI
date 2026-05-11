# PRD: /app SDK + Proxy Integration Rollout — Phased Real Execution + Capability Exposure

Labels: `needs-triage`, `prd`, `frontend`, `sdk`, `proxy`, `demo`

Type: `AFK` (with HITL phase ordering decisions noted in Implementation)

Status: `TODO`

## Problem Statement

The Polet operator console at `/app` exposes only a partial slice of
what the SDK + proxy actually support. Setup actions (initialize
wallet, register custody, save policy, grant session) hit real
on-chain transactions, but rail actions ("Try 25 USDC", "Run 5 USDC",
"Approve 5 USDC") are policy preview only — the proxy returns
approval data plus an unsigned smart-wallet transaction, but `/app`
never broadcasts it. An operator clicks "Run 5 USDC", sees a green
"ALLOWED" receipt with Jupiter route proof, yet their custody USDC
never actually swaps. The same gap exists for Ika: the proxy returns
dWallet message approval data, but no MPC sign or destination
broadcast happens.

Beyond the preview gap, `/app` cannot:

- Deposit USDC to PDA custody (operator can't fund the smart wallet
  from `/app`).
- Withdraw funds from PDA (looks like a "lock-in" — trust gap).
- Fund the agent session keypair with SOL (without gas, the agent
  can't sign even after real execution lands).
- Enable Sui / Ethereum chains for Ika dWallet.
- Progress the Ika MPC lifecycle (Presign → Sign → CommitSignature).
- Broadcast the signed Ika message to the destination chain.
- Surface dWallet status, gas floor health, full balance breakdown.
- Show MCP integration config for AI-agent developers.

The SDK has all of these capabilities (see `kit.execute()`,
`kit.signAndSendTransaction()`, `kit.balance()`, `kit.status()`,
`kit.progressIkaLifecycle()`, plus 5 MCP server tools). The proxy
has all the endpoints (`/intent/dca/run` returns an unsigned tx,
`/wallet/fund-agent-gas` exists, `/ika/enable-chain` exists,
`/ika/lifecycle/progress` exists, `/intent/ika/destination-broadcast`
exists). But the operator console doesn't expose any of them, so the
demo's "policy gate enforces real swaps and real cross-chain
settlement" thesis is unprovable from the UI.

## Solution

A 3-phase integration rollout that delivers the missing exposure
incrementally, with a regression backstop at each step:

1. **Phase 0 — Mapping** (this PRD): codifies the integration map as
   a single source of truth. Future agents and contributors know
   which proxy endpoints + SDK methods are wired vs unwired.

2. **Phase 1 — Smoke test baseline**: introduces a headless e2e
   validator that exercises every existing `/app` capability against
   devnet (setup → rails preview → cleanup) and emits a pass/fail
   report. This becomes the regression backstop before each
   subsequent integration commit.

3. **Phase 2-N — Sequential 1-by-1 integration**: per gap from the
   capability audit, each phase commits independently with the smoke
   test re-run after each commit.

Phase order, ranked by demo impact + effort:

- **Phase 2** — Real Jupiter execution. Sign the unsigned tx returned
  by `/intent/dca/run` with the session keypair, broadcast to devnet,
  emit a receipt with a real Solana Explorer link.
- **Phase 3** — Fund agent gas. Required for Phase 2 (and beyond) to
  actually execute on devnet — without lamports on the session
  pubkey, broadcast fails.
- **Phase 4** — Owner deposit + withdraw custody. Trust signal:
  operator can pull funds out of the PDA. Completes the operator
  flow loop.
- **Phase 5** — Enable chain UI. Required before Ika real execution;
  Ika rails currently assume the chain is enabled.
- **Phase 6** — Ika lifecycle + destination broadcast. Drives the
  Presign → Sign → CommitSignature → Sui/Ethereum broadcast cycle so
  the cross-chain message actually settles.
- **Phase 7** — Bonus surfaces: agent integration panel, chain
  status strip, gas floor warning, full balance breakdown.

After this rollout, the demo flow becomes: operator initializes
wallet → grants session → funds agent gas → deposits USDC → policy
gate decides verdict → agent broadcasts on-chain Solana swap → cross-
chain settlement reaches Sui or Ethereum. Every receipt has a real
signature, every claim is verifiable, and the policy gate value prop
is provable end-to-end.

## User Stories

### Operator: real execution

1. As an operator, I want my Run 5 USDC click to actually swap USDC
   to wSOL via Jupiter on devnet, so that the smart wallet PDA's
   balance reflects the trade.
2. As an operator, I want the receipt log entry for an executed Run
   to include a real Solana Explorer link, so that I can verify the
   transaction on-chain.
3. As an operator, I want a Preview button alongside Execute, so
   that I can see the policy verdict without committing the swap.
4. As an operator, I want the rails to refuse to execute when the
   session keypair is null (lost on refresh), so that I don't see
   ambiguous failures from missing keypair state.
5. As an operator, I want the rails to refuse to execute when agent
   gas balance is below the proxy floor, so that I don't broadcast
   a transaction that will fail at validation.
6. As an operator, I want every executed receipt to display
   confirmation status (broadcasting → confirming → confirmed), so
   that I see progress instead of a frozen "Submitting…" spinner.

### Operator: funds management

7. As an operator, I want to deposit USDC into PDA custody from
   `/app`, so that I don't need a separate wallet tool for funding.
8. As an operator, I want to deposit wSOL into PDA custody, so that
   the Jupiter rails have inventory on the destination side too.
9. As an operator, I want to withdraw USDC + wSOL from PDA custody,
   so that I trust I'm not locked in to the smart wallet.
10. As an operator, I want to fund the agent session keypair with
    SOL from `/app`, so that the agent can broadcast txs without me
    wiring SOL manually.
11. As an operator, I want a per-bucket balance breakdown — custody
    USDC, custody wSOL, PDA SOL, agent gas, owner SOL — so that I
    see where every dollar is.
12. As an operator, I want a warning banner when agent gas drops
    below the floor, so that I fund it before running rails.

### Operator: cross-chain (Ika)

13. As an operator, I want to enable Sui chain for Ika dWallet from
    `/app`, so that my first Ika rail run doesn't fail with "chain
    not enabled".
14. As an operator, I want to enable Ethereum Sepolia for Ika
    dWallet from `/app`, so that I can demo the Ethereum settlement
    path.
15. As an operator, I want my Approve 5 USDC click to progress the
    full Ika lifecycle (Presign → Sign → CommitSignature → Sui
    broadcast), so that the cross-chain message reaches Sui.
16. As an operator, I want the Ika receipt to include a destination
    chain Explorer link (Suiscan or Etherscan), so that I can verify
    settlement on the destination side.
17. As an operator, I want StatStrip to show dWallet ID + per-chain
    status (sui ✓ / ethereum ✗), so that I see Ika's reachability
    at a glance.
18. As an operator, I want to choose source asset / target asset /
    target chain on Ika rail per click, so that the demo matches the
    multichain narrative beyond a hardcoded `solana:USDC → sui:SUI`.

### Operator: state visibility

19. As an operator, I want StatStrip to surface full `kit.status()`
    data — policy enabled, session active, ika chain status, gas
    floor — so that the visible state reflects all gate conditions.
20. As an operator, I want a smoke indicator (proxy reachable,
    devnet RPC reachable, Solana Explorer reachable) somewhere in
    the chrome, so that I know the infra is healthy before clicking.
21. As an operator, I want the AppHeader to show last refresh time +
    proxy round-trip latency, so that I know the data is current.

### Developer / Agent: SDK integration

22. As a developer, I want a paste-ready Claude Desktop MCP config
    block from `/app`, so that I can copy-paste it into my mcp.json
    and bind Polet to my Claude session in one minute.
23. As a developer, I want the MCP integration panel to list all 5
    tools (polet_balance, polet_status, polet_enable_chain,
    polet_trade, polet_execute) with descriptions, so that I see
    what the agent can do.
24. As a developer, I want polet-agent.json (Issue 093) to include a
    POLET_AGENT_GAS_FUNDED hint, so that my SDK runner can preflight
    before broadcasting.
25. As a developer, I want every `/app` action to emit a structured
    receipt that the SDK runner could consume too (Issue 096), so
    that observability is unified across products.

### Hackathon judge

26. As a judge, I want the demo flow to include real on-chain
    execution (not just preview), so that the policy gate value prop
    is demonstrably real.
27. As a judge, I want both Solana side (Jupiter swap) AND cross-
    chain side (Ika message to Sui) to actually settle, so that
    "three rails · one gate" is provable, not just claimed.
28. As a judge, I want every receipt entry to have a verifiable
    Explorer link, so that I can confirm on-chain artifacts
    independently of the demo narration.
29. As a judge, I want the demo to bridge `/app` → SDK CLI (Issue
    095), so that I see both human-operator and AI-agent rails
    enforced by the same gate.

### Smoke test / CI

30. As a contributor, I want `bun run smoke-test` to validate every
    current capability against devnet, so that I know nothing
    regressed before committing new integration work.
31. As a contributor, I want the smoke test to emit per-step timing
    + pass/fail report, so that I can spot slowdowns between phases.
32. As a contributor, I want the smoke test to be CI-able (fast,
    devnet-stable, clear exit codes), so that GitHub Actions can run
    it on every PR.
33. As a contributor, I want the smoke test to be re-runnable
    (idempotent setup) so that I can iterate on a single owner key
    across many runs without manual cleanup.

## Implementation Decisions

### 4 deep modules (testable in isolation)

- **session-tx-broadcaster**: pure function module that takes a
  base64 unsigned transaction, the session Keypair, and a Solana
  Connection, and returns the confirmed signature. Encapsulates
  versioned-vs-legacy detection, blockhash refresh, sendRawTransaction
  call, and confirm-with-retry on blockhash expiry. Used by Jupiter
  execute, Ika lifecycle execute, and any future agent-driven flows.
  Single clean interface; rarely changes. The interface looks like
  `broadcast(txBase64, sessionKeypair, connection, options) →
  Promise<signature | error>`.

- **ika-lifecycle-orchestrator**: multi-step state machine that
  takes the Ika request from `/intent/multichain/run`, plus session
  keypair and connection, and drives Presign → Sign →
  CommitSignature → destination broadcast (Sui or Ethereum). Returns
  a discriminated result with `status: 'executed' | 'lifecycle-error'
  | 'broadcast-failed' | 'broadcast-disabled' | 'gas-floor-
  underfunded' | 'session-revoked-midflight' | …`. Composes session-
  tx-broadcaster for the Polet approval transaction, plus the
  proxy's `/ika/lifecycle/progress` and `/intent/ika/destination-
  broadcast` endpoints.

- **receipt-builder**: pure transformation that maps an execution
  outcome into a typed `ReceiptEntry`. Exhaustive variants: preview-
  allowed, preview-blocked, broadcast-success, broadcast-failure,
  lifecycle-progress, lifecycle-broadcasted, gas-floor-blocked,
  session-keypair-missing, chain-not-enabled. Each variant has the
  right fields populated (constraint refs, jupiter / ika proof,
  signature, explorer links).

- **balance-aggregator**: pure function that takes a connection plus
  `{ owner, walletPda, sessionPubkey, custodyUsdcAta,
  custodyWsolAta }` and returns
  `{ ownerSol, agentGas, pdaSol, custodyUsdc, custodyWsol }`. Hides
  the parallel `getBalance` and `getTokenAccountBalance` calls.
  Returns null per bucket on error so partial data is consumable by
  the UI without crashing.

### Modified UI modules

- **useConsole hook**: adds 6 actions — `executeJupiter(amount)`,
  `executeIka(amount)`, `enableChain(chain)`, `fundAgentGas(amount)`,
  `depositCustody(asset, amount)`, `withdrawCustody(asset, amount)`.
  Existing `runJupiterAllow` / `runIkaAllow` are renamed
  `previewJupiter` / `previewIka` for clarity. New ConsoleData fields:
  `ikaChainStatus`, `agentGasBalance`, `dwalletId`, `gasFloorOk`. New
  ConsoleState field: `lastExecuteResult` (for retries).

- **ReceiptEntry schema**: adds `executionStage: 'preview' |
  'broadcast' | 'lifecycle-progress'` and `chain: 'solana' | 'sui' |
  'ethereum'`. Existing fields preserved for backward compatibility.

- **SetupLedger**: optional new row 05 "Enable Sui chain" rendered
  only when policy is sealed AND chain not yet enabled. Collapses
  once enabled. Renders alongside existing 4 rows; 5th index in the
  numbered ledger.

- **StatStrip**: replaces the single SOL Balance tile with 4 split
  tiles — PDA SOL, agent gas, owner SOL, custody (USDC + wSOL
  combined). Existing 4 tiles (PDA, balance, policy seq, sessions)
  becomes 7 — needs grid layout adjustment for mobile.

- **RailCard**: adds two action modes per rail — "Preview" (existing
  behavior, calls preview action) and "Execute" (calls execute
  action). Execute button only enabled when prerequisites are met
  (session active + agent gas above floor + chain enabled for Ika).
  Disabled state shows a tooltip with the missing prerequisite.

- **AppHeader**: adds a mini status indicator
  ([●] proxy 200ms · sui ✓ · gas ok). Reads from kit.status()
  refreshed every 30 seconds.

### New UI modules

- **AgentIntegrationPanel**: collapsed `<details>` section in `/app`
  showing the 5 MCP tools list + a Claude Desktop config snippet
  (paste-ready JSON block). Bridges to the polet-agent.json
  download flow already shipped in Day 11.5.

- **ChainStatusStrip**: small horizontal strip showing per-chain Ika
  status (Sui / Ethereum: enabled / not-enabled / dWallet ID). Links
  to the enable-chain action when not enabled.

- **GasFloorWarning**: coral banner above the rails section when
  `data.gasFloorOk === false`. Includes a "Fund agent gas →" CTA.

### Smoke test infrastructure

- **scripts/smoke-test.ts**: runs against a configured devnet owner.
  Sequence: initialize wallet (idempotent if already done) → setup
  custody → save policy → grant session → preview Jupiter block →
  preview Jupiter allow → preview Ika block → preview Ika allow →
  revoke session. Per-step pass/fail with timing. Exits non-zero on
  any failure. Phase 1 commits this baseline. Each subsequent phase
  appends new test steps.

- **Per-phase smoke regression**: same script runs after each phase
  commit. Phase 2 adds executeJupiter assertions; Phase 3 adds
  fundAgentGas assertions; Phase 6 adds full Ika lifecycle
  assertions. CI hook so PR fails if smoke regresses.

### Phase sequencing

- Phase 2 depends on session-tx-broadcaster + receipt-builder +
  executeJupiter action.
- Phase 3 (fund agent gas) is small but critical for Phase 2 to
  actually execute on real devnet. Owner-signed via Phantom.
- Phase 4 (deposit / withdraw) is independent and can ship anytime.
- Phase 5 (enable chain) gates Phase 6.
- Phase 6 (Ika lifecycle) depends on session-tx-broadcaster +
  ika-lifecycle-orchestrator + receipt-builder + executeIka action.
- Phase 7 (bonus surfaces) all independent — agent integration
  panel, chain status strip, gas floor warning, full balance
  breakdown.

Each phase commits independently. Smoke test re-runs after each
commit.

### API / schema decisions

- `kit.status()` shape becomes the canonical source for `/app`'s
  ConsoleData. Frontend types align with SDK types (the `protocol/`
  workspace decision from ADR 094 will determine if they're imported
  or duplicated).
- Receipt shape extension is backward compatible (new fields
  optional).
- Session keypair stays in sessionStorage (per Day 11.5 fix); never
  sent to proxy.
- Agent gas funding tx is owner-signed (via Phantom), not session-
  signed, to keep the trust model intact.

## Testing Decisions

### Good test definition

A good test exercises external behaviour: given inputs A, expect
outputs B. Tests should never assert internal state, private method
calls, or component rendering details. They test what the user or
caller observes, not how the result is produced. This applies to
both the unit tests on deep modules and the smoke test scripts.

### Modules to test (per user direction: deep + smoke e2e)

- **session-tx-broadcaster**: unit tests with a mocked Connection.
  Covers legacy tx, versioned tx, blockhash expiry retry, signing
  failure, broadcast failure, confirm timeout. Asserts the returned
  signature for success paths and the error type for each failure
  mode.

- **ika-lifecycle-orchestrator**: unit tests with mocked proxy +
  connection. Covers the full happy path (4 steps), each lifecycle
  stage failure, destination broadcast failure, signer-required
  short-circuit, gas-floor-underfunded short-circuit. Asserts the
  discriminated result with the correct status + error info.

- **receipt-builder**: pure transformation tests. Covers every
  variant (preview-allowed, preview-blocked, broadcast-success,
  broadcast-failure, lifecycle-progress, lifecycle-broadcasted,
  gas-floor-blocked, session-keypair-missing, chain-not-enabled).
  Asserts the returned ReceiptEntry has the correct shape per
  variant.

- **balance-aggregator**: unit tests with mocked Connection. Covers
  all buckets populated, partial failure (one ATA missing), token
  account decode error. Asserts the returned object has null for
  failed buckets and populated values for successful ones.

### Smoke test scope (per user direction: baseline + per-phase)

Devnet end-to-end. Phase 1 commits the baseline that exercises every
current `/app` capability. Each subsequent phase appends new test
steps and re-runs the full sequence. The script is CI-able with
clear exit codes and per-step timing.

### Prior art

- `frontend-v2/src/routes/-index.test.tsx` — vitest content
  assertions across 9 sections, EN + ID locales. Pattern for any
  new UI vitest coverage.
- `sdk/tests/*.test.ts` (113 tests, all passing) — pattern for unit
  tests with mocked dependencies.
- `sdk/src/local-agent-runner.ts` — pattern for a headless devnet
  runner. The smoke test follows a similar structure but is
  verification-focused, not demo-focused.
- `sdk/src/bin/readiness.ts` — pattern for a CLI smoke check with
  exit codes.

UI module tests (RailCard, StatStrip, etc.) intentionally NOT
scoped — UI wiring is trusted via the end-to-end smoke test plus
Playwright (Day 12 separate work).

## Out of Scope

- **Encrypt FHE flow**: `/wallet/create-encrypt-deposit`, FHE policy
  graph, decryption requests, approve-ika-with-verified-encrypt.
  Advanced demo path. The SDK has CLI runners
  (`bun run encrypt:evidence`, `bun run encrypt:live-e2e`). Defer
  until after the hackathon judging window.
- **Recovery + multisig**: `/wallet/recovery-authority`,
  `/wallet/recover-access`, `/wallet/shared-ika-approvers`. Already
  accessible via the legacy WalletDashboard inside the
  AdvancedFallback collapsed `<details>` section. Operators with
  recovery needs use the legacy surface.
- **Passkey co-approval**: `/passkey/coapproval/challenge`, `/verify`.
  Not part of the hackathon demo flow.
- **Templates**: `/legacy/template/*` endpoints. Legacy intent
  system, not aligned with the current confidential policy demo.
- **Mobile QA + Lighthouse**: separate scope (Day 12 todo).
- **Cutover frontend-v2 → frontend**: separate scope (Day 13 todo).
- **Confidential transfer**: `/wallet/execute-confidential-transfer`,
  `/execute-confidential-usdc-transfer`. "Send" feature separate
  from rails. Defer.
- **UI vitest coverage for new strips / panels**: trusted via smoke
  + Playwright.

## Further Notes

- Issues 093-097 already filed for SDK ↔ /app product alignment
  (CLI config flag, ADR boundaries, demo bridge, receipt schema
  parity, shared constraint vocab). This PRD complements those by
  addressing the frontend-side integration gap.
- Phase 2 (real Jupiter execution) is the highest-impact single
  change. Recommended to commit it first, validate via smoke test,
  then continue.
- The "Re-grant for download →" flow already covers the case where
  sessionKeypair is null on refresh. Real execution depends on
  sessionKeypair being in memory; if null, executeJupiter and
  executeIka should hard-fail with a "session keypair lost — re-
  grant first" receipt.
- Agent gas funding tx is owner-signed via Phantom. The session
  keypair receives lamports but doesn't authorize the funding
  itself. This keeps the trust model intact.
- ADR 094 (SDK ↔ /app product boundaries, in Issue 094) should be
  settled before this rollout reaches Phase 7 (agent integration
  panel) so the panel reflects the agreed boundaries.
- `kit.status()` and `kit.balance()` calls might happen on every
  refresh cycle. Polling cost should be measured; might need RPC
  batching or a server-side aggregator if it gets expensive.
- The capability audit summary (which informed this PRD) lives in
  the conversation history — top 5 gaps were Real Jupiter
  execution, Ika lifecycle + destination broadcast, owner deposit /
  withdraw, fund agent gas, enable chain UI. Bonus high-value
  cheap wins: status panel, balance panel, MCP integration tab.
