# Agent SDK Strategy Intents

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Extend the Polet SDK so AI agent runtimes can submit DCA and risk-gated swap intents without manually constructing Solana transactions or Jupiter API calls. This enables OpenClaw/Hermes-compatible examples while keeping the SDK backward-compatible with existing intent builders where practical.

## Acceptance criteria

- [x] Existing transfer, swap, stake, and custom intent builders remain available.
- [x] The SDK exposes a `createDcaIntent` builder for USDC to SOL strategy requests.
- [x] The SDK exposes a `createRiskGatedSwapIntent` builder for policy-checked swap requests.
- [x] The SDK exposes a submit helper for sending intents to the Polet proxy.
- [x] The SDK exposes an evaluate helper if the proxy supports evaluation without execution.
- [x] The SDK includes an agent-compatible example suitable for OpenClaw/Hermes-style runtimes.
- [x] Tests cover existing builder compatibility, DCA intent shape, risk-gated swap intent shape, submit helper success, and submit helper failure.

## Blocked by

- `005-confidential-dca-execution-path.md`

## Completion Notes

Issue 006 is complete. The SDK exposes DCA and risk-gated swap intent builders, proxy submission/evaluation helpers, typed proxy errors, Jupiter USDC/SOL constants, and local agent runtime examples while preserving the earlier transfer, swap, stake, unstake, delegate, undelegate, and custom builders. SDK tests and build verification are recorded in `docs/progress.txt`.
