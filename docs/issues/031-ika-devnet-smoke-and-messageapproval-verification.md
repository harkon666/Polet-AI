# Ika Devnet Smoke and MessageApproval Verification

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Add a manual devnet smoke path that proves Polet can work with the official Ika Solana Pre-Alpha flow when the external devnet is available. The runbook should create or import a dWallet, transfer authority to the Polet CPI authority PDA, submit an approved Sui order, and verify the MessageApproval/signature result.

## Acceptance criteria

- [ ] A runbook documents all required devnet accounts, faucet needs, and environment variables.
- [ ] The runbook covers dWallet creation/import and authority transfer to Polet's CPI authority PDA.
- [ ] A 25 USDC-equivalent request is shown blocked before Ika approval.
- [ ] A 5 USDC-equivalent Sui request is shown approved through Polet and Ika Pre-Alpha.
- [ ] The team can fetch and inspect MessageApproval or equivalent signature proof when Ika devnet is available.
- [ ] Failure states are documented: Ika devnet unavailable, mock signer unavailable, insufficient funds, wrong authority, stale session, and expired order.
- [ ] The runbook states that CI remains mocked/local and devnet smoke is optional/manual.

## Blocked by

- `docs/issues/029-agent-sdk-ika-sui-signed-intent.md`

## Architecture notes

This is HITL because it depends on external Pre-Alpha devnet availability and credentials/faucets. It should not block deterministic local tests.

