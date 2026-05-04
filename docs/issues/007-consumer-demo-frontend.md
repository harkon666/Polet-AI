# Consumer Demo Frontend

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Build the user-facing demo for Polet AI as a confidential DCA smart wallet. The frontend should support wallet setup, deposit guidance, confidential policy setup, DCA strategy setup, a manual "Run Agent Now" demo trigger, and an activity log that shows approved/blocked outcomes without leaking confidential thresholds.

The UI should support Indonesian and English copy for key flows.

## Acceptance criteria

- [ ] The frontend presents Polet as a confidential DCA smart wallet for AI agents.
- [ ] The user can initialize or view their Polet smart wallet.
- [ ] The user can see deposit instructions or wallet account addresses for the demo assets.
- [ ] The user can configure the demo confidential policy values.
- [ ] After policy save, exact private policy values are hidden or redacted in the normal UI.
- [ ] The user can configure a USDC to SOL DCA strategy.
- [ ] The user can trigger "Run Agent Now".
- [ ] The UI displays an allowed 5 USDC run.
- [ ] The UI displays a blocked 25 USDC run without revealing exact thresholds.
- [ ] The activity log avoids leaking confidential policy values.
- [ ] The core flow supports Indonesian and English language toggle.
- [ ] Frontend tests cover hidden policy values, allow/block display, activity log privacy, and language toggle.

## Blocked by

- `005-confidential-dca-execution-path.md`
