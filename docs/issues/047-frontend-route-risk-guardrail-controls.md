# Frontend Route Risk Guardrail Controls

Labels: `done`

Type: `frontend`

## Parent

`docs/prd.md`

## What was built

Added frontend controls for public Ika route-risk guardrails. The strategy panel now includes compact controls for slippage (bps), max price impact (bps), minimum liquidity score (Low/Medium/High select), and verified-route requirement (checkbox). These values feed into the Ika `routeRisk` and `riskGuardrails` parameters sent to the proxy on each request.

## Acceptance criteria

- [x] The frontend provides compact controls for slippage bps, max price impact bps, minimum liquidity score, and verified route requirement.
- [x] Ika requests include the selected route-risk metadata and risk guardrail policy.
- [x] Safe values produce a passed route-risk status in the approved preview.
- [x] Unsafe values block before Ika approval construction and show no dWallet approval data.
- [x] Tests cover safe risk, high slippage block, high price-impact block, low liquidity block, and unverified-route block.

## Blocked by

- `docs/issues/046-frontend-ika-optional-route-ui.md`

## Implementation notes

- These are public route guardrails, not encrypted allowlist or confidential numeric policy values.
- Route risk controls are in the Strategy panel above the Ika action buttons.
- Controls bind into `routeRiskDraft` state and are passed through `slippageBps`, `routeRisk`, and `riskGuardrails` on Ika requests.

