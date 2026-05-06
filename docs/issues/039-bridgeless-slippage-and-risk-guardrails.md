# Bridgeless Slippage and Risk Guardrails

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Extend Polet guardrails for bridgeless Ika orders with slippage and route-risk constraints so agents cannot request unsafe destination-chain trading parameters even when amount limits pass.

## Acceptance criteria

- [ ] Canonical bridgeless orders include slippage and optional route-risk fields.
- [ ] Proxy/SDK validate slippage and risk fields before transaction construction.
- [ ] Contract or policy layer enforces selected risk constraints before Ika approval where feasible.
- [ ] UI displays route-risk status without leaking private policy limits.
- [ ] Tests cover allowed safe slippage, blocked unsafe slippage, malformed risk metadata, and interaction with daily cap.

## Blocked by

- `docs/issues/038-chain-and-asset-allowlist-guardrails.md`

