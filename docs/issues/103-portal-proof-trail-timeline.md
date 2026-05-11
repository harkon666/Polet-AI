# Polet Portal — Phase 5: Proof Trail page (timeline + extracted Jupiter/Ika proof panels)

Labels: `needs-triage`, `frontend`, `design`, `policy`, `jupiter`, `ika`

Type: `AFK`

Status: `DONE`

## Shipped

- New `frontend-v2/src/components/app/proof/`:
  - `proof-format.ts` — pure formatters + URL builders
    (`formatProofClock`, `formatPriceImpactPct`, `explorerTxUrl`,
    `explorerAccountUrl`, `suiscanUrl`).
  - `ProofRow.tsx` — shared key/value row used by both proof panels.
  - `JupiterProofPanel.tsx` — extracted from `<ReceiptLog>`. Receives
    `proof: JupiterProof`, renders the same proof grid the legacy log
    rendered (tokens, route, slippage, price impact, signers, smart-
    wallet authority, block hash).
  - `IkaProofPanel.tsx` — extracted from `<ReceiptLog>`. Receives
    `proof: IkaProof`, renders dWallet, MessageApproval, CPI authority,
    message hash, destination digest with chain glyph + suiscan link
    for Sui, signature scheme, settlement, attestation, canonical
    order hash.
  - `ProofTimeline.tsx` — calm typographic feed of every receipt
    (chronological-reverse). Each row: 84px timestamp · title +
    description + constraint refs · right-side status tag. Allowed/
    blocked rail receipts have an expand chevron that reveals the
    Jupiter/Ika panel inline. Solana Explorer link from
    `entry.signature` rendered as a small mono link.
- `app.proof.tsx` replaces the placeholder with a hero (kicker, title,
  sub, count pill) plus `<ProofTimeline />`.
- 16 new `portal.proof.*` i18n keys (EN canonical + ID mirror).
- `app.proof.test.tsx`: 7 state-aware tests covering empty state, the
  3 status tag tones, both panel expand affordances, the Solana
  Explorer link, count pill, and ID locale mirror.
- `app.proof-preview.tsx` dev route renders 3 canonical states (empty,
  mixed allowed/blocked/info, ika allowed with full proof) for visual
  audits.
- Verify: typecheck clean, 100/100 tests green (93 → 100), build clean.

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

The **Proof Trail** page at `/app/proof` — a calm typographic timeline of
every receipt the operator has produced, with expandable Jupiter / Ika
proof panels. Replaces the old `<ReceiptLog>` boxed feed with a hairline-
divided list, and extracts `<JupiterProofPanel>` + `<IkaProofPanel>` from
inside `<ReceiptLog>` so they can be reused on the Policy Gate page (and
later by an SDK runner if needed).

After this slice the operator can:

1. **Read every receipt as a row** in chronological-reverse order:
   `HH:MM:SS · TITLE · BODY · TAG`.
2. **Expand allowed Jupiter / Ika receipts** to see the full proof grid
   (route metadata, dWallet ID, message hash, destination digest, explorer
   link). Same data as the existing `<ReceiptLog>`, just in extractable
   panels.
3. **Follow a Solana Explorer link** from any receipt with a signature.
4. **See an empty state** when no actions have been taken yet.

The visual is intentionally plain — no event cards, no boxes, just rhythm
through hairlines + type.

## Acceptance criteria

### Extracted proof panels

- [ ] `frontend-v2/src/components/app/proof/JupiterProofPanel.tsx`:
      - Receives `proof: JupiterProof` (shape exists in
        `use-console-actions.tsx`).
      - Renders the same grid the current `<ReceiptLog>` renders for
        Jupiter approvals: input/output token pair, route label, slippage,
        price impact (via `formatPriceImpactPct`), routes count, signers,
        smart-wallet authority.
      - Mono uppercase labels, hairline rows. No card frame.
- [ ] `frontend-v2/src/components/app/proof/IkaProofPanel.tsx`:
      - Receives `proof: IkaProof`.
      - Renders dWallet account, MessageApproval PDA, CPI authority,
        message hash, destination digest (with chain glyph), signature
        scheme, settlement status, policy attestation hash, canonical
        order hash.
      - Suiscan link for `destinationDigest.chain === 'sui'`; Etherscan
        link for `'ethereum'`.
- [ ] **Both panels live independently of `<ReceiptLog>`**. The old
      `<ReceiptLog>` file may keep wrappers for backwards compat, but the
      panel logic now lives in `proof/`. Phase 7 archives the old file.

### Timeline

- [ ] `frontend-v2/src/components/app/proof/ProofTimeline.tsx`:
      - Reads `state.receipts` from `useConsole()`.
      - Each row: 84px timestamp column · title + body · right-side tag
        (Allowed / Blocked / Sealed / Active / Revoked / etc.).
      - Hairline divider between rows.
      - Allowed/blocked rail receipts have an expand toggle (chevron) that
        reveals `<JupiterProofPanel>` or `<IkaProofPanel>` underneath the
        body.
      - Constraint refs (`pi_numeric_limit`, etc.) render as a small
        sub-list under the body (icon + name + short description) — same
        vocabulary the current `<ReceiptLog>` uses.
      - Solana Explorer link from `entry.signature` rendered as a small
        mono link at the right.
      - Empty state: 1 line "No agent activity yet — preview the gate to
        leave a receipt." (i18n).

### Page composition

- [ ] `frontend-v2/src/routes/app.proof.tsx` replaces the placeholder:
      ```
      <PageHead kicker="Proof Trail" title="…" sub="…" pill="…" />
      <ProofTimeline />
      ```

### Reuse on the Policy Gate page

- [ ] Wire `<JupiterProofPanel>` / `<IkaProofPanel>` into the gate page's
      Rail Output node (Phase 3) so the latest allowed receipt's proof
      can be revealed inline. This is OPTIONAL for Phase 5; it can land
      as a small follow-up if Phase 3 already has the rail-output verdict
      hook. If wired here, the panels appear collapsed under the verdict
      line with an expand chevron.

### i18n

- [ ] All copy via `portal.proof.*` keys + reuse existing
      `app.constraint.*` keys for constraint-ref tooltips. EN canonical +
      ID mirror.

### Tests

- [ ] `frontend-v2/src/routes/app.proof.test.tsx`:
      - Empty state renders the expected sentence.
      - Timeline renders 1 allowed + 1 blocked + 1 info receipt with
        correct tag colours.
      - Allowed Jupiter receipt expands into `<JupiterProofPanel>`.
      - Allowed Ika receipt expands into `<IkaProofPanel>`.
      - Solana Explorer link present on receipts with signature.
      - ID locale mirror renders.
- [ ] Component-level tests for each panel render shape (snapshot or
      content assertion).

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`

## Implementation notes

- **Reuse, don't re-derive**, all proof formatting from the current
  `<ReceiptLog>` source (`frontend-v2/src/components/app/ReceiptLog.tsx`).
  Move the `<JupiterProofPanel>` / `<IkaProofPanel>` definitions
  byte-identically to `proof/` and import them back into the old
  `<ReceiptLog>` if it still exists; Phase 7 deletes the old file.
- **Constraint refs**: today they live in `<ReceiptLog>` as inline
  computation. Lift that into a small helper or selector if it makes
  reuse cleaner; otherwise leave it inline within the timeline row.
- **No new actions** on `useConsole()`. Proof Trail is read-only.
- **Receipts are local state today** (cleared on reload). Persistence is a
  separate concern (issue 96 / 098 PRD discussions). Don't fix here.

## Risks

1. The existing `<ReceiptLog>` had subtle layout for proof grids that
   could regress when extracted. Snapshot tests for the panels mitigate
   this.
2. Receipt identification for "is this a Jupiter approval / Ika approval"
   today depends on `entry.action` string contains. Keep that contract
   stable; future work could move to `entry.kind: 'jupiter'|'ika'|...`.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
- `docs/issues/100-portal-workspace-home-readiness-cta-activity.md` (uses
  `console-selectors.ts`).
