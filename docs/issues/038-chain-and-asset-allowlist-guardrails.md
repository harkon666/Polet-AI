# Chain and Asset Allowlist Guardrails

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add chain and asset allowlist guardrails for bridgeless Ika intents so users can restrict which destination chains and assets AI agents may request.

## Acceptance criteria

- [ ] The policy model supports allowed source chains, target chains, source assets, and target assets.
- [ ] Sui/SUI remains allowed for the primary demo path.
- [ ] Unsupported chains/assets are blocked before Ika approval.
- [ ] Blocked responses do not reveal private numeric thresholds or witness data.
- [ ] UI and SDK show a safe unsupported-route explanation.
- [ ] Tests cover allowed Sui, blocked unsupported chain, blocked unsupported asset, and interaction with numeric limits.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`

## Architecture notes

Encrypted allowlist membership remains out of scope unless Encrypt primitives make it practical. This issue can use public commitments or explicit route policy first.

