# Frontend Official Encrypt Ika Lifecycle Command Center

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Status

Re-scoped. Existing frontend lifecycle cards are useful, but they currently prove UI handling of normalized statuses more than real official Encrypt integration. This issue should start after `059` defines the live official state shape.

## What to build

Expose official Encrypt devnet lifecycle in the command center using real ciphertext/graph state from Polet:

- policy ciphertext account ids,
- source amount ciphertext id,
- graph execution status,
- pending allowed output ciphertext id,
- pending daily-spent output ciphertext id,
- verified blocked,
- verified allowed,
- Ika approval preparation after verified allowed,
- signer-required transaction summary.

The UI must remain an operational command center, not a landing page.

## Acceptance Criteria

- [ ] Frontend can display official Encrypt policy setup state using ciphertext account ids, not witness bytes.
- [ ] Frontend can trigger or display graph execution pending state from real pending output ciphertext ids.
- [ ] Pending state hides dWallet, MessageApproval, destination digest, unsigned approval transaction, thresholds, caps, and witness bytes.
- [ ] Verified blocked state hides all execution/approval artifacts.
- [ ] Verified allowed state shows safe artifacts required to inspect Polet/Ika approval preparation.
- [ ] Quorum-required after verified allowed still shows progress only and no Ika approval transaction.
- [ ] Component tests cover official state rendering and redaction.
- [ ] Build passes.

## Blocked By

- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`
- `docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md`

## Existing Related Work

- `frontend/src/components/DemoTab.tsx`
- `frontend/src/components/ActivityCard.tsx`
- `frontend/src/components/DemoTab.test.tsx`
- `frontend/src/components/activity-log.ts`
- `frontend/src/lib/api.ts`

## Notes

Prior UI work for `pending-encrypt-execution`, `encrypt-verified-blocked`, `encrypt-verified-allowed`, and quorum states should be reused. Do not claim production privacy.
