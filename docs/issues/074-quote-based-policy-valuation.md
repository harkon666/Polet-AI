# Quote-Based Policy Valuation

Labels: `needs-triage`, `jupiter`, `policy`, `proxy`, `sdk`, `frontend`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add quote-based valuation for production policy previews. Jupiter swap quote should be used as the trade-specific source for USDC-equivalent policy exposure, while Jupiter Price API remains the dashboard/balance display source. The product must avoid calling this an oracle and must carry quote TTL, slippage, min-output, route, and freshness metadata through the policy decision surface.

## Acceptance criteria

- [ ] SOL trade policy preview calculates USDC-equivalent exposure from the current Jupiter swap quote rather than a static SOL price.
- [ ] USDC trade policy preview uses the nominal USDC amount.
- [ ] Quote metadata includes enough information for later execution binding: input amount, expected output, minimum output or threshold, slippage bps, route metadata where available, and freshness context.
- [ ] Dashboard value display uses Jupiter Price API separately from trade policy valuation.
- [ ] API and UI copy describe the model as quote-based valuation, not as an independent oracle.
- [ ] Tests cover USDC valuation, SOL quote valuation, stale quote rejection metadata, and Price API display separation.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
