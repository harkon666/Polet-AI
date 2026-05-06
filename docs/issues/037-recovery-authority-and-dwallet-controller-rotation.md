# Recovery Authority and dWallet Controller Rotation

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Design and implement a recovery path for Polet control-layer wallets that can rotate session keys, co-approvers, and dWallet controller metadata without allowing bypass of confidential guardrails.

## Acceptance criteria

- [ ] A recovery threat model is documented before implementation.
- [ ] Recovery can revoke compromised sessions and rotate shared access metadata.
- [ ] Recovery can support a dWallet authority/controller migration plan when safe.
- [ ] Recovery actions emit clear frontend/activity states without exposing private policy values.
- [ ] Tests cover compromised session revocation, owner recovery, co-approver rotation, and blocked unauthorized recovery.

## Blocked by

- `docs/issues/035-shared-access-and-multisig-lite-ika-approvals.md`

## Architecture notes

This issue is HITL because recovery can become a bypass if the authority model is not crisp.

