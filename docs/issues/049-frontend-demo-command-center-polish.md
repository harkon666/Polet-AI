# Frontend Demo Command Center Polish

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Turn the frontend into a single demo command center for the hackathon flow. The page should organize wallet setup, policy setup, agent authorization, Jupiter DCA, Ika Sui/Ethereum routes, shared approval, recovery, route-risk controls, and optional broadcast into a coherent operational workflow with safe disabled states and transaction summaries.

No legacy public policy routes should be exposed in the primary UI.

## Acceptance criteria

- [x] The primary frontend flow has no visible legacy public policy route, template, or plaintext policy workflow.
- [x] Every owner-signed setup/recovery/shared-approval action shows a transaction summary before wallet signing.
- [x] The demo checklist covers setup, shared access, recovery readiness, Jupiter allow/block, Ika Sui approve, optional Ethereum route, route-risk block, and safe log review.
- [x] Mobile and desktop layouts remain readable without overlapping text or controls.
- [x] Frontend unit tests cover the final command-center flow.
- [x] README/demo script instructions already describe the final command-center flow and no new screenshot asset was needed.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`
- `docs/issues/043-frontend-recovery-authority-ui.md`
- `docs/issues/044-frontend-passkey-coapproval-demo-ui.md`
- `docs/issues/045-frontend-ika-destination-broadcast-ui.md`
- `docs/issues/046-frontend-ethereum-ika-optional-route-ui.md`
- `docs/issues/047-frontend-route-risk-guardrail-controls.md`
- `docs/issues/048-frontend-official-encrypt-status-surface.md`

## Completion notes

- Consolidated the command-center checklist so it now tracks shared Ika approval, recovery authority, Sui Ika approval, optional Ethereum Ika approval, route-risk block verification, Jupiter allow/block, and safe log review.
- Added localized transaction confirmation summaries before owner-signed custody, confidential policy, shared approver configure/revoke, recovery authority, and recovery-access transactions.
- Kept policy values redacted after save and kept legacy public policy routes out of the primary UI.
- Added route-risk block test coverage and tightened existing tests around the confirmation modal flow.

## Verification

- `cd frontend && bun run test src/components/DemoTab.test.tsx` — passed with 14 tests. Vitest still prints the existing `ReferenceError: module is not defined` and close-timeout warnings, but exits 0.
- `cd frontend && bun run build` — passed.
