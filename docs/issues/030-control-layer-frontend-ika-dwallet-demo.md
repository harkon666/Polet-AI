# Control Layer Frontend Ika dWallet Demo

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Update the consumer demo from a DCA-only wallet view into a control-layer experience that shows Polet approving or blocking agent execution rails. The UI should keep the main experience simple while showing a Sui Ika dWallet signed-intent proof for approved bridgeless requests.

## Acceptance criteria

- [ ] The primary UI copy says Polet is a confidential Solana control layer for AI agents.
- [ ] DCA remains visible as the Jupiter strategy rail, not the whole product identity.
- [ ] The Ika section shows Sui as the primary destination and Ethereum as optional/future.
- [ ] A blocked 25 USDC-equivalent Ika request shows no Ika approval and no private thresholds.
- [ ] An allowed 5 USDC-equivalent Ika request shows "Ika dWallet message approved" or equivalent pre-alpha signed-intent proof.
- [ ] Technical details are available without overwhelming the consumer view: dWallet, message approval account, message hash, signature scheme, and pre-alpha boundary.
- [ ] Frontend unit/E2E tests cover the three required demo outcomes.

## Blocked by

- `docs/issues/029-agent-sdk-ika-sui-signed-intent.md`

## Architecture notes

SDK/API should expose technical proof; UI should communicate "agent trading intent approved/signed" with clear pre-alpha disclaimers.

