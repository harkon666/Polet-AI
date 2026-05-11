# Archived components

Files in this directory were the single-page `/app` console before the
**Polet Portal** rollout (issues 099–105, May 2026).

They are kept on disk — not deleted — so contributors can reference the
previous structure when porting flows that haven't yet moved to the new
multi-page portal:

- `AppHeader.tsx` — `/app` chrome header
- `MissionRibbon.tsx` — single-line strip below the header
- `StatStrip.tsx` — four compact status tiles
- `SetupLedger.tsx` — linear setup checklist + `<SessionKeypairAffordance>`
- `TwoRailConsole.tsx` — Jupiter + Ika rail cards
- `RailCard.tsx` — one rail card (block / allow / execute buttons)
- `ChainStatusStrip.tsx` — Ika managed-chain enable strip
- `ReceiptLog.tsx` — append-only proof feed (proof panels extracted in Phase 5)
- `AgentIntegrationPanel.tsx` — MCP config + tools details panel

## Where to look now

| Old | New |
| --- | --- |
| `AppHeader` / `MissionRibbon` | `components/app/portal/PortalShell.tsx` + `PortalSidebar.tsx` + `PortalMobileBar.tsx` + `PortalDrawer.tsx` |
| `StatStrip` | Sidebar runtime block in `PortalSidebar.tsx` (Phase 2) |
| `SetupLedger` | `components/app/funds/OwnerSetupList.tsx` (Phase 4) |
| `TwoRailConsole` / `RailCard` | `components/app/gate/` (Phase 3) |
| `ChainStatusStrip` | `components/app/funds/QuickActions.tsx` (Phase 4) |
| `ReceiptLog` proof panels | `components/app/proof/JupiterProofPanel.tsx` + `IkaProofPanel.tsx` (Phase 5) |
| `ReceiptLog` feed | `components/app/proof/ProofTimeline.tsx` (Phase 5) |
| `AgentIntegrationPanel` | `components/app/bridge/agent-config.ts` + `BridgeConfigPanel.tsx` + `MCPToolsList.tsx` (Phase 6) |

`WalletDashboard.tsx` is **not** archived — it powers the Advanced fallback
collapse on `/app/bridge` until recovery, shared quorum, and the Encrypt
graph are ported individually.

## Don't import from this folder

Production code paths must not import from `_archived/`. The directory
exists only for git history + reference reading. If you need a piece of
behaviour from one of these files, port it into a Phase-aligned module
under `components/app/{portal,workspace,gate,funds,proof,bridge,selectors}/`.
