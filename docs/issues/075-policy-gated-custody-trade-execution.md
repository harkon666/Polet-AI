# Policy-Gated Custody Trade Execution

Labels: `needs-triage`, `critical-path`, `contract`, `proxy`, `smart-wallet`, `custody`, `policy`, `jupiter`, `encrypt`

Type: `HITL`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Build the real smart-wallet custody spend path for policy-approved agent trading. A session signer should be able to execute only supported Jupiter trade actions from smart-wallet custody after the contract re-checks session state, policy sequence, quote-bound execution facts, available custody balance, minimum SOL reserve, and confidential numeric policy. Daily-spent accounting must update atomically only inside successful execution.

This is the main transition from guardrail preview to production smart-wallet trading.

## Acceptance criteria

- [x] Agent/session execution spends from smart-wallet custody, not from the owner wallet or agent wallet principal.
- [x] Trade output and profit return to smart-wallet custody by default.
- [x] Execution re-checks current session authorization and rejects revoked or stale sessions.
- [x] Execution binds quote freshness, slippage, minimum output, policy sequence, and current spend state strongly enough that stale artifacts fail or require rebuild.
- [x] Daily-spent accounting updates atomically in the successful execution transaction, not during preview.
- [x] Native SOL execution cannot reduce custody SOL below the configured minimum reserve.
- [x] Concurrent previews are advisory: first confirmed over shared quota can succeed, later over-cap execution fails on-chain.
- [x] Tests cover allowed execution, blocked over-cap execution, stale quote failure, min SOL reserve failure, revoked session failure, and concurrent daily-cap behavior.

## Implementation note

Completed on 2026-05-09. Added `execute_policy_gated_custody_trade_as_session`, a session-signed custody execution instruction that validates current session state, policy sequence, quote freshness/slot TTL, slippage/min-output facts, registered custody accounts, source balance, native SOL reserve, and confidential numeric policy before moving custody tokens with wallet PDA authority. The proxy DCA path now builds this custody execution transaction from Jupiter quote metadata instead of the older generic confidential transfer envelope. Tests were added for the required success/failure cases but intentionally not run in this pass per operator request.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
- `docs/issues/074-quote-based-policy-valuation.md`
