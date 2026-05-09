# Agent Gas Wallet Funding

Labels: `needs-triage`, `agent-runtime`, `frontend`, `wallet`, `gas`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add a separate gas-funding flow for the manual external agent wallet. The frontend should show the authorized agent wallet gas balance and let the owner transfer a small amount of SOL to that wallet. This must be clearly separated from smart-wallet custody deposits because agent gas SOL pays transaction fees and is not principal or profit custody.

## Acceptance criteria

- [ ] Frontend displays the selected authorized agent wallet public key and current SOL gas balance.
- [ ] Frontend warns when the agent gas balance is below a configurable readiness threshold.
- [ ] Owner can build, sign, and confirm a SOL transfer from owner wallet to agent wallet.
- [ ] The flow is labeled as Fund Agent Gas Wallet and is not shown as Deposit to Smart Wallet.
- [ ] Readiness state distinguishes custody-funded from agent-gas-funded.
- [ ] Tests cover low-gas, funded-gas, and transfer-confirmed UI states.

## Blocked by

None - can start immediately.
