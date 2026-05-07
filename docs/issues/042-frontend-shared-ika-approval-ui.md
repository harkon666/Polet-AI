# Frontend Shared Ika Approval UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a frontend shared-access workflow for Ika approvals. The user should be able to configure an M-of-N shared Ika approval policy, revoke an approver, see whether an Ika request needs co-approval, and understand that the on-chain authority boundary remains Solana signer accounts enforced by Polet.

This is a demo-facing frontend slice over existing proxy/contract capability. It must not expose legacy public policy routes.

## Acceptance criteria

- [x] The frontend can create a shared Ika approver configuration through the proxy and sign the returned owner transaction.
- [x] The frontend can revoke a shared Ika approver and refresh wallet state after confirmation.
- [x] The Ika demo shows `needs-approval` progress with required/received/missing counts before approval data is prepared.
- [x] The approved path clearly shows when quorum is ready and which co-approver public keys are counted without exposing private policy witness data.
- [x] Tests cover configure, revoke, missing quorum, and ready quorum UI states.

## Blocked by

None - can start immediately

## Completion notes

- Added frontend API wrappers for shared Ika approver configure/revoke owner transactions.
- Added a shared Ika approval panel to the command-center demo with threshold, co-approver public-key list, revoke controls, wallet-state hydration, and optional collected co-approval proof JSON for the ready-quorum demo path.
- Ika activity cards now show `needs-approval` progress and counted co-approver public keys without surfacing private policy thresholds or witness bytes.
- Verification: `bun run test src/components/DemoTab.test.tsx` passes in `frontend/` with the existing Vitest/Vite `module is not defined` and shutdown-timeout warnings; `bun run build` passes in `frontend/`.
