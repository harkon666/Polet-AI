# Agent Trade SDK Adapters

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add a high-level Polet Agent SDK trade API that lets AI agents and simpler app integrations submit policy-gated trading requests through one interface while keeping execution rails modular.

Polet should remain the Solana-enforced control layer: it owns intent construction, session context, confidential guardrail submission, allow/block normalization, and honest settlement status. Rail-specific execution belongs behind adapters. The first adapter targets are the existing Jupiter guarded DCA path and the existing Ika bridgeless request boundary.

This slice should make the SDK feel like "agent can trade through Polet" without claiming real Ika settlement or production private trading until those backend/rail paths are verified.

## Acceptance criteria

- [x] SDK exposes `createPoletAgent()` with a `trade()` method.
- [x] `trade()` supports a simple input shape for common Solana USDC -> SOL DCA usage, for example `{ from: "USDC", to: "SOL", amount: "5" }`.
- [x] `trade()` supports an explicit input shape with `rail`, source chain/asset, target chain/asset, amount, strategy, slippage, and confidential policy witness.
- [x] Default trade behavior is `rail: "jupiter"`, `from.chain: "solana"`, `to.chain: "solana"`, and `strategy: "dca"`.
- [x] Jupiter trades map to the existing guarded DCA proxy route and normalize allowed results as `status: "preview-ready"` with `settlement: "not-executed"`.
- [x] Ika trades map to the existing multichain guarded proxy route and normalize allowed results as `status: "request-prepared"` with `settlement: "not-executed"`.
- [x] Blocked responses normalize to a non-leaking `status: "blocked"` result without exposing private thresholds or witness bytes.
- [x] Unsupported routes normalize to `status: "not-supported"` instead of throwing opaque rail-specific errors.
- [x] Tests cover simple Jupiter trade, explicit Ika trade, blocked policy response, and unsupported route normalization.
- [x] SDK examples or docs show an AI agent using `polet.trade()` while explicitly stating that Ika settlement is not executed by this MVP slice.

## Blocked by

- None - can start immediately.

## Architecture notes

Current foundation:

- `sdk/src/index.ts` already exposes DCA and multichain intent builders plus proxy submit helpers.
- `sdk/src/local-agent-runtime.ts` already scripts allow, block, Ika, and hybrid scenarios through lower-level builders.
- `proxy` already supports guarded Jupiter DCA through `/intent/dca/run` and guarded Ika request preparation through `/intent/multichain/run`.

Target shape:

- `createPoletAgent()` is the ergonomic entry point for AI agents and app developers.
- `trade()` is a control-layer API, not a direct settlement guarantee.
- Execution rail adapters should make room for future real Ika submit/settle integration without changing the user-facing `trade()` call.
- Return values should use one normalized vocabulary: `allowed`, `rail`, `status`, `policy`, `execution`, and `raw`/`details` only where useful for advanced consumers.

Non-goals:

- Do not implement real Ika settlement in this slice.
- Do not claim production private trading.
- Do not add lending, borrowing, RWA collateral, or encrypted allowlist/blocklist membership.

## Implementation notes

- Added `createPoletAgent()` in the SDK with a high-level `trade()` method.
- Jupiter trades use the existing guarded DCA route and normalize allowed responses to `preview-ready` / `not-executed`.
- Ika trades use the existing multichain guarded route and normalize allowed responses to `request-prepared` / `not-executed`.
- Blocked and unsupported outcomes use normalized statuses and do not include private witness bytes in blocked results.
- Added `polet.trade()` examples and agent-runtime docs that explicitly state Ika settlement is not executed by this MVP slice.

## Verification

- `bun test` passes in `sdk/`.
- `bun run build` passes in `sdk/`.
