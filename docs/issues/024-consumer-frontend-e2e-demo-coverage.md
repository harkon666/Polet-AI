# Consumer Frontend E2E Demo Coverage

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add end-to-end frontend coverage for the redesigned consumer confidential DCA workflow so the team can verify the demo experience as a user-facing product, not only as isolated component logic. The E2E path should prove that the simplified navigation, guided checklist, policy redaction, allow/block scenarios, Jupiter preview boundary, and calmer visual treatment all hold together.

## Acceptance criteria

- [ ] The frontend has an E2E test setup suitable for running the app locally in CI or developer machines.
- [ ] An E2E test verifies the primary navigation does not expose `Legacy Policy`.
- [ ] An E2E test verifies the first viewport shows the DCA workflow/checklist instead of a large marketing hero.
- [ ] An E2E test verifies checklist steps and CTAs are disabled/enabled according to prerequisites using mocked wallet/API state where needed.
- [ ] An E2E test verifies saved confidential policy values are redacted.
- [ ] An E2E test verifies the 25 USDC blocked result does not reveal thresholds, remaining caps, or witness values.
- [ ] An E2E test verifies the 5 USDC allowed result displays Jupiter preview or unsigned payload boundary information without claiming real frontend swap execution.
- [ ] The E2E suite includes at least one mobile-width and one desktop-width assertion for non-overlapping, readable UI.

## Blocked by

- `docs/issues/021-consumer-frontend-navigation-simplification.md`
- `docs/issues/022-linear-confidential-dca-demo-checklist.md`
- `docs/issues/023-quiet-fintech-frontend-visual-refresh.md`
