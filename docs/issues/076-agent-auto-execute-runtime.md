# Agent Auto-Execute Runtime

Labels: `needs-triage`, `agent-runtime`, `sdk`, `proxy`, `smart-wallet`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Extend the SDK and local agent runtime so a manual external agent wallet can auto-execute approved trades. The runtime should request a trade through Polet, receive an allowed unsigned transaction, simulate it, sign with the configured agent private key, and broadcast only when required signers match and simulation succeeds.

The frontend should not be required in the execution loop.

## Acceptance criteria

- [x] SDK exposes a clear auto-execute path for allowed Polet trade results using an explicit external agent signer provider.
- [x] Runtime refuses to broadcast when required signers do not include the configured agent signer or when required signers are missing.
- [x] Runtime simulates the transaction before signing/broadcasting and stops on simulation error.
- [x] Runtime handles blocked, pending, stale quote, insufficient balance, and revoked session responses without leaking private thresholds.
- [x] Runtime records submitted transaction signatures and normalized execution outcomes.
- [x] Tests cover happy-path auto-execute, signer-required failure, simulation failure, blocked policy response, and revoked session response.

## Implementation note

Completed on 2026-05-09. Added SDK `autoExecuteTrade` support on `createPoletAgentKit` with explicit `agentSigner`, required-signer validation, simulation-before-signing, signing/broadcast through the external agent signer only, submitted signature recording, and normalized non-execution outcomes for blocked, pending, needs-approval, not-supported, signer-required, simulation-failed, and failed paths. Local scripted runtime now exposes `runDcaAutoExecuteScenario` so the frontend is not required in the execution loop. Added SDK tests for happy path, wrong signer, simulation failure, blocked policy, revoked session, and runtime auto-execute wiring.

Verification this pass: `cd sdk && bun run build` ✅. Tests were added but not run per operator instruction to avoid non-smart-contract test execution.

## Blocked by

- `docs/issues/075-policy-gated-custody-trade-execution.md`
