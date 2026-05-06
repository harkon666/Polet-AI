# Ethereum Transaction Digest Adapter

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add an optional Ethereum destination adapter for Ika dWallet signing so Polet can demonstrate that the control-layer model generalizes beyond the Sui-primary demo path.

## Acceptance criteria

- [x] The SDK accepts Ethereum as an optional Ika destination without making it the primary demo path.
- [x] A narrow EVM message or transaction digest format is selected and documented.
- [x] Proxy/SDK can construct the EVM digest from an approved canonical order.
- [x] Blocked policy responses suppress all Ethereum/Ika signing proof fields.
- [x] Tests cover digest construction, unsupported EVM inputs, policy block, and response normalization.

## Blocked by

- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Notes

- Selected action: Ethereum Sepolia sign-only EIP-191 `zero-wei-transfer-proof` message digest.
- The proxy builds `ethereumMessageDigest` with schema `polet.ethereum.sepolia.message-digest.v1`, chain id `11155111`, Keccak-256 EIP-191 digest, `0` wei, a validated `nativeDestinationAccount` recipient or Polet's fixed Sepolia verifier address, and explicit `broadcastable: false` / `productionSettlement: false` flags.
- Issue 040 superseded the original hash mapping. Allowed Ethereum Ika responses keep `canonicalOrderHash` as the Polet order reference; `ethereumMessageDigest.digestHex` is destination sign-only metadata, while `preAlphaSigning.ikaMessageHash` and the Polet approval transaction use a separate Keccak-256 Ika MessageApproval hash.
- Ethereum defaults to `ecdsa-secp256k1-sha256`; Sui remains the primary demo path and still defaults to `ed25519-prealpha`.
- Blocked policy responses suppress Ika approval plus Sui/Ethereum digest artifacts.

## Verification

- `bun test ./tests/ethereum-transaction-digest.test.ts ./tests/sui-transaction-digest.test.ts ./tests/ika-bridgeless-request.test.ts` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
- `bun test ./tests/intent-builder.test.ts ./tests/local-agent-runtime.test.ts` passes in `sdk/`.
- `bun run build` passes in `sdk/`.
- `bun run build` passes in `frontend/`.
