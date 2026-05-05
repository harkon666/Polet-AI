# Smart Wallet Identity Module

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Create a single smart wallet identity module for Polet's program identity and wallet PDA derivation, then align the SDK with the contract/proxy wallet seed. Agent developers should derive the same wallet PDA that the contract and proxy use for setup, custody, policy, and execution paths.

## Acceptance criteria

- [x] Proxy code derives wallet PDAs through one shared module instead of repeating program id and wallet seed constants across routes.
- [x] The SDK wallet PDA helper uses the on-chain `polet_wallet` seed instead of the old `polet_ai_wallet` seed.
- [x] The SDK wallet PDA helper uses Solana PDA derivation, not a hash-only simulation.
- [x] Tests lock the SDK program id, wallet seed, and PDA derivation result.
- [x] SDK and proxy tests/builds pass after the change.

## Blocked by

None - can start immediately

## Completion Notes

Added `proxy/src/lib/program-identity.ts` as the proxy seam for `PROGRAM_ID`, `WALLET_SEED`, and `deriveWalletPda`. Updated proxy wallet/session/setup/execution call sites to use it. Updated the SDK session helper to derive the real Polet wallet PDA using `PublicKey.findProgramAddressSync` and the contract seed.

Verification:

- `bun run test` and `bun run build` pass in `sdk/`.
- `bun run test` and `bun run build` pass in `proxy/`.
