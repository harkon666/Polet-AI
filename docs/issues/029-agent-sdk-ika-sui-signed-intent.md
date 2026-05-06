# Agent SDK Ika Sui Signed Intent

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Make OpenClaw/Hermes-style agents feel the new Ika rail through the Polet SDK. The high-level agent API should submit Sui-primary bridgeless trading intents, return `blocked` when confidential guardrails fail, and return a pre-alpha dWallet signed-intent approval result when Polet builds or confirms the Ika approval path.

## Acceptance criteria

- [ ] `createPoletAgent().trade({ rail: "ika", to: { chain: "sui", asset: "SUI" } })` uses the canonical order and proxy transaction builder.
- [ ] The SDK exposes structured statuses for `blocked`, `message-approved`, `signature-produced-prealpha`, and devnet smoke proof when available.
- [ ] The result includes technical proof fields for agent runtimes without leaking policy thresholds or witness bytes.
- [ ] The local CLI runtime has `ika-sui` and `hybrid` scenarios that show block, Jupiter allow, and Ika signed-intent allow.
- [ ] Example docs show how OpenClaw/Hermes-style agents call the SDK and interpret results.
- [ ] Tests cover Sui success, policy block, unsupported destination, expired order, and response normalization.

## Blocked by

- `docs/issues/028-proxy-ika-dwallet-transaction-builder.md`

## Architecture notes

This is not a full OpenClaw or Hermes plugin. The deliverable is a generic SDK and CLI adapter that any agent runtime can call.

