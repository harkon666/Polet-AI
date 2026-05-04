# Jupiter DX Notes

Final report: `docs/jupiter-dx-report.md`.

## Issue 004: Strategy Gateway

Date: 2026-05-04

Scope:

- Integrated Tokens V2 search for USDC/SOL metadata and quality signals.
- Integrated Price V3 for USDC/SOL USD price context.
- Integrated Swap API V2 `/build` as the Polet smart wallet fallback path because it returns raw instructions.
- Recorded Recurring as incompatible for the current MVP execution path until Polet can prove per-run PDA policy gating through a recurring order flow.

Notes:

- The docs clearly position Swap V2 `/build` for custom transaction composition and raw instruction control, which matches Polet's need to wrap execution with confidential policy checks.
- Tokens V2 exposes useful quality fields such as `isVerified`, `organicScore`, tags, holder count, liquidity, and audit fields. The response schema is explicitly subject to change, so the gateway normalizes only the fields Polet currently needs.
- Price V3 uses a compact `ids` query model that is simple to mock and compose with Tokens V2 prechecks.
- Recurring is product-aligned for DCA, but the documented flow is order-centric and fee-bearing. For this MVP, Polet needs each agent-triggered run to pass the confidential smart wallet check immediately before spending, so Swap V2 `/build` is the safer fallback.
- API key handling is straightforward. The proxy validates `JUPITER_API_KEY` before gateway requests so demos fail fast with an actionable configuration error.

Follow-up questions for the final Jupiter DX report:

- Is there a supported Recurring flow where each execution can call an integrator-owned policy gate before funds move?
- Can Recurring expose raw instructions or hooks comparable to Swap V2 `/build` for smart-wallet composition?
- Which Tokens V2 quality fields are stable enough for long-term policy prechecks?
