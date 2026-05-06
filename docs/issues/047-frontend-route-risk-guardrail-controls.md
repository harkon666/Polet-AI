# Frontend Route Risk Guardrail Controls

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add frontend controls for public Ika route-risk guardrails. Users should be able to adjust slippage, max price impact, minimum liquidity score, and verified-route requirement before submitting Ika demo requests. The UI should bind those controls into the canonical order path through the proxy and show safe block reasons.

These are public route guardrails, not encrypted allowlist or confidential numeric policy values.

## Acceptance criteria

- [ ] The frontend provides compact controls for slippage bps, max price impact bps, minimum liquidity score, and verified route requirement.
- [ ] Ika requests include the selected route-risk metadata and risk guardrail policy.
- [ ] Safe values produce a passed route-risk status in the approved preview.
- [ ] Unsafe values block before Ika approval construction and show no dWallet approval data.
- [ ] Tests cover safe risk, high slippage block, high price-impact block, low liquidity block, and unverified-route block.

## Blocked by

- `docs/issues/046-frontend-ika-optional-route-ui.md`

