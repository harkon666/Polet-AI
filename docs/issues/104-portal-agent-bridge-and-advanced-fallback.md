# Polet Portal — Phase 6: Agent Bridge page (MCP config · tools · advanced fallback)

Labels: `needs-triage`, `frontend`, `design`, `sdk`, `agent-runtime`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`

## What to build

The **Agent Bridge** page at `/app/bridge` — the developer surface where
operators copy MCP config and SDK setup, kept intentionally separate from
the owner-facing pages (Workspace / Gate / Funds / Proof). It also hosts
the **Advanced** collapse — the legacy v1 `<WalletDashboard>` fallback that
currently lives behind a `<details>` at the bottom of `app.tsx` (Phase 1
removed it from the tree but kept the file).

After this slice an SDK developer integrating Polet via Claude Desktop or
a local agent runtime can:

1. **Copy a paste-ready `mcp.json`** that uses the operator's currently
   active session keypair + owner pubkey + proxy URL.
2. **See all 5 MCP tools** (`polet_balance`, `polet_status`, `polet_trade`,
   `polet_execute`, `polet_enable_chain`) with one-line descriptions.
3. **Download `polet-agent.json`** (existing affordance from
   `<SessionKeypairAffordance>`) so the SDK CLI (issue 093) can be
   pre-configured.
4. **Open the Advanced panel** to access the legacy v1 dashboard for
   power-user flows (recovery, shared quorum, Encrypt graph) not yet
   ported to the portal.

## Acceptance criteria

### Bridge config panel

- [ ] `frontend-v2/src/components/app/bridge/BridgeConfigPanel.tsx`:
      - Two-column layout: MCP config (left) + tool list (right) — but
        with NO card frames, just hairline divider between columns.
      - Uses the same config-builder logic from the current
        `<AgentIntegrationPanel>`:
        - `POLET_OWNER` from `publicKey?.toBase58()`
        - `POLET_SESSION_KEY` from `sessionKeypair?.publicKey.toBase58()`
        - `POLET_AGENT_KEYPAIR` from `bs58.encode(sessionKeypair.secretKey)`
        - `POLET_PROXY_URL` from window override or default
        - `POLET_RPC_URL` from devnet default
      - Copy button uses navigator.clipboard with a 1.5s "Copied" feedback.
      - Falls back to placeholder strings (`<grant-session-first>`) when
        no session keypair is in memory; shows a 1-line note guiding the
        user to grant a session first (link to Funds & Setup).

### MCP tools list

- [ ] `frontend-v2/src/components/app/bridge/MCPToolsList.tsx`:
      - 5 rows (mono name + 1-line description), one per tool. Reuse the
        existing `MCP_TOOLS` array from `<AgentIntegrationPanel>` —
        export it from a shared constant if convenient, or inline as
        before.
      - Hairline divider between rows.

### Polet-agent.json download

- [ ] Surface a small "Download polet-agent.json" affordance on this page
      that mirrors the logic in `<SessionKeypairAffordance>` (Phase 1
      moves the affordance out of `<SetupLedger>` so this page can host
      it). When `sessionKeypair === null`, the button is greyed with a
      hint "Grant a session first → /app/funds".

### Advanced collapse

- [ ] At the bottom of `app.bridge.tsx`, host a `<details>` block:
      - Summary line: "Advanced · Legacy v1 console" (i18n key already
        exists: `app.advanced.label`).
      - Body renders the existing `<WalletDashboard>` from
        `frontend-v2/src/components/app/WalletDashboard.tsx` inside the
        `.pl-app-shell` shim.
      - Visual is intentionally hidden by default. Operators who need
        recovery / shared quorum / Encrypt graph still reach those
        flows.

### Page composition

- [ ] `frontend-v2/src/routes/app.bridge.tsx` replaces the placeholder:
      ```
      <PageHead kicker="Agent Bridge" title="…" sub="…" pill="MCP · SDK · polet-agent.json" />
      <BridgeConfigPanel />        // includes MCPToolsList alongside
      <DownloadPoletAgentJson />   // small inline affordance
      <details>{<WalletDashboard />}</details>
      ```

### i18n

- [ ] All copy via `portal.bridge.*` keys, plus reuse `app.agent.*`
      keys that already exist. EN canonical + ID mirror.

### Tests

- [ ] `frontend-v2/src/routes/app.bridge.test.tsx`:
      - Renders config block with placeholder strings when no session.
      - Renders config block with real values when session exists (mock
        `useConsole()`).
      - Copy config button triggers `navigator.clipboard.writeText` with
        the expected JSON.
      - 5 MCP tool rows present.
      - Advanced collapse summary present, body collapsed by default.
      - ID locale mirror renders.

### Verification

- [ ] `bun run --cwd frontend-v2 typecheck`
- [ ] `bun run --cwd frontend-v2 test`
- [ ] `bun run --cwd frontend-v2 build`

## Implementation notes

- **Reuse the existing `<AgentIntegrationPanel>` config-builder**. Don't
  re-implement the JSON shape, env-var keys, or copy-clipboard handler.
  Move the constants/helpers to a small shared module
  (`bridge/agent-config.ts`) and let the new components import them.
- **The download `polet-agent.json` affordance** is part of
  `<SessionKeypairAffordance>` today (`SetupLedger.tsx`). Phase 1 left
  that file in place; Phase 6 references its logic from the new bridge
  page. Phase 7 archives the old caller.
- **Advanced fallback safety**: do NOT remove `<WalletDashboard>` in this
  phase. It's the only surface that exposes recovery / shared quorum /
  Encrypt graph today. Keeping it under a `<details>` preserves access
  while we port those flows incrementally.

## Blocked by

- `docs/issues/099-portal-scaffolding-and-connect-first-cutover.md`
- `docs/issues/100-portal-workspace-home-readiness-cta-activity.md` (uses
  `console-selectors.ts`).
