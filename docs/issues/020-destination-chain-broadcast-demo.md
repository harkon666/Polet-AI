# Destination Chain Broadcast Demo

Labels: `done`

Type: `HITL`

## Parent

`docs/prd.md`

## What to build

Optionally extend the Ika Pre-Alpha signing proof into a destination-chain broadcast demo. After Polet guardrails approve an Ika trade request and the Ika Pre-Alpha flow produces a signature, the SDK/proxy should construct a destination-chain transaction, broadcast it to a selected testnet/devnet when safe, and return a verifiable receipt.

This is optional and should only be implemented if the destination chain, asset, faucet, transaction type, and verification path are narrow enough to demo reliably. The slice should show the final leg of the bridgeless execution story without claiming production settlement, production MPC, or broad "any chain" coverage.

## Acceptance criteria

- [x] A single destination-chain demo path is selected and documented before implementation, including chain, testnet/devnet, asset/action, faucet requirements, and explorer/receipt verification.
- [x] SDK/proxy can take a `signature-produced-prealpha` Ika result and construct the matching destination-chain transaction for that one demo path.
- [x] SDK/proxy can broadcast the transaction only when explicit demo configuration is enabled.
- [x] The result includes `status: "broadcast-submitted"` or `status: "broadcast-confirmed"` plus a destination-chain transaction id/receipt when available.
- [x] Failure states are explicit and recoverable: unsupported chain, missing faucet funds, invalid signature, RPC failure, and timeout.
- [x] Tests cover transaction construction, disabled-broadcast safety, receipt normalization, and failure mapping with mocked RPCs.
- [x] Docs and demo script state that this is a narrow Pre-Alpha broadcast demo, not production bridgeless settlement.

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

## Selected demo path

- Chain: Solana.
- Network: devnet.
- Asset/action: no asset transfer; write a Solana Memo proof transaction containing the Polet/Ika request id, source/target metadata, amount base units, message digest, signature scheme, and a hash of the produced Pre-Alpha signature.
- Faucet requirement: only the configured demo fee payer needs devnet SOL for gas. User assets and smart-wallet funds are not moved.
- Verification path: returned Solana devnet transaction id plus `https://explorer.solana.com/tx/<signature>?cluster=devnet`.
- Safety gate: proxy broadcast is disabled by default and only runs when `POLET_DESTINATION_BROADCAST_DEMO=enabled` and `POLET_DESTINATION_BROADCAST_FEE_PAYER` are configured.
- Boundary: this is a Pre-Alpha broadcast proof and memo receipt only. It is not production Ika settlement, production MPC, or general destination-chain support.

## Implementation notes

- Added `proxy/src/lib/destination-broadcast-demo.ts` for memo proof construction, opt-in broadcast, receipt normalization, and failure mapping.
- Added `POST /intent/ika/destination-broadcast` to the proxy.
- Added SDK helper `broadcastIkaDestinationDemo()`.
- Added mocked-RPC tests for construction, disabled-broadcast safety, submitted receipt normalization, unsupported chain, missing faucet funds, invalid signature, RPC failure, and timeout.

Non-goals:

- Do not support arbitrary destination chains in this slice.
- Do not use mainnet funds.
- Do not claim production settlement finality.
- Do not implement lending, borrowing, RWA collateral, or encrypted allowlist/blocklist membership.
