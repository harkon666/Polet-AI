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
- [ ] The owner policy setup path creates or accepts official Encrypt ciphertext accounts using the devnet/pre-alpha config, deposit, network key, event authority, CPI authority, and payer accounts required by `EncryptContext`.
- [x] The contract session path can run `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext` and records pending output ciphertexts.
- [ ] The Ika `approve_ika_message_as_session` path uses the same official Encrypt policy graph boundary before any Ika `approve_message` CPI, so blocked requests cannot emit dWallet or MessageApproval data.
- [x] Contract, proxy, SDK, and frontend response types clearly distinguish `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked` states without leaking private policy thresholds or witness bytes.
- [ ] Tests use `encrypt-solana-test` / `EncryptTestContext` with `process_pending()` for deterministic mock execution, while existing masked-witness tests are either migrated, quarantined as legacy simulation coverage, or removed from the primary confidential path.
- [ ] Documentation keeps the pre-alpha disclaimer explicit: Encrypt pre-alpha has no production privacy guarantee, data may be public/plaintext in the current network, and interfaces can reset or change.

## Implementation notes

- Added `EncryptPolicyCiphertexts` to the wallet's confidential policy state so the contract stores official Encrypt ciphertext account identifiers for max-per-run, daily cap, daily spent, pending source amount, pending allow/block output, and pending updated daily-spend output.
- Added owner instruction `set_encrypt_ciphertext_policy` for accepting pre-created Encrypt ciphertext accounts and session instruction `execute_encrypt_policy_graph_as_session` for submitting `polet_policy_guardrail_graph` through `encrypt_anchor::EncryptContext`.
- Fixed `NO_DNA=1 anchor build` by excluding native `mock_ika` from Anchor IDL generation and building it in a pre-build hook for LiteSVM tests.
- Added proxy official Encrypt lifecycle handling for DCA and Ika. When wallet policy state has official Encrypt ciphertexts, guarded execution now returns `pending-encrypt-execution` until a resolver supplies verified graph output, carries `encrypt-verified-allowed` into DCA/Ika policy attestations, and suppresses DCA transactions, Ika signing metadata, MessageApproval data, and private witness/threshold data for pending or verified-blocked outcomes.
- SDK blocked-trade normalization and frontend API types now understand the official Encrypt lifecycle status values.
- Remaining work is to wire official Encrypt ciphertext account creation, migrate the on-chain Ika CPI instruction away from masked-witness enforcement, and add full `EncryptTestContext/process_pending()` coverage.

Verification:

- `NO_DNA=1 anchor build` passes in `contract/`.
- `NO_DNA=1 cargo test` passes in `contract/`.
- `bun test` and `bun run build` pass in `proxy/`.
- `bun test` and `bun run build` pass in `sdk/`.
- `bun run build` passes in `frontend/`.

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
