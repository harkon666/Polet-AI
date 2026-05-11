# Polet Portal — Phase 3: Policy Gate page (composer · flow · verdict · actions)

Labels: `needs-triage`, `frontend`, `design`, `policy`, `jupiter`, `ika`

Type: `AFK`

Status: `DONE`

## Shipped

Commit pending under `feat(portal): Phase 3 — policy gate composer, flow,
actions`.

- New `frontend-v2/src/components/app/gate/` directory:
  - `gate-state.ts` — shared `Rail`, `Scenario` types + pure helpers
    (`amountForScenario`, `railForScenario`, `scenarioForRail`).
  - `GateHero.tsx` — page head + live verdict pill driven by
    `getGatePillState(state, rail)`.
  - `IntentComposer.tsx` — wide hairline sentence with a display-only
    amount slot (no `<input>`) and a Jupiter ↔ Ika `<select>`.
  - `ScenarioRow.tsx` — 3 chip buttons (allow-jupiter, block-25, ika).
  - `GateOrb.tsx` — pure visual primitive (conic + radial gradient,
    two dashed orbit rings, centered word).
  - `FlowCanvas.tsx` — 3-node grid (Agent request → Sealed gate orb →
    Rail output) with hairline pulse-dot connectors.
  - `ActionsBar.tsx` — Preview · Try blocked · Execute with the
    disabled rules mirrored from `<RailCard>` (no session / no session
    keypair / no managed Ika chain).
- `app.gate.tsx` replaces the Phase 1 placeholder with the composition.
- `getGatePillState(state, rail)` added to `console-selectors.ts` with
  six new unit tests covering the rail loading + receipt status
  resolution matrix.
- Three new CSS primitives (Rule 3) in `styles.css`:
  `.pl-gate-orb` (with `data-verdict` variants), `.pl-flow-pulse`,
  and reduced-motion overrides for both.
- 56 new `portal.gate.*` i18n keys (EN canonical + ID mirror).
- 15 new gate state tests in `app.gate.test.tsx` exercising every
  scenario → composer transition, every action wiring, every disabled
  precondition, and the ID locale mirror.
- Dev-only `/app/gate-preview` route renders the composition four
  times (idle · allow · block · evaluating). Exempted from the
  redirector bounce alongside `workspace-preview`.
- New visual audit screenshots committed to the gitignored
  `e2e/screenshots/` (regenerate with `npx playwright test
  e2e/phase2-visual.spec.ts`).
- `bun run typecheck` clean, 73/73 tests green, `bun run build` clean.

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

The **Policy Gate** page at `/app/gate` — the heart of the portal where
agent intent passes through Polet's confidential gate before any rail can
sign. It replaces the old `<TwoRailConsole>` + `<RailCard>` two-card
composition with one unified terminal screen:

1. **Intent composer** (Jupiter-style, no card frame): "Run [N USDC] through
   [Jupiter | Ika · Sui]" — number is **display-only** in this phase
   (decision A from the mapping; backend actions are hardcoded `5`/`25`).
2. **Scenario chips** drive the composer: "Allow Jupiter 5 USDC", "Block 25
   USDC", "Ika Sui approval".
3. **3-node policy-gated flow**: Agent request → Sealed gate (orb) → Rail
   output, separated by hairline connectors with a breathing pulse dot.
4. **Verdict line** under the rail-output node updates from the latest
   matching rail receipt.
5. **Actions bar**: Preview gate · Try blocked amount · Execute with
   session key.

After this slice the operator can run the same demo flow that
`<TwoRailConsole>` ran, but in one calm sealed-gate composition. All five
existing rail action functions on `useConsole()` are reused as-is
(`runJupiterAllow`, `runJupiterBlock`, `runIkaAllow`, `runIkaBlock`,
`executeJupiter`, `executeIka`).

## Acceptance criteria

### Composer

- [ ] `frontend-v2/src/components/app/gate/IntentComposer.tsx`:
      - Two type-driven slots inside a wide horizontal sentence:
        - amount slot: shows the active scenario's number ("5" or "25"),
          rendered as static text (NO `<input>` element). The visible
          number tracks the active scenario chip.
        - rail slot: a `<select>` (or button-group) toggling Jupiter ↔ Ika.
      - Visual rule: hairline `border-bottom` under each slot, no card
        frame. Matches v3 mockup.
      - When rail switches to Ika, the active scenario auto-flips to
        `ika` (and vice versa for `jupiter`).

### Scenario row

- [ ] `frontend-v2/src/components/app/gate/ScenarioRow.tsx`:
      - 3 pill buttons: `allow-jupiter`, `block-25`, `ika-sui`.
      - Selecting a chip:
        - sets the composer's amount + rail.
        - **does not fire a backend action** (no auto-preview).
      - Active chip styled consistently with landing's `.pl-scenario-pill`.

### Flow canvas

- [ ] `frontend-v2/src/components/app/gate/FlowCanvas.tsx`:
      - 3-node grid with two `connector` columns between them.
      - **Node 1 — Agent request**:
        - Kicker `01 · AGENT REQUEST`, title swaps Jupiter/Ika.
        - Body: 1 sentence describing what the agent is asking.
        - 3-row blob stack: amount, route, session.
      - **Node 2 — Sealed gate** (uses `<GateOrb>`):
        - Kicker `02 · SEALED GATE`.
        - Centered orb (existing aurora aesthetic from mockup).
        - 3-row check stack: session active · policy seq fresh · private
          limit (rendered with `EncryptedField` where applicable).
      - **Node 3 — Rail output**:
        - Kicker `03 · RAIL OUTPUT`.
        - Title swaps "Jupiter transaction ready" / "Ika MessageApproval
          ready" based on selected rail.
        - Verdict line (palm or coral) sourced from
          `latestRailVerdict(state, rail)` selector.
        - 1-line body explaining what the verdict means.

### Gate orb

- [ ] `frontend-v2/src/components/app/gate/GateOrb.tsx`:
      - Pure visual primitive. Receives `verdict: 'allow' | 'block' |
        'idle'`. Default = idle.
      - Conic + radial gradient + dashed orbit rings (per mockup CSS).
      - Shows centered word: `ALLOW`, `BLOCK`, or `READY`.
      - `prefers-reduced-motion: reduce` disables ring rotation.

### Actions bar

- [ ] `frontend-v2/src/components/app/gate/ActionsBar.tsx`:
      - Three buttons (left-to-right): `Preview gate` · `Try blocked
        amount` · `Execute with session key`.
      - Wiring:
        - **Preview gate**: calls `runJupiterAllow()` if rail=jupiter or
          `runIkaAllow()` if rail=ika.
        - **Try blocked amount**: switches scenario to `block-25` and calls
          `runJupiterBlock()` (Ika scenario stays as Jupiter for the
          blocked demo path; or wire to `runIkaBlock` when rail=ika —
          mirror the existing `<TwoRailConsole>` behaviour).
        - **Execute**: calls `executeJupiter()` if rail=jupiter,
          `executeIka()` if rail=ika.
      - Disabled states (mirror existing `<RailCard>` rules):
        - Disabled when no active session (`hasActiveSession === false`).
        - Disabled when any action is in flight (`state.loading !== null`).
        - Execute disabled additionally when `sessionKeypair === null`.
        - Ika execute disabled when `getActiveIkaChain(state) !== 'sui'`.

### Page composition

- [ ] `frontend-v2/src/routes/app.gate.tsx`:
      ```
      <GateHero />          // PageHead with kicker, title, sub, live verdict pill
      <IntentComposer />
      <ScenarioRow />
      <FlowCanvas />
      <ActionsBar />
      ```
- [ ] No card walls. Sections separated by whitespace + the actions-bar
      top hairline rule.

### State derivation

- [ ] Live verdict pill in the page head reads
      `latestRailVerdict(state, rail)` and renders one of:
      - `READY TO PREVIEW` (no receipts yet for this rail)
      - `ALLOWED BY POLICY` (last receipt allowed)
      - `BLOCKED BY POLICY` (last receipt blocked)
      - `EVALUATING` (a matching action is currently loading)

### i18n

- [ ] All copy via dictionary under `portal.gate.*`. EN canonical + ID
      mirror.

### Tests

- [ ] `frontend-v2/src/routes/app.gate.test.tsx`:
      - Scenario click switches composer state and active rail.
      - Preview button fires the correct action key per rail (mock
        `useConsole().actions`).
      - Verdict line + orb word reflect the latest receipt for the rail.
      - Disabled states fire correctly under each precondition.
      - ID locale mirror renders.

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`

## Implementation notes

- **Amount input is intentionally display-only**. Phase mapping decision A:
  the visible number tracks the active scenario chip. Don't render an
  `<input>` because backend actions are hardcoded 5/25 and a real input
  would lie.
- **Rail switching must reset active scenario** to keep amount + rail in
  sync (rail=ika → scenario=`ika`, rail=jupiter → scenario=`allow-jupiter`,
  unless `block-25` is currently active).
- **Ethereum disabled today**. `executeIka()` only supports Sui devnet
  (existing constraint in `use-console-actions.tsx`). The composer's rail
  selector exposes "Ika · Sui" only. Future Ethereum support is a
  separate slice; no scope creep here.
- **Reuse**, **don't rewrite**, the existing rail proof formatting from
  `<ReceiptLog>` if you need to surface a one-line proof under the verdict
  line. Phase 5 fully extracts those panels.
- **Mockup reference**: `frontend-v2/mockups/agent-wallet.html`, gate page
  + flow canvas section.

## Risks

1. The hardcoded amount could mislead users who expect the displayed
   number to drive the action. Mitigated by chip-only interaction (no
   input field). Document in JSDoc on `IntentComposer.tsx`.
2. Latest-receipt verdict can flicker if a new receipt arrives mid-render.
   Use `latestRailVerdict(state, rail)` selector + memoize.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
- `docs/issues/100-portal-workspace-home-readiness-cta-activity.md`
  (selector module lands there; this issue depends on it).
