# Hackathon Ika and Encrypt Pre-Alpha Integration

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Make the hackathon demo prove one coherent Ika x Encrypt pre-alpha path: an AI agent submits a Solana USDC to Sui/Ethereum intent, Polet evaluates the policy through the official Encrypt lifecycle when configured, and Ika dWallet approval data is prepared only after Encrypt returns a verified allowed state. Pending or verified blocked Encrypt states must suppress dWallet, MessageApproval, unsigned approval transactions, Jupiter payloads, private thresholds, and witness bytes.

This issue does not require claiming production FHE, production MPC, or real bridgeless settlement. The product should present masked-witness policy evaluation as a fallback/dev fixture, while the hackathon evidence path highlights official Encrypt pre-alpha lifecycle semantics for Ika approval preparation.

## Acceptance criteria

- [ ] A demo setup path exists for configuring an official Encrypt pre-alpha policy state on the Polet wallet without relying on the masked-witness fallback as the primary Ika approval gate.
- [ ] The Ika intent path can return `pending-encrypt-execution` for unresolved Encrypt graph output and does not expose dWallet, MessageApproval, unsigned transaction, destination digest, private threshold, remaining cap, or witness material in that state.
- [ ] The Ika intent path can return `encrypt-verified-blocked` and proves blocked output suppresses Ika approval data and unsigned approval transactions.
- [ ] The Ika intent path can return `encrypt-verified-allowed` and only then prepares the Ika approval artifacts: canonical order hash, Ika message hash, dWallet account, MessageApproval PDA, CPI authority PDA, and unsigned Polet approval transaction for the session signer.
- [ ] Shared Ika approval quorum still applies after verified Encrypt allowed output, so a missing co-approver proof returns `IKA_APPROVAL_QUORUM_REQUIRED` before dWallet approval data is prepared.
- [ ] SDK/Hermes-facing responses clearly label `intentStrategy` separately from `executionRail`, so `strategy: dca` is not misread as “Ika has a DCA strategy.”
- [ ] Frontend activity cards and proxy/API responses never display `encryptionWitness`, private max-per-run, daily cap, or decrypted remaining cap in any Encrypt lifecycle state.
- [ ] A hackathon runbook section documents the exact evidence to capture: pending, verified blocked, verified allowed, quorum required, quorum satisfied, unsigned approval signer, and devnet transaction/explorer links where applicable.
- [ ] Tests cover the pending, verified blocked, verified allowed, quorum-required, and quorum-satisfied Ika x Encrypt outcomes across proxy, SDK normalization, and frontend rendering.
- [ ] Documentation states explicitly that Encrypt and Ika are pre-alpha here: no production privacy guarantee, no production MPC claim, and settlement remains `not-executed` unless a separate destination broadcast demo is explicitly enabled.

## Blocked by

None - can start immediately

## Existing related work

- `docs/issues/041-official-encrypt-policy-graph-execution.md`
- `docs/issues/048-frontend-official-encrypt-status-surface.md`
- `docs/issues/050-contract-official-encrypt-verified-ika-cpi-lifecycle.md`
- `docs/issues/051-encrypt-test-harness-compatibility.md`
- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Grill decisions

Recommended scope: keep this as one end-to-end vertical hackathon integration issue. Do not split it into separate contract/proxy/frontend tickets unless implementation proves too large, because the value being judged is the coherent demo boundary: Encrypt verified output gates Ika approval artifacts.

Recommended policy stance: official Encrypt pre-alpha is the primary story for Ika approval readiness; masked-witness remains a compatibility fallback and local fixture. The UI and SDK must not imply that `[1..32]` witness bytes are produced by Encrypt official.

Recommended Ika stance: Ika is the dWallet approval rail, not the DCA strategy engine. DCA is an intent strategy label; Ika approval artifacts are a rail-specific result after Polet policy approval.

Recommended evidence stance: show transaction success and artifacts, but keep settlement language strict. `approval-transaction-prepared` is acceptable; “asset settlement completed” is not.

## Implementation notes

- 2026-05-07: Added explicit `intentStrategy` labeling to Ika bridgeless proxy responses and SDK/Hermes normalized result details, separate from `executionRail: "ika-bridgeless"`, so `strategy: "dca"` is not presented as an Ika strategy. Updated proxy/SDK tests and the Ika devnet smoke runbook evidence checklist.
- 2026-05-07: Added targeted proxy coverage for `encrypt-verified-blocked` Ika suppression and shared quorum enforcement after `encrypt-verified-allowed`, plus SDK normalization coverage for pending and verified-blocked official Encrypt Ika responses. The runbook now points to the deterministic proxy/SDK commands that prove pending, verified-blocked, verified-allowed, quorum-required, quorum-satisfied, and safe redaction behavior before manual devnet evidence is collected.
