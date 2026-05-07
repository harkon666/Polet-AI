# Official Encrypt No-Witness Manual E2E Readiness

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md`

## What to build

Prepare the repo for another full manual end-to-end test after issue `054` removes static `encryptionWitness` from the primary path. This issue should verify and polish the frontend, proxy, SDK, docs, and runbooks so a human can run the official Encrypt pre-alpha demo without hand-editing request payloads or reintroducing `[1,2,3,...,32]` witness arrays.

The target manual path is: configure or register official Encrypt pre-alpha ciphertext policy inputs, grant a session, run 25 USDC blocked, run 5 USDC Jupiter preview, run 5 USDC-equivalent Sui Ika pending/verified allowed/verified blocked scenarios, prove shared quorum behavior, simulate or sign the unsigned Polet approval transaction when a session signer is explicitly available, and collect evidence without claiming production privacy, production MPC, or settlement.

## Acceptance criteria

- [ ] Frontend primary demo never constructs or submits static `encryptionWitness` arrays for official Encrypt-configured wallets.
- [ ] Frontend shows official Encrypt setup/status, pending, verified blocked, verified allowed, quorum required, quorum satisfied, and signer-required states with no private thresholds, decrypted caps, witness bytes, dWallet data on blocked/pending, or executable payload leakage.
- [ ] Proxy DCA and Ika routes accept official Encrypt-configured wallets without `encryptionWitness`, return stable lifecycle statuses, and still reject missing witness only for explicitly named masked-witness fallback/dev routes.
- [ ] SDK `createPoletAgent()`, `createPoletAgentKit()`, local runner, and examples can run official no-witness DCA/Ika requests and normalize `pending-encrypt-execution`, `encrypt-verified-blocked`, `encrypt-verified-allowed`, `needs-approval`, `preview-ready`, `approval-transaction-prepared`, `signer-required`, `submitted`, and `failed`.
- [ ] Docs and runbooks provide exact manual E2E steps, required env vars, expected proxy/frontend outputs, evidence filenames, and failure triage for official Encrypt pre-alpha no-witness runs.
- [ ] Automated tests cover frontend rendering, proxy route behavior, SDK normalization, and E2E harness flow for no-witness official Encrypt states.
- [ ] Regression scan or tests prove primary docs/examples/frontend fixtures do not include `POLET_ENCRYPTION_WITNESS`, `encryptionWitness: [1,2,3,...,32]`, or `Array.from({ length: 32 }, (_, index) => index + 1)` outside explicitly named legacy/dev fixture tests.
- [ ] Manual E2E checklist includes devnet cluster, Encrypt gRPC endpoint, Encrypt program id, Polet program id, wallet PDA, session signer, Ika dWallet, MessageApproval, CPI authority, unsigned transaction signer list, simulation result, and explorer link when a transaction is sent.
- [ ] The runbook states that Encrypt and Ika are pre-alpha, production privacy/MPC are not claimed, and settlement remains `not-executed` unless a separate destination broadcast demo is explicitly enabled.

## Blocked by

- `054-official-encrypt-policy-inputs-without-static-witness`

## Existing related work

- `docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`
- `docs/issues/053-agent-sdk-integration-kit.md`
- `docs/issues/054-official-encrypt-policy-inputs-without-static-witness.md`
- `docs/issues/048-frontend-official-encrypt-status-surface.md`
- `docs/issues/024-consumer-frontend-e2e-demo-coverage.md`
- `docs/ika-devnet-smoke-runbook.md`
- `docs/agent-runtime.md`

## Grill decisions

Recommended dependency stance: do not start this before `054` lands, because this issue validates the new no-witness official path rather than designing it.

Recommended scope: one vertical verification/polish issue across frontend, proxy, SDK, docs, and tests. The output should be a repeatable manual E2E checklist plus automated coverage that prevents static witness arrays from returning to the primary path.

Recommended demo stance: official Encrypt no-witness is the primary path. Masked witness may appear only in explicitly named legacy/dev fixture tests and must not be shown as the hackathon evidence path.
