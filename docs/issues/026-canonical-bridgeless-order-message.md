# Canonical Bridgeless Order Message

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a canonical `polet.bridgeless.order.v1` message format for Ika dWallet signing. The message should represent a policy-gated bridgeless trading intent in a deterministic way so the proxy, SDK, frontend, and contract can agree on the exact hash Polet approves through Ika.

## Acceptance criteria

- [x] A shared module defines the canonical order payload with intent id, source, target, amount, slippage, owner, session key, policy sequence, nonce, and expiry.
- [x] Sui is the primary destination shape and Ethereum is accepted as an optional destination shape without becoming the default demo path.
- [x] The hash is deterministic across SDK/proxy tests for the same logical order.
- [x] The hash includes replay protection through nonce and expiry.
- [x] The order amount used for policy is the source USDC-equivalent amount.
- [x] Tests cover stable serialization, hash mismatches, expired order rejection, and Sui/Ethereum destination validation.
- [x] Docs show the JSON payload that OpenClaw/Hermes-style agents are signing indirectly through Polet.

## Blocked by

- `docs/issues/025-official-ika-dwallet-prealpha-alignment.md`

## Architecture notes

The MVP signs a canonical order hash rather than a chain-specific transaction digest. Sui and Ethereum transaction digest adapters are extension issues after the dWallet approval path works end to end.

## Completion notes

- Added SDK and proxy canonical bridgeless order modules with deterministic serialization, SHA-256 hashing, hash verification, expiry checks, and Sui/Ethereum destination validation.
- The proxy Ika allowed envelope now includes `canonicalOrder` and `canonicalOrderHash`; blocked policy/session paths still suppress Ika payloads.
- Added `docs/bridgeless-order-message.md` with the canonical JSON payload and expected digest.
- Verification: `bun test ./tests/bridgeless-order.test.ts ./tests/ika-bridgeless-request.test.ts` and `bun run build` pass in `proxy/`; `bun test ./tests/intent-builder.test.ts` and `bun run build` pass in `sdk/`.
