# Ika Pre-Alpha Policy-Gated Signing

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add the first real Ika Solana Pre-Alpha integration proof: after a Polet guarded Ika trade intent passes policy, Polet should prepare or execute the Ika `approve_message` path so the project can demonstrate Solana-enforced policy gating before an Ika dWallet signing request.

This slice should move beyond an Ika-shaped JSON envelope, but it must still be honest about the Ika Pre-Alpha boundary. Ika Pre-Alpha uses Solana devnet and a mock signer, not production distributed MPC. The goal is to prove the control-layer integration point: Polet policy approval leads to an Ika message approval/signature workflow.

## Acceptance criteria

- [x] Polet defines an Ika Pre-Alpha signing request model that includes dWallet account, message digest, user public key, signature scheme, message approval PDA, and pre-alpha environment metadata.
- [x] Contract or proxy integration derives/accepts the Ika CPI authority/message approval accounts needed for the Ika Pre-Alpha `approve_message` flow.
- [x] A policy-allowed Ika trade intent can produce a normalized SDK/proxy status of `approval-transaction-prepared`, `approval-submitted`, `signature-pending`, or `signature-produced-prealpha` after the Polet guardrail passes.
- [x] A policy-blocked Ika trade intent never prepares or submits an Ika message approval.
- [x] The response shape distinguishes `request-prepared`, `approval-transaction-prepared`, `approval-submitted`, `signature-pending`, and `signature-produced-prealpha` where applicable.
- [x] Tests cover allowed approval preparation, blocked suppression, account/PDA derivation, and non-leaking blocked responses.
- [x] Docs clearly state that Ika Pre-Alpha uses a mock signer and does not provide production MPC security or final settlement guarantees.

## Blocked by

- `018-agent-trade-sdk-adapters.md`

## Architecture notes

Relevant Ika Pre-Alpha facts:

- Solana devnet endpoint is supported by Ika Pre-Alpha.
- Ika dWallet signing is controlled by Solana programs through a CPI authority PDA.
- A program calls `approve_message` when its policy conditions pass.
- Ika writes the produced signature into a `MessageApproval` account.
- In Pre-Alpha, signing uses a single mock signer and interfaces/data may change.

Target shape:

- Polet remains the control layer: session, policy, allow/block, and audit vocabulary stay in Polet.
- Ika remains an execution rail adapter: message approval/signature-specific details are isolated.
- The SDK should surface this as an Ika rail progression rather than a separate low-level Ika API.

Non-goals:

- Do not claim real decentralized MPC security.
- Do not claim final bridgeless settlement.
- Do not implement lending, borrowing, RWA collateral, or encrypted allowlist/blocklist membership.

## Implementation notes

- Added `proxy/src/lib/ika-prealpha-signing.ts` with a deterministic Ika Solana Pre-Alpha signing request model.
- The proxy now derives a mock Pre-Alpha Ika dWallet account, CPI authority PDA, message approval PDA, and message digest after Polet confidential guardrails approve the Ika intent.
- Issue 040 superseded the original unsigned status wording. Allowed Ika proxy responses now include `status: "approval-transaction-prepared"` plus `ikaRequest.preAlphaSigning`; blocked policy/session responses still omit all Ika approval data.
- The SDK trade API now recognizes Ika rail progression statuses: `request-prepared`, `approval-transaction-prepared`, `approval-submitted`, `signature-pending`, and `signature-produced-prealpha`.
- Docs and runner output state that this is Solana devnet/mock-signer Pre-Alpha metadata only, not production MPC or final settlement.

## Verification

- `bun test` and `bun run build` pass in `proxy/`.
- `bun test` and `bun run build` pass in `sdk/`.
