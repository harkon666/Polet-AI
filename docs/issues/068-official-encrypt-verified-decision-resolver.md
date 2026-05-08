# Official Encrypt Verified Decision Resolver

Labels: `needs-triage`, `critical-path`, `privacy`, `frontend`, `proxy`

Type: `AFK`

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

- [ ] The proxy exposes a route or resolver that can request decryption for the wallet's current `pendingAllowedOutput` ciphertext without revealing policy thresholds.
- [ ] The resolver validates that the pending allowed-output ciphertext belongs to the current wallet pending graph state and policy sequence.
- [ ] The frontend can drive the full decision lifecycle for `Try 25 USDC via proxy`: submit graph, request allowed-output decryption, poll, and display `encrypt-verified-blocked`.
- [ ] The frontend can drive the same lifecycle for an allowed amount such as `5 USDC` and display `encrypt-verified-allowed`.
- [ ] `runConfidentialDcaExecution` and Ika request creation can consume a verified decision and only prepare Jupiter/Ika artifacts for verified allowed.
- [ ] Pending or verified-blocked states never include Jupiter transactions, Ika dWallet data, MessageApproval data, destination digests, raw witnesses, decrypted policy thresholds, or remaining cap values.
- [ ] If the session signer is unavailable to the connected wallet, the UI shows a signer-required state instead of a generic unexpected error.
- [ ] Tests cover pending, verified blocked, verified allowed, mismatched pending ciphertext refs, stale policy sequence, and no-payload leakage.
- [ ] Documentation states that Encrypt pre-alpha decryption request accounts can expose decrypted output values publicly and that this is not production privacy.

## Blocked by

- `docs/issues/066-frontend-official-encrypt-policy-graph-execution.md`
- `docs/issues/067-owner-only-official-encrypt-policy-reveal.md`

## Implementation notes

- Reuse the owner policy reveal account decoding pattern, but apply it to the graph's `pendingAllowedOutput` boolean rather than max-per-run/daily-cap/daily-spent policy values.
- Keep the policy thresholds masked. The only decrypted execution value needed for a decision is the boolean allowed output.
- The transaction that submits `execute_encrypt_policy_graph_as_session` is session-signed. If the connected wallet cannot sign the session key, the frontend should surface an explicit signer-required state or use a dev-only local session signer path that is clearly labeled and never enabled for production.
- Verified allowed should feed the existing official Encrypt lifecycle types: `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`.
- Do not fall back to plaintext/local numeric evaluation while claiming an Official Encrypt verified decision.
