# Legacy Policy Path Quarantine

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Quarantine or remove the legacy public policy path from Polet's main confidential DCA product flow. The current confidential smart wallet narrative should have one obvious execution path: agent intent, session validation, confidential numeric policy check, Jupiter route/build preview, and unsigned smart-wallet execution payload.

Legacy allowlist/blocklist and plaintext policy modules can remain as prior foundation only if they are clearly named, documented, and excluded from the current confidential execution path.

## Acceptance criteria

- [ ] Main proxy routes and docs make it clear which policy path is current and which path is legacy/prior foundation.
- [ ] Legacy public policy evaluation is either moved behind an explicitly named legacy module/interface or removed from active product routes that are not used by the current demo.
- [ ] Tests for the current confidential DCA path do not depend on public plaintext policy helpers.
- [ ] Existing legacy tests are either renamed to reflect legacy coverage or replaced with current confidential policy coverage.
- [ ] README/progress notes do not imply plaintext policy enforcement is part of the final confidential execution path.

## Blocked by

- `014-confidential-numeric-policy-module.md`

## Architecture notes

Current friction:

- `proxy/src/lib/policy-engine.ts` still owns public allowlist/blocklist/maxAmount evaluation.
- `proxy/src/routes/intent.ts` still exposes legacy `/intent/evaluate` and `/intent/execute` flows beside the confidential DCA and multichain flows.
- `proxy/src/routes/wallet.ts` still includes legacy policy setup behavior next to confidential policy setup.

Target shape:

- Current confidential policy behavior is the default path and vocabulary.
- Legacy public policy behavior is isolated enough that future maintainers do not confuse it with the product's privacy-critical path.
- The deletion test should be easy to apply: deleting/quarantining legacy modules should not make confidential DCA complexity reappear across unrelated callers.
