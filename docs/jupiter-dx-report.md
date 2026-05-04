# Jupiter DX Report

Date: 2026-05-04

Project: Polet AI confidential DCA smart wallet for AI agents.

## Integration Scope

Polet used Jupiter as the execution and market intelligence layer for the USDC -> SOL DCA demo:

- Tokens V2 for token metadata, verification, quality, tags, holder/liquidity/audit signals where available.
- Price V3 for compact USDC/SOL price context before the policy-gated run.
- Recurring as the preferred product direction for DCA, evaluated for compatibility.
- Swap API V2 `/build` as the current MVP fallback because it gives raw instruction control for smart-wallet composition.

## Onboarding Time

The first gateway slice took one implementation pass to isolate behind `proxy/src/lib/jupiter-gateway.ts`, add deterministic tests, and wire the DCA execution path. Most time went into shaping Jupiter responses into a stable Polet-owned preview type and deciding the Recurring vs Swap V2 boundary for smart-wallet policy gating.

## API Key Setup

API key handling was straightforward. The proxy validates `JUPITER_API_KEY` before making gateway requests, so local demos fail fast with an actionable `JUPITER_API_KEY_MISSING` error instead of surfacing vague downstream failures.

Recommended improvement: provide a small "minimum viable environment" checklist in Jupiter docs for hackathon teams that lists which APIs require keys, expected header shape, and common local failure modes such as 401, 403, and 429.

## Docs Friction

Swap V2 `/build` was the clearest fit for Polet because custom transaction composition and raw instruction control are central to smart-wallet execution. Tokens V2 and Price V3 were easy to mock and test because their request shape is compact.

The main friction was Recurring compatibility. Recurring is product-aligned for DCA, but the documented flow appears order-centric. Polet needs each agent-triggered spend to pass a confidential policy check immediately before funds move. The docs did not make it obvious whether an integrator-owned policy hook, delegated smart-wallet signer, or raw instruction handoff is supported for every recurring execution.

## API Edge Cases

- Tokens V2 response fields are useful but broad. Polet normalizes only the fields it needs because some quality and audit fields may change.
- Price V3 missing-price responses must be treated as failed prechecks, not silently ignored.
- Swap V2 route/build failures should surface the Jupiter HTTP status and a bounded response body for operator debugging.
- Rate limits should be visible in proxy errors. The tests cover HTTP 429 propagation.

## AI Stack Feedback

The APIs were friendly to AI-assisted integration when the task was framed as typed boundary modules plus tests. The most reliable pattern was:

- Keep raw Jupiter responses inside a gateway module.
- Normalize a small preview object for the proxy/frontend.
- Inject `fetch` in tests so agent-written tests do not depend on live Jupiter availability.
- Make Recurring compatibility an explicit object in the plan, not an implicit fallback.

## Missing Features Or Clarifications

- A documented Recurring hook for smart-wallet policy gates before each execution.
- A Recurring mode that exposes raw instructions or an equivalent handoff for PDA/smart-wallet composition.
- Stability guidance for Tokens V2 quality fields: which fields are contractual vs best-effort.
- A compact table comparing `/build`, `/order`, `/execute`, and Recurring for smart-wallet integrators.
- Example code for a smart-wallet/PDA taker flow that never requires the backend to sign user funds.

## Actionable Recommendations

1. Add a Recurring "policy-gated smart wallet" guide showing whether and how every execution can call an integrator policy gate.
2. Publish a Swap V2 `/build` example that returns raw instructions for a PDA taker and explains signer expectations.
3. Label Tokens V2 fields by stability tier so policy engines can decide which fields are safe to depend on.
4. Add a hackathon quickstart with API key setup, rate limit behavior, and sample test fixtures.
5. Document recommended error mapping for integrators: auth failure, rate limit, invalid mint, no route, malformed build response.

## Current Polet Decision

Polet records Recurring as incompatible for the current MVP execution path and uses Swap V2 `/build` as the fallback. This is intentional: the demo must prove confidential policy gating immediately before each smart-wallet spend. Recurring remains the preferred product direction once that policy hook or raw instruction handoff is verified.
