# Sui Transaction Digest Adapter

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Extend the Sui Ika rail from signing a canonical order hash to signing a Sui-specific transaction or transaction digest when a narrow, safe devnet path is selected.

## Acceptance criteria

- [ ] A narrow Sui devnet action is selected and documented.
- [ ] SDK/proxy can map an approved Polet bridgeless order into the selected Sui transaction digest.
- [ ] Ika approval signs the chain-specific digest rather than only the canonical order hash.
- [ ] The response includes a Sui-oriented verification artifact without claiming production settlement.
- [ ] Tests cover digest construction, invalid destination data, and blocked-policy suppression.

## Blocked by

- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

