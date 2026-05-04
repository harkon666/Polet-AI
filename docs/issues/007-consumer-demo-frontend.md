# Consumer Demo Frontend

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Build the user-facing demo for Polet AI as a confidential DCA smart wallet. The frontend should support wallet setup, deposit guidance, confidential policy setup, DCA strategy setup, a manual "Run Agent Now" demo trigger, and an activity log that shows approved/blocked outcomes without leaking confidential thresholds.

The UI should support Indonesian and English copy for key flows.

## Acceptance criteria

- [x] The frontend presents Polet as a confidential DCA smart wallet for AI agents.
- [x] The user can initialize or view their Polet smart wallet.
- [x] The user can see deposit instructions or wallet account addresses for the demo assets.
- [x] The user can configure the demo confidential policy values.
- [x] After policy save, exact private policy values are hidden or redacted in the normal UI.
- [x] The user can configure a USDC to SOL DCA strategy.
- [x] The user can trigger "Run Agent Now".
- [x] The UI displays an allowed 5 USDC run.
- [x] The UI displays a blocked 25 USDC run without revealing exact thresholds.
- [x] The activity log avoids leaking confidential policy values.
- [x] The core flow supports Indonesian and English language toggle.
- [x] Frontend tests cover hidden policy values, allow/block display, activity log privacy, and language toggle.

## Completion notes

- Replaced the legacy transfer simulator with the consumer confidential DCA demo flow.
- Added policy setup with normal-view redaction after save, DCA strategy setup, 25 USDC blocked run, 5 USDC allowed run, safe activity log, deposit guidance, and ID/EN copy.
- Verification: `bun test` and `bun run build` pass in `frontend/`.

## Blocked by

- `005-confidential-dca-execution-path.md`
