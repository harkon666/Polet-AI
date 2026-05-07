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

- [x] Frontend can display official Encrypt policy setup state using ciphertext account ids, not witness bytes.
- [x] Frontend can trigger or display graph execution pending state from real pending output ciphertext ids.
- [x] Pending state hides dWallet, MessageApproval, destination digest, unsigned approval transaction, thresholds, caps, and witness bytes.
- [x] Verified blocked state hides all execution/approval artifacts.
- [x] Verified allowed state shows safe artifacts required to inspect Polet/Ika approval preparation.
- [x] Quorum-required after verified allowed still shows progress only and no Ika approval transaction.
- [x] Component tests cover official state rendering and redaction.
- [x] Build passes.

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

## Progress - 2026-05-07

Implemented official Encrypt lifecycle surface in the command center:

**api.ts:**
- Extended `OfficialEncryptPolicyPreview` with `encryptProgram`, `grpcEndpoint`, `inputCiphertexts` (sourceAmount, maxPerRun, dailySpent, dailyCap), `pendingOutputCiphertexts` (allowedOutput, dailySpentOutput), `suppressedUntilVerified`

**ActivityCard.tsx:**
- Enhanced `EncryptPolicyStatusCard` with ciphertext IDs (short-truncated), encrypt program, gRPC endpoint
- Pending state: shows "Suppressed until verified" list
- Blocked state: shows red "All execution artifacts suppressed" banner
- Allowed state: shows green "Ika approval preparation available" banner

**i18n.ts:**
- Added 7 new labels (id + en) for Encrypt lifecycle fields

**Tests (DemoTab.test.tsx):**
- "official Encrypt policy state displays ciphertext ids and suppresses pending artifacts"
- "official Encrypt verified-allowed state shows safe Ika approval preparation"
- "official Encrypt verified-blocked state suppresses all artifacts"
- All 49 tests pass, build clean

**Issue #054 cleanup:**
- Tagged legacy `encryptionWitnessHash` references as masked-witness dev fixture
- Archived unused hero components
