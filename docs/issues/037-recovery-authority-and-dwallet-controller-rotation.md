# Recovery Authority and dWallet Controller Rotation

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Design and implement a recovery path for Polet control-layer wallets that can rotate session keys, co-approvers, and dWallet controller metadata without allowing bypass of confidential guardrails.

## Acceptance criteria

- [x] A recovery threat model is documented before implementation.
- [x] Recovery can revoke compromised sessions and rotate shared access metadata.
- [x] Recovery can support a dWallet authority/controller migration plan when safe.
- [x] Recovery actions emit clear frontend/activity states without exposing private policy values.
- [x] Tests cover compromised session revocation, owner recovery, co-approver rotation, and blocked unauthorized recovery.

## Blocked by

- `docs/issues/035-shared-access-and-multisig-lite-ika-approvals.md`

## Architecture notes

This issue is HITL because recovery can become a bypass if the authority model is not crisp.

## Recovery threat model

Recovery is allowed to change access metadata, not confidential policy values or guarded execution outcomes.

Threats covered in this slice:

- Compromised session key: recovery revokes named sessions and advances the global session revocation slot so stale session attestations cannot be reused.
- Compromised or stale co-approver set: recovery replaces the shared Ika quorum metadata and increments `policy_seq`, forcing new approvals to bind to the rotated policy sequence.
- dWallet controller migration: recovery stages a pending dWallet controller and rotation sequence for a human/operator migration plan. It does not execute Ika settlement, transfer assets, or bypass Polet policy checks.
- Unauthorized recovery signer: only the wallet owner or configured recovery authority can call the recovery instruction.
- Privacy leakage: recovery outputs disclose session/co-approver/controller metadata only. They do not expose max-per-run, daily cap, daily spent, or the policy witness.

Non-goals and remaining risks:

- This slice does not prove a live Ika dWallet authority transfer. It records the pending controller metadata that a separate HITL smoke process can use.
- Recovery authority compromise is still high impact. Users should use a hardware wallet, multisig, or institutional recovery key for the recovery authority.
- Existing initialized wallet accounts from older deployments may need migration/reinitialization because the wallet account layout grew.

## Implementation notes

- Added `recovery_authority` and `dwallet_controller` metadata to the wallet account.
- Added owner-only `set_recovery_authority`.
- Added `recover_wallet_access`, callable by owner or recovery authority, to revoke compromised sessions, advance the global revocation slot, rotate shared Ika approvers, and stage a pending dWallet controller.
- Added proxy builders for `/wallet/recovery-authority` and `/wallet/recover-access` with activity states that redact confidential policy values.
- Added contract tests for recovery authority execution, owner recovery, co-approver rotation, and unauthorized recovery blocking.
