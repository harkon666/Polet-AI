# Passkey Owner and Session Auth

Labels: `done`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Explore and prototype a passkey-based owner/session authentication layer for Polet so the control-layer wallet can move toward web2-style UX without weakening the Solana/Ika security boundary.

## Acceptance criteria

- [x] The team chooses whether passkeys are used for owner login, session key creation, co-approval, or all of the above.
- [x] The threat model explains what a passkey can and cannot authorize.
- [x] A prototype demonstrates passkey-backed session creation or co-approval without replacing on-chain policy checks.
- [x] Docs explain the relationship between passkeys, Solana signatures, Polet session keys, and Ika dWallet authority.
- [x] Tests or manual steps verify recovery/failure cases for unavailable passkeys.

## Blocked by

- `docs/issues/035-shared-access-and-multisig-lite-ika-approvals.md`

## Architecture notes

This is HITL because passkeys affect product security and UX. Do not make passkeys the critical path for the Ika/Encrypt MVP.

## Implemented slice

- Chose passkeys for shared Ika co-approval UX only, not owner login, not session-key creation, and not Ika dWallet authority.
- Added `docs/passkey-coapproval-prototype.md` with the threat model, passkey/Solana/Ika boundary, API shape, and recovery/failure checks.
- Added proxy WebAuthn-style challenge and verification helpers for passkey co-approval receipts.
- Added `POST /passkey/coapproval/challenge` and `POST /passkey/coapproval/verify` prototype routes.
- Verification checks origin, rpId hash, challenge binding, user presence, optional user verification, and P-256 assertion signature.
- Successful receipts explicitly warn that Polet still requires Solana owner/session/co-approver signatures and on-chain policy checks.

## Verification

- `bun test ./tests/passkey-coapproval.test.ts` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
