# Confidential DCA Execution Path

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Implement the end-to-end demo path for confidential DCA execution. A user or demo operator should be able to trigger "Run Agent Now", the proxy should evaluate Jupiter market/token context, the contract should enforce confidential policy, and the smart wallet should either execute the approved strategy or block it without revealing private policy values.

The primary demo pair is USDC to SOL. The allow scenario is 5 USDC. The block scenario is 25 USDC.

## Acceptance criteria

- [x] The proxy accepts a DCA run request for USDC to SOL.
- [x] The proxy performs Jupiter token and price prechecks before execution.
- [x] The execution path validates the AI agent session key.
- [x] The execution path checks confidential max-per-run and daily-cap policy before moving funds.
- [x] A 25 USDC run is blocked in the demo policy configuration without revealing the exact threshold.
- [x] A 5 USDC run is allowed in the demo policy configuration.
- [x] The smart wallet PDA is the execution authority for the allowed action.
- [x] If Jupiter Recurring is compatible, the flow uses it for the DCA strategy; otherwise it uses the Polet scheduler plus Swap V2 `/build` fallback.
- [x] Tests cover allow, block, stale session, revoked session, Jupiter precheck failure, and non-leaking block response.

## Completion notes

- Added `POST /intent/dca/run` in the proxy.
- Added `proxy/src/lib/confidential-dca-execution.ts` to coordinate wallet/session lookup, Jupiter Tokens/Price/Swap V2 prechecks, pre-alpha confidential policy witness evaluation, non-leaking blocked responses, and unsigned confidential session transaction construction.
- Added confidential transfer instruction serialization for the contract's `execute_confidential_transfer_as_session` path.
- The allowed path uses the smart wallet PDA as Jupiter `/build` taker/payer and as the Polet contract wallet authority. The proxy returns an unsigned transaction for the session key to sign/send; it does not sign or broadcast.
- Jupiter Recurring remains recorded as incompatible for the MVP because every run must pass Polet policy gating immediately before spending, so the execution path uses Swap V2 `/build` fallback.

Verification: `bun test` and `bun run build` pass in `proxy/`.

Pre-alpha limitation: the proxy mirrors the contract's masked witness policy model for deterministic demo prechecks. This is not production-grade confidentiality until real Encrypt primitives replace the witness path.

## Blocked by

- `002-confidential-numeric-policy-enforcement.md`
- `003-pda-token-custody-usdc-sol-dca.md`
- `004-jupiter-strategy-gateway.md`
