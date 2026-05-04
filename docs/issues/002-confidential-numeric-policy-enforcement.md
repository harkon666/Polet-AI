# Confidential Numeric Policy Enforcement

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add the first confidential policy enforcement path for numeric policy rules. Polet should enforce max per run, daily cap, and daily spent updates without exposing the user's exact thresholds in public wallet state or blocked responses.

This slice should focus on the policy interface and behavior. It does not need to implement encrypted allowlist or blocklist membership checks.

## Acceptance criteria

- [ ] The wallet can store or reference confidential policy state for max per execution, daily cap, and daily spent.
- [ ] A policy check allows an in-limit action.
- [ ] A policy check blocks an action above max per execution.
- [ ] A policy check blocks an action that would exceed the daily cap.
- [ ] Daily spent is updated after an allowed action.
- [ ] Daily spent reset behavior is defined and tested.
- [ ] Blocked responses do not reveal the exact confidential threshold that caused the block.
- [ ] Tests cover allow, max-per-run block, daily-cap block, daily-spent update, and reset behavior.
- [ ] Documentation or code comments accurately state Encrypt pre-alpha limitations if the implementation depends on pre-alpha primitives.

## Blocked by

- `001-confidential-smart-wallet-core.md`
