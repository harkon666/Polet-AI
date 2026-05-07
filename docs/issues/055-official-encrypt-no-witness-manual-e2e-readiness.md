# Official Encrypt Devnet Manual E2E Readiness

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Status

Re-scoped. This is no longer a generic no-witness checklist issue. It is the manual rehearsal and evidence-pack issue for the official Encrypt devnet path created by `059`.

## What to build

Prepare a human-run manual E2E that starts from official Encrypt ciphertext creation and ends at Polet/Ika verified-output behavior.

The manual path must cover:

1. Devnet owner/session setup.
2. Official Encrypt gRPC/client config.
3. Encrypt ciphertext creation for max-per-run, daily cap, daily spent, and source amount.
4. Polet `set_official_encrypt_ciphertext_policy`.
5. Polet `execute_encrypt_policy_graph_as_session`.
6. Pending output evidence.
7. Verified blocked evidence.
8. Verified allowed evidence.
9. Ika approval preparation only after verified allowed.
10. Optional live Ika MessageApproval smoke when Ika devnet is available.

## Acceptance Criteria

- [x] Runbook contains exact env vars, commands, and expected outputs for official Encrypt devnet.
- [x] Evidence template includes Encrypt program id, gRPC endpoint, ciphertext account ids, graph execution tx/signature, pending output ciphertext ids, verified result state, and Polet/Ika consume state.
- [x] Failure table covers gRPC unavailable, devnet reset, faucet/funding failure, executor delay, decryptor delay, client API mismatch, and Ika devnet unavailable.
- [x] Manual evidence avoids private keys, seed phrases, witness bytes, plaintext thresholds after setup, decrypted caps, and blocked/pending executable payloads.
- [x] Docs clearly state pre-alpha may be public/plaintext internally and is not production privacy.
- [x] Local fallback harness evidence is labeled fallback only.

## Blocked By

- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Existing Related Work

- `docs/ika-devnet-smoke-runbook.md`
- issue `059` live evidence output or blocker record
- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Notes

The older "no-witness readiness" work remains useful for redaction and safe lifecycle wording, but it is not enough for hackathon Encrypt core integration.

## Progress - 2026-05-07

Created `docs/encrypt-devnet-e2e-runbook.md` covering:

- Environment variables (Encrypt gRPC, program IDs, USDC amounts)
- Devnet owner/session setup with throwaway keypairs
- Step-by-step commands for ciphertext creation, policy registration, graph execution
- Pending/verified/blocked state documentation
- Ika approval preparation (only after verified allowed)
- Failure table: gRPC unavailable, devnet reset, faucet failure, executor delay, decryptor delay, client API mismatch, Ika devnet unavailable
- Evidence template with safe fields only (no private keys, no thresholds, no witness bytes)
- Safety rules

**Note**: Live devnet execution is blocked by external Encrypt infra (event_authority PDA not initialized). The runbook documents the exact commands and expected outputs based on #059 implementation. Step 8 (Ika approval) requires Ika devnet availability.

Verification:
- Runbook references actual proxy routes: `/wallet/set-official_encrypt_ciphertext-policy`, `/wallet/execute-encrypt-policy-graph`, `/wallet/approve-ika-with-verified-encrypt`
- Runbook references actual scripts: `scripts/059-encrypt-devnet-e2e.ts`, `sdk/src/official-encrypt-evidence-runner.ts`
- All referenced file paths verified to exist
