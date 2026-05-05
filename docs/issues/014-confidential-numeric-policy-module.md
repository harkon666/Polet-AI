# Confidential Numeric Policy Module

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Deepen the confidential numeric policy module so max-per-run, daily cap, daily spent, witness verification, amount encoding, day indexing, and safe block responses sit behind a small testable interface. The existing 25 USDC blocked path and 5 USDC allowed path must keep working, but callers should no longer need to understand the masked witness implementation details to set up or evaluate a policy.

This is an architecture hardening slice from `/improve-codebase-architecture`. It should preserve the current Encrypt pre-alpha honesty: masked witness enforcement is a simulation boundary, not a production confidentiality claim.

## Acceptance criteria

- [x] Proxy confidential policy setup and DCA execution share one policy module for USDC amount parsing, witness hashing, mask/encrypt/decrypt behavior, and day-index handling.
- [x] Contract-side confidential numeric policy helpers are grouped so witness verification, limit evaluation, and daily-spend mutation are local to the policy module implementation.
- [x] Existing allow/block behavior remains unchanged: 25 USDC is blocked without leaking private thresholds, and 5 USDC is allowed when policy/session/custody prerequisites pass.
- [x] Tests cover policy encoding/evaluation through the module interface instead of duplicating private helper knowledge across route and execution tests.
- [x] Proxy and contract verification commands pass for the touched surfaces.

## Completion notes

- Added `proxy/src/lib/confidential-numeric-policy.ts` as the shared masked-witness demo interface for USDC parsing, policy setup encoding, witness hashing, current day indexing, and safe allow/block evaluation.
- Updated wallet confidential policy setup, DCA execution, and Ika bridgeless request preparation to call the shared proxy module instead of duplicating private helper details.
- Added `contract/programs/contract/src/confidential_policy.rs` and moved witness verification, limit evaluation, daily-spend reset/update, and masked amount helpers out of the main program file.
- Updated proxy tests so policy fixture encoding/evaluation goes through the module interface while integration tests still prove the 25 USDC block and 5 USDC allow paths.
- Verification: `bun test` and `bun run build` pass in `proxy/`; `NO_DNA=1 cargo build`, `NO_DNA=1 anchor build`, and `NO_DNA=1 cargo test` pass in `contract/`.

## Blocked by

- Completed: `013-smart-wallet-identity-module.md`

## Architecture notes

Current friction:

- `proxy/src/routes/wallet.ts` owns policy setup details such as USDC amount parsing, witness hashing, masked value construction, and day index.
- `proxy/src/lib/confidential-dca-execution.ts` independently owns witness verification, decrypt/evaluate logic, and current day handling.
- `contract/programs/contract/src/lib.rs` keeps the confidential policy implementation embedded in the main program file, making the contract interface and implementation harder to scan.

Target shape:

- A proxy-side confidential numeric policy module owns the setup/evaluation interface for the masked witness demo path.
- A contract-side confidential policy module concentrates enforcement helpers away from unrelated wallet/session/custody code.
- Tests exercise the policy interface as the test surface, while integration tests keep proving the end-to-end DCA allow/block flow.
