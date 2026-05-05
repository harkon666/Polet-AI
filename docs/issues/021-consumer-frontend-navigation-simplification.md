# Consumer Frontend Navigation Simplification

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Simplify the consumer frontend so the main wallet experience no longer presents legacy public policy configuration or a separate static overview tab as primary product navigation. The default connected-wallet view should put the confidential DCA workflow first, with agent access kept as the only secondary utility surface needed for the demo.

## Acceptance criteria

- [ ] `Legacy Policy` is removed from the primary connected-wallet tab navigation.
- [ ] Legacy public policy UI is either removed from the consumer bundle or moved behind an explicitly dev-only/legacy route that is not linked from the main demo.
- [ ] The static overview content is folded into a compact status area in the DCA workflow instead of remaining a separate tab.
- [ ] The connected-wallet default view opens on the DCA demo workflow.
- [ ] The primary navigation has no more than `DCA Demo` and `Agent Access` for the consumer demo.
- [ ] Existing legacy policy code paths are not reintroduced into current confidential DCA routes.
- [ ] Frontend component tests assert that primary navigation does not render `Legacy Policy`.

## Blocked by

None - can start immediately.
