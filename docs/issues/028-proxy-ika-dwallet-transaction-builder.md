# Proxy Ika dWallet Transaction Builder

Labels: `done`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Update the proxy Ika rail so it builds the real Polet `approve_ika_message` transaction for the session signer instead of returning only a prepared envelope. The proxy should derive or accept official Ika accounts, build the canonical order hash, preserve non-leaking blocked behavior, and normalize the MessageApproval-oriented response for SDK/frontend consumers.

## Acceptance criteria

- [x] `/intent/multichain/run` maps Sui-primary Ika intents into the canonical bridgeless order message.
- [x] The proxy builds the Polet contract transaction that calls the Ika CPI path through `approve_ika_message`.
- [x] The proxy response exposes technical proof fields for SDK consumers: dWallet, message hash, message approval account, signature scheme, destination chain/asset, and pre-alpha settlement boundary.
- [x] Blocked or invalid requests do not include dWallet approval data or private policy thresholds.
- [x] Existing Jupiter DCA behavior remains unchanged.
- [x] Tests cover allowed Sui Ika transaction construction, blocked suppression, stale session rejection, official Ika account validation, and response normalization.
- [x] The proxy docs explain required environment/config for optional devnet Ika smoke runs.

## Blocked by

- `docs/issues/027-polet-contract-ika-approve-message-cpi.md`

## Architecture notes

The proxy is a transaction builder and state reader, not the trust boundary. The on-chain contract remains responsible for approving or blocking the Ika dWallet message.

## Implementation Notes

- Added proxy-side encoding and transaction construction for Polet `approve_ika_message_as_session`.
- Allowed Ika responses now include `ikaRequest.poletApprovalTransaction` for the session signer, alongside canonical order hash and Pre-Alpha MessageApproval metadata.
- Updated proxy Ika metadata to the pinned official devnet program id `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` and Polet CPI authority seed `__ika_cpi_authority`.
- The proxy still does not sign, simulate, send, or claim settlement.

## Verification

- `bun test` passes in `proxy/`.
- `bun run build` passes in `proxy/`.
