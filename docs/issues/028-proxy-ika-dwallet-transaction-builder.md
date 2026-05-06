# Proxy Ika dWallet Transaction Builder

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Update the proxy Ika rail so it builds the real Polet `approve_ika_message` transaction for the session signer instead of returning only a prepared envelope. The proxy should derive or accept official Ika accounts, build the canonical order hash, preserve non-leaking blocked behavior, and normalize the MessageApproval-oriented response for SDK/frontend consumers.

## Acceptance criteria

- [ ] `/intent/multichain/run` maps Sui-primary Ika intents into the canonical bridgeless order message.
- [ ] The proxy builds the Polet contract transaction that calls the Ika CPI path through `approve_ika_message`.
- [ ] The proxy response exposes technical proof fields for SDK consumers: dWallet, message hash, message approval account, signature scheme, destination chain/asset, and pre-alpha settlement boundary.
- [ ] Blocked or invalid requests do not include dWallet approval data or private policy thresholds.
- [ ] Existing Jupiter DCA behavior remains unchanged.
- [ ] Tests cover allowed Sui Ika transaction construction, blocked suppression, stale session rejection, official Ika account validation, and response normalization.
- [ ] The proxy docs explain required environment/config for optional devnet Ika smoke runs.

## Blocked by

- `docs/issues/027-polet-contract-ika-approve-message-cpi.md`

## Architecture notes

The proxy is a transaction builder and state reader, not the trust boundary. The on-chain contract remains responsible for approving or blocking the Ika dWallet message.

