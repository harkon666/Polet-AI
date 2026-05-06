# Polet Recovery Model

Polet recovery is an access-rotation path for compromised control-layer wallets. It is not an execution path for funds, Ika settlement, or confidential policy changes.

## Authority Model

Each Polet wallet stores:

- `owner`: the primary Solana wallet authority.
- `recovery_authority`: an owner-configured recovery signer. New wallets default this to the owner.
- `sessions`: temporary agent session keys.
- `shared_ika_approvals`: M-of-N co-approver metadata for guarded Ika approvals.
- `dwallet_controller`: metadata for staged dWallet controller migration.

Only the owner can update `recovery_authority` through `set_recovery_authority`.

Only the owner or the configured `recovery_authority` can call `recover_wallet_access`.

## Recovery Flow

The recovery instruction accepts:

- `compromised_sessions`: session keys to revoke.
- `shared_ika_threshold`: new M-of-N quorum threshold.
- `shared_ika_approvers`: new authorized Ika co-approver keys.
- `pending_dwallet_controller`: the next controller intended for a HITL dWallet migration.

When `recover_wallet_access` succeeds, the contract:

1. Verifies the signer is the owner or configured recovery authority.
2. Marks named compromised sessions as unauthorized.
3. Advances `last_revoked_slot` to invalidate stale session attestations.
4. Replaces shared Ika co-approver metadata and increments `policy_seq`.
5. Stages dWallet controller metadata by setting `pending_controller`, incrementing `rotation_seq`, recording `last_rotated_slot`, and setting `migration_pending = true`.

This means old sessions and old shared-approval challenges cannot continue as if the access model had not changed.

## Proxy Builders

The proxy exposes unsigned transaction builders:

- `POST /wallet/recovery-authority`
- `POST /wallet/recover-access`

Example recovery request:

```json
{
  "owner": "owner_pubkey",
  "authority": "recovery_authority_pubkey",
  "compromisedSessions": ["bad_session_pubkey"],
  "sharedIkaThreshold": 2,
  "sharedIkaApprovers": ["new_approver_a", "new_approver_b"],
  "pendingDwalletController": "new_controller_pubkey"
}
```

The proxy returns an unsigned transaction and redacted activity metadata. The returned activity state can say that sessions were revoked, shared Ika approvers were rotated, and dWallet controller migration was staged, but it must not expose private policy values.

## Privacy Boundary

Recovery does not read, rewrite, or reveal:

- confidential max-per-run,
- confidential daily cap,
- confidential daily spent,
- encryption witness bytes.

Recovery changes only access metadata. Normal Polet guardrails still apply to later DCA or Ika approval attempts.

## dWallet Controller Boundary

The `dwallet_controller` fields are migration metadata:

- `current_controller`
- `pending_controller`
- `rotation_seq`
- `last_rotated_slot`
- `migration_pending`

This slice does not perform a live Ika dWallet authority transfer. A human/operator smoke process must still verify the official Ika authority migration path before treating the pending controller as active.

## Security Notes

- Recovery authority compromise is high impact. Use a hardware wallet, multisig, or institutional recovery key where possible.
- Recovery cannot bypass confidential spend checks or shared Ika quorum checks for future approvals.
- Recovery does not sign, simulate, or broadcast Ika settlement.
- Existing wallet accounts from older deployments may need migration or reinitialization because the wallet account layout changed.

## Tests

Contract tests cover:

- recovery authority revoking compromised sessions,
- owner recovery without a separate recovery authority,
- shared co-approver rotation,
- unauthorized recovery signer rejection.
