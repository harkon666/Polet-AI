# Frontend Ika Destination Broadcast UI

Labels: `done`

Type: `frontend`

## Parent

`docs/prd.md`

## What was built

Added an optional Ika destination broadcast UI panel to the frontend command center. When an approved Ika Sui or Ethereum request produces a `signature-produced-prealpha` status, the frontend surfaces a compact panel showing the demo path (Solana devnet memo proof, no asset movement, disabled-by-default) with an explicit "Request Devnet Memo Broadcast" button. The button calls `POST /intent/ika/destination-broadcast` through the proxy, respecting the broadcast-disabled boundary unless `POLET_DESTINATION_BROADCAST_DEMO=enabled` is configured server-side. Activity logs display safe block/disabled/success/failure states without implying failed asset settlement.

## Acceptance criteria

- [x] The frontend detects whether an Ika result is eligible for destination broadcast demo.
- [x] The UI shows chain, network, memo/proof intent, fee payer boundary, and disabled-by-default status before any broadcast request.
- [x] The frontend calls `/intent/ika/destination-broadcast` only after explicit user action.
- [x] Broadcast success displays receipt/explorer metadata returned by the proxy.
- [x] Broadcast blocked/disabled/error states are displayed without implying failed asset settlement.
- [x] Tests cover disabled, eligible, success, and RPC failure states.

## Blocked by

- `docs/issues/046-frontend-ethereum-ika-optional-route-ui.md`

## Implementation notes

- Broadcast is disabled by default and requires `POLET_DESTINATION_BROADCAST_DEMO=enabled` on the proxy.
- No user asset is moved; the demo path uses a devnet memo proof with Solana fee payer SOL.
- The Ika Pre-Alpha produced signature is captured from the `ikaRequest.preAlphaSigning` field after an approved Ika run.
- Broadcast panel only appears after an approved Ika request produces a signature-produced-prealpha status.

