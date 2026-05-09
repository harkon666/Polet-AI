# Agent Gas Wallet Funding

Labels: `agent-runtime`, `frontend`, `wallet`, `gas`

Type: `issue`

Status: `completed`

Parent: `docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add a separate gas-funding flow for the manual external agent wallet. The frontend should show the authorized agent wallet gas balance and let the owner transfer a small amount of SOL to that wallet. This must be clearly separated from smart-wallet custody deposits because agent gas SOL pays transaction fees and is not principal or profit custody.

## Acceptance criteria

- [x] Frontend displays the selected authorized agent wallet public key and current SOL gas balance.
- [x] Frontend warns when the agent gas balance is below a configurable readiness threshold.
- [x] Owner can build, sign, and confirm a SOL transfer from owner wallet to agent wallet.
- [x] The flow is labeled as Fund Agent Gas Wallet and is not shown as Deposit to Smart Wallet.
- [x] Readiness state distinguishes custody-funded from agent-gas-funded.
- [x] Tests cover low-gas, funded-gas, and transfer-confirmed UI states.

## Blocked by

None - can start immediately.

## Completion notes

Proxy route `POST /wallet/fund-agent-gas` validates agent wallet is an authorized session key, enforces 10 SOL max per transaction, and returns an owner-signed SOL transfer. Frontend displays the authorized agent wallet public key and current SOL balance via `Connection.getBalance()`, shows a low-balance warning when below 0.05 SOL, and provides a Fund Agent Gas input + button separate from Deposit to Smart Wallet. Tests updated with mock `fundAgentGas` implementations.

## Verification

- `cd proxy && bun test ./tests/wallet-routes.test.ts` (7 tests pass) ✅
- `cd proxy && bun run build` ✅
- `cd frontend && bun run test src/components/DemoTab.test.tsx` (27 tests pass) ✅
- `cd frontend && bun run typecheck` ✅
- `cd frontend && bun run build` ✅
