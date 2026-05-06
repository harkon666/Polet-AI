# Control Layer Frontend Ika dWallet Demo

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Update the consumer demo from a DCA-only wallet view into a control-layer experience that shows Polet approving or blocking agent execution rails. The UI should keep the main experience simple while showing a Sui Ika dWallet signed-intent proof for approved bridgeless requests.

## Acceptance criteria

- [x] The primary UI copy says Polet is a confidential Solana control layer for AI agents.
- [x] DCA remains visible as the Jupiter strategy rail, not the whole product identity.
- [x] The Ika section shows Sui as the primary destination and Ethereum as optional/future.
- [x] A blocked 25 USDC-equivalent Ika request shows no Ika approval and no private thresholds.
- [x] An allowed 5 USDC-equivalent Ika request shows "Ika dWallet message approved" or equivalent pre-alpha signed-intent proof.
- [x] Technical details are available without overwhelming the consumer view: dWallet, message approval account, message hash, signature scheme, and pre-alpha boundary.
- [x] Frontend unit/E2E tests cover the three required demo outcomes.

## Blocked by

- `docs/issues/029-agent-sdk-ika-sui-signed-intent.md`

## Architecture notes

SDK/API should expose technical proof; UI should communicate "agent trading intent approved/signed" with clear pre-alpha disclaimers.

## Implementation Notes

- Reframed the consumer demo copy from DCA-only to "confidential Solana control layer for AI agents".
- Added explicit Jupiter strategy rail and Ika dWallet rail cards; Ika names Sui/SUI as primary and Ethereum/ETH as optional future.
- Added separate Ika 25 USDC-equivalent blocked and 5 USDC-equivalent approved actions.
- Approved Ika activity shows dWallet, MessageApproval, message hash, signature scheme, and pre-alpha non-settlement boundary; blocked Ika activity suppresses approval details and private policy thresholds.

## Verification

- `bun run test src/components/DemoTab.test.tsx` passes in `frontend/`.
- `bun run build` passes in `frontend/`.
- `bunx playwright test` passes in `frontend/` against an escalated local dev server.
