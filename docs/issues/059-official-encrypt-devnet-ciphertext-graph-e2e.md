# Official Encrypt Devnet Ciphertext Graph E2E

Labels: `needs-triage`, `critical-path`

Type: `AFK`

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

- [ ] A proxy or SDK script can create official Encrypt pre-alpha ciphertext inputs through the official client, not by constructing masked XOR witness values.
- [ ] A wallet setup flow registers Encrypt-owned ciphertext accounts through `set_official_encrypt_ciphertext_policy`.
- [ ] A policy execution flow builds/runs `execute_encrypt_policy_graph_as_session` with Encrypt config, deposit, CPI authority, caller program, network encryption key, event authority, input ciphertext accounts, and output ciphertext accounts.
- [ ] The flow records pending output ciphertext ids and returns `pending-encrypt-execution` while executor verification is unresolved.
- [ ] The flow can observe or ingest a verified allowed result and prepare the verified-output Ika approval path without `encryptionWitness`.
- [ ] The flow can observe or ingest a verified blocked result and suppress Jupiter payloads, Ika dWallet data, MessageApproval data, destination digests, unsigned approval transactions, private thresholds, decrypted caps, and witness bytes.
- [ ] Evidence output includes official Encrypt program id, gRPC endpoint, ciphertext account ids, graph execution transaction/signature when available, pending output ciphertext ids, verified result status, and Ika consume status when allowed.
- [ ] Evidence output does not include private keys, seed phrases, raw witness bytes, plaintext policy thresholds after setup, decrypted caps, or executable blocked/pending payloads.
- [ ] README, demo script, and runbook wording are corrected so the project does not imply masked-witness XOR is official Encrypt or FHE.
- [ ] If live devnet cannot complete, the issue documents the exact blocker, the command attempted, the observed error, and the smallest retry action without claiming live Encrypt success.
- [ ] Targeted tests/builds pass for changed proxy, SDK, frontend, and contract surfaces.

## Blocked by

None - can start immediately.

External blockers may occur during execution:

- Encrypt pre-alpha gRPC unavailable.
- Encrypt devnet program/state reset.
- Faucet/funding unavailable.
- Executor/decryptor delayed.
- `@encrypt.xyz/pre-alpha-solana-client` API mismatch with docs.
- Existing workspace dependency mismatch for `encrypt-solana-test`.

These are not blockers to starting; they must be recorded as live-evidence blockers if hit.

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
