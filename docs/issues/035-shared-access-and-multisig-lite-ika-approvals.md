# Shared Access and Multisig-Lite Ika Approvals

Labels: `in-progress`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add demo-visible shared access and multisig-lite controls for Ika signing approvals. High-risk or over-threshold Ika intents should require M-of-N Polet approvals before the contract can approve the dWallet message.

## Acceptance criteria

- [ ] Wallet owners can register co-approvers or shared access keys for the Polet wallet.
- [x] The policy model supports a threshold that requires multiple approvals for selected Ika intents.
- [ ] The contract blocks Ika `approve_message` until quorum is met.
- [x] UI shows approval progress such as `1/2` and `2/2 ready` without leaking private policy thresholds.
- [x] SDK/proxy expose a structured `needs-approval` or equivalent state for agent runtimes.
- [x] Tests cover below-threshold solo approvals, above-threshold quorum, missing approval block, revocation, and non-leaking responses.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`

## Implemented slice

- Added an off-chain multisig-lite `sharedAccess` intent policy for Ika requests with mode `ika-approval-quorum`, M-of-N approvers, and optional `ethereum-only` scope.
- Added deterministic `polet.ika.shared-approval.v1` challenge construction over request id, owner, session key, canonical order hash, destination digest, target, amount base units, policy sequence, nonce, and expiry.
- Proxy verifies Ed25519 co-approver signatures with registered Solana public keys before creating `preAlphaSigning` or `poletApprovalTransaction`.
- Missing quorum returns `allowed: false`, `status: "needs-approval"`, `code: "IKA_APPROVAL_QUORUM_REQUIRED"`, and progress fields such as `1/2` without exposing confidential numeric thresholds or Ika approval proof data.
- SDK high-level Ika trades pass `sharedAccess` through and normalize `needs-approval` into agent-readable results.
- Frontend activity cards can render shared approval progress when the proxy returns a needs-approval response.

## Remaining work

- Persist co-approvers/shared access metadata on the Polet wallet instead of requiring the policy in each intent.
- Add a contract instruction/account path that verifies or consumes quorum state before `approve_ika_message_as_session` can CPI-call Ika.
- Add owner-signed co-approver registration/revocation transactions and frontend setup controls.

## Verification

- `bun test` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
- `bun test` passes in `sdk/`.
- `bun run build` passes in `sdk/`.
- `bun run test src/components/DemoTab.test.tsx` passes in `frontend/`, with a Vitest/Vite shutdown warning after tests complete.
- `bun run build` passes in `frontend/`.
