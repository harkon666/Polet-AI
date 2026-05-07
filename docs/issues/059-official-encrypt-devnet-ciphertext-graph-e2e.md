# Official Encrypt Devnet Ciphertext Graph E2E

Labels: `needs-triage`, `critical-path`

Type: `AFK`

## Current Status

`DONE (Polet-side) / BLOCKED (external Encrypt pre-alpha infra)`

Polet has implemented and evidenced the official Encrypt pre-alpha integration boundary: ciphertext inputs are created through the official client, Encrypt-owned ciphertext accounts are registered on the Polet wallet, session authorization works on devnet, unsigned graph/consume builders exist, and the live runner reaches `execute_encrypt_policy_graph_as_session`.

Full live graph execution, executor verification, decryption result handling, and verified-output Ika consume evidence are not complete yet because the current Encrypt devnet infrastructure rejects the graph CPI before graph processing. The recorded blocker is external to Polet: missing/uninitialized Encrypt infrastructure accounts and fee configuration (`event_authority`, per-payer `encrypt_deposit`, and non-zero `enc_mint`/vault setup).

Use this issue as integration-ready evidence, not as a claim that Polet completed a full live Encrypt executor lifecycle.

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## Why this issue exists

The current hackathon evidence path overstates the practical Encrypt integration. Polet has a contract-level official Encrypt graph boundary (`polet_policy_guardrail_graph`, `execute_encrypt_policy_graph_as_session`, and verified-output Ika consume), but the product path still lacks a real end-to-end official Encrypt pre-alpha flow from client/proxy through devnet ciphertext creation, graph execution, executor verification, and verified consume.

The masked-witness XOR path is only a legacy/dev compatibility fixture. It must not be presented as official Encrypt, FHE, or the primary hackathon privacy integration.

This issue is the correction slice: make Polet use the official Encrypt pre-alpha interface described in `docs/encrypt/raw.md` for the hackathon demo evidence path.

## What to build

Build the smallest live-devnet official Encrypt E2E path that proves Polet's policy gate depends on Encrypt ciphertexts and graph lifecycle rather than `encryptionWitness`.

Primary path:

1. Use `@encrypt.xyz/pre-alpha-solana-client` or the official Rust client against `https://pre-alpha-dev-1.encrypt.ika-network.net:443`.
2. Create/register ciphertext accounts for:
   - max per run,
   - daily cap,
   - daily spent,
   - source amount.
3. Build an unsigned Polet transaction for `set_official_encrypt_ciphertext_policy` using the Encrypt-owned ciphertext account ids.
4. Build an unsigned Polet transaction for `execute_encrypt_policy_graph_as_session` using `polet_policy_guardrail_graph`.
5. Track pending output ciphertext ids:
   - allowed output,
   - updated daily spent output.
6. Wait for or poll executor verification / decryption result according to official docs.
7. Map result to Polet lifecycle:
   - `pending-encrypt-execution`,
   - `encrypt-verified-blocked`,
   - `encrypt-verified-allowed`.
8. Only after verified allowed, build or execute the verified-output consume path for Ika approval preparation.

Local fallback:

- If live devnet/gRPC/faucet/executor is unavailable, keep a deterministic local harness that mirrors the official API boundaries and records the exact live blocker plus retry command.
- The fallback is evidence support, not a replacement for live official Encrypt integration.

## Acceptance criteria

- [x] A proxy or SDK script can create official Encrypt pre-alpha ciphertext inputs through the official client, not by constructing masked XOR witness values.
- [x] A wallet setup flow registers Encrypt-owned ciphertext accounts through `set_official_encrypt_ciphertext_policy`.
- [ ] A policy execution flow builds/runs `execute_encrypt_policy_graph_as_session` with Encrypt config, deposit, CPI authority, caller program, network encryption key, event authority, input ciphertext accounts, and output ciphertext accounts. Built and attempted; live run is blocked by Encrypt devnet infrastructure.
- [x] The flow records pending output ciphertext ids and returns `pending-encrypt-execution` while executor verification is unresolved.
- [x] The flow can observe or ingest a verified allowed result and prepare the verified-output Ika approval path without `encryptionWitness`.
- [x] The flow can observe or ingest a verified blocked result and suppress Jupiter payloads, Ika dWallet data, MessageApproval data, destination digests, unsigned approval transactions, private thresholds, decrypted caps, and witness bytes.
- [x] Evidence output includes official Encrypt program id, gRPC endpoint, ciphertext account ids, graph execution transaction/signature when available, pending output ciphertext ids, verified result status, and Ika consume status when allowed.
- [x] Evidence output does not include private keys, seed phrases, raw witness bytes, plaintext policy thresholds after setup, decrypted caps, or executable blocked/pending payloads.
- [x] README, demo script, and runbook wording are corrected so the project does not imply masked-witness XOR is official Encrypt or FHE.
- [x] If live devnet cannot complete, the issue documents the exact blocker, the command attempted, the observed error, and the smallest retry action without claiming live Encrypt success.
- [x] Targeted tests/builds pass for changed proxy, SDK, frontend, and contract surfaces.

## Blocked by

External Encrypt pre-alpha devnet infrastructure for the final live graph/executor leg.

Already reached/verified on Polet side:

- Official ciphertext creation evidence through `@encrypt.xyz/pre-alpha-solana-client`.
- Devnet ciphertext account verification against the official Encrypt program id.
- Polet wallet initialization on devnet.
- `set_official_encrypt_ciphertext_policy` registration on devnet.
- Session grant on devnet.
- Live `execute_encrypt_policy_graph_as_session` attempt.
- Exact blocker evidence in `docs/evidence/059-official-encrypt-devnet-e2e-result.json`.

External blockers recorded during execution:

- Encrypt pre-alpha gRPC unavailable.
- Encrypt devnet program/state reset.
- Faucet/funding unavailable.
- Executor/decryptor delayed.
- `@encrypt.xyz/pre-alpha-solana-client` API mismatch with docs.
- Existing workspace dependency mismatch for `encrypt-solana-test`.
- Current observed blocker: Encrypt CPI exits before graph processing because required infra is not initialized/configured.

Smallest unblock action: once Encrypt devnet has a configured non-zero `enc_mint`, initialized `event_authority`, and initialized/creatable per-payer `encrypt_deposit`, re-run:

```bash
bun run scripts/059-encrypt-devnet-e2e.ts ~/.config/solana/id.json
```

## Existing related work

- `docs/encrypt/raw.md`
- `docs/encrypt/SUMMARY.md`
- `docs/encrypt-installation.md`
- `docs/ika-encrypt-integration-book.md`
- `contract/programs/contract/src/encrypt_policy_graph.rs`
- `contract/programs/contract/src/encrypt_prealpha.rs`
- `contract/programs/contract/src/lib.rs`
- `contract/programs/contract/tests/encrypt_harness_compatibility.rs`
- `docs/issues/041-official-encrypt-policy-graph-execution.md`
- `docs/issues/050-contract-official-encrypt-verified-ika-cpi-lifecycle.md`
- `docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md`

## Implementation plan

1. Re-read `docs/encrypt/raw.md` sections for quick start, ciphertexts, execute graph, decryption, mock vs real FHE, account layouts, and TS/Rust client usage.
2. Add a narrow SDK/proxy helper for official Encrypt client config and ciphertext creation.
3. Add a script or route that creates the three policy ciphertexts and one source-amount ciphertext on devnet.
4. Add transaction builders for:
   - `set_official_encrypt_ciphertext_policy`,
   - `execute_encrypt_policy_graph_as_session`,
   - verified-output Ika consume when allowed.
5. Add polling/normalization for pending/verified/decryption states.
6. Update runbook/demo/evidence docs to make live official Encrypt the primary evidence path and masked witness the fallback only.
7. Run targeted tests and builds.
8. If live devnet fails, capture blocker evidence and keep local harness proof clearly labeled as fallback.

## Recommended demo boundary

Use this wording:

> Polet uses the official Encrypt pre-alpha ciphertext and graph lifecycle for the hackathon policy gate. Pre-alpha does not provide production privacy yet, but Polet is integrated at the correct interface: ciphertext inputs, graph execution, pending outputs, verified allowed/blocked result, and policy-gated Ika approval.

Avoid this wording:

> Polet uses XOR witness bytes as Encrypt FHE.

## Notes

- Do not reintroduce static `encryptionWitness: [1,2,3,...,32]` into the primary demo path.
- Do not claim production FHE, production privacy, production Ika MPC, bridgeless settlement, or mainnet Jupiter execution.
- Do not sign/send transactions without explicit operator approval. Build unsigned transactions and record signer requirements first.

## Progress - 2026-05-07

Landed a narrow externally verifiable proxy slice for the no-witness official Encrypt path:

- Added unsigned transaction builders for `set_official_encrypt_ciphertext_policy`, `execute_encrypt_policy_graph_as_session`, and `approve_ika_message_with_verified_encrypt_as_session`.
- Added proxy routes:
  - `POST /wallet/set-official-encrypt-ciphertext-policy`
  - `POST /wallet/execute-encrypt-policy-graph`
  - `POST /wallet/approve-ika-with-verified-encrypt`
- Builder responses include signer lists, official Encrypt program id, gRPC endpoint, graph name, input ciphertext ids, pending output ciphertext ids, and suppression boundaries for pending graph execution.
- Verified Ika consume builder omits `encryptionWitness` and `sourceAmount`; it only prepares an unsigned Ika approval transaction after an external verified-allowed Encrypt result is supplied.
- Updated demo/runbook wording so official Encrypt ciphertext/graph lifecycle is the primary evidence path and masked witness is local fallback only.

Verification:

- `cd proxy && bun test ./tests/transaction-builder.test.ts` passed.
- `cd proxy && bun run build` passed.

## Progress - 2026-05-07 (Audit Update)

Polet-side implementation is complete, but full live acceptance remains externally blocked. Audit confirmation:

- `official-encrypt-live-e2e-runner.ts` creates ciphertexts via `@encrypt.xyz/pre-alpha-solana-client` gRPC (not static witness).
- E2E runner completes steps 1–6 on live devnet (wallet init, ciphertext verification, policy registration, session grant).
- Step 7 (`execute_encrypt_policy_graph_as_session`) blocked by external Encrypt infrastructure: `event_authority` PDA (`6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ`) not initialized on devnet, causing CPI to fail at 186 CU with custom error `0x1`. Root cause is Encrypt program infrastructure, not Polet code.
- Evidence captured in `docs/evidence/059-official-encrypt-devnet-e2e-result.json` with exact error, logs, and retry action.
- README honestly describes pre-alpha + masked-witness simulation (not production FHE).
- One pre-existing test failure unrelated to this issue: `ika-bridgeless-request.test.ts:207` expects `INVALID_IKA_RISK_METADATA` for valid-but-rejected liquidity score, but gets `IKA_RISK_GUARDRAIL_BLOCKED`. Test intent is correct; expected error code is wrong.

Build verification:

- `cd proxy && bun run build` ✅
- `cd sdk && bun run build` ✅ (tsc clean)
- `cd frontend && bun run build` ✅
- `cd contract && NO_DNA=1 cargo test` ✅
- `cd proxy && bun test` → 152/153 pass (1 pre-existing failure)
- `cd sdk && bun test` → 85/85 pass ✅

Remaining:

- Re-run graph execution once Encrypt team initializes `event_authority` and per-payer `deposit` PDAs on devnet.
- Executor verification polling and Ika consume evidence not yet captured (blocked by above).
- Pre-existing test bug: `ika-bridgeless-request.test.ts:207` needs expected code corrected from `INVALID_IKA_RISK_METADATA` to `IKA_RISK_GUARDRAIL_BLOCKED`.

## Progress - 2026-05-07 (Test Fix)

Fixed pre-existing test bug in `proxy/tests/ika-bridgeless-request.test.ts:207`:

- Test expected `INVALID_IKA_RISK_METADATA` thrown error for `liquidityScore: 'low'`, but 'low' is valid metadata that gets blocked by risk guardrails returning `IKA_RISK_GUARDRAIL_BLOCKED`.
- Changed test from try/catch pattern to checking returned result.
- All 153 proxy tests now pass with 0 failures.

Remaining:
- Re-run graph execution once Encrypt team initializes `event_authority` and per-payer `deposit` PDAs on devnet.
- Executor verification polling and Ika consume evidence not yet captured (blocked by above).

## Progress - 2026-05-07 (Deposit Creation)

Added Encrypt deposit creation infrastructure:

**Proxy (transaction-builder.ts):**
- `deriveEncryptDepositPda(ownerPubkey)` — derives deposit PDA from owner's pubkey
- `deriveEncryptConfigPda()`, `deriveEncryptEventAuthorityPda()`, `derivePoletEncryptCpiAuthorityPda()`
- `buildCreateEncryptDepositTransaction(ownerPubkey)` — builds create_deposit instruction (disc 13)
- Reads encVault from on-chain config data bytes 100-132
- 17-byte data: bump(1) | initial_enc_amount(8) | initial_gas_amount(8)

**Proxy route (wallet.ts):**
- `POST /wallet/create-encrypt-deposit` — takes `{ owner }`, returns unsigned tx

**Frontend (api.ts):**
- `createEncryptDeposit(owner)` — calls proxy route

**Frontend (DemoTab.tsx):**
- Added `createEncryptDeposit` to DemoApi interface

**Tests:**
- 154 proxy tests pass (1 new)
- 49 frontend tests pass
- All builds clean

**Known blockers:**
- `create_deposit` instruction fails on devnet with error 0x1 (156 CU)
- Root cause: Encrypt devnet config has enc_mint = 0 (no ENC token configured)
- event_authority PDA not initialized on devnet
- These are external Encrypt infrastructure issues, not Polet code bugs
- Deposit creation code is ready, will work once Encrypt devnet is properly configured

## Progress - 2026-05-08 (Infra Preflight)

Added a reusable preflight for the live retry path:

- `proxy/src/lib/encrypt-ciphertext-poller.ts` now derives and checks Encrypt config, event authority, and per-payer `encrypt_deposit` PDA state.
- The preflight validates config ownership, config account size, `enc_mint`, `enc_vault`, event authority existence/ownership, and deposit existence/ownership without deserializing untrusted account data as trusted instructions.
- `scripts/059-encrypt-devnet-e2e.ts` records owner/session Encrypt infrastructure status before expensive graph execution and records a focused `executeGraphInfraAtFailure` snapshot if CPI still fails.
- Fixed the runner's deposit PDA seed to `encrypt_deposit` to match `docs/encrypt/raw.md` and the proxy transaction builder.

Verification:

- `cd proxy && bun test ./tests/encrypt-ciphertext-poller.test.ts ./tests/transaction-builder.test.ts` ✅
- `cd proxy && bun run build` ✅
- `cd sdk && bun run build` ✅

Remaining live blocker:

- Re-run the graph once Encrypt devnet has a configured non-zero `enc_mint`, initialized `event_authority`, and initialized per-payer `encrypt_deposit` PDA. Until then, full live graph execution, executor verification, and verified-output Ika consume evidence remain externally blocked.

## Shipping Boundary - 2026-05-08

For the hackathon demo, present `059` as:

> Polet has completed the official Encrypt pre-alpha integration boundary on the Polet side. The project creates and registers official Encrypt ciphertext accounts, compiles the policy as an Encrypt graph, builds/attempts the devnet graph CPI, and records exact blocker evidence when Encrypt devnet infra rejects the CPI. Full live executor verification and verified-output Ika consume will be rerun after Encrypt infra is initialized.

Do not present `059` as:

> Full live Encrypt graph execution and production privacy are complete.

Primary evidence file:

- `docs/evidence/059-official-encrypt-devnet-e2e-result.json`
