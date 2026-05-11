# Polet Portal — Phase 2: Workspace home (readiness · CTA · activity)

Labels: `needs-triage`, `frontend`, `design`, `agent-runtime`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

Replace the workspace placeholder (Phase 1) with the **Polet Portal home
page** at `/app/workspace`. The home page is intentionally lean: status
sentence + readiness pills + one primary CTA + one activity line. No card
walls, no setup ledger, no rails, no receipt log. Each visual unit reads
state via a new shared selector module so other pages (gate / funds /
proof) can reuse the same derivations.

After this slice, the operator who has just connected their wallet should
land on a screen that:

1. **Names their current state** in plain language ("Finish one funding
   step before your agent can execute" or "Your agent can act safely now").
2. **Shows readiness** as 5 inline pills (Wallet / Custody / Policy /
   Session / Gas) — green dot if done, sunset dot if blocking.
3. **Offers one primary CTA** that points to the next blocking step's page
   (Funds, Gate, etc.). If everything is ready, the primary CTA is "Open
   Policy Gate".
4. **Shows the latest activity** in one compact line (timestamp + verdict
   tag + action title) sourced from `state.receipts[0]`.

Sub-routes remain placeholders until phases 3–6.

## Acceptance criteria

### Selector module (new, shared across phases 2–6)

- [ ] New file `frontend-v2/src/components/app/selectors/console-selectors.ts`
      exporting pure functions over `ConsoleState`:
      - `deriveReadiness(state)` → `{ wallet, custody, policy, session, gas }`
        each `'done' | 'pending' | 'needs'`. (Defines the canonical
        readiness shape used by Workspace + Gate + Funds + Proof.)
      - `nextBlockingStep(state)` →
        `'wallet' | 'custody' | 'policy' | 'session' | 'gas' | null`.
        Returns `null` when all five are `done`. Order: wallet → custody →
        policy → session → gas.
      - `latestReceipt(state)` → `ReceiptEntry | null`.
      - `latestRailVerdict(state, rail?)` → `{ rail, status, at } | null`.
      - `isCustodyFunded(state)` → boolean (USDC custody balance > 0 OR a
        deposit receipt exists).
      - `hasActiveSession(state)` → boolean (existing session-finder logic
        ported from `SetupLedger` / `TwoRailConsole`).
      - `getActiveIkaChain(state)` → `'sui' | 'ethereum' | null` (port of
        `activeManagedIkaChain` already private inside
        `use-console-actions.tsx`).
      - `getReadinessPills(state)` → array suitable for `<ReadinessStrip>`
        rendering, with `id`, `labelKey`, `state`.
- [ ] **No state mutation, no React hooks** inside the selector module —
      pure functions only.
- [ ] Unit-tested against representative `ConsoleState` snapshots
      (disconnected, just-connected, wallet-only, custody-registered,
      policy-sealed, session-active, custody-funded, all-ready).

### Workspace components (new)

- [ ] `frontend-v2/src/components/app/workspace/WorkspaceHero.tsx`:
      - Renders `<PageHead>` (kicker + title + sub + right-side status pill).
      - Title swaps based on `nextBlockingStep(state)`:
        - `wallet` → "Initialize your smart wallet to begin." (i18n key)
        - `custody` → "Finish one funding step before your agent can execute."
        - `policy` → "Seal a confidential policy to gate your agent."
        - `session` → "Grant a temporary session key to your agent."
        - `gas` → "Fund your agent's gas tank to enable execution."
        - `null` (all ready) → "Your agent can act safely now."
      - Sub-line uses matching `portal.workspace.sub.<step>` key.
      - Right-side pill uses readiness colour: warn dot when blocking,
        green dot when ready.
- [ ] `frontend-v2/src/components/app/workspace/ReadinessStrip.tsx`:
      - 5 inline pills derived from `getReadinessPills(state)`.
      - Each pill: small dot (palm if done, sunset if needs) + bold label +
        short status word.
      - `prefers-reduced-motion` respected: no pulsing dots.
- [ ] `frontend-v2/src/components/app/workspace/ContinueCTA.tsx`:
      - Renders 1 primary CTA + 1–2 ghost CTAs.
      - Primary `to=` is derived from `nextBlockingStep(state)`:
        - `wallet | custody | policy | session | gas` → `/app/funds`
          (since Funds & Setup hosts all owner-side actions in Phase 4)
        - `null` → `/app/gate`
      - Primary label uses `portal.workspace.cta.<openFunds|openGate>` key.
      - Ghost CTAs always show: Funds, Gate, Proof (the two not equal to
        primary plus Proof). Disabled state if not yet phase-implemented is
        fine (just navigate; placeholder will render).
- [ ] `frontend-v2/src/components/app/workspace/ActivityLine.tsx`:
      - One compact line: `Latest · HH:MM:SS · TAG · TITLE` (mono).
      - Picks `latestReceipt(state)`. When no receipts, renders
        `Latest · — · No agent activity yet`.
      - Tag colour follows receipt status (allowed/blocked/info/error/pending).

### Workspace route

- [ ] `frontend-v2/src/routes/app.workspace.tsx` replaces the Phase 1
      placeholder with:
      ```
      <WorkspaceHero />
      <ReadinessStrip />
      <ContinueCTA />
      <ActivityLine />
      ```
- [ ] Page padding/rhythm matches the v3 mockup
      (`frontend-v2/mockups/agent-wallet.html` workspace section).

### Sidebar runtime block

- [ ] Wire the sidebar's bottom runtime rows (Phase 1 had placeholder
      strings) to live state:
      - "Devnet" → static (devnet-only build, OK to hard-code "online")
      - "Proxy" → static "—" for now (live proxy ping is Phase 7+ work)
      - "Policy" → `state.data?.usdcDcaPolicy?.enabled ? 'enc #N' : '—'`
      - "Session" → `formatExpiry(activeSession.expiresAt)` or `—`

### i18n

- [ ] New `portal.workspace.*` keys per the list in issue 099 plus the
      title/sub keys for each blocking step. EN canonical + ID mirror.
- [ ] No hardcoded English strings remain in any new component file.

### Tests

- [ ] `frontend-v2/src/components/app/selectors/console-selectors.test.ts`:
      unit tests for each function across the 8 representative state
      snapshots.
- [ ] `frontend-v2/src/routes/app.workspace.test.tsx`:
      - Renders with a mocked `useConsole()` returning each state snapshot.
      - Asserts the title swaps correctly per blocking step.
      - Asserts the primary CTA's `to=` reflects the blocking step.
      - Asserts the activity line picks the latest receipt.
      - Asserts ID locale mirrors render.

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`

## Implementation notes

- **Action plumbing untouched**. `useConsole()` and its 17 actions stay as
  they are. Workspace home is read-only — no buttons fire actions on this
  page (those live on Funds, Gate, Bridge).
- **Selector module placement**: keep next to `use-console-actions.tsx` so
  it's obvious where to look. Alternative folder `selectors/` chosen to
  encourage extraction.
- **Custody funded heuristic**: `isCustodyFunded` should return `true`
  when EITHER `state.data?.custodyBalances?.usdcUi` parses to > 0 OR a
  receipt with `action.startsWith('5 USDC DEPOSITED')` exists. This
  matches the Phase 1 mockup's `funded` state machine.
- **No agent gas live balance yet**. Phase 4 marks this TODO. For Phase 2,
  treat "gas done" as `sessionKeypair !== null AND a fund-gas receipt
  exists`. Document this heuristic in code comments.
- **Activity line vs receipt log**: this is INTENTIONALLY one line, not a
  list. The full proof trail lives on `/app/proof`. Workspace just hints.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
