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

- [ ] Runbook contains exact env vars, commands, and expected outputs for official Encrypt devnet.
- [ ] Evidence template includes Encrypt program id, gRPC endpoint, ciphertext account ids, graph execution tx/signature, pending output ciphertext ids, verified result state, and Polet/Ika consume state.
- [ ] Failure table covers gRPC unavailable, devnet reset, faucet/funding failure, executor delay, decryptor delay, client API mismatch, and Ika devnet unavailable.
- [ ] Manual evidence avoids private keys, seed phrases, witness bytes, plaintext thresholds after setup, decrypted caps, and blocked/pending executable payloads.
- [ ] Docs clearly state pre-alpha may be public/plaintext internally and is not production privacy.
- [ ] Local fallback harness evidence is labeled fallback only.

## Blocked By

- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Existing Related Work

- `docs/ika-devnet-smoke-runbook.md`
- issue `059` live evidence output or blocker record
- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Notes

The older "no-witness readiness" work remains useful for redaction and safe lifecycle wording, but it is not enough for hackathon Encrypt core integration.
