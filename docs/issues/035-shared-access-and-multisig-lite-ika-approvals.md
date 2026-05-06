# Shared Access and Multisig-Lite Ika Approvals

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add demo-visible shared access and multisig-lite controls for Ika signing approvals. High-risk or over-threshold Ika intents should require M-of-N Polet approvals before the contract can approve the dWallet message.

## Acceptance criteria

- [ ] Wallet owners can register co-approvers or shared access keys for the Polet wallet.
- [ ] The policy model supports a threshold that requires multiple approvals for selected Ika intents.
- [ ] The contract blocks Ika `approve_message` until quorum is met.
- [ ] UI shows approval progress such as `1/2` and `2/2 ready` without leaking private policy thresholds.
- [ ] SDK/proxy expose a structured `needs-approval` or equivalent state for agent runtimes.
- [ ] Tests cover below-threshold solo approvals, above-threshold quorum, missing approval block, revocation, and non-leaking responses.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`

