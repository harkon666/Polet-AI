# Chain and Asset Allowlist Guardrails

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add chain and asset allowlist guardrails for bridgeless Ika intents so users can restrict which destination chains and assets AI agents may request.

## Acceptance criteria

- [x] The policy model supports allowed source chains, target chains, source assets, and target assets.
- [x] Sui/SUI remains allowed for the primary demo path.
- [x] Unsupported chains/assets are blocked before Ika approval.
- [x] Blocked responses do not reveal private numeric thresholds or witness data.
- [x] UI and SDK show a safe unsupported-route explanation.
- [x] Tests cover allowed Sui, blocked unsupported chain, blocked unsupported asset, and interaction with numeric limits.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`

## Architecture notes

Encrypted allowlist membership remains out of scope unless Encrypt primitives make it practical. This issue can use public commitments or explicit route policy first.

## Implementation notes

- Added `routeGuardrails.mode = "chain-asset-allowlist"` for explicit public route policy on Ika multichain intents.
- Added proxy route guardrail evaluation before confidential numeric policy execution and before Ika approval transaction construction.
- Default Ika route policy keeps Solana USDC as the source and supports the existing Sui/SUI primary path plus the optional Ethereum/ETH path.
- Unsupported chains/assets return `allowed: false`, `code: "IKA_ROUTE_NOT_ALLOWED"`, and a safe explanation without threshold, cap, daily-spend, witness, dWallet, or MessageApproval data.
- SDK intent builders and `createPoletAgent().trade()` pass route guardrails through and normalize `IKA_ROUTE_NOT_ALLOWED` as a blocked policy result.
- Frontend demo now includes an unsupported Ika route action that shows the safe block state without approval proof.
