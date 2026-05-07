# Frontend Passkey Coapproval Demo UI

Labels: `done`

Type: `frontend`

## Parent

`docs/prd.md`

## What was built

Added a frontend passkey co-approval prototype panel for shared Ika approvals. The panel requests a proxy challenge, runs a WebAuthn-style browser assertion when available, verifies the assertion through the proxy, and attaches the resulting proof to the Ika demo request as a UX helper.

The UI clearly states the boundary: passkeys improve co-approval UX only; Solana owner/session/co-approver signatures and Polet on-chain checks remain the authority boundary.

## Acceptance criteria

- [x] The frontend can request a passkey co-approval challenge for an Ika shared approval.
- [x] The frontend can verify a browser assertion through the proxy when WebAuthn APIs are available.
- [x] The frontend shows a deterministic fallback/demo state when browser passkey support is unavailable.
- [x] The resulting proof can be attached to the shared-access Ika request payload.
- [x] The UI copy does not claim passkeys control wallet funds, dWallet authority, or Polet policy enforcement by themselves.
- [x] Tests cover challenge request, verification success, unavailable WebAuthn, and expired/rejected assertion states.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`

## Implementation notes

- WebAuthn availability is checked at browser runtime; unavailable API shows fallback message.
- Passkeys do not directly control wallet funds, dWallet authority, or Polet policy enforcement.

