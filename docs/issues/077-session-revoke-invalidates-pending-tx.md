# Session Revoke Invalidates Pending Tx

Labels: `needs-triage`, `security`, `contract`, `proxy`, `sdk`, `frontend`, `agent-runtime`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Make individual session revoke a production security invariant: any unsigned transaction built before the revoke must fail if submitted afterward. The contract execution path must read current session state, not trust the fact that a transaction was previously built or simulated.

## Acceptance criteria

- [x] Revoke individual session remains owner-authorized and visible in the frontend command center.
- [x] Any policy-gated custody execution transaction from a revoked session fails after revoke, even if it was built before revoke.
- [x] Proxy and SDK normalize revoked-session failures as a safe stop condition for the agent runtime.
- [x] Frontend activity shows which session was revoked and which session executed each trade when available.
- [ ] Tests build an unsigned session transaction, revoke the session, then verify the old transaction fails.
- [ ] Tests verify the runtime stops or refuses retry on revoked-session response.

## Implementation notes

- Contract custody execution already calls `validate_session_and_attestation` at submit time and reads current `wallet.sessions`; individual `revoke_session` flips the current session record to unauthorized, so a previously built unsigned session transaction cannot pass after revoke.
- SDK now maps proxy `SESSION_*` stops, simulation logs, and broadcast errors matching session authorization failures to explicit `revoked-session` outcomes, so auto-execute stops without retrying as a generic failure.
- Frontend activity entries now include the session key for revoke events plus Jupiter/Ika trade attempts when available.

## Verification

- `cd sdk && bun run build` ✅
- `cd frontend && bun run typecheck` ✅
- Tests were not added or run per operator instruction.

## Blocked by

- `docs/issues/075-policy-gated-custody-trade-execution.md`
