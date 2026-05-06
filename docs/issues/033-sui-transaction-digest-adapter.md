# Sui Transaction Digest Adapter

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Extend the Sui Ika rail from signing a canonical order hash to signing a Sui-specific transaction or transaction digest when a narrow, safe devnet path is selected.

## Acceptance criteria

- [x] A narrow Sui devnet action is selected and documented.
- [x] SDK/proxy can map an approved Polet bridgeless order into the selected Sui transaction digest.
- [x] Ika approval signs the chain-specific digest rather than only the canonical order hash.
- [x] The response includes a Sui-oriented verification artifact without claiming production settlement.
- [x] Tests cover digest construction, invalid destination data, and blocked-policy suppression.

## Blocked by

- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Notes

- Selected action: Sui devnet sign-only `zero-mist-transfer-proof`.
- The proxy builds `suiTransactionDigest` with schema `polet.sui.devnet.transaction-digest.v1`, Sui `TransactionData` intent prefix `0x000000`, BLAKE2b-256 digest, `0` MIST, a validated `nativeDestinationAccount` recipient or Polet's fixed devnet verifier address, and explicit `broadcastable: false` / `productionSettlement: false` flags.
- Allowed Ika responses keep `canonicalOrderHash` as the Polet order reference, but `preAlphaSigning.messageDigest` and the Polet approval transaction message hash now use `suiTransactionDigest.digestHex`.
- Sui defaults to the `ed25519-prealpha` / EddsaSha512 scheme unless an explicit Ika Pre-Alpha override is supplied.
- Blocked policy responses still suppress Ika approval and Sui digest artifacts.

## Verification

- `bun test ./tests/sui-transaction-digest.test.ts ./tests/ika-bridgeless-request.test.ts` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
- `bun test ./tests/intent-builder.test.ts ./tests/local-agent-runtime.test.ts` passes in `sdk/`.
- `bun run build` passes in `sdk/` after installing package dependencies.
- `bun run build` passes in `frontend/` after installing package dependencies.
