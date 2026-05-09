# Frontend Production Readiness Command Center

Labels: `needs-triage`, `frontend`, `smart-wallet`, `custody`, `agent-runtime`, `policy`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Turn the frontend command center into a production smart-wallet readiness surface. The frontend should guide the owner through wallet creation, deposit, policy setup, session authorization, agent gas funding, balance review, activity review, individual session revoke, and owner withdrawal. It should show whether the system is ready for agent auto-execution without putting the frontend in the execution loop.

## Acceptance criteria

- [ ] Readiness checklist includes smart wallet created, custody funded, policy active, agent session active, agent gas ready, and SOL reserve satisfied.
- [ ] Deposit to Smart Wallet, Fund Agent Gas Wallet, and Withdraw are visually and semantically separate flows.
- [ ] Balance panels show USDC available, native SOL total, native SOL reserve, native SOL tradable, and agent gas wallet SOL.
- [ ] Agent auto-execution readiness is shown as a status, not as a requirement for frontend manual execution.
- [ ] Revoke individual session is prominent enough for the owner to stop the active agent.
- [ ] Activity log records deposits, withdrawals, policy changes, session grants/revokes, and agent trade outcomes without leaking private thresholds.
- [ ] Tests cover readiness transitions across unfunded, partially funded, fully ready, revoked, and withdrawn states.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
- `docs/issues/072-owner-withdraw-from-smart-wallet-custody.md`
- `docs/issues/073-agent-gas-wallet-funding.md`
- `docs/issues/076-agent-auto-execute-runtime.md`
- `docs/issues/077-session-revoke-invalidates-pending-tx.md`
