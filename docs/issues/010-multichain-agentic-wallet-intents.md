# Multichain Agentic Wallet Intents

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Extend Polet's strategy intent model so AI agents can express multichain wallet actions without changing the confidential guardrail primitive. A user or agent should be able to describe source chain, source asset, target chain, target asset, amount, and execution rail while Polet still evaluates the same private max-per-run, daily-cap, session, and revocation rules.

This slice should not execute Ika settlement yet. It should create the narrow cross-chain intent shape that later Ika execution can consume.

## Acceptance criteria

- [ ] The SDK exposes a multichain strategy intent builder with `sourceChain`, `sourceAsset`, `targetChain`, `targetAsset`, `amount`, and `executionRail`.
- [ ] The proxy accepts and validates the multichain intent shape.
- [ ] The proxy maps Solana USDC -> SOL intents to the existing Jupiter route/build preview path.
- [ ] The frontend can show a multichain strategy configuration without implying real cross-chain settlement.
- [ ] Tests cover valid multichain intent parsing and invalid chain/asset combinations.
- [ ] Existing single-chain DCA behavior remains unchanged.

## Blocked by

- `009-real-agent-runtime-integration.md`
