# PDA Token Custody for USDC/SOL DCA

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add the custody primitives needed for the demo DCA pair: USDC to SOL. The Polet smart wallet PDA must be able to hold assets in accounts it controls, and later execution slices must be able to spend from those accounts only through approved policy-checked flows.

This slice should keep the asset scope narrow and reliable for the hackathon demo.

## Acceptance criteria

- [ ] The smart wallet can derive or reference PDA-owned token accounts for the demo asset flow.
- [ ] The frontend/proxy contract flow can identify where a user should deposit demo funds.
- [ ] Deposited funds are held under smart wallet PDA authority, not direct owner authority.
- [ ] The contract exposes the account context later needed for USDC to SOL execution.
- [ ] Unauthorized sessions cannot move funds from the PDA-owned accounts.
- [ ] Tests cover custody account derivation/reference, deposit assumptions, and unauthorized movement rejection.

## Blocked by

- `001-confidential-smart-wallet-core.md`
