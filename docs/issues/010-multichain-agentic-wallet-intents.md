# Multichain Agentic Wallet Intents

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Extend Polet's strategy intent model so AI agents can express multichain wallet actions without changing the confidential guardrail primitive. A user or agent should be able to describe source chain, source asset, target chain, target asset, amount, and execution rail while Polet still evaluates the same private max-per-run, daily-cap, session, and revocation rules.

This slice should not execute Ika settlement yet. It should create the narrow cross-chain intent shape that later Ika execution can consume.

## Acceptance criteria

- [x] The SDK exposes a multichain strategy intent builder with `sourceChain`, `sourceAsset`, `targetChain`, `targetAsset`, `amount`, and `executionRail`.
- [x] The proxy accepts and validates the multichain intent shape.
- [x] The proxy maps Solana USDC -> SOL intents to the existing Jupiter route/build preview path.
- [x] The frontend can show a multichain strategy configuration without implying real cross-chain settlement.
- [x] Tests cover valid multichain intent parsing and invalid chain/asset combinations.
- [x] Existing single-chain DCA behavior remains unchanged.

## Blocked by

- `009-real-agent-runtime-integration.md`

## Completion note

Implemented as a narrow, non-settlement slice:

- SDK builder: `createMultichainStrategyIntent`.
- Proxy route: `POST /intent/multichain/run`.
- Current executable mapping: Solana USDC -> SOL on `jupiter` rail maps to the existing confidential DCA route/build preview path.
- Ika/cross-chain settlement remains intentionally unexecuted for issue 011.
