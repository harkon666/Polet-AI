# Bridgeless Slippage and Risk Guardrails

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Extend Polet guardrails for bridgeless Ika orders with slippage and route-risk constraints so agents cannot request unsafe destination-chain trading parameters even when amount limits pass.

## Acceptance criteria

- [x] Canonical bridgeless orders include slippage and optional route-risk fields.
- [x] Proxy/SDK validate slippage and risk fields before transaction construction.
- [x] Contract or policy layer enforces selected risk constraints before Ika approval where feasible.
- [x] UI displays route-risk status without leaking private policy limits.
- [x] Tests cover allowed safe slippage, blocked unsafe slippage, malformed risk metadata, and interaction with daily cap.

## Blocked by

- `docs/issues/038-chain-and-asset-allowlist-guardrails.md`

## Completion notes

- Added `routeRisk` metadata and `riskGuardrails` policy fields for Ika bridgeless intents.
- The proxy now blocks unsafe slippage, high price impact, low liquidity score, or unverified routes before confidential spend mutation and before Polet/Ika approval transaction construction.
- Canonical bridgeless orders include optional route-risk metadata when provided, so the signed intent digest binds the checked route-risk facts.
- SDK builders and the high-level agent trade adapter preserve route-risk fields, and the frontend Ika preview displays a non-leaking route-risk status.
- Verification: `bun test` and `bun run build` pass in `proxy/`; `bun test` and `bun run build` pass in `sdk/`; `bun run test src/components/DemoTab.test.tsx` and `bun run build` pass in `frontend/`.
