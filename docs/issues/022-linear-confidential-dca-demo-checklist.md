# Linear Confidential DCA Demo Checklist

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Turn the confidential DCA demo into a guided end-to-end checklist so users and judges can follow one deterministic product path: initialize wallet, set up PDA custody, grant or select agent access, save confidential policy, configure USDC to SOL DCA, run the blocked 25 USDC scenario, run the allowed 5 USDC scenario, and verify the activity log without exposing private thresholds.

## Acceptance criteria

- [x] The DCA demo displays a compact stepper/checklist for the full demo path.
- [x] Each step reflects live UI state where available: wallet initialized, custody registered, agent selected, policy saved, block run completed, allow run completed.
- [x] Primary CTAs are enabled only when their prerequisites are satisfied.
- [x] The UI clearly shows the next action the user should take without requiring tab switching.
- [x] Policy values are redacted after save in the normal workflow.
- [x] The 25 USDC blocked run is shown as a deliberate demo scenario and does not reveal max-per-run, daily cap, remaining cap, or witness values.
- [x] The 5 USDC allowed run shows the Jupiter preview and unsigned transaction boundary without claiming frontend swap execution.
- [x] Component tests cover checklist progression, disabled/enabled CTA states, redacted policy display, blocked result privacy, and allowed result preview.

## Implementation notes

- Added a compact localized checklist to the DCA demo for wallet, custody, agent, policy, strategy, blocked run, allowed run, and safe log review.
- Checklist completion is derived from live component state: owner, custody registration, selected agent, saved policy, strategy inputs, and activity entries.
- Policy save now waits for owner, custody, and agent prerequisites. The 5 USDC allow CTA waits for the deliberate 25 USDC block scenario, keeping the demo path linear.
- Activity log and result cards continue to redact private thresholds, remaining cap, and witness values. The allowed path still frames Jupiter as route/build preview plus unsigned transaction boundary.
- Expanded `frontend/src/components/DemoTab.test.tsx` coverage for checklist progression and CTA gating.

## Verification

- `bun run test src/components/DemoTab.test.tsx src/components/WalletDashboard.test.tsx` passes in `frontend/`.
- `bun run build` passes in `frontend/`.

## Blocked by

- `docs/issues/021-consumer-frontend-navigation-simplification.md`
