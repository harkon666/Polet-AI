# Consumer Frontend Navigation Simplification

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Simplify the consumer frontend so the main wallet experience no longer presents legacy public policy configuration or a separate static overview tab as primary product navigation. The default connected-wallet view should put the confidential DCA workflow first, with agent access kept as the only secondary utility surface needed for the demo.

## Acceptance criteria

- [x] `Legacy Policy` is removed from the primary connected-wallet tab navigation.
- [x] Legacy public policy UI is either removed from the consumer bundle or moved behind an explicitly dev-only/legacy route that is not linked from the main demo.
- [x] The static overview content is folded into a compact status area in the DCA workflow instead of remaining a separate tab.
- [x] The connected-wallet default view opens on the DCA demo workflow.
- [x] The primary navigation has no more than `DCA Demo` and `Agent Access` for the consumer demo.
- [x] Existing legacy policy code paths are not reintroduced into current confidential DCA routes.
- [x] Frontend component tests assert that primary navigation does not render `Legacy Policy`.

## Implementation notes

- `frontend/src/components/WalletDashboard.tsx` now defaults to the DCA demo tab and only exposes `DCA Demo` plus `Agent Access` in the connected-wallet primary navigation.
- Removed the dashboard import, state, deserialization, and submit handler for the legacy public policy configurator from the consumer path.
- Folded the former overview stats into a compact DCA workflow status summary above the demo.
- Added `frontend/src/components/WalletDashboard.test.tsx` coverage for the simplified navigation and absence of `Legacy Policy`.

## Verification

- `bun run test src/components/WalletDashboard.test.tsx src/components/DemoTab.test.tsx` passes in `frontend/`.
- `bun run build` passes in `frontend/`.

## Blocked by

None - can start immediately.
