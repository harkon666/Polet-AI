# Frontend Demo Command Center Polish

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Turn the frontend into a single demo command center for the hackathon flow. The page should organize wallet setup, policy setup, agent authorization, Jupiter DCA, Ika Sui/Ethereum routes, shared approval, recovery, route-risk controls, and optional broadcast into a coherent operational workflow with safe disabled states and transaction summaries.

No legacy public policy routes should be exposed in the primary UI.

## Acceptance criteria

- [ ] The primary frontend flow has no visible legacy public policy route, template, or plaintext policy workflow.
- [ ] Every owner-signed or session-signed action shows a clear transaction summary before wallet signing.
- [ ] The demo checklist covers setup, shared access, recovery readiness, Jupiter allow/block, Ika Sui approve, optional Ethereum route, route-risk block, and safe log review.
- [ ] Mobile and desktop layouts remain readable without overlapping text or controls.
- [ ] Frontend unit tests and Playwright E2E cover the final command-center flow.
- [ ] README/demo script screenshots or instructions match the final frontend flow.

## Blocked by

- `docs/issues/042-frontend-shared-ika-approval-ui.md`
- `docs/issues/043-frontend-recovery-authority-ui.md`
- `docs/issues/044-frontend-passkey-coapproval-demo-ui.md`
- `docs/issues/045-frontend-ika-destination-broadcast-ui.md`
- `docs/issues/046-frontend-ethereum-ika-optional-route-ui.md`
- `docs/issues/047-frontend-route-risk-guardrail-controls.md`
- `docs/issues/048-frontend-official-encrypt-status-surface.md`

