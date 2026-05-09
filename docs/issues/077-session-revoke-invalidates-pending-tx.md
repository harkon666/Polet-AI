# Session Revoke Invalidates Pending Tx

Labels: `needs-triage`, `security`, `contract`, `proxy`, `sdk`, `frontend`, `agent-runtime`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Make individual session revoke a production security invariant: any unsigned transaction built before the revoke must fail if submitted afterward. The contract execution path must read current session state, not trust the fact that a transaction was previously built or simulated.

## Acceptance criteria

- [ ] Revoke individual session remains owner-authorized and visible in the frontend command center.
- [ ] Any policy-gated custody execution transaction from a revoked session fails after revoke, even if it was built before revoke.
- [ ] Proxy and SDK normalize revoked-session failures as a safe stop condition for the agent runtime.
- [ ] Frontend activity shows which session was revoked and which session executed each trade when available.
- [ ] Tests build an unsigned session transaction, revoke the session, then verify the old transaction fails.
- [ ] Tests verify the runtime stops or refuses retry on revoked-session response.

## Blocked by

- `docs/issues/075-policy-gated-custody-trade-execution.md`
