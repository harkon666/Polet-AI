# Frontend Recovery Authority UI

Labels: `done`

Type: `frontend`

## Parent

`docs/prd.md`

## What was built

Added a frontend recovery workflow for owner-configured recovery authority. The user can set a recovery authority, run a recovery action that revokes compromised sessions, rotate shared Ika approver metadata, and stage dWallet controller migration metadata while preserving the confidential policy boundary.

Presented as an operational safety workflow, not a marketing page.

## Acceptance criteria

- [x] The frontend can set a recovery authority through the proxy and sign the returned owner transaction.
- [x] The frontend can build and sign a recover-access transaction using the owner or configured recovery authority.
- [x] The UI supports selecting compromised session public keys from current wallet state.
- [x] The UI supports entering replacement shared Ika approvers and a pending dWallet controller.
- [x] Activity logs explain recovery actions without leaking confidential numeric policy values.
- [x] Tests cover successful setup, recovery transaction preparation, invalid/missing inputs, and post-recovery state display.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`

## Implementation notes

- Recovery authority must be set before recover-access can be used.
- Recovery stages dWallet controller metadata only; does not bypass Polet policy checks or execute Ika settlement.
- Recovery does not alter private policy values.

