# Jupiter Strategy Gateway

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Create an isolated Jupiter strategy gateway in the proxy that supports Polet's DCA strategy flow. The gateway should use Jupiter APIs as a composed strategy layer, not just a basic swap wrapper.

It should check token and market context with Jupiter Tokens and Price APIs, probe whether Jupiter Recurring can support the desired smart wallet flow, and fall back to Swap V2 `/build` for immediate or scheduler-driven execution.

## Acceptance criteria

- [ ] The proxy has a Jupiter gateway module with a small testable interface.
- [ ] The gateway can fetch token metadata, verification/risk-like fields, or equivalent token quality data from Jupiter Tokens API.
- [ ] The gateway can fetch price data for USDC and SOL through Jupiter Price API.
- [ ] The gateway records whether Jupiter Recurring is compatible with the Polet smart wallet flow.
- [ ] The gateway can request Swap V2 `/build` instructions for USDC to SOL with the Polet wallet/taker model.
- [ ] Jupiter API key configuration is documented and validated at startup or request time.
- [ ] Tests mock Jupiter APIs and cover success, API failure, missing API key, and fallback path selection.
- [ ] DX notes are captured during implementation for the later Jupiter report.

## Blocked by

None - can start immediately.
