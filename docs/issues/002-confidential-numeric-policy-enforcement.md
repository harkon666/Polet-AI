# Confidential Numeric Policy Enforcement

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Add the first confidential policy enforcement path for numeric policy rules. Polet should enforce max per run, daily cap, and daily spent updates without exposing the user's exact thresholds in public wallet state or blocked responses.

This slice should focus on the policy interface and behavior. It does not need to implement encrypted allowlist or blocklist membership checks.

## Acceptance criteria

- [x] The wallet can store or reference confidential policy state for max per execution, daily cap, and daily spent.
- [x] A policy check allows an in-limit action.
- [x] A policy check blocks an action above max per execution.
- [x] A policy check blocks an action that would exceed the daily cap.
- [x] Daily spent is updated after an allowed action.
- [x] Daily spent reset behavior is defined and tested.
- [x] Blocked responses do not reveal the exact confidential threshold that caused the block.
- [x] Tests cover allow, max-per-run block, daily-cap block, daily-spent update, and reset behavior.
- [x] Documentation or code comments accurately state Encrypt pre-alpha limitations if the implementation depends on pre-alpha primitives.

## Implementation notes

Completed in the contract as the first pre-alpha confidential numeric policy slice.

- Added `ConfidentialNumericPolicy` to wallet state with policy commitment, witness hash, encrypted max-per-run, encrypted daily cap, encrypted daily spent, and spent day index.
- Added `set_confidential_numeric_policy` for the owner-controlled policy reference update.
- Added `execute_confidential_transfer_as_session` for session-key execution gated by confidential max-per-run and daily-cap checks.
- Daily spent resets when the stored spent day index differs from the current UTC day index.
- Block errors identify the class of violation but never include the configured threshold values.

Encrypt pre-alpha limitation: this slice uses a local masked-value/witness model to represent the confidential policy interface until real Encrypt primitives are wired in. It avoids plaintext numeric policy fields in wallet state, but the witness flow is not a production privacy guarantee.

Verification: `NO_DNA=1 cargo build`, `NO_DNA=1 anchor build`, and `NO_DNA=1 cargo test` pass in `contract/`; `bun test` passes in `proxy/`.

## Blocked by

- `001-confidential-smart-wallet-core.md`
