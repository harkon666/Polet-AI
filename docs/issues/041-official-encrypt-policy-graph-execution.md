# Official Encrypt Policy Graph Execution

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Replace Polet's masked-witness confidential numeric policy simulation with the official Encrypt pre-alpha execution surface for the core allow/block path. The DCA and Ika approval flows should submit the existing `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext`, track ciphertext account identifiers and pending output state, and use Encrypt's mock/test lifecycle for deterministic local verification.

This issue exists because the current codebase only partially implements the official Encrypt model. `contract/programs/contract/src/encrypt_policy_graph.rs` already defines a `#[encrypt_fn]` graph and `contract/programs/contract/src/encrypt_prealpha.rs` tracks the official devnet constants, but `contract/programs/contract/src/confidential_policy.rs` still decrypts locally with a witness-derived XOR mask and mutates `encrypted_daily_spent` directly. That is useful as a demo boundary, but it is not the official Encrypt integration path described in `docs/encrypt/raw.md`.

## Acceptance criteria

- [x] Wallet policy state stores Encrypt ciphertext account identifiers for max-per-run, daily cap, daily spent, and any pending allow/block or updated daily-spend outputs as the official path.
- [x] The owner policy setup path creates or accepts official Encrypt ciphertext accounts using the devnet/pre-alpha config, deposit, network key, event authority, CPI authority, and payer accounts required by `EncryptContext`.
- [x] The contract session path can run `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext` and records pending output ciphertexts.
- [x] The Ika `approve_ika_message_as_session` path uses the same official Encrypt policy graph boundary before any Ika `approve_message` CPI, so blocked requests cannot emit dWallet or MessageApproval data.
- [x] Contract, proxy, SDK, and frontend response types clearly distinguish `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked` states without leaking private policy thresholds or witness bytes.
- [x] Contract tests cover the official Encrypt policy boundary with LiteSVM E2E coverage for owner setup, pending graph execution state, verified allowed/blocked consumption, and masked-witness quarantine. Full `encrypt-solana-test` / `EncryptTestContext::process_pending()` lifecycle coverage is documented as blocked by the current Encrypt harness dependency graph and deferred to a compatibility follow-up.
- [x] Documentation keeps the pre-alpha disclaimer explicit: Encrypt pre-alpha has no production privacy guarantee, data may be public/plaintext in the current network, and interfaces can reset or change.

## Implementation notes

- Added `EncryptPolicyCiphertexts` to the wallet's confidential policy state so the contract stores official Encrypt ciphertext account identifiers for max-per-run, daily cap, daily spent, pending source amount, pending allow/block output, and pending updated daily-spend output.
- Added owner instruction `set_encrypt_ciphertext_policy` for accepting pre-created Encrypt ciphertext accounts and session instruction `execute_encrypt_policy_graph_as_session` for submitting `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext`.
- Added owner instruction `set_official_encrypt_ciphertext_policy` for accepting real Encrypt-owned policy ciphertext accounts through the official Encrypt account surface: devnet/pre-alpha Encrypt program, config, deposit, CPI authority, caller program, network encryption key, payer, event authority, and system program. The legacy pubkey-only setter remains for compatibility and simulation scaffolding.
- Fixed `NO_DNA=1 anchor build` by excluding native `mock_ika` from Anchor IDL generation and building it in a pre-build hook for LiteSVM tests.
- Added proxy official Encrypt lifecycle handling for DCA and Ika. When wallet policy state has official Encrypt ciphertexts, guarded execution now returns `pending-encrypt-execution` until a resolver supplies verified graph output, carries `encrypt-verified-allowed` into DCA/Ika policy attestations, and suppresses DCA transactions, Ika signing metadata, MessageApproval data, and private witness/threshold data for pending or verified-blocked outcomes.
- SDK blocked-trade normalization and frontend API types now understand the official Encrypt lifecycle status values.
- Issue `050-contract-official-encrypt-verified-ika-cpi-lifecycle` migrated the on-chain Ika CPI boundary: masked-witness Ika approval is rejected when official Encrypt ciphertext policy is configured, and verified Encrypt allowed output is required before Ika CPI.
- LiteSVM contract tests now cover the official Encrypt boundary enough to close this issue's local correctness scope: official owner setup, pending policy graph execution, verified allowed and blocked output consumption, stale sequence/session checks, Ika CPI suppression, and masked-witness quarantine when official Encrypt policy is configured.
- Attempted direct `encrypt-solana-test` dev-dependency wiring for graph lifecycle tests on 2026-05-07. Both unpinned and `rev = "7a3c347f"` forms pulled Solana 4 beta/rc test-harness dependencies and failed before Polet tests compiled with `agave-votor-messages` `SchemaWrite` / `SchemaRead` errors caused by multiple `wincode` versions. The dependency was removed again so the contract workspace stays buildable. Full `EncryptTestContext/process_pending()` executor coverage is deferred to a separate compatibility follow-up rather than blocking issue 041.

Verification:

- `NO_DNA=1 anchor build` passes in `contract/`.
- `NO_DNA=1 cargo test` passes in `contract/`.
- `bun test` and `bun run build` pass in `proxy/`.
- `bun test` and `bun run build` pass in `sdk/`.
- `bun run build` passes in `frontend/`.
- `NO_DNA=1 cargo test -p contract encrypt_policy_graph` was attempted after adding `encrypt-solana-test`, but failed during dependency compilation in `agave-votor-messages` before Polet tests ran because the Encrypt test harness currently resolves an incompatible Solana 4 beta/rc dependency set for this workspace.

## Blocked by

None - can start immediately

## Official Encrypt notes

- `docs/encrypt/raw.md` describes ciphertext accounts as regular Encrypt-owned keypair accounts where the pubkey is the ciphertext identifier.
- `execute_graph` creates or updates output ciphertext accounts, emits a graph event, and leaves outputs pending until the executor commits them.
- The Anchor CPI path requires `EncryptContext` accounts: Encrypt program, config, deposit, CPI authority, caller program, network encryption key, payer, event authority, system program, and CPI authority bump.
- Local tests should model the executor/decryptor lifecycle with `EncryptTestContext` and `process_pending()`.
- Polet must not claim production FHE/privacy until Encrypt alpha/mainnet documentation supports that claim.

## Grill decision

Recommended answer: make this one vertical AFK slice, not separate contract/proxy/frontend tickets. The value being verified is one end-to-end policy decision lifecycle: encrypted policy inputs enter the system, the contract executes the official graph, proxy/SDK/frontend expose safe pending/verified states, and tests prove both allowed and blocked outcomes without the masked witness path.
