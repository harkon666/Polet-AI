# Canonical Bridgeless Order Message

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a canonical `polet.bridgeless.order.v1` message format for Ika dWallet signing. The message should represent a policy-gated bridgeless trading intent in a deterministic way so the proxy, SDK, frontend, and contract can agree on the exact hash Polet approves through Ika.

## Acceptance criteria

- [ ] A shared module defines the canonical order payload with intent id, source, target, amount, slippage, owner, session key, policy sequence, nonce, and expiry.
- [ ] Sui is the primary destination shape and Ethereum is accepted as an optional destination shape without becoming the default demo path.
- [ ] The hash is deterministic across SDK/proxy tests for the same logical order.
- [ ] The hash includes replay protection through nonce and expiry.
- [ ] The order amount used for policy is the source USDC-equivalent amount.
- [ ] Tests cover stable serialization, hash mismatches, expired order rejection, and Sui/Ethereum destination validation.
- [ ] Docs show the JSON payload that OpenClaw/Hermes-style agents are signing indirectly through Polet.

## Blocked by

- `docs/issues/025-official-ika-dwallet-prealpha-alignment.md`

## Architecture notes

The MVP signs a canonical order hash rather than a chain-specific transaction digest. Sui and Ethereum transaction digest adapters are extension issues after the dWallet approval path works end to end.

