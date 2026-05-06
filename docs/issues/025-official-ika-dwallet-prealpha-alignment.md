# Official Ika dWallet Pre-Alpha Alignment

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Verify the official Ika Solana Pre-Alpha integration surface before implementation so Polet can move from an Ika-shaped request envelope to a real dWallet approval path. This issue should pin the current devnet program id, IDL/API, dWallet creation/import flow, authority transfer flow, `approve_message` CPI accounts, `MessageApproval` read path, and pre-alpha limitations.

## Acceptance criteria

- [ ] The official Ika Solana Pre-Alpha program id, docs URL, repo/SDK references, and version/date checked are recorded.
- [ ] The team documents how to create or import a dWallet for the demo.
- [ ] The team documents how dWallet authority is transferred to the Polet CPI authority PDA.
- [ ] The `approve_message` account list, instruction args, signer requirements, and MessageApproval output are documented.
- [ ] A devnet smoke plan exists for Sui-primary and Ethereum-optional destination messages.
- [ ] README/demo wording is corrected if any current Ika program id, account derivation, or status names differ from the official docs.
- [ ] The issue explicitly states Ika Pre-Alpha uses devnet/mock-signer constraints and does not provide production MPC or settlement.

## Blocked by

None - can start immediately.

## Architecture notes

This is intentionally HITL because the official Pre-Alpha surface can change and because the team must validate docs and devnet behavior before locking contract account layouts. The output should be a short integration memo linked from later implementation issues.

