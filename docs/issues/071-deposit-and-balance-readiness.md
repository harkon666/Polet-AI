# Deposit And Balance Readiness

Labels: `needs-triage`, `smart-wallet`, `custody`, `frontend`, `proxy`, `contract`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add the first production custody path for Polet smart wallets: owner-facing USDC and native SOL deposit flows plus balance readiness. The completed slice should let a user create or reuse custody accounts, enter a USDC or SOL amount, sign a deposit transfer, and see smart-wallet custody balances with native SOL reserve and tradable SOL separated.

This slice should replace the product ambiguity around "setup custody" by separating custody-account readiness from actual asset funding.

## Acceptance criteria

- [ ] Frontend exposes a Deposit to Smart Wallet flow for USDC and native SOL with amount input, source owner wallet, destination custody, and confirmation status.
- [ ] USDC deposit builds an owner-signed SPL token transfer into the PDA-owned USDC custody token account and creates that account when missing.
- [ ] Native SOL deposit builds an owner-signed lamport transfer into the smart-wallet native SOL custody address selected by the implementation.
- [ ] Wallet data exposes USDC balance, total native SOL custody balance, minimum SOL reserve, and tradable SOL balance.
- [ ] Frontend copy clearly distinguishes custody account setup from funded custody balance.
- [ ] Tests cover deposit transaction builders, balance parsing, and frontend readiness states for unfunded and funded wallets.

## Blocked by

None - can start immediately.
