# Polet Portal — Phase 1: scaffolding, sidebar shell, connect-first cutover

Labels: `needs-triage`, `frontend`, `design`, `agent-runtime`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/098-app-sdk-proxy-integration-rollout-prd.md` (companion: this
phased rollout converts `/app` into a multi-page sidebar portal — Polet
Portal — that will host the integrations rolled out in PRD 098).

## What to build

Convert the existing single-page `/app` into a multi-page portal shell with a
left sidebar and 5 sub-routes. Phase 1 only ships the **shell + scaffolding +
disconnected/connected cutover**; sub-pages are placeholders with kicker +
title only. Subsequent phases (issues 100–105) fill in each sub-page.

After this slice the operator should:

1. Hit `/app` while disconnected → see **Polet Portal** sidebar (with nav
   muted) + a calm "Connect a devnet wallet to enter the portal" panel in
   main, with the existing `WalletButton` as the primary action.
2. Connect Phantom (devnet) → automatically navigate to `/app/workspace`
   (placeholder for now).
3. Click any sidebar link → switch routes inside the portal shell. Sidebar
   stays sticky, `<ConsoleStateProvider>` does NOT re-mount across route
   changes (single source of truth preserved).
4. Disconnect → automatically navigate back to `/app`.

The sub-pages render placeholder content for now (kicker + title + 1
sentence + a small "coming in phase N" hint). Wallet adapter, console state,
session keypair persistence, and all 17 actions on `useConsole()` continue
to work without modification.

## Acceptance criteria

### Route tree

- [ ] `frontend-v2/src/routes/app.tsx` becomes the **layout route** for
      `/app/*`:
      - Wraps children in `<ClientWalletProvider>` then
        `<ConsoleStateProvider>` then `<PortalShell>`.
      - Renders `<Outlet />` from `@tanstack/react-router` inside the shell's
        main slot.
      - No content of its own beyond the shell.
- [ ] New file `frontend-v2/src/routes/app.index.tsx`:
      - Path: `/app` (the index of the layout route).
      - Renders the **disconnected/connect-first screen** when wallet is
        not connected.
      - On `connected === true`, runs `navigate({ to: '/app/workspace',
        replace: true })` so the disconnected screen never lingers.
- [ ] New placeholder routes (each renders a simple kicker + title + body):
      - `frontend-v2/src/routes/app.workspace.tsx` → `/app/workspace`
      - `frontend-v2/src/routes/app.gate.tsx` → `/app/gate`
      - `frontend-v2/src/routes/app.funds.tsx` → `/app/funds`
      - `frontend-v2/src/routes/app.proof.tsx` → `/app/proof`
      - `frontend-v2/src/routes/app.bridge.tsx` → `/app/bridge`

### Disconnect / reconnect behaviour

- [ ] Visiting `/app/*` while disconnected (any sub-route) auto-navigates
      to `/app` so the connect-first screen takes over. Implemented via
      `useEffect` watching `connected` inside the layout (no router loader,
      because wallet state is React state, not loader-time state).
- [ ] On `connected → true`, the layout navigates to `/app/workspace`
      with `replace: true` so the back button doesn't bounce to the
      connect-first screen.
- [ ] On `connected → false`, the layout navigates back to `/app` with
      `replace: true`.

### Portal shell

- [ ] New component `frontend-v2/src/components/app/portal/PortalShell.tsx`:
      - Two-column grid: `var(--sidebar-w, 268px)` + `minmax(0, 1fr)`.
      - Renders `<PortalSidebar />` on the left and the `<Outlet />`
        children inside `<main className="pl-portal-main">`.
      - Mobile (≤ 960px): hides sidebar, shows nothing in its place
        (Phase 7 introduces `<PortalMobileBar>` + drawer).
- [ ] New component `frontend-v2/src/components/app/portal/PortalSidebar.tsx`:
      - Brand block: `<Logo>` + "Polet" + small kicker "Portal".
      - Nav block: 5 `<Link>`s (workspace / gate / funds / proof / bridge),
        each with glyph + label + tiny right-side meta (`live`, `#42`,
        `home`, etc., placeholder text fine).
      - Active-route highlight via TanStack Router's `useLocation()` (or
        `<Link activeProps>`).
      - When disconnected, nav items are visually muted (reduced opacity,
        cursor: not-allowed) but still clickable for inspection (Phase 7
        decides if hard-disable). Brand and runtime block stay visible.
      - Bottom block:
        - Runtime rows (devnet / proxy ms / policy / session) — placeholder
          static text fine; Phase 2 wires them to live state.
        - `<WalletButton>` (existing, reused as-is).

### Disconnected screen (`app.index.tsx`)

- [ ] One large headline ("Connect a devnet wallet to enter the portal" or
      similar i18n key).
- [ ] One sentence body explaining what Polet Portal is (one short line).
- [ ] Primary affordance is the existing `<WalletButton>` rendered prominently
      in main. The sidebar's bottom `<WalletButton>` continues to work too.
- [ ] No setup ledger, no rails, no receipts on this screen. Just connect.

### Sub-page placeholders

- [ ] Each placeholder route renders a `<PageHead>` (kicker + title + 1
      sentence + 1 right-side pill with text "phase N · pending").
- [ ] No interactive logic on placeholders. Hitting Preview / Execute /
      Deposit etc. is impossible because nothing renders those buttons yet.

### Cutover

- [ ] Old single-page composition (`<AppHeader>`, `<MissionRibbon>`,
      `<StatStrip>`, `<SetupLedger>`, `<TwoRailConsole>`, `<ReceiptLog>`,
      `<AgentIntegrationPanel>`, `<AdvancedFallback>`) is **removed from
      `app.tsx`** but the component files **stay in place** (un-imported).
      Phase 7 archives them.
- [ ] No new dual-UI: there is no flag, no toggle, no fallback panel. The
      portal is the only `/app/*` UI from this point on.

### Tests

- [ ] New `frontend-v2/src/routes/app.test.tsx`:
      - Renders `app.tsx` layout + `app.index.tsx` and asserts the
        connect-first headline is present (mock `useWallet` →
        `{ connected: false }`).
      - Renders the layout with `connected: true` and asserts a
        navigation effect targets `/app/workspace`.
      - Renders one placeholder sub-route (e.g. `/app/workspace`) and
        asserts its kicker text appears.
- [ ] Existing landing test (`routes/-index.test.tsx`) still passes.

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`
- [ ] `git diff --check`

## Implementation notes

- **No action plumbing changes**. `<ConsoleStateProvider>` and
  `useConsole()` stay byte-identical. Phase 2 onwards consumes the same
  context. This phase is presentational + routing only.
- **TanStack Router file convention**: flat dot syntax matches the existing
  `routes/` (which is flat). Do NOT introduce a `routes/app/` directory
  pattern; use `app.workspace.tsx`, `app.gate.tsx`, etc.
- **Disconnected nav muted, not disabled**: keep `<Link>`s clickable so a
  disconnected operator can still scan the portal layout. Visiting a sub-
  route while disconnected just bounces back to `/app`.
- **Sidebar width**: `268px` matches the v3 mockup
  (`frontend-v2/mockups/agent-wallet.html`). Use a CSS var so future phases
  can tweak.
- **Portal class prefix**: use `pl-portal-*` for portal-scoped classes
  (`pl-portal-shell`, `pl-portal-sidebar`, `pl-portal-main`,
  `pl-portal-nav`, `pl-portal-brand`). Tailwind utilities for layout/spacing.
- **i18n note**: Phase 1 is allowed to inline a few strings if it's faster,
  but the connect-first headline + sub-page kicker/title MUST go through the
  shared dictionary (`frontend/src/locale/dictionary.ts`) under a new
  `portal.*` namespace. Phase 7 audits the rest. Add EN canonical + ID
  mirror.
- **Dictionary keys to add (minimum)**:
  - `portal.brand.name` ("Polet")
  - `portal.brand.kicker` ("Portal")
  - `portal.connect.title`
  - `portal.connect.body`
  - `portal.nav.workspace`
  - `portal.nav.gate`
  - `portal.nav.funds`
  - `portal.nav.proof`
  - `portal.nav.bridge`
  - `portal.placeholder.title.{workspace,gate,funds,proof,bridge}`
  - `portal.placeholder.sub.{workspace,gate,funds,proof,bridge}`
  - `portal.placeholder.pending` (for the right-side pill)

- **Mockup reference**: `frontend-v2/mockups/agent-wallet.html` (multi-page
  hash-routed version). The visual target is "calm sidebar portal, no card
  walls". Keep the implementation faithful to the mockup's hairline-driven,
  type-driven feel.

## Blocked by

None — can start immediately.

## Out of scope (future issues)

- Workspace home content (issue 100)
- Policy gate composer + flow (issue 101)
- Funds & setup lists (issue 102)
- Proof timeline + extracted Jupiter/Ika proof panels (issue 103)
- Agent bridge + advanced fallback collapse (issue 104)
- Mobile drawer + i18n full audit + archive sweep (issue 105)
