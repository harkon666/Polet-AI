# Legacy Policy Path Quarantine

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Quarantine or remove the legacy public policy path from Polet's main confidential DCA product flow. The current confidential smart wallet narrative should have one obvious execution path: agent intent, session validation, confidential numeric policy check, Jupiter route/build preview, and unsigned smart-wallet execution payload.

Legacy allowlist/blocklist and plaintext policy modules can remain as prior foundation only if they are clearly named, documented, and excluded from the current confidential execution path.

## Acceptance criteria

- [x] Main proxy routes and docs make it clear which policy path is current and which path is legacy/prior foundation.
- [x] Legacy public policy evaluation is either moved behind an explicitly named legacy module/interface or removed from active product routes that are not used by the current demo.
- [x] Tests for the current confidential DCA path do not depend on public plaintext policy helpers.
- [x] Existing legacy tests are either renamed to reflect legacy coverage or replaced with current confidential policy coverage.
- [x] README/progress notes do not imply plaintext policy enforcement is part of the final confidential execution path.

## Completion notes

- Added `proxy/src/lib/legacy-public-policy-engine.ts` and moved plaintext allowlist/blocklist/maxAmount evaluation behind explicitly named legacy exports.
- Moved legacy intent evaluation/execution to `POST /legacy/intent/evaluate` and `POST /legacy/intent/execute`; `/intent/*` now keeps the current confidential DCA and multichain routes.
- Moved legacy policy templates to `/legacy/template/*` and legacy public wallet policy setup to `POST /wallet/legacy/set-policy`.
- Updated SDK/frontend legacy helpers to call the legacy namespace, relabeled the frontend public policy tab as legacy, and updated the About page to describe confidential numeric guardrails as the current path.
- Renamed legacy test descriptions/imports while keeping confidential DCA tests independent of public plaintext policy helpers.
- Verification: `bun test` and `bun run build` pass in `proxy/`; `bun test` and `bun run build` pass in `sdk/`; `bun run test src/components/DemoTab.test.tsx` and `bun run build` pass in `frontend/`; `NO_DNA=1 cargo build` passes in `contract/`.

## Blocked by

- Completed: `014-confidential-numeric-policy-module.md`

## Architecture notes

Resolved friction:

- `proxy/src/lib/policy-engine.ts` now only re-exports the explicitly named legacy public policy engine for compatibility.
- Legacy intent evaluation/execution now lives under `/legacy/intent/evaluate` and `/legacy/intent/execute`, away from the current confidential DCA and multichain flows.
- `proxy/src/routes/wallet.ts` now exposes legacy public policy setup at `/wallet/legacy/set-policy`, while confidential setup remains `/wallet/set-confidential-policy`.

Target shape:

- Current confidential policy behavior is the default path and vocabulary.
- Legacy public policy behavior is isolated enough that future maintainers do not confuse it with the product's privacy-critical path.
- The deletion test should be easy to apply: deleting/quarantining legacy modules should not make confidential DCA complexity reappear across unrelated callers.
