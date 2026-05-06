# Contract Official Encrypt Verified Ika CPI Lifecycle

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/041-official-encrypt-policy-graph-execution.md`

## What to build

Migrate Polet's on-chain Ika approval path from the masked-witness immediate policy check to an official Encrypt graph lifecycle. This is intentionally a contract-only slice: smart contract work should complete the on-chain boundary and tests first, while backend/frontend vertical handling remains separate.

The contract should no longer allow `approve_ika_message_as_session` to decrypt masked policy values and immediately CPI into Ika. Instead, the Ika path should require an official Encrypt `polet_policy_guardrail_graph` execution, wait for verified output state, and only submit Ika `approve_message` after the verified policy result is allowed. Pending or verified-blocked Encrypt outputs must not emit dWallet approval data or call Ika.

## Acceptance criteria

- [x] The contract exposes a clear Ika policy lifecycle for official Encrypt graph execution before Ika approval, either by splitting submit/consume instructions or by adding an explicit verified-output consume instruction.
- [x] The Ika approval CPI path no longer uses `enforce_confidential_numeric_policy` or `encryption_witness` as the primary policy gate when an official Encrypt ciphertext policy is configured.
- [x] Pending Encrypt graph state cannot call Ika `approve_message`.
- [x] Verified-blocked Encrypt output cannot call Ika `approve_message`, cannot mutate spend as allowed, and returns a safe contract error.
- [x] Verified-allowed Encrypt output can call the mock Ika `approve_message` CPI with the existing canonical Ika message hash, dWallet, MessageApproval, shared approver, expiry, and session checks still enforced.
- [x] Contract tests cover pending, verified-blocked, verified-allowed, stale policy sequence, stale/revoked session, expired order, and shared Ika quorum behavior across the new lifecycle.
- [x] Tests use the official Encrypt mock/test lifecycle where practical (`EncryptTestContext` / `process_pending()`); if the current pre-alpha test harness cannot be wired cleanly, the blocker and smallest next action are documented in this issue.
- [x] No production privacy, production MPC, or real bridgeless settlement claims are added.

## Blocked by

- `docs/issues/041-official-encrypt-policy-graph-execution.md`

## Implementation notes

- Existing contract entry points to inspect first:
  - `contract/programs/contract/src/lib.rs`
  - `contract/programs/contract/src/confidential_policy.rs`
  - `contract/programs/contract/src/encrypt_policy_graph.rs`
  - `contract/programs/contract/tests/ika_approval.rs`
  - `contract/programs/mock_ika/src/lib.rs`
- Existing proxy lifecycle work already distinguishes `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`; this issue is specifically about making the on-chain Ika CPI boundary obey the same lifecycle.
- Do not remove the legacy masked-witness code globally unless the surrounding DCA tests are migrated or explicitly quarantined. The required change is that the official Encrypt-configured Ika path cannot rely on masked-witness approval.

## Completion notes

- Added `approve_ika_message_with_verified_encrypt_as_session` as the explicit verified-output consume instruction for Ika and synced the proxy IDL artifact.
- The consume path checks the pending official Encrypt output accounts, verifies the allowed decryption request against the current allowed-output ciphertext digest, rejects pending output with `EncryptPolicyPending`, rejects verified blocked output with `EncryptPolicyBlocked`, and only then updates the official daily-spent ciphertext pointer and CPI-calls mock Ika.
- The legacy masked-witness `approve_ika_message_as_session` remains for compatibility, but now returns `EncryptPolicyPending` when an official Encrypt ciphertext policy is configured.
- Added deterministic contract tests for pending, verified blocked, verified allowed, stale policy sequence, revoked session, expired order, and shared Ika quorum behavior. These tests use mock ciphertext/decryption request account data rather than `EncryptTestContext/process_pending()` because full official Encrypt account creation/executor wiring remains part of issue 041.
- Verification: `NO_DNA=1 anchor build`, `NO_DNA=1 cargo fmt --check`, `NO_DNA=1 cargo test -p contract --test ika_approval`, and `NO_DNA=1 cargo test` pass in `contract/`; `bun run build` passes in `proxy/`.
