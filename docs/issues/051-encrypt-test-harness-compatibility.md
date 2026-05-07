# Encrypt Test Harness Compatibility

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/041-official-encrypt-policy-graph-execution.md`

## What to build

Add full official Encrypt mock executor coverage for Polet's policy graph lifecycle once the `encrypt-solana-test` dependency graph can be pinned or patched to match this workspace's Solana/Anchor versions.

The current issue 041 coverage uses LiteSVM contract tests for Polet's local correctness boundary: official owner setup, pending graph execution state, verified allowed/blocked consumption, Ika CPI suppression, and masked-witness quarantine. This follow-up should add the missing Encrypt harness layer: `encrypt-solana-test` / `EncryptTestContext` creates or registers the ciphertext inputs, Polet submits `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext`, `process_pending()` runs the deterministic mock executor, and tests verify both allowed and blocked graph outputs without relying on hand-written mock ciphertext/decryption account data.

This is a compatibility slice, not a product behavior change. The goal is to make the official Encrypt test harness runnable in this repo without breaking the existing `NO_DNA=1 anchor build` and `NO_DNA=1 cargo test` workflows.

## Acceptance criteria

- [x] A pinned or patched `encrypt-solana-test` setup compiles with this workspace's current Solana/Anchor dependency graph, without reintroducing the `agave-votor-messages` `SchemaWrite` / `SchemaRead` failure caused by mixed `wincode` versions.
- [x] The harness coverage uses `encrypt_solana_test::litesvm::EncryptTestContext` or an equivalent compatibility-pinned wrapper and calls `process_pending()` for graph executor/decryptor work.
- [x] Tests cover the full Polet official Encrypt policy graph lifecycle for an allowed run: policy ciphertext setup, source amount ciphertext creation, `execute_encrypt_policy_graph_as_session`, pending output registration/processing, verified allowed output, and daily-spent output update.
- [x] Tests cover the blocked path through the same lifecycle and prove that blocked output does not mutate spend as allowed or enable Ika approval.
- [x] Existing masked-witness tests remain quarantined as legacy simulation coverage and are not used as the primary confidential policy proof for official Encrypt-configured wallets.
- [x] The new harness tests are documented with an explicit Encrypt pre-alpha disclaimer: no production privacy, no production FHE guarantee, and no production MPC/settlement claim.
- [x] Verification commands are documented and pass locally, including `NO_DNA=1 anchor build`, `NO_DNA=1 cargo test -p contract`, and the new compatibility harness test command.

## Blocked by

None - can start immediately

## Background

- Issue 041 attempted direct `encrypt-solana-test` dev-dependency wiring on 2026-05-07.
- Both unpinned and `rev = "7a3c347f"` forms pulled Solana 4 beta/rc harness dependencies and failed before Polet tests compiled.
- The observed failure was in `agave-votor-messages` with `SchemaWrite` / `SchemaRead` errors caused by multiple `wincode` versions.
- Keep the main contract workspace buildable while experimenting. A standalone compatibility crate is acceptable if it avoids poisoning the primary dependency graph.

## Implementation notes

- Added a local `mock_encrypt` SBF program under the official Encrypt pre-alpha program id so LiteSVM can execute Polet's `encrypt_anchor::EncryptContext::execute_graph` CPI without pulling the incompatible upstream `encrypt-solana-test` dependency graph into the contract workspace.
- Added `contract/programs/contract/tests/encrypt_harness_compatibility.rs` with an `EncryptTestContext` compatibility wrapper and explicit `process_pending()` executor/decryptor step. The wrapper writes deterministic Encrypt-shaped ciphertext and bool decryption request accounts owned by the mock Encrypt program.
- Covered allowed lifecycle from official policy ciphertext setup through `execute_encrypt_policy_graph_as_session`, pending output recording, `process_pending()`, verified Ika approval, and daily-spent ciphertext update.
- Covered blocked lifecycle through the same graph execution and `process_pending()` path, proving the verified blocked output suppresses Ika approval and leaves daily-spent unchanged.
- Kept masked-witness coverage in the existing legacy simulation tests; the new compatibility harness uses official Encrypt ciphertext identifiers and pending/verified state.
- Documented the pre-alpha boundary in a test assertion: this mock harness does not prove production privacy, production FHE, production MPC, or settlement.

Verification:

- `NO_DNA=1 anchor build` passes in `contract/`.
- `NO_DNA=1 cargo test -p contract encrypt_harness` passes in `contract/`.
- `NO_DNA=1 cargo test -p contract` passes in `contract/`.
