# Official Encrypt Verified Decision Resolver

Labels: `needs-triage`, `critical-path`, `privacy`, `frontend`, `proxy`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Turn a submitted Official Encrypt policy graph into a final strategy decision that the proxy and frontend can use directly:

1. A guarded request such as `Try 25 USDC via proxy` creates fresh execution ciphertexts and submits `execute_encrypt_policy_graph_as_session`.
2. Polet records pending output ciphertext refs for:
   - `allowedOutputCiphertext`,
   - `dailySpentOutputCiphertext`.
3. The product flow requests decryption of the pending allowed-output ciphertext through the official Encrypt pre-alpha decryption request path.
4. The frontend/proxy polls the decryption request account until the decryptor writes a result.
5. The result is decoded as a boolean decision:
   - `false` -> `encrypt-verified-blocked`, suppressing Jupiter/Ika payloads.
   - `true` -> `encrypt-verified-allowed`, allowing the proxy to prepare the safe strategy payload.
6. The UI shows a final `allowed` or `blocked` decision for the clicked amount instead of stopping at `ENCRYPT_POLICY_GRAPH_NOT_EXECUTED`.

This issue closes the current UX gap where Official Encrypt setup and owner policy reveal work, but a normal guarded run can still stop at "Official Encrypt policy graph must be executed before strategy payloads can be prepared."

## Acceptance criteria

- [x] The proxy exposes a route or resolver that can request decryption for the wallet's current `pendingAllowedOutput` ciphertext without revealing policy thresholds.
- [x] The resolver validates that the pending allowed-output ciphertext belongs to the current wallet pending graph state and policy sequence.
- [x] The frontend can drive the full decision lifecycle for `Try 25 USDC via proxy`: submit graph, request allowed-output decryption, poll, and display `encrypt-verified-blocked`.
- [x] The frontend can drive the same lifecycle for an allowed amount such as `5 USDC` and display `encrypt-verified-allowed`.
- [x] `runConfidentialDcaExecution` and Ika request creation can consume a verified decision and only prepare Jupiter/Ika artifacts for verified allowed.
- [x] Pending or verified-blocked states never include Jupiter transactions, Ika dWallet data, MessageApproval data, destination digests, raw witnesses, decrypted policy thresholds, or remaining cap values.
- [x] If the session signer is unavailable to the connected wallet, the UI shows a signer-required state instead of a generic unexpected error.
- [x] Tests cover pending, verified blocked, verified allowed, mismatched pending ciphertext refs, stale policy sequence, and no-payload leakage.
- [x] Documentation states that Encrypt pre-alpha decryption request accounts can expose decrypted output values publicly and that this is not production privacy.

## Implementation note

Implemented the pending allowed-output resolver across contract, proxy, and frontend. The contract now permits the owner-signed Encrypt decryption request instruction to target kind `3` (`pending_allowed_output`) after a graph is pending. The proxy adds `/wallet/request-pending-allowed-output-decryption`, `/wallet/resolve-encrypt-policy-decision`, bool `DecryptionRequest` account decoding, pending ciphertext/digest/policy-sequence validation, and verified allowed/blocked lifecycle mapping. The frontend graph-first path now submits the graph, waits for the allowed-output ciphertext status byte to become `1` (verified, not allowed), requests allowed-output decryption with a fresh request keypair, resolves the bool result from the `DecryptionRequest`, displays final lifecycle status, and only continues into Jupiter/Ika payload preparation for `encrypt-verified-allowed`.

Follow-up live debugging in scripts `070` and `071` corrected an earlier misleading infra diagnosis: zero deposit `enc_balance` / `gas_balance` fields and absent readonly event-authority account data are not sufficient blockers. Deposit PDA lamports can pay graph/decryption gas, and a 25 USDC run decrypts to `false` while a 5 USDC run decrypts to `true`.

Verification:

- `cd proxy && bun test ./tests/official-encrypt-policy.test.ts ./tests/transaction-builder.test.ts ./tests/confidential-dca-execution.test.ts`
- `cd proxy && bun run build`
- `cd frontend && bun run test src/components/DemoTab.test.tsx`
- `cd frontend && bun run typecheck`
- `cd frontend && bun run build`
- `cd contract && NO_DNA=1 cargo build`
- `cd contract && NO_DNA=1 cargo test -p contract encrypt_harness`

Boundary: Encrypt pre-alpha decryption request accounts may expose decrypted output values publicly after the decryptor responds. This resolver only decrypts the graph's boolean allowed output; it does not decrypt policy thresholds or remaining caps and does not claim production privacy.

## Blocked by

- `docs/issues/066-frontend-official-encrypt-policy-graph-execution.md`
- `docs/issues/067-owner-only-official-encrypt-policy-reveal.md`

## Implementation notes

- Reuse the owner policy reveal account decoding pattern, but apply it to the graph's `pendingAllowedOutput` boolean rather than max-per-run/daily-cap/daily-spent policy values.
- Keep the policy thresholds masked. The only decrypted execution value needed for a decision is the boolean allowed output.
- The transaction that submits `execute_encrypt_policy_graph_as_session` is session-signed. If the connected wallet cannot sign the session key, the frontend should surface an explicit signer-required state or use a dev-only local session signer path that is clearly labeled and never enabled for production.
- Verified allowed should feed the existing official Encrypt lifecycle types: `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`.
- Do not fall back to plaintext/local numeric evaluation while claiming an Official Encrypt verified decision.
