# Linear Confidential DCA Demo Checklist

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Turn the confidential DCA demo into a guided end-to-end checklist so users and judges can follow one deterministic product path: initialize wallet, set up PDA custody, grant or select agent access, save confidential policy, configure USDC to SOL DCA, run the blocked 25 USDC scenario, run the allowed 5 USDC scenario, and verify the activity log without exposing private thresholds.

## Acceptance criteria

- [ ] The DCA demo displays a compact stepper/checklist for the full demo path.
- [ ] Each step reflects live UI state where available: wallet initialized, custody registered, agent selected, policy saved, block run completed, allow run completed.
- [ ] Primary CTAs are enabled only when their prerequisites are satisfied.
- [ ] The UI clearly shows the next action the user should take without requiring tab switching.
- [ ] Policy values are redacted after save in the normal workflow.
- [ ] The 25 USDC blocked run is shown as a deliberate demo scenario and does not reveal max-per-run, daily cap, remaining cap, or witness values.
- [ ] The 5 USDC allowed run shows the Jupiter preview and unsigned transaction boundary without claiming frontend swap execution.
- [ ] Component tests cover checklist progression, disabled/enabled CTA states, redacted policy display, blocked result privacy, and allowed result preview.

## Blocked by

- `docs/issues/021-consumer-frontend-navigation-simplification.md`
