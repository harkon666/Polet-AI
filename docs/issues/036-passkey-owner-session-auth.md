# Passkey Owner and Session Auth

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Explore and prototype a passkey-based owner/session authentication layer for Polet so the control-layer wallet can move toward web2-style UX without weakening the Solana/Ika security boundary.

## Acceptance criteria

- [ ] The team chooses whether passkeys are used for owner login, session key creation, co-approval, or all of the above.
- [ ] The threat model explains what a passkey can and cannot authorize.
- [ ] A prototype demonstrates passkey-backed session creation or co-approval without replacing on-chain policy checks.
- [ ] Docs explain the relationship between passkeys, Solana signatures, Polet session keys, and Ika dWallet authority.
- [ ] Tests or manual steps verify recovery/failure cases for unavailable passkeys.

## Blocked by

- `docs/issues/035-shared-access-and-multisig-lite-ika-approvals.md`

## Architecture notes

This is HITL because passkeys affect product security and UX. Do not make passkeys the critical path for the Ika/Encrypt MVP.

