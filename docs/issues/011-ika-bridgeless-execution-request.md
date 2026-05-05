# Ika Bridgeless Execution Request

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Add an Ika-oriented execution request path for approved multichain intents. After Polet approves an AI agent action through confidential guardrails, the proxy should produce a structured bridgeless execution request that represents the native source asset, target asset, route intent, policy attestation metadata, and session context needed by an Ika integration.

This slice should be honest about settlement status: it can prepare and display an Ika request envelope, but it must not claim real bridgeless trading unless an actual Ika execution backend is connected and verified.

## Acceptance criteria

- [x] Approved multichain intents can return an `executionRail: "ika-bridgeless"` payload.
- [x] The Ika request envelope includes source chain, source asset, target chain, target asset, amount, owner, session key, policy sequence, and non-leaking policy status.
- [x] Blocked multichain intents return safe non-leaking errors and do not create Ika execution requests.
- [x] The frontend can display "bridgeless route requested" and the execution boundary without exposing private thresholds.
- [x] Tests cover allowed request creation, blocked request suppression, stale session rejection, and safe response shape.

## Blocked by

- `010-multichain-agentic-wallet-intents.md`

## Completion note

Implemented as a non-settlement Ika request slice:

- Proxy route `POST /intent/multichain/run` now branches `executionRail: "ika"` into a confidential guardrail check and returns an `ika-bridgeless` envelope only when approved.
- The envelope includes source/target chain and asset, amount, owner, session key, smart wallet authority, policy sequence, policy commitment, non-leaking approved status, and explicit `settlement: "not-executed"` boundary text.
- Blocked policy/session results return safe non-leaking responses and omit `ikaRequest`.
- Frontend demo can request and display the Ika bridgeless envelope boundary separately from the Jupiter route/build preview.

Verification:

- `bun test ./tests/ika-bridgeless-request.test.ts ./tests/intent-parser.test.ts` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
- `bun test` and `bun run build` pass in `sdk/`.
- `bun run test` passes in `frontend/` with Vitest's existing post-run hanging-process warning.
- `bun run build` passes in `frontend/`.
