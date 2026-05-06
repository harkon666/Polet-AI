# Ika dWallet Solana Pre-Alpha Alignment

Checked date: 2026-05-06

This memo pins the official Ika Solana Pre-Alpha surface that Polet should build against before implementing the contract CPI path.

## Official Sources

- Ika docs: https://docs.ika.xyz/
- Solana Pre-Alpha guide: https://solana-pre-alpha.ika.xyz/
- Solana Pre-Alpha repo: https://github.com/dwallet-labs/ika-pre-alpha
- General Ika repo and SDK: https://github.com/dwallet-labs/ika

The official docs now expose a Solana-specific Pre-Alpha surface. The root Ika docs link to "Solana Pre-Alpha is live" and the Pre-Alpha repo describes a public developer SDK for Solana programs.

## Pinned Devnet Surface

Official Pre-Alpha environment:

- dWallet gRPC: `https://pre-alpha-dev-1.ika.ika-network.net:443`
- Solana RPC: `https://api.devnet.solana.com`
- dWallet program id: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`
- SDK repo dependency: `https://github.com/dwallet-labs/ika-pre-alpha`
- Anchor CPI crate: `ika-dwallet-anchor` with `anchor-lang = "1"`
- Pinocchio CPI crate: `ika-dwallet-pinocchio`
- Native CPI crate: `ika-dwallet-native`
- Account reader/PDA helper crate: `ika-solana-sdk-types`

Polet currently has a local proxy compatibility model under `proxy/src/lib/ika-prealpha-signing.ts`. That model must not be described as an official on-chain MessageApproval until issue 027 replaces it with the real CPI path and official account derivations.

## dWallet Creation Or Import

Official docs describe two relevant flows:

- New dWallet by DKG: the user submits a DKG request through the gRPC flow; the network commits the on-chain `DWallet` account; initial authority is the requesting user.
- Imported dWallet: key import exists in the wider Ika docs for bringing an existing key into Ika, but it has a different trust model because the network receives a share of an existing key.

For the Polet demo, the safer primary path is a freshly created Pre-Alpha dWallet by DKG. Imported keys are optional future work and should not be required for the hackathon demo.

## Authority Transfer To Polet

Before Polet can approve messages, dWallet authority must be transferred to Polet's CPI authority PDA.

Official CPI authority PDA:

- Seeds: `[b"__ika_cpi_authority"]`
- Program id: the caller program id, which is Polet's Solana program id for our integration.

Required flow:

1. Create a dWallet with user authority.
2. Derive Polet's CPI authority PDA from the Polet program id.
3. Current dWallet authority transfers dWallet ownership/authority to that PDA.
4. Polet can then CPI-call `approve_message` only from an approved contract instruction.

The proxy must not be the dWallet authority in the final integration. The owner and agent also must not bypass Polet's guardrails.

## approve_message Surface

Official quick-start CPI call shape:

```rust
ctx.approve_message(
    message_approval,
    dwallet,
    payer,
    system_program,
    message_hash,
    user_pubkey,
    signature_scheme,
    bump,
)?;
```

Observed account/argument meaning:

- `message_approval`: writable MessageApproval PDA to create.
- `dwallet`: dWallet account that will sign.
- `payer`: rent payer for the MessageApproval account.
- `system_program`: Solana system program.
- `message_hash`: 32-byte digest of the message to sign.
- `user_pubkey`: 32-byte user public key used by the signing flow.
- `signature_scheme`: `u16` scheme. Official docs list `EddsaSha512 = 5` for Curve25519/Ed25519 chains such as Solana and Sui, and ECDSA variants for Ethereum/Bitcoin-style targets.
- `bump`: MessageApproval PDA bump.

Official MessageApproval PDA and fields:

- Seeds include `"dwallet"`, dWallet-derived chunks, `"message_approval"`, `scheme_u16_le`, `message_digest`, and optional metadata digest.
- Program id: Ika dWallet program id.
- Fields include dWallet, message digest, metadata digest, approver, user pubkey, signature scheme, epoch, status, signature length, signature bytes, bump, and reserved bytes.
- Status values: `0 = Pending`, `1 = Signed`.
- Signature bytes are readable from the MessageApproval account after the Ika network writes them back.

Polet product statuses should map official status to user-facing states:

- Polet approved and CPI submitted: `message-approval-pending`
- MessageApproval status `1`: `signature-produced-prealpha`
- Policy/session blocked: no Ika approval object and no dWallet signature fields.

## Devnet Smoke Plan

Sui-primary path:

1. Create a fresh Curve25519/Ed25519-compatible dWallet on Ika Solana Pre-Alpha devnet.
2. Transfer dWallet authority to Polet's CPI authority PDA.
3. Build a canonical `polet.bridgeless.order.v1` message for Solana USDC -> Sui SUI, amount `25`.
4. Submit through Polet; expect confidential policy rejection before any Ika account access.
5. Build the same order family for amount `5`.
6. Submit through Polet; expect policy approval and an Ika `approve_message` CPI.
7. Poll/read MessageApproval until status is `Signed` or timeout.
8. Record the signature bytes, MessageApproval account, dWallet account, message hash, signature scheme, and devnet transaction signature.

Ethereum-optional path:

1. Reuse the same authority and policy setup.
2. Build a canonical order for Solana USDC -> Ethereum ETH.
3. Use an ECDSA-compatible signature scheme only if the dWallet curve and official examples support that path in Pre-Alpha.
4. Treat this as optional; do not block the Sui demo on Ethereum support.

Failure states to record in issue 031:

- Ika devnet unavailable or reset.
- gRPC endpoint unavailable.
- Mock signer delayed or unavailable.
- Insufficient SOL/rent or Ika gas deposit.
- Wrong dWallet authority.
- Wrong MessageApproval PDA derivation.
- Stale/revoked/expired Polet session.
- Expired order nonce.

## Pre-Alpha Limitations

This integration is development/testing only:

- Signing uses a single mock signer in Pre-Alpha, not real distributed MPC.
- APIs, account formats, keys, and data formats can change.
- Devnet state may be wiped periodically.
- Do not rely on Pre-Alpha key material until mainnet.
- Polet must not claim production MPC, production privacy, real settlement, or executed bridgeless asset movement from this path.

## Required Repo Corrections

- Replace any old Ika program id references with `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` before implementing issue 027.
- Replace Polet's local MessageApproval PDA derivation with the official Ika SDK/type helpers where possible.
- Derive Polet CPI authority with seed `__ika_cpi_authority` under the Polet program id, not under the Ika program id.
- Update future UI/API wording from "message approved" to a two-stage state: approval submitted/pending, then Pre-Alpha signature produced when MessageApproval status is signed.
