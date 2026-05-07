# Frontend Ika Encrypt Lifecycle Command Center

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Expose the official Encrypt Ika lifecycle as a complete command-center vertical slice in the frontend. A judge should be able to trigger or view pending, verified blocked, verified allowed, quorum required, and quorum satisfied states without seeing witness bytes, private thresholds, remaining cap values, dWallet approval data before approval, or unsigned transactions before quorum is satisfied.

This slice should keep the app operational and compact. Do not turn the frontend into a landing page.

## Acceptance criteria

- [ ] Frontend renders `pending-encrypt-execution` for Ika with no dWallet, MessageApproval, destination digest, unsigned approval transaction, witness bytes, private thresholds, or remaining cap.
- [ ] Frontend renders `encrypt-verified-blocked` for Ika with no approval artifacts or private policy data.
- [ ] Frontend renders `encrypt-verified-allowed` for Ika with safe canonical order hash, Ika message hash, dWallet account, MessageApproval PDA, CPI authority PDA, destination digest metadata, and unsigned Polet approval transaction signer summary.
- [ ] Frontend renders `IKA_APPROVAL_QUORUM_REQUIRED` after verified allowed as progress counts only, with no Ika approval artifacts or unsigned transaction.
- [ ] Frontend renders quorum-satisfied Ika as `approval-transaction-prepared` and keeps settlement labeled `not-executed`.
- [ ] Component tests cover all five states and assert no `encryptionWitness`, static witness array, private max-per-run, daily cap, decrypted remaining cap, or premature approval artifact appears.
- [ ] Build passes.

## Blocked by

- `docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md`
- `docs/issues/055-official-encrypt-no-witness-manual-e2e-readiness.md`

## Implementation notes

- Existing files to inspect first:
  - `frontend/src/components/DemoTab.tsx`
  - `frontend/src/components/ActivityCard.tsx`
  - `frontend/src/components/DemoTab.test.tsx`
  - `frontend/src/components/activity-log.ts`
  - `frontend/src/lib/api.ts`
- Preserve the command-center feel and current localized copy style.
