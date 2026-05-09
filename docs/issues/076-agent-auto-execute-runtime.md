# Agent Auto-Execute Runtime

Labels: `needs-triage`, `agent-runtime`, `sdk`, `proxy`, `smart-wallet`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Extend the SDK and local agent runtime so a manual external agent wallet can auto-execute approved trades. The runtime should request a trade through Polet, receive an allowed unsigned transaction, simulate it, sign with the configured agent private key, and broadcast only when required signers match and simulation succeeds.

The frontend should not be required in the execution loop.

## Acceptance criteria

- [ ] SDK exposes a clear auto-execute path for allowed Polet trade results using an explicit external agent signer provider.
- [ ] Runtime refuses to broadcast when required signers do not include the configured agent signer or when required signers are missing.
- [ ] Runtime simulates the transaction before signing/broadcasting and stops on simulation error.
- [ ] Runtime handles blocked, pending, stale quote, insufficient balance, and revoked session responses without leaking private thresholds.
- [ ] Runtime records submitted transaction signatures and normalized execution outcomes.
- [ ] Tests cover happy-path auto-execute, signer-required failure, simulation failure, blocked policy response, and revoked session response.

## Blocked by

- `docs/issues/075-policy-gated-custody-trade-execution.md`
