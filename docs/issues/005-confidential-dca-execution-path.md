# Confidential DCA Execution Path

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Implement the end-to-end demo path for confidential DCA execution. A user or demo operator should be able to trigger "Run Agent Now", the proxy should evaluate Jupiter market/token context, the contract should enforce confidential policy, and the smart wallet should either execute the approved strategy or block it without revealing private policy values.

The primary demo pair is USDC to SOL. The allow scenario is 5 USDC. The block scenario is 25 USDC.

## Acceptance criteria

- [ ] The proxy accepts a DCA run request for USDC to SOL.
- [ ] The proxy performs Jupiter token and price prechecks before execution.
- [ ] The execution path validates the AI agent session key.
- [ ] The execution path checks confidential max-per-run and daily-cap policy before moving funds.
- [ ] A 25 USDC run is blocked in the demo policy configuration without revealing the exact threshold.
- [ ] A 5 USDC run is allowed in the demo policy configuration.
- [ ] The smart wallet PDA is the execution authority for the allowed action.
- [ ] If Jupiter Recurring is compatible, the flow uses it for the DCA strategy; otherwise it uses the Polet scheduler plus Swap V2 `/build` fallback.
- [ ] Tests cover allow, block, stale session, revoked session, Jupiter precheck failure, and non-leaking block response.

## Blocked by

- `002-confidential-numeric-policy-enforcement.md`
- `003-pda-token-custody-usdc-sol-dca.md`
- `004-jupiter-strategy-gateway.md`
