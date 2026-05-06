# Frontend Shared Ika Approval UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a frontend shared-access workflow for Ika approvals. The user should be able to configure an M-of-N shared Ika approval policy, revoke an approver, see whether an Ika request needs co-approval, and understand that the on-chain authority boundary remains Solana signer accounts enforced by Polet.

This is a demo-facing frontend slice over existing proxy/contract capability. It must not expose legacy public policy routes.

## Acceptance criteria

- [ ] The frontend can create a shared Ika approver configuration through the proxy and sign the returned owner transaction.
- [ ] The frontend can revoke a shared Ika approver and refresh wallet state after confirmation.
- [ ] The Ika demo shows `needs-approval` progress with required/received/missing counts before approval data is prepared.
- [ ] The approved path clearly shows when quorum is ready and which co-approver public keys are counted without exposing private policy witness data.
- [ ] Tests cover configure, revoke, missing quorum, and ready quorum UI states.

## Blocked by

None - can start immediately

