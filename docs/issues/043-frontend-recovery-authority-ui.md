# Frontend Recovery Authority UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a frontend recovery workflow for owner-configured recovery authority. The user should be able to set a recovery authority, run a recovery action that revokes compromised sessions, rotate shared Ika approver metadata, and stage dWallet controller migration metadata while preserving the confidential policy boundary.

This should be presented as an operational safety workflow, not as a marketing page.

## Acceptance criteria

- [ ] The frontend can set a recovery authority through the proxy and sign the returned owner transaction.
- [ ] The frontend can build and sign a recover-access transaction using the owner or configured recovery authority.
- [ ] The UI supports selecting compromised session public keys from current wallet state.
- [ ] The UI supports entering replacement shared Ika approvers and a pending dWallet controller.
- [ ] Activity logs explain recovery actions without leaking confidential numeric policy values.
- [ ] Tests cover successful setup, recovery transaction preparation, invalid/missing inputs, and post-recovery state display.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`

