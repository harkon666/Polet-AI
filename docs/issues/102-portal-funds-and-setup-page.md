# Polet Portal — Phase 4: Funds & Setup page (wallet map + setup list + quick actions)

Labels: `needs-triage`, `frontend`, `design`, `custody`, `agent-runtime`, `ika`

Type: `AFK`

Status: `DONE`

## Shipped

- New `frontend-v2/src/components/app/funds/`:
  - `funds-selectors.ts` — `getCustodyBalances`, `getAgentGasStatus`,
    `getIkaDwalletStatus`, `getOwnerAuthority`, `getActiveSessionInfo`.
    9 unit tests in `funds-selectors.test.ts`.
  - `FundsList.tsx` — 4 hairline rows (USDC custody · SOL custody ·
    agent gas · Ika dWallet). Tabular-nums values, mono kicker subs,
    no card frame.
  - `QuickActions.tsx` — 4 underline-style action buttons (Deposit ·
    Withdraw · Fund gas · Enable chain). Reuses existing
    `useConsole().actions.*` with the same fixed amounts the legacy
    CustodyFundsStrip / ChainStatusStrip used. Disabled rules mirror
    those components.
  - `OwnerSetupList.tsx` — 5 hairline rows (PDA · custody · policy ·
    session · authority) derived from `deriveReadiness(state)`. Inline
    action button when row is `pending`. Re-grant strip when session
    active but `sessionKeypair` is null. Authority row read-only.
- `app.funds.tsx` replaces the placeholder with hero + 2-column
  composition. Mobile stacks vertically.
- 41 new `portal.funds.*` i18n keys (EN canonical + ID mirror), all
  inserted between Phase 4 sentinels.
- 11 new state-aware tests in `app.funds.test.tsx` covering empty
  render, inline action firing, deposit/fund-gas precondition gating,
  re-grant strip visibility, and ID locale mirror.
- `app.funds-preview.tsx` dev route renders 3 canonical states
  (empty · partial · fully ready) for visual review.
- Verify: typecheck clean, 93/93 tests green (73 → 93, +20), build clean.

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

The **Funds & Setup** page at `/app/funds` — owner control surface
condensed into two calm columns of list rows (no card walls) plus a
hairline-styled quick-actions row. Replaces the old `<SetupLedger>` table,
the `<CustodyFundsStrip>`, the `<ChainStatusStrip>`, and the
`<SessionKeypairAffordance>` block with one clean two-column layout.

After this slice the operator can, on a single page:

1. **See balances** in the left column: USDC custody · SOL custody · agent
   gas · Ika dWallet status. One row per asset, hairline divider, no card.
2. **See setup state** in the right column: 5 rows for PDA · custody ·
   policy · session · authority. Each row has a status dot + 1-line sub +
   short value (right-aligned).
3. **Fire owner-only actions** from the quick-actions row under the funds
   list: Deposit · Withdraw · Fund gas · Enable chain. These map to the
   existing `useConsole()` actions with the same 5 / 1 / 0.05 amounts the
   current `<SetupLedger>` already uses.
4. **Re-grant a session** when the keypair was lost on refresh (regrant
   row appears inline within the session row, similar to the existing
   `<SessionLostKeyStrip>` affordance).

Setup actions that lead a row to `done` (initialize wallet, register
custody, save policy, grant session) move under the right column too —
inline buttons that fire the matching action when the row is `pending`.

## Acceptance criteria

### Funds list (left column)

- [ ] `frontend-v2/src/components/app/funds/FundsList.tsx`:
      - 4 rows: USDC custody · SOL custody · agent gas · Ika dWallet.
      - Each row: 26px glyph mark · name + 1-line sub · right-aligned
        bold value (`tabular-nums`).
      - Values pulled from `state.data.custodyBalances.usdcUi`,
        `nativeSolUi`, agent-gas heuristic (Phase 2 selector
        `isCustodyFunded` complement), `getActiveIkaChain(state)`.
      - Hairline divider between rows. No card frame, no shadow.

### Quick actions

- [ ] `frontend-v2/src/components/app/funds/QuickActions.tsx`:
      - 4 underline-style buttons: Deposit · Withdraw · Fund gas ·
        Enable chain.
      - Wiring (mirror existing `<CustodyFundsStrip>` and
        `<ChainStatusStrip>` rules):
        - Deposit → `actions.depositCustody('USDC', '5')` if custody
          registered, else greyed-out hint "Register custody first".
        - Withdraw → `actions.withdrawCustody('USDC', '1')`.
        - Fund gas → `actions.fundAgentGas('0.05')` if active session
          exists, else greyed-out.
        - Enable chain → `actions.enableIkaChain('sui')` (Ethereum is a
          future scope).
      - Disabled when `state.loading !== null` (any action in flight).

### Owner setup list (right column)

- [ ] `frontend-v2/src/components/app/funds/OwnerSetupList.tsx`:
      - 5 rows derived from `deriveReadiness(state)`:
        - **Smart-wallet PDA** — value: shortened PDA or "ready" when
          initialized; inline action `Initialize` when `state ===
          'pending'` calling `actions.initializeWallet()`.
        - **Custody funds** — value: balance summary or "needs deposit";
          inline action `Register` when `'pending'` calling
          `actions.registerCustody()`. Once registered, custody-funded
          status surfaces here AND in funds list.
        - **Confidential policy** — value: `sealed #N` from
          `state.data.policySeq` rendered in mono; inline action `Save
          policy` when `'pending'` calling
          `actions.saveConfidentialPolicy()`. Optional: tiny
          `<EncryptedField>` showing the first 5 bytes of
          `policyCommitment` for visual continuity with landing.
        - **Agent session** — value: `<shortpubkey> · <expiry>` or `—`;
          inline action `Grant session` when `'pending'` calling
          `actions.grantAgentSession()`.
        - **Authority** — read-only row showing "owner" (placeholder for
          future recovery-authority work).
      - When session is `'active'` but `sessionKeypair === null`, render
        a small inline "Re-grant for download" hint that fires
        `actions.regrantAgentSession()`.
      - Hairline divider between rows.

### Page composition

- [ ] `frontend-v2/src/routes/app.funds.tsx` replaces the placeholder:
      ```
      <PageHead kicker="Funds & Setup" title="…" sub="…" pill="PDA custody" />
      <div className="map-grid">
        <div>
          <FundsList />
          <QuickActions />
        </div>
        <OwnerSetupList />
      </div>
      <ContinueCTA />     // optional bottom CTA: "Open Policy Gate →"
      ```

### State + selectors

- [ ] Reuse `console-selectors.ts` (Phase 2). Extend if needed with:
      - `getCustodyBalances(state)` returning a stable shape so list rows
        don't drift.
      - `getOwnerAuthority(state)` (today returns `'owner'`; future
        recovery-authority work adds variants).
- [ ] No new `useConsole()` actions; all wiring is reuse.

### i18n

- [ ] All copy via `portal.funds.*` keys. EN canonical + ID mirror.
      Reuse existing `app.action.*` and `app.custody.*` labels where the
      strings already exist (don't duplicate; `portal.funds.*` can simply
      import or alias).

### Tests

- [ ] `frontend-v2/src/routes/app.funds.test.tsx`:
      - Renders all 4 funds rows + 5 setup rows from a hydrated state
        snapshot.
      - Inline action buttons render only when the matching row is
        `pending`.
      - Clicking an action fires the matching `useConsole()` action.
      - Custody funded → funds list reflects new balance + setup list
        marks custody as `done`.
      - Re-grant strip appears when session active but keypair missing.
      - ID locale mirror renders.

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`

## Implementation notes

- **No new actions on `useConsole()`**. This is a presentational + wiring
  slice. All 11 setup/custody/Ika actions already exist.
- **Agent gas live balance**: still uses the heuristic from Phase 2
  (`sessionKeypair !== null` + fund-gas receipt seen). Live polling of
  `connection.getBalance(sessionPubkey)` is parked until Phase 7+ —
  document the TODO in code.
- **Ethereum chain row**: deferred. The Ika dWallet row in `<FundsList>`
  reflects Sui devnet only this phase.
- **Recovery authority**: read-only `'owner'` for now. Future issues
  introduce shared Ika quorum / recovery rotation surface (issue 045 +
  contract work).
- **Visual reference**: `frontend-v2/mockups/agent-wallet.html`, funds
  page section.

## Risks

1. Custody funded status + Ika dWallet status drift if both sides
   (FundsList vs OwnerSetupList) compute independently. Mitigation: derive
   both from `deriveReadiness(state)` and `getCustodyBalances(state)` in
   the selector module — never inline computation.
2. Inline action buttons can render too many CTAs at once when nothing is
   set up. Hide buttons that aren't actionable (prerequisite not met) and
   surface 1-line guidance in the row sub instead.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
- `docs/issues/100-portal-workspace-home-readiness-cta-activity.md` (uses
  `console-selectors.ts`).
