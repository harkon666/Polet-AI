# Ika Bridgeless Execution Request

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add an Ika-oriented execution request path for approved multichain intents. After Polet approves an AI agent action through confidential guardrails, the proxy should produce a structured bridgeless execution request that represents the native source asset, target asset, route intent, policy attestation metadata, and session context needed by an Ika integration.

This slice should be honest about settlement status: it can prepare and display an Ika request envelope, but it must not claim real bridgeless trading unless an actual Ika execution backend is connected and verified.

## Acceptance criteria

- [ ] Approved multichain intents can return an `executionRail: "ika-bridgeless"` payload.
- [ ] The Ika request envelope includes source chain, source asset, target chain, target asset, amount, owner, session key, policy sequence, and non-leaking policy status.
- [ ] Blocked multichain intents return safe non-leaking errors and do not create Ika execution requests.
- [ ] The frontend can display "bridgeless route requested" and the execution boundary without exposing private thresholds.
- [ ] Tests cover allowed request creation, blocked request suppression, stale session rejection, and safe response shape.

## Blocked by

- `010-multichain-agentic-wallet-intents.md`
