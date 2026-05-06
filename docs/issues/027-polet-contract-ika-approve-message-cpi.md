# Polet Contract Ika approve_message CPI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add the on-chain Polet instruction that enforces the existing session and confidential numeric policy checks, then CPI-calls Ika Pre-Alpha `approve_message` only for approved bridgeless order hashes. Blocked, stale, revoked, expired, or invalid-witness requests must never call Ika.

## Acceptance criteria

- [ ] The contract has an Ika approval instruction that accepts the Polet wallet PDA, session signer, dWallet account, Ika approval accounts, canonical order hash, source amount, expiry, and policy witness.
- [ ] The instruction reuses the existing confidential numeric guardrails: max per run, daily cap, and daily spent mutation.
- [ ] The dWallet authority model uses the Polet CPI authority PDA rather than the owner, proxy, or agent directly.
- [ ] Allowed 5 USDC-equivalent requests CPI-call Ika `approve_message`.
- [ ] Blocked 25 USDC-equivalent requests return a non-leaking policy error and do not CPI-call Ika.
- [ ] Revoked/stale/expired sessions are rejected before Ika account access.
- [ ] Contract tests use a deterministic local/mock Ika program for CI and assert both CPI-called and CPI-not-called paths.
- [ ] Docs state this is Ika Pre-Alpha devnet/mock-signer integration, not production MPC or settlement.

## Blocked by

- `docs/issues/025-official-ika-dwallet-prealpha-alignment.md`
- `docs/issues/026-canonical-bridgeless-order-message.md`

## Architecture notes

This is the core Ika/Encrypt integration slice. Polet must remain the Solana control layer: agent intent in, confidential policy enforced on-chain, Ika dWallet signing approved only after policy pass.

