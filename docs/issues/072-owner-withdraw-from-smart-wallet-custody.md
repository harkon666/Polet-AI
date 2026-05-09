# Owner Withdraw From Smart Wallet Custody

Labels: `needs-triage`, `smart-wallet`, `custody`, `frontend`, `proxy`, `contract`

Type: `AFK`

Status: `COMPLETED`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add owner-only withdrawal for USDC and native SOL from smart-wallet custody. The owner should be able to withdraw funds while an agent session remains active, and future agent trades should naturally fail if custody balance becomes insufficient. Native SOL withdrawals must respect the configured minimum reserve unless an explicit owner-only override is later designed.

## Acceptance criteria

- [x] Owner can build, sign, and confirm a USDC withdrawal from smart-wallet custody to the owner wallet.
- [x] Owner can build, sign, and confirm a native SOL withdrawal while preserving the minimum SOL reserve.
- [x] Agent/session signers cannot call generic withdraw or transfer instructions.
- [x] Withdrawals are recorded in frontend activity and wallet balances refresh after confirmation.
- [x] If a withdrawal makes future agent trades impossible, agent execution fails with a normal insufficient-balance style response rather than bypassing policy.
- [x] Tests cover owner-only authorization, session rejection, SOL reserve preservation, and frontend withdrawal states.

## Blocked by

- `docs/issues/071-deposit-and-balance-readiness.md`

## Verification

- `cd contract && NO_DNA=1 anchor build` ✅
- `cd contract && NO_DNA=1 cargo test --test demo_custody` (6 tests pass) ✅
- `cd proxy && bun test ./tests/wallet-routes.test.ts` (7 tests pass) ✅
- `cd proxy && bun run build` ✅
- Commit: `92e498f`
