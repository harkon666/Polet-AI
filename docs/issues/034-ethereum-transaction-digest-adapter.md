# Ethereum Transaction Digest Adapter

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add an optional Ethereum destination adapter for Ika dWallet signing so Polet can demonstrate that the control-layer model generalizes beyond the Sui-primary demo path.

## Acceptance criteria

- [ ] The SDK accepts Ethereum as an optional Ika destination without making it the primary demo path.
- [ ] A narrow EVM message or transaction digest format is selected and documented.
- [ ] Proxy/SDK can construct the EVM digest from an approved canonical order.
- [ ] Blocked policy responses suppress all Ethereum/Ika signing proof fields.
- [ ] Tests cover digest construction, unsupported EVM inputs, policy block, and response normalization.

## Blocked by

- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

