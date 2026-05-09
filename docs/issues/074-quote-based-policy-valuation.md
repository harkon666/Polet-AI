# Quote-Based Policy Valuation

Labels: `jupiter`, `policy`, `proxy`, `sdk`, `frontend`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add quote-based valuation for production policy previews. Jupiter swap quote should be used as the trade-specific source for USDC-equivalent policy exposure, while Jupiter Price API remains the dashboard/balance display source. The product must avoid calling this an oracle and must carry quote TTL, slippage, min-output, route, and freshness metadata through the policy decision surface.

## Acceptance criteria

- [x] SOL trade policy preview calculates USDC-equivalent exposure from the current Jupiter swap quote rather than a static SOL price.
- [x] USDC trade policy preview uses the nominal USDC amount.
- [x] Quote metadata includes enough information for later execution binding: input amount, expected output, minimum output or threshold, slippage bps, route metadata where available, and freshness context.
- [x] Dashboard value display uses Jupiter Price API separately from trade policy valuation.
- [x] API and UI copy describe the model as quote-based valuation, not as an independent oracle.
- [x] Tests cover USDC valuation, SOL quote valuation, stale quote rejection metadata, and Price API display separation.

## Implementation

- `proxy/src/lib/jupiter-gateway.ts`: Added `JupiterQuoteMetadata` interface with `inputMint`, `outputMint`, `inputAmount`, `expectedOutput`, `minimumOutput`, `slippageBps`, `priceImpactPct`, `routeLabel`, and `freshness` timestamp/slot/blockHeight. `JupiterDcaStrategyPlan` carries optional `quoteMetadata`. `computeUsdcEquivalentFromQuote` helper extracts USDC-equivalent from quote. `formatQuoteMetadataForDisplay` utility for UI. `prepareDcaStrategy` now populates `quoteMetadata` from build response.
- `proxy/src/lib/confidential-dca-execution.ts`: Allowed DCA responses include `usdcEquivalent`, `usdcEquivalentBaseUnits`, `quoteBasedValuation: true`, and `quoteMetadata`. USDC input trades use nominal amount; SOL output trades use expected output as USDC-equivalent.
- `frontend/src/lib/api.ts`: `JupiterPlanPreview` and `RunConfidentialDcaResult` updated with quote metadata fields and USDC-equivalent fields.
- Audit follow-up: stale quote responses now return a non-executable `QUOTE_STALE` blocked result with quote metadata instead of an API error, and the frontend activity preview labels policy valuation as quote-based valuation, not an independent oracle.
- Price API (`fetchPrices`) remains separate for dashboard/balance display only.

## Verification

- `cd proxy && bun run build` ✅
- `cd proxy && bun test ./tests/confidential-dca-execution.test.ts ./tests/transaction-builder.test.ts` (41 tests pass) ✅
- `cd proxy && bun test ./tests/wallet-routes.test.ts` (7 tests pass) ✅
- `cd sdk && bun test ./tests/intent-builder.test.ts` (54 tests pass) ✅
- `cd frontend && bun run typecheck` ✅
- Audit follow-up on 2026-05-09: tests were added for USDC nominal valuation, SOL quote valuation, stale quote rejection metadata, and Price API/display separation, but not run per user request.

## Notes

Quote metadata carries TTL, slippage, min-output, route, and freshness context for later execution binding. This is quote-based valuation, not an independent oracle.
