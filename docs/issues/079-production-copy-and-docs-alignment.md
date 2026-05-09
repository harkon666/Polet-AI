# Production Copy And Docs Alignment

Labels: `needs-triage`, `docs`, `frontend`, `product`, `jupiter`, `ika`, `encrypt`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Align product copy, README, runbooks, SDK docs, and frontend language with the production smart-wallet model. The language should make clear that Polet is an agent-safe custody and execution boundary, Jupiter valuation is quote-based and not an independent oracle, Ika is a policy-gated approval/signing rail for the MVP, and the agent wallet is a gas-paying session signer rather than a custody destination.

## Acceptance criteria

- [ ] README and product docs describe the production flow: create wallet, deposit USDC/SOL, set policy, grant agent session, fund agent gas, auto-execute approved trades, review balances, withdraw/revoke.
- [ ] Frontend copy distinguishes Deposit to Smart Wallet from Fund Agent Gas Wallet.
- [ ] Jupiter copy says quote-based valuation and Price API display, not oracle.
- [ ] Ika copy says policy-gated approval/signing rail and avoids settlement overclaims.
- [ ] Encrypt copy distinguishes confidential numeric policy from public operational guardrails.
- [ ] Docs explain that revoked sessions invalidate pending unsigned transactions and stale quotes require rebuild.
- [ ] Tests or snapshots cover the most important no-overclaim frontend strings where the project already uses UI tests.

## Blocked by

- `docs/issues/074-quote-based-policy-valuation.md`
- `docs/issues/075-policy-gated-custody-trade-execution.md`
- `docs/issues/076-agent-auto-execute-runtime.md`
