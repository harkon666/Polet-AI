# Frontend Production Readiness Command Center

Labels: `needs-triage`, `frontend`, `smart-wallet`, `custody`, `agent-runtime`, `policy`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Turn the frontend command center into a production smart-wallet readiness surface. The frontend should guide the owner through wallet creation, deposit, policy setup, session authorization, agent gas funding, balance review, activity review, individual session revoke, and owner withdrawal. It should show whether the system is ready for agent auto-execution without putting the frontend in the execution loop.

## Acceptance criteria

- [x] Readiness checklist includes smart wallet created, custody funded, policy active, agent session active, agent gas ready, and SOL reserve satisfied.
- [x] Deposit to Smart Wallet, Fund Agent Gas Wallet, and Withdraw are visually and semantically separate flows.
- [x] Balance panels show USDC available, native SOL total, native SOL reserve, native SOL tradable, and agent gas wallet SOL.
- [x] Agent auto-execution readiness is shown as a status, not as a requirement for frontend manual execution.
- [x] Revoke individual session is prominent enough for the owner to stop the active agent.
- [x] Activity log records deposits, withdrawals, policy changes, session grants/revokes, and agent trade outcomes without leaking private thresholds.
- [x] Tests cover readiness transitions across unfunded, partially funded, fully ready, revoked, and withdrawn states.

## Implementation notes

- `DemoTab` now tracks wallet PDA readiness separately from connected owner, displays an auto-execution readiness status, and uses a production readiness checklist for wallet, custody funding, policy, active session, agent gas, and SOL reserve.
- Added owner-signed smart-wallet initialization and external agent session authorization controls directly in the command center.
- Kept Deposit to Smart Wallet, Withdraw from Smart Wallet, and Fund Agent Gas Wallet as separate surfaces with separate activity log entries and non-leaking messages.

## Verification

- `cd frontend && bun run typecheck` ✅
- `cd frontend && bun run build` ✅
- Frontend tests were not run per operator instruction.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
- `docs/issues/072-owner-withdraw-from-smart-wallet-custody.md`
- `docs/issues/073-agent-gas-wallet-funding.md`
- `docs/issues/076-agent-auto-execute-runtime.md`
- `docs/issues/077-session-revoke-invalidates-pending-tx.md`
