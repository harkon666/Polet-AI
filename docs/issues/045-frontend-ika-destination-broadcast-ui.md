# Frontend Ika Destination Broadcast UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add an optional frontend panel for the Ika destination broadcast demo. When the proxy has a `signature-produced-prealpha` style proof, the frontend should show a safe transaction summary and allow the user to request the disabled-by-default Solana devnet memo broadcast route through the proxy.

This must not claim production Ika settlement, asset transfer, or mainnet execution.

## Acceptance criteria

- [ ] The frontend detects whether an Ika result is eligible for destination broadcast demo.
- [ ] The UI shows chain, network, memo/proof intent, fee payer boundary, and disabled-by-default status before any broadcast request.
- [ ] The frontend calls `/intent/ika/destination-broadcast` only after explicit user action.
- [ ] Broadcast success displays receipt/explorer metadata returned by the proxy.
- [ ] Broadcast blocked/disabled/error states are displayed without implying failed asset settlement.
- [ ] Tests cover disabled, eligible, success, and RPC failure states.

## Blocked by

- `docs/issues/046-frontend-ethereum-ika-optional-route-ui.md`

