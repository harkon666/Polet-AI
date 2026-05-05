# Consumer Frontend E2E Demo Coverage

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Add end-to-end frontend coverage for the redesigned consumer confidential DCA workflow so the team can verify the demo experience as a user-facing product, not only as isolated component logic. The E2E path should prove that the simplified navigation, guided checklist, policy redaction, allow/block scenarios, Jupiter preview boundary, and calmer visual treatment all hold together.

## Acceptance criteria

- [x] The frontend has an E2E test setup suitable for running the app locally in CI or developer machines.
- [x] An E2E test verifies the primary navigation does not expose `Legacy Policy`.
- [x] An E2E test verifies the first viewport shows the DCA workflow/checklist instead of a large marketing hero.
- [x] An E2E test verifies checklist steps and CTAs are disabled/enabled according to prerequisites using mocked wallet/API state where needed.
- [x] An E2E test verifies saved confidential policy values are redacted.
- [x] An E2E test verifies the 25 USDC blocked result does not reveal thresholds, remaining caps, or witness values.
- [x] An E2E test verifies the 5 USDC allowed result displays Jupiter preview or unsigned payload boundary information without claiming real frontend swap execution.
- [x] The E2E suite includes at least one mobile-width and one desktop-width assertion for non-overlapping, readable UI.

## Implementation notes

- Added Playwright with `bun run test:e2e`, desktop and mobile Chromium projects, and a local Vite web server config.
- Added an unlinked `/e2e/consumer-demo` route that renders the real `DemoTabContent` with deterministic mocked owner, agent, API responses, and transaction signing. This avoids wallet-extension and network dependencies while exercising the browser-rendered product flow.
- Added E2E coverage for primary navigation, absence of `Legacy Policy`, operational first viewport/checklist, prerequisite-gated CTAs, policy redaction, blocked 25 USDC privacy, allowed 5 USDC Jupiter route/build preview, unsigned transaction boundary copy, and viewport readability.
- Fixed `ClientWalletProvider` so SSR does not render wallet hook consumers before the wallet provider is mounted.
- Ignored generated Playwright reports and test results in `frontend/.gitignore`.

## Verification

- `bun run test:e2e` passes in `frontend/` with 6 Playwright tests across desktop and mobile projects.
- `bun run test src/routes/-index.test.tsx src/components/DemoTab.test.tsx src/components/WalletDashboard.test.tsx` passes in `frontend/`.
- `bun run build` passes in `frontend/`.

## Blocked by

- `docs/issues/021-consumer-frontend-navigation-simplification.md`
- `docs/issues/022-linear-confidential-dca-demo-checklist.md`
- `docs/issues/023-quiet-fintech-frontend-visual-refresh.md`
