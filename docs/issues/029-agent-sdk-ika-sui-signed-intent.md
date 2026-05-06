# Agent SDK Ika Sui Signed Intent

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Make OpenClaw/Hermes-style agents feel the new Ika rail through the Polet SDK. The high-level agent API should submit Sui-primary bridgeless trading intents, return `blocked` when confidential guardrails fail, and return a pre-alpha dWallet signed-intent approval result when Polet builds or confirms the Ika approval path.

## Acceptance criteria

- [x] `createPoletAgent().trade({ rail: "ika", to: { chain: "sui", asset: "SUI" } })` uses the canonical order and proxy transaction builder.
- [x] The SDK exposes structured statuses for `blocked`, `approval-transaction-prepared`, `approval-submitted`, `signature-pending`, `signature-produced-prealpha`, and devnet smoke proof when available.
- [x] The result includes technical proof fields for agent runtimes without leaking policy thresholds or witness bytes.
- [x] The local CLI runtime has `ika-sui` and `hybrid` scenarios that show block, Jupiter allow, and Ika signed-intent allow.
- [x] Example docs show how OpenClaw/Hermes-style agents call the SDK and interpret results.
- [x] Tests cover Sui success, policy block, unsupported destination, expired order, and response normalization.

## Blocked by

- `docs/issues/028-proxy-ika-dwallet-transaction-builder.md`

## Architecture notes

This is not a full OpenClaw or Hermes plugin. The deliverable is a generic SDK and CLI adapter that any agent runtime can call.

## Implementation Notes

- `createPoletAgent().trade({ rail: "ika", ... })` now validates the MVP route as Solana USDC -> Sui SUI before calling the proxy.
- Allowed Ika results expose `details.proof` with dWallet, canonical order hash, message hash, MessageApproval account, CPI authority, signature scheme, destination, optional unsigned Polet approval transaction, and optional devnet smoke proof.
- High-level trade results redact `encryptionWitness` from returned `execution.intent`.
- The local runtime accepts `POLET_AGENT_SCENARIO=ika-sui`; `ika` remains a compatibility alias.

## Verification

- `bun test` passes in `sdk/`.
- `bun run build` passes in `sdk/`.
