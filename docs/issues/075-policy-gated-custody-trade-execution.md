# Policy-Gated Custody Trade Execution

Labels: `needs-triage`, `critical-path`, `contract`, `proxy`, `smart-wallet`, `custody`, `policy`, `jupiter`, `encrypt`

Type: `HITL`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Build the real smart-wallet custody spend path for policy-approved agent trading. A session signer should be able to execute only supported Jupiter trade actions from smart-wallet custody after the contract re-checks session state, policy sequence, quote-bound execution facts, available custody balance, minimum SOL reserve, and confidential numeric policy. Daily-spent accounting must update atomically only inside successful execution.

This is the main transition from guardrail preview to production smart-wallet trading.

## Acceptance criteria

- [ ] Agent/session execution spends from smart-wallet custody, not from the owner wallet or agent wallet principal.
- [ ] Trade output and profit return to smart-wallet custody by default.
- [ ] Execution re-checks current session authorization and rejects revoked or stale sessions.
- [ ] Execution binds quote freshness, slippage, minimum output, policy sequence, and current spend state strongly enough that stale artifacts fail or require rebuild.
- [ ] Daily-spent accounting updates atomically in the successful execution transaction, not during preview.
- [ ] Native SOL execution cannot reduce custody SOL below the configured minimum reserve.
- [ ] Concurrent previews are advisory: first confirmed over shared quota can succeed, later over-cap execution fails on-chain.
- [ ] Tests cover allowed execution, blocked over-cap execution, stale quote failure, min SOL reserve failure, revoked session failure, and concurrent daily-cap behavior.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
- `docs/issues/074-quote-based-policy-valuation.md`
