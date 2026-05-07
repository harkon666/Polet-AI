# Hackathon Ika and Encrypt Pre-Alpha Integration

Labels: `needs-triage`, `critical-path`

Type: `Umbrella`

## Parent

`docs/prd.md`

## Correction

Earlier local evidence issues treated Polet's pending/verified lifecycle simulation as enough for the hackathon Encrypt story. That was too optimistic.

The official Encrypt pre-alpha docs in `docs/encrypt/raw.md` do not describe `encryptionWitness` as the product interface. They describe ciphertext accounts, `#[encrypt_fn]` graph compilation, `execute_graph`, pending output ciphertexts, executor commit, decryption request/result, and local `EncryptTestContext/process_pending()` testing.

Therefore, the hackathon evidence path must use official Encrypt ciphertext/graph interfaces first. Masked-witness XOR is only a legacy/dev fixture and must not be pitched as official Encrypt, FHE, or the primary privacy integration.

## What to build

Make the hackathon demo prove one coherent Ika x Encrypt pre-alpha path:

1. Owner creates or registers official Encrypt pre-alpha ciphertext accounts for max-per-run, daily cap, and daily spent.
2. Agent request creates or references a source amount ciphertext.
3. Polet executes `polet_policy_guardrail_graph` through official Encrypt `execute_graph`.
4. Pending output ciphertexts suppress Jupiter/Ika payloads.
5. Verified blocked output suppresses all execution/approval artifacts.
6. Verified allowed output is the only path that can prepare Ika approval artifacts and unsigned Polet verified-output consume transaction.

This issue does not require production FHE, production privacy, production Ika MPC, real bridgeless settlement, or mainnet Jupiter execution. It does require using the official pre-alpha interface, even if the pre-alpha implementation stores public plaintext internally.

## Child Issues

- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md` — first executable correction issue. Live official Encrypt devnet ciphertext/graph E2E, with local fallback only when external pre-alpha services block.
- `docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md` — rewritten as follow-up API/frontend cleanup after `059` proves the real official path.
- `docs/issues/055-official-encrypt-no-witness-manual-e2e-readiness.md` — rewritten as manual rehearsal and evidence collection after `059`.
- `docs/issues/056-frontend-ika-encrypt-lifecycle-command-center.md` — rewritten as frontend surface after real `059` states are available.
- `docs/issues/053-agent-sdk-integration-kit.md` — still relevant, but lower priority until `059` stabilizes the official Encrypt path.

Removed/superseded:

- `057-hackathon-encrypt-ika-local-evidence-pack`
- `058-hackathon-encrypt-ika-final-closeout`

Those local evidence/closeout issues are no longer source-of-truth for hackathon readiness.

## Acceptance Criteria

- [ ] Live or attempted-live official Encrypt devnet evidence exists for ciphertext creation, policy registration, graph execution, pending output tracking, and verified allowed/blocked handling.
- [ ] If live devnet is unavailable, blocker evidence records exact command, endpoint, error, and smallest retry action.
- [ ] Masked-witness XOR is quarantined as legacy/dev fixture only and is not used in primary demo copy, runbook, SDK examples, or frontend setup.
- [ ] Polet prepares Ika approval artifacts only after verified allowed output from the official Encrypt path.
- [ ] Pending and verified blocked states suppress dWallet, MessageApproval, unsigned approval tx, destination digest, Jupiter execution payload, thresholds, caps, witness bytes, and executable payloads.
- [ ] README/demo/runbook wording says official Encrypt pre-alpha is not production privacy but is integrated through ciphertext + graph lifecycle.
- [ ] Tests/builds cover changed contract/proxy/SDK/frontend surfaces.

## Existing Related Work

- `docs/encrypt/raw.md`
- `docs/encrypt-installation.md`
- `docs/ika-encrypt-integration-book.md`
- `contract/programs/contract/src/encrypt_policy_graph.rs`
- `contract/programs/contract/src/lib.rs`
- `contract/programs/contract/tests/encrypt_harness_compatibility.rs`
- `docs/issues/041-official-encrypt-policy-graph-execution.md`
- `docs/issues/050-contract-official-encrypt-verified-ika-cpi-lifecycle.md`
- `docs/issues/051-encrypt-test-harness-compatibility.md`

## Claim Boundary

Use:

> Polet uses the official Encrypt pre-alpha ciphertext and graph lifecycle for its policy gate. Pre-alpha does not provide production privacy yet, but Polet is integrated at the correct interface.

Do not use:

> Polet uses XOR witness bytes as Encrypt FHE.
