# Contract Official Encrypt Verified Ika CPI Lifecycle

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/041-official-encrypt-policy-graph-execution.md`

## What to build

Migrate Polet's on-chain Ika approval path from the masked-witness immediate policy check to an official Encrypt graph lifecycle. This is intentionally a contract-only slice: smart contract work should complete the on-chain boundary and tests first, while backend/frontend vertical handling remains separate.

The contract should no longer allow `approve_ika_message_as_session` to decrypt masked policy values and immediately CPI into Ika. Instead, the Ika path should require an official Encrypt `polet_policy_guardrail_graph` execution, wait for verified output state, and only submit Ika `approve_message` after the verified policy result is allowed. Pending or verified-blocked Encrypt outputs must not emit dWallet approval data or call Ika.

## Acceptance criteria

- [ ] The contract exposes a clear Ika policy lifecycle for official Encrypt graph execution before Ika approval, either by splitting submit/consume instructions or by adding an explicit verified-output consume instruction.
- [ ] The Ika approval CPI path no longer uses `enforce_confidential_numeric_policy` or `encryption_witness` as the primary policy gate when an official Encrypt ciphertext policy is configured.
- [ ] Pending Encrypt graph state cannot call Ika `approve_message`.
- [ ] Verified-blocked Encrypt output cannot call Ika `approve_message`, cannot mutate spend as allowed, and returns a safe contract error.
- [ ] Verified-allowed Encrypt output can call the mock Ika `approve_message` CPI with the existing canonical Ika message hash, dWallet, MessageApproval, shared approver, expiry, and session checks still enforced.
- [ ] Contract tests cover pending, verified-blocked, verified-allowed, stale policy sequence, stale/revoked session, expired order, and shared Ika quorum behavior across the new lifecycle.
- [ ] Tests use the official Encrypt mock/test lifecycle where practical (`EncryptTestContext` / `process_pending()`); if the current pre-alpha test harness cannot be wired cleanly, the blocker and smallest next action are documented in this issue.
- [ ] No production privacy, production MPC, or real bridgeless settlement claims are added.

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
