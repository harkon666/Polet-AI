# Official Ika dWallet Pre-Alpha Alignment

Labels: `done`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Verify the official Ika Solana Pre-Alpha integration surface before implementation so Polet can move from an Ika-shaped request envelope to a real dWallet approval path. This issue should pin the current devnet program id, IDL/API, dWallet creation/import flow, authority transfer flow, `approve_message` CPI accounts, `MessageApproval` read path, and pre-alpha limitations.

## Acceptance criteria

- [x] The official Ika Solana Pre-Alpha program id, docs URL, repo/SDK references, and version/date checked are recorded.
- [x] The team documents how to create or import a dWallet for the demo.
- [x] The team documents how dWallet authority is transferred to the Polet CPI authority PDA.
- [x] The `approve_message` account list, instruction args, signer requirements, and MessageApproval output are documented.
- [x] A devnet smoke plan exists for Sui-primary and Ethereum-optional destination messages.
- [x] README/demo wording is corrected if any current Ika program id, account derivation, or status names differ from the official docs.
- [x] The issue explicitly states Ika Pre-Alpha uses devnet/mock-signer constraints and does not provide production MPC or settlement.

## Blocked by

None - can start immediately.

## Architecture notes

This is intentionally HITL because the official Pre-Alpha surface can change and because the team must validate docs and devnet behavior before locking contract account layouts. The output should be a short integration memo linked from later implementation issues.

## Completion notes

- Added `docs/ika-dwallet-prealpha-alignment.md`.
- Pinned the official Solana Pre-Alpha devnet program id: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`.
- Recorded official CPI authority seed `__ika_cpi_authority`, `approve_message` call shape, MessageApproval status/read fields, Sui-primary smoke plan, Ethereum-optional smoke plan, and Pre-Alpha/mock-signer limitations.
- Updated README, demo script, and agent runtime wording so current local Ika metadata is not described as verified production MPC or settlement.
