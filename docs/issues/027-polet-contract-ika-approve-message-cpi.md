# Polet Contract Ika approve_message CPI

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add the on-chain Polet instruction that enforces the existing session and confidential numeric policy checks, then CPI-calls Ika Pre-Alpha `approve_message` only for approved bridgeless order hashes. Blocked, stale, revoked, expired, or invalid-witness requests must never call Ika.

## Acceptance criteria

- [x] The contract has an Ika approval instruction that accepts the Polet wallet PDA, session signer, dWallet account, Ika approval accounts, canonical order hash, source amount, expiry, and policy witness.
- [x] The instruction reuses the existing confidential numeric guardrails: max per run, daily cap, and daily spent mutation.
- [x] The dWallet authority model uses the Polet CPI authority PDA rather than the owner, proxy, or agent directly.
- [x] Allowed 5 USDC-equivalent requests CPI-call Ika `approve_message`.
- [x] Blocked 25 USDC-equivalent requests return a non-leaking policy error and do not CPI-call Ika.
- [x] Revoked/stale/expired sessions are rejected before Ika account access.
- [x] Contract tests use a deterministic local/mock Ika program for CI and assert both CPI-called and CPI-not-called paths.
- [x] Docs state this is Ika Pre-Alpha devnet/mock-signer integration, not production MPC or settlement.

## Blocked by

- `docs/issues/025-official-ika-dwallet-prealpha-alignment.md`
- `docs/issues/026-canonical-bridgeless-order-message.md`

## Architecture notes

This is the core Ika/Encrypt integration slice. Polet must remain the Solana control layer: agent intent in, confidential policy enforced on-chain, Ika dWallet signing approved only after policy pass.

## Completion notes

- Added `approve_ika_message_as_session` to the single Polet contract. The instruction validates the session, attestation slot/policy sequence, bridgeless order expiry, confidential numeric policy witness, max-per-run, and daily cap before performing any Ika CPI.
- Added the Polet CPI authority PDA seed `__ika_cpi_authority`; the CPI signs with this PDA instead of owner, proxy, or agent authority.
- Added a deterministic `mock_ika` Anchor test program for CI. The mock records `approve_message` calls into a MessageApproval-like account so tests can assert CPI-called and CPI-not-called paths.
- Synced the proxy IDL with the new contract ABI.
- Verification: `NO_DNA=1 cargo fmt --check`, `NO_DNA=1 anchor build`, and `NO_DNA=1 cargo test` pass in `contract/`; `bun test` and `bun run build` pass in `proxy/`.
- Boundary: this is wired to a local/mock Ika program in CI. Issue 031 owns live Ika devnet smoke verification against the official Pre-Alpha program and MessageApproval read path. This is not production MPC or settlement.
