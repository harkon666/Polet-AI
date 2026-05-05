# Destination Chain Broadcast Demo

Labels: `needs-triage`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Optionally extend the Ika Pre-Alpha signing proof into a destination-chain broadcast demo. After Polet guardrails approve an Ika trade request and the Ika Pre-Alpha flow produces a signature, the SDK/proxy should construct a destination-chain transaction, broadcast it to a selected testnet/devnet when safe, and return a verifiable receipt.

This is optional and should only be implemented if the destination chain, asset, faucet, transaction type, and verification path are narrow enough to demo reliably. The slice should show the final leg of the bridgeless execution story without claiming production settlement, production MPC, or broad "any chain" coverage.

## Acceptance criteria

- [ ] A single destination-chain demo path is selected and documented before implementation, including chain, testnet/devnet, asset/action, faucet requirements, and explorer/receipt verification.
- [ ] SDK/proxy can take a `signature-produced-prealpha` Ika result and construct the matching destination-chain transaction for that one demo path.
- [ ] SDK/proxy can broadcast the transaction only when explicit demo configuration is enabled.
- [ ] The result includes `status: "broadcast-submitted"` or `status: "broadcast-confirmed"` plus a destination-chain transaction id/receipt when available.
- [ ] Failure states are explicit and recoverable: unsupported chain, missing faucet funds, invalid signature, RPC failure, and timeout.
- [ ] Tests cover transaction construction, disabled-broadcast safety, receipt normalization, and failure mapping with mocked RPCs.
- [ ] Docs and demo script state that this is a narrow Pre-Alpha broadcast demo, not production bridgeless settlement.

## Blocked by

- `019-ika-prealpha-policy-gated-signing.md`

## Architecture notes

This issue is intentionally HITL because the team must choose one narrow broadcast target before coding. Reasonable candidates include a simple signed message verification path, a native transfer on a low-risk testnet, or another destination-chain action that can be funded and verified reliably during the demo.

Decision questions before implementation:

- Which destination chain is safest and easiest to fund during the demo?
- Is the transaction type a native transfer, contract call, or signed-message proof?
- Who pays destination-chain gas?
- What receipt proves success without relying on production-value funds?
- How should the UI/SDK avoid implying support for arbitrary chains before adapters exist?

Non-goals:

- Do not support arbitrary destination chains in this slice.
- Do not use mainnet funds.
- Do not claim production settlement finality.
- Do not implement lending, borrowing, RWA collateral, or encrypted allowlist/blocklist membership.
