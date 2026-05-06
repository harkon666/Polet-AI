# Frontend Passkey Coapproval Demo UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a frontend passkey co-approval prototype panel for shared Ika approvals. The panel should request a proxy challenge, run a WebAuthn-style browser assertion when available, verify the assertion through the proxy, and attach the resulting proof to the Ika demo request as a UX helper.

The UI must state the boundary clearly: passkeys improve co-approval UX only; Solana owner/session/co-approver signatures and Polet on-chain checks remain the authority boundary.

## Acceptance criteria

- [ ] The frontend can request a passkey co-approval challenge for an Ika shared approval.
- [ ] The frontend can verify a browser assertion through the proxy when WebAuthn APIs are available.
- [ ] The frontend shows a deterministic fallback/demo state when browser passkey support is unavailable.
- [ ] The resulting proof can be attached to the shared-access Ika request payload.
- [ ] The UI copy does not claim passkeys control wallet funds, dWallet authority, or Polet policy enforcement by themselves.
- [ ] Tests cover challenge request, verification success, unavailable WebAuthn, and expired/rejected assertion states.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`

