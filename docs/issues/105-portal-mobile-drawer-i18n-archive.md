# Polet Portal — Phase 7: mobile drawer · i18n audit · tests · archive sweep

Labels: `needs-triage`, `frontend`, `design`, `i18n`, `a11y`, `test`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

Final cleanup phase that locks the Polet Portal in place:

1. **Mobile drawer** — `<PortalMobileBar>` collapses the sticky sidebar
   into a hamburger + brand + WalletButton row (≤ 960px). Tapping the
   hamburger slides the sidebar in from the left as a modal drawer with
   focus trap, backdrop dim, ESC / route-change close.
2. **i18n audit** — every visible portal string flows through the shared
   dictionary at `frontend/src/locale/dictionary.ts`. EN canonical, ID
   mirror. No hard-coded English in any `components/app/portal/`,
   `workspace/`, `gate/`, `funds/`, `proof/`, `bridge/` file.
3. **Test coverage** — every page has a smoke test asserting at least one
   assertion in EN and one in ID. Selectors module fully unit-tested
   (Phase 2 starts this; Phase 7 finishes coverage gaps).
4. **Archive sweep** — old single-page components are moved to
   `components/app/_archived/` (not deleted) so future agents can
   reference the previous shape.

After this slice the portal is mobile-safe, fully localized, fully
covered by tests, and the legacy components no longer pollute the active
component tree.

## Acceptance criteria

### Mobile drawer

- [ ] `frontend-v2/src/components/app/portal/PortalMobileBar.tsx`:
      - Visible only at `≤ 960px`.
      - Layout: hamburger icon · brand block (Polet · Portal) ·
        `<WalletButton>` (compact).
      - Hamburger toggles a drawer state held in
        `<PortalShell>`-local state (or new `<PortalDrawerProvider>` if
        cleaner).
- [ ] Drawer behaviour:
      - Slides in from the left (≤ 280px) over a backdrop dimmed at
        `rgb(0 0 0 / 0.62)`.
      - Focus traps inside the drawer when open.
      - Closes on: tap backdrop · ESC · navigation (route change closes
        automatically via `useLocation()` effect).
      - Renders the same `<PortalSidebar>` component used at desktop
        widths — no duplication.
      - ARIA: `role="dialog"` + `aria-modal="true"` + label from
        `portal.sidebar.brand`.
      - `prefers-reduced-motion: reduce` disables slide animation,
        snaps open/closed instead.
- [ ] Desktop (> 960px): no drawer logic; sidebar renders inline as in
      Phase 1.

### i18n audit

- [ ] Run `rg "['\"]([A-Z][^'\"]{4,})['\"]" frontend-v2/src/components/app/portal/ frontend-v2/src/components/app/workspace/ frontend-v2/src/components/app/gate/ frontend-v2/src/components/app/funds/ frontend-v2/src/components/app/proof/ frontend-v2/src/components/app/bridge/ frontend-v2/src/routes/app.*.tsx`
      and confirm every match is either:
      - a TypeScript type literal,
      - a CSS class name,
      - a developer-only string (URL, env var name), or
      - an ID locale mirror inside the dictionary itself.
- [ ] Every `portal.*` key referenced in code exists in BOTH EN and ID
      blocks of `frontend/src/locale/dictionary.ts`.
- [ ] CI test (or a small unit) asserts EN and ID keys agree on the
      `portal.*` namespace (key set parity).

### Test coverage

- [ ] `app.workspace.test.tsx`, `app.gate.test.tsx`, `app.funds.test.tsx`,
      `app.proof.test.tsx`, `app.bridge.test.tsx` each have at least one
      EN content assertion + one ID content assertion.
- [ ] `app.test.tsx` covers:
      - Connect-first redirect (disconnected at any sub-route → bounce
        to `/app`).
      - Already-connected at `/app` → bounce to `/app/workspace`.
      - Sidebar nav links navigate within the layout (no full reload).
      - Mobile drawer toggle opens/closes the drawer.
- [ ] Selectors:
      `console-selectors.test.ts` covers all 8 representative state
      snapshots from issue 100.
- [ ] All tests pass: `bun run --cwd frontend-v2 test`.

### Archive sweep

- [ ] Create `frontend-v2/src/components/app/_archived/` and move the
      following intact files there (preserving git history via `git mv`):
      - `AppHeader.tsx`
      - `MissionRibbon.tsx`
      - `StatStrip.tsx`
      - `SetupLedger.tsx`
      - `TwoRailConsole.tsx`
      - `RailCard.tsx`
      - `ChainStatusStrip.tsx`
      - `ReceiptLog.tsx` (only if `<JupiterProofPanel>` /
        `<IkaProofPanel>` were fully extracted in Phase 5; otherwise
        archive its empty husk after extraction).
      - `AgentIntegrationPanel.tsx`
- [ ] Delete the imports from `app.tsx` (already done in Phase 1 — verify
      no stale references remain).
- [ ] Add a top-of-file JSDoc to each archived file noting the date,
      reason ("Replaced by Polet Portal — see issues 099–105"), and
      pointer to the new component path.

### Browser smoke (HITL — manual)

- [ ] On Chrome desktop: `/app` → connect → `/app/workspace` → click each
      sidebar link → no flicker, no remount, no console errors.
- [ ] On Chrome iPhone-emulator (375px): hamburger toggles drawer ·
      backdrop closes · ESC closes · navigating closes.
- [ ] Keyboard tab order through sidebar nav is sensible.
- [ ] Lighthouse a11y ≥ 95 on `/app/workspace` after connect (mock if
      Phantom not available; otherwise just confirm landmark roles).

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`
- [ ] `git diff --check`
- [ ] `git status` shows the archive moves correctly under
      `_archived/`.

## Implementation notes

- **Drawer pattern**: Linear's mobile drawer is a good reference: simple
  overlay, no fancy transforms, focus trap via JS. Don't over-engineer.
- **Focus trap**: implement with a tiny utility (no library); manage
  `tabindex` on body siblings or use the standard `inert` attribute on
  the main content while the drawer is open.
- **Archive vs delete**: per the mapping decision, archive (not delete)
  preserves the action plumbing reference for future contributors. The
  `_archived/` folder is excluded from CI eslint via path glob if rules
  are noisy; otherwise leave them lintable.
- **Locale parity test**: a quick assertion that the EN and ID
  dictionaries have the same `portal.*` keys can be a one-liner Vitest
  test. Reuse if a similar test exists for landing keys.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
- `docs/issues/100-portal-workspace-home-readiness-cta-activity.md`
- `docs/issues/101-portal-policy-gate-composer-flow-actions.md`
- `docs/issues/102-portal-funds-and-setup-page.md`
- `docs/issues/103-portal-proof-trail-timeline.md`
- `docs/issues/104-portal-agent-bridge-and-advanced-fallback.md`
