# Proxy Execution Module

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Deepen the proxy execution module for confidential DCA and multichain strategy runs. A caller should be able to request a guarded strategy run without knowing the internal ordering of wallet lookup, session validation, custody checks, Jupiter prechecks, confidential policy evaluation, and transaction/request payload construction.

The existing 25 USDC block, 5 USDC Jupiter approval, and Ika bridgeless request scenarios should remain externally unchanged.

## Acceptance criteria

- [x] Confidential DCA run orchestration is expressed through a small strategy execution interface instead of one function that exposes all ordering details.
- [x] Jupiter preparation, confidential policy decision, and execution payload building sit behind internal seams with focused tests.
- [x] Multichain Jupiter and Ika routes reuse the same strategy execution decision shape where practical.
- [x] Blocked responses remain non-leaking and allowed responses keep the current Jupiter/Ika payload shapes.
- [x] Proxy tests cover the strategy execution interface plus the end-to-end route behavior.

## Implementation notes

- Added `proxy/src/lib/strategy-execution.ts` as the shared guardrail orchestration surface for wallet lookup, session validation, optional custody checks, preparation, confidential policy evaluation, and allowed payload construction.
- Refactored confidential DCA execution so Jupiter route/build preparation and unsigned transaction building are adapter steps behind the shared strategy decision interface.
- Refactored Ika bridgeless request preparation to reuse the same confidential strategy decision shape while preserving the existing request envelope.
- Added direct strategy execution interface coverage in `proxy/tests/strategy-execution.test.ts`.

## Verification

- `bun test ./tests/strategy-execution.test.ts ./tests/confidential-dca-execution.test.ts ./tests/ika-bridgeless-request.test.ts` passes in `proxy/`.
- `bun run build` passes in `proxy/`.

## Blocked by

- `014-confidential-numeric-policy-module.md`

## Architecture notes

Current friction:

- `proxy/src/lib/confidential-dca-execution.ts` coordinates validation, wallet state, session checks, custody checks, Jupiter gateway calls, policy simulation, and transaction building in one broad module.
- `proxy/src/lib/ika-bridgeless-request.ts` reuses pieces of the confidential guardrail path but has its own result envelope.
- `proxy/src/routes/intent.ts` branches between Jupiter and Ika flows, so route code has to know strategy execution details.

Target shape:

- A deeper proxy execution module gives callers leverage: submit a guarded strategy run and receive an allow/block/result envelope.
- Internal seams are real only where behavior varies: Jupiter route/build, Ika request preparation, and execution payload construction.
- Tests use the execution module interface as the main test surface, while route tests stay thin.
