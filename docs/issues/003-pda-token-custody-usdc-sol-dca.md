# PDA Token Custody for USDC/SOL DCA

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add the custody primitives needed for the demo DCA pair: USDC to SOL. The Polet smart wallet PDA must be able to hold assets in accounts it controls, and later execution slices must be able to spend from those accounts only through approved policy-checked flows.

This slice should keep the asset scope narrow and reliable for the hackathon demo.

## Acceptance criteria

- [x] The smart wallet can derive or reference PDA-owned token accounts for the demo asset flow.
- [x] The frontend/proxy contract flow can identify where a user should deposit demo funds.
- [x] Deposited funds are held under smart wallet PDA authority, not direct owner authority.
- [x] The contract exposes the account context later needed for USDC to SOL execution.
- [x] Unauthorized sessions cannot move funds from the PDA-owned accounts.
- [x] Tests cover custody account derivation/reference, deposit assumptions, and unauthorized movement rejection.

## Blocked by

- `001-confidential-smart-wallet-core.md`

## Completion Notes

Issue 003 is complete. The contract records PDA-owned USDC and SOL/wSOL demo custody references through owner-only setup after validating the supplied token accounts are owned by the smart wallet PDA authority. Proxy and frontend setup flows can surface the custody accounts for demo deposits, and contract coverage verifies valid custody registration plus unauthorized custody movement rejection.
