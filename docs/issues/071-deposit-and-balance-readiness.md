# Deposit And Balance Readiness

Labels: `needs-triage`, `smart-wallet`, `custody`, `frontend`, `proxy`, `contract`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## What to build

Add the first production custody path for Polet smart wallets: owner-facing USDC and native SOL deposit flows plus balance readiness. The completed slice should let a user create or reuse custody accounts, enter a USDC or SOL amount, sign a deposit transfer, and see smart-wallet custody balances with native SOL reserve and tradable SOL separated.

This slice should replace the product ambiguity around "setup custody" by separating custody-account readiness from actual asset funding.

## Acceptance criteria

- [x] Frontend exposes a Deposit to Smart Wallet flow for USDC and native SOL with amount input, source owner wallet, destination custody, and confirmation status.
- [x] USDC deposit builds an owner-signed SPL token transfer into the PDA-owned USDC custody token account and creates that account when missing.
- [x] Native SOL deposit builds an owner-signed lamport transfer into the smart-wallet native SOL custody address selected by the implementation.
- [x] Wallet data exposes USDC balance, total native SOL custody balance, minimum SOL reserve, and tradable SOL balance.
- [x] Frontend copy clearly distinguishes custody account setup from funded custody balance.
- [x] Tests cover deposit transaction builders, balance parsing, and frontend readiness states for unfunded and funded wallets.

## Implementation notes

- Added `/wallet/deposit-custody` for owner-signed USDC `TransferChecked` deposits and native SOL `SystemProgram.transfer` deposits into the wallet PDA custody boundary.
- Extended wallet reads with `custodyBalances`: USDC base/UI balance, total native SOL custody, 0.05 SOL minimum reserve, tradable SOL, native custody address, and funded/readiness flags.
- Updated the command-center wallet panel so custody-account setup and funded balances are distinct, with copy separating smart-wallet custody deposits from future agent gas funding.

## Verification

- `cd proxy && bun test ./tests/wallet-routes.test.ts` ✅
- `cd proxy && bun run build` ✅
- `cd frontend && bun run test src/components/DemoTab.test.tsx` ✅
- `cd frontend && bun run typecheck` ✅
- `cd frontend && bun run build` ✅

## Blocked by

None - can start immediately.
