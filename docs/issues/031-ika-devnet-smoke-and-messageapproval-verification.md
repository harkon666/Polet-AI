# Ika Devnet Smoke and MessageApproval Verification

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Add a manual devnet smoke path that proves Polet can work with the official Ika Solana Pre-Alpha flow when the external devnet is available. The runbook should create or import a dWallet, transfer authority to the Polet CPI authority PDA, submit an approved Sui order, and verify the MessageApproval/signature result.

## Acceptance criteria

- [x] A runbook documents all required devnet accounts, faucet needs, and environment variables.
- [x] The runbook covers dWallet creation/import and authority transfer to Polet's CPI authority PDA.
- [x] A 25 USDC-equivalent request is shown blocked before Ika approval.
- [x] A 5 USDC-equivalent Sui request is shown approved through Polet and Ika Pre-Alpha.
- [x] The team can fetch and inspect MessageApproval or equivalent signature proof when Ika devnet is available.
- [x] Failure states are documented: Ika devnet unavailable, mock signer unavailable, insufficient funds, wrong authority, stale session, and expired order.
- [x] The runbook states that CI remains mocked/local and devnet smoke is optional/manual.

## Blocked by

- `docs/issues/029-agent-sdk-ika-sui-signed-intent.md`

## Architecture notes

This is HITL because it depends on external Pre-Alpha devnet availability and credentials/faucets. It should not block deterministic local tests.

## Implementation notes

- Added the manual smoke runbook at `docs/ika-devnet-smoke-runbook.md`.
- The runbook documents devnet accounts, faucet requirements, environment variables, dWallet DKG/import boundary, authority transfer to Polet's `__ika_cpi_authority` PDA, the 25 USDC blocked path, the 5 USDC Sui approval path, MessageApproval inspection, evidence capture, failure states, and CI/manual boundaries.
- No live devnet transaction was signed or broadcast during implementation. Operators must simulate and review the unsigned Polet approval transaction before the session signer signs it.
