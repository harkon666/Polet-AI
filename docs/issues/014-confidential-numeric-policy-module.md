# Confidential Numeric Policy Module

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Deepen the confidential numeric policy module so max-per-run, daily cap, daily spent, witness verification, amount encoding, day indexing, and safe block responses sit behind a small testable interface. The existing 25 USDC blocked path and 5 USDC allowed path must keep working, but callers should no longer need to understand the masked witness implementation details to set up or evaluate a policy.

This is an architecture hardening slice from `/improve-codebase-architecture`. It should preserve the current Encrypt pre-alpha honesty: masked witness enforcement is a simulation boundary, not a production confidentiality claim.

## Acceptance criteria

- [ ] Proxy confidential policy setup and DCA execution share one policy module for USDC amount parsing, witness hashing, mask/encrypt/decrypt behavior, and day-index handling.
- [ ] Contract-side confidential numeric policy helpers are grouped so witness verification, limit evaluation, and daily-spend mutation are local to the policy module implementation.
- [ ] Existing allow/block behavior remains unchanged: 25 USDC is blocked without leaking private thresholds, and 5 USDC is allowed when policy/session/custody prerequisites pass.
- [ ] Tests cover policy encoding/evaluation through the module interface instead of duplicating private helper knowledge across route and execution tests.
- [ ] Proxy and contract verification commands pass for the touched surfaces.

## Blocked by

- `013-smart-wallet-identity-module.md`

## Architecture notes

Current friction:

- `proxy/src/routes/wallet.ts` owns policy setup details such as USDC amount parsing, witness hashing, masked value construction, and day index.
- `proxy/src/lib/confidential-dca-execution.ts` independently owns witness verification, decrypt/evaluate logic, and current day handling.
- `contract/programs/contract/src/lib.rs` keeps the confidential policy implementation embedded in the main program file, making the contract interface and implementation harder to scan.

Target shape:

- A proxy-side confidential numeric policy module owns the setup/evaluation interface for the masked witness demo path.
- A contract-side confidential policy module concentrates enforcement helpers away from unrelated wallet/session/custody code.
- Tests exercise the policy interface as the test surface, while integration tests keep proving the end-to-end DCA allow/block flow.
