# Shared Access and Multisig-Lite Ika Approvals

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add demo-visible shared access and multisig-lite controls for Ika signing approvals. High-risk or over-threshold Ika intents should require M-of-N Polet approvals before the contract can approve the dWallet message.

## Acceptance criteria

- [x] Wallet owners can register co-approvers or shared access keys for the Polet wallet.
- [x] The policy model supports a threshold that requires multiple approvals for selected Ika intents.
- [x] The contract blocks Ika `approve_message` until quorum is met.
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
- The contract wallet state now persists shared Ika approvers plus a threshold, owner instructions can configure or revoke approvers, and `approve_ika_message_as_session` requires enough authorized co-approver signer remaining accounts before confidential spend mutation or Ika CPI.
- The proxy IDL/wallet store are synced to the shared Ika approval state, `/wallet/shared-ika-approvers` and `/wallet/shared-ika-approvers/revoke` build owner-signed setup transactions, and approved Ika transactions include verified co-approvers as required transaction signers.

## Notes

- Contract quorum enforcement uses Solana signer remaining accounts for the on-chain approval boundary. The off-chain proxy/SDK challenge signatures remain the agent-runtime collection flow and are mapped into required transaction signers when the approval transaction is prepared.
- Dedicated frontend setup controls can still be polished later, but the current demo can show approval progress and the proxy exposes owner-signed registration/revocation transactions.

## Verification

- `bun test` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
- `bun test` passes in `sdk/`.
- `bun run build` passes in `sdk/`.
- `bun run test src/components/DemoTab.test.tsx` passes in `frontend/`, with a Vitest/Vite shutdown warning after tests complete.
- `bun run build` passes in `frontend/`.
- `NO_DNA=1 cargo build-sbf` passes in `contract/`.
- `NO_DNA=1 cargo test` passes in `contract/`.
