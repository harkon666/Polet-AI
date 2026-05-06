# Official Ika Message Hash and Signing Lifecycle

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Align Polet's Ika approval path with the official Ika pre-alpha message hash and signing lifecycle described in `docs/ika/raw.md`. Polet should separate three concepts that are currently blurred together:

- Polet's `canonicalOrderHash`, which identifies the approved bridgeless order.
- Ika's `message_hash` / MessageApproval lookup digest, which the official docs say must be `keccak256(preimage)` regardless of destination chain.
- The destination-chain signing digest or gRPC sign payload, which is controlled separately by Ika signing/hash-scheme handling.

The current implementation is likely wrong for official Ika semantics because `proxy/src/lib/ika-bridgeless-request.ts` passes `preAlphaSigning.messageDigest` into `buildApproveIkaMessageSessionTransaction` as `canonicalOrderHash`, and `proxy/src/lib/ika-prealpha-signing.ts` derives that message digest directly from `suiTransactionDigest.digestHex` or `ethereumMessageDigest.digestHex`. For Sui, that means a BLAKE2b-256 Sui devnet digest is used as the `approve_message` `message_hash`, while `docs/ika/raw.md` states the approval hash should be a Keccak-256 uniqueness key. The contract then forwards the same value to `DWalletContext::approve_message` from `contract/programs/contract/src/ika_approval.rs`.

## Acceptance criteria

- [ ] Proxy types and docs expose distinct fields for `canonicalOrderHash`, `ikaMessageHash`, destination signing digest, and any future Ika gRPC `hash_scheme`/sign payload metadata.
- [ ] `ikaMessageHash` is derived as Keccak-256 over a stable Polet/Ika approval preimage and is the only value passed to `approve_ika_message_as_session` / Ika `approve_message`.
- [ ] Sui and Ethereum digest adapters remain available as sign-only destination artifacts, but they are not reused as Ika MessageApproval PDA lookup hashes unless the official Ika docs explicitly require that for the selected flow.
- [ ] The contract instruction/data naming is updated away from `canonical_order_hash` where it actually means Ika `message_hash`, and tests assert the value forwarded into mock Ika is the Keccak-256 Ika message hash.
- [ ] MessageApproval PDA derivation uses the official dWallet seed hierarchy with curve and public key chunks for real devnet mode. Compatibility fallback derivation is either removed from the official path or explicitly quarantined as local-only test metadata.
- [ ] Response statuses distinguish `approval-transaction-prepared`, `approval-submitted`, `signature-pending`, and `signature-produced-prealpha`; the proxy/SDK/frontend do not label an unsigned transaction as `message-approved`.
- [ ] Devnet smoke/runbook steps verify the full official lifecycle: dWallet authority is Polet's `__ika_cpi_authority` PDA, the approval transaction is simulated/reviewed before signing, MessageApproval is polled by official PDA, and signed status/signature bytes are recorded only after Ika writes them.

## Blocked by

- `docs/issues/027-polet-contract-ika-approve-message-cpi.md`
- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Official Ika notes

- `docs/ika/raw.md` says `approve_message` creates a MessageApproval PDA and the Ika network later writes the signature.
- The raw docs state the approval `message_hash` must be computed as Keccak-256 over a preimage regardless of destination chain.
- The digest the network signs is a separate concern controlled by the gRPC signing request's hash scheme.
- The current pre-alpha network uses a single mock signer and must not be described as production MPC.

## Grill decision

Recommended answer: keep this as one vertical AFK issue. The bug crosses proxy digest construction, transaction building, contract instruction naming, SDK/frontend status semantics, and devnet smoke verification. Splitting it by layer would risk preserving the same semantic mistake under cleaner names.
