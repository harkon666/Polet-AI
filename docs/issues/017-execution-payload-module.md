# Execution Payload Module

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Create a focused execution payload module for the contract/proxy instruction data contract. The module should make Polet's confidential transfer payload layout, account ordering, discriminator usage, amount encoding, and destination validation explicit and testable.

The goal is to prevent silent drift between `contract/programs/contract/src/lib.rs` parsing and `proxy/src/lib/transaction-builder.ts` construction.

## Acceptance criteria

- [x] Proxy transaction building uses a named execution payload module for confidential transfer instruction data.
- [x] Contract-side parsing/validation helpers are grouped so payload layout is local and easy to audit.
- [x] Tests verify the exact payload layout used by proxy construction and contract parsing expectations.
- [x] Existing confidential DCA allowed path still returns an unsigned transaction with the same signer expectations.
- [x] Proxy transaction-builder tests and contract tests pass after the refactor.

## Implementation notes

- Added `proxy/src/lib/execution-payload.ts` for transfer intent layout constants, confidential transfer discriminator, u32/u64 little-endian encoding, witness length validation, and contract account ordering.
- Updated `proxy/src/lib/transaction-builder.ts` to delegate confidential transfer instruction data and accounts to the payload module while preserving the existing unsigned transaction/signers shape.
- Added `contract/programs/contract/src/execution_payload.rs` so transfer intent parsing, destination validation, instruction validation, and amount decoding live behind a named contract module.
- Updated contract tests/helpers to use the shared payload constants and added Rust unit tests for parser layout drift.

## Verification

- `bun test` and `bun run build` pass in `proxy/`.
- `NO_DNA=1 cargo fmt --check`, `NO_DNA=1 cargo test`, and `NO_DNA=1 anchor build` pass in `contract/`.

## Blocked by

- `016-proxy-execution-module.md`

## Architecture notes

Current friction:

- `contract/programs/contract/src/lib.rs` parses transfer intent bytes inline.
- `proxy/src/lib/transaction-builder.ts` constructs matching bytes and discriminator data separately.
- The seam is real because both proxy and contract must agree exactly, but the interface is currently implicit.

Target shape:

- Payload construction and parsing become named modules with explicit responsibilities.
- The interface is the test surface: tests should catch account-order, amount-encoding, destination, and discriminator regressions before devnet execution.
- Future execution paths can reuse the same payload vocabulary instead of re-learning byte layout details.
