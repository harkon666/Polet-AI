# Owner Withdraw From Smart Wallet Custody

Labels: `needs-triage`, `smart-wallet`, `custody`, `frontend`, `proxy`, `contract`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add owner-only withdrawal for USDC and native SOL from smart-wallet custody. The owner should be able to withdraw funds while an agent session remains active, and future agent trades should naturally fail if custody balance becomes insufficient. Native SOL withdrawals must respect the configured minimum reserve unless an explicit owner-only override is later designed.

## Acceptance criteria

- [ ] Owner can build, sign, and confirm a USDC withdrawal from smart-wallet custody to the owner wallet.
- [ ] Owner can build, sign, and confirm a native SOL withdrawal while preserving the minimum SOL reserve.
- [ ] Agent/session signers cannot call generic withdraw or transfer instructions.
- [ ] Withdrawals are recorded in frontend activity and wallet balances refresh after confirmation.
- [ ] If a withdrawal makes future agent trades impossible, agent execution fails with a normal insufficient-balance style response rather than bypassing policy.
- [ ] Tests cover owner-only authorization, session rejection, SOL reserve preservation, and frontend withdrawal states.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`
