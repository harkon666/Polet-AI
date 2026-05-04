# Agent SDK Strategy Intents

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Extend the Polet SDK so AI agent runtimes can submit DCA and risk-gated swap intents without manually constructing Solana transactions or Jupiter API calls. This enables OpenClaw/Hermes-compatible examples while keeping the SDK backward-compatible with existing intent builders where practical.

## Acceptance criteria

- [ ] Existing transfer, swap, stake, and custom intent builders remain available.
- [ ] The SDK exposes a `createDcaIntent` builder for USDC to SOL strategy requests.
- [ ] The SDK exposes a `createRiskGatedSwapIntent` builder for policy-checked swap requests.
- [ ] The SDK exposes a submit helper for sending intents to the Polet proxy.
- [ ] The SDK exposes an evaluate helper if the proxy supports evaluation without execution.
- [ ] The SDK includes an agent-compatible example suitable for OpenClaw/Hermes-style runtimes.
- [ ] Tests cover existing builder compatibility, DCA intent shape, risk-gated swap intent shape, submit helper success, and submit helper failure.

## Blocked by

- `005-confidential-dca-execution-path.md`
