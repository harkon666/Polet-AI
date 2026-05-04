# Ralph Prompt — Polet AI

Read these files first:

- `docs/prd.md`
- `docs/progress.txt`
- `docs/issues/*.md`

## Product Direction

Polet AI is now a single-contract confidential multichain agentic wallet for AI agents.

Core thesis:

> Users can delegate DeFi actions to AI agents without exposing their private spending guardrails or giving agents unlimited wallet authority.

Primary demo:

- User deposits USDC/SOL into a Polet smart wallet PDA.
- User sets confidential numeric policy rules.
- AI agent runs a USDC -> SOL DCA strategy through Polet.
- A 25 USDC run is blocked without revealing the policy threshold.
- A 5 USDC run is allowed and receives a Jupiter Swap V2 route/build preview plus a policy-gated smart-wallet execution payload.
- Final target: the same agent and guardrail model supports multichain bridgeless trading requests through Ika.

Track alignment:

- Encrypt: confidential policy enforcement is the core product primitive.
- Ika: target bridgeless execution rail for multichain native-asset trading requests.
- Jupiter: composed strategy execution using Tokens, Price, Recurring if compatible, and Swap V2 `/build` fallback.
- National Campus Hackathon Indonesia: Consumer App / DeFi safety for Indonesian users.

## Your Task

Find the next incomplete, unblocked issue in `docs/progress.txt` and `docs/issues/`, then implement exactly one issue end-to-end.

If the issue is too large for one pass, complete the smallest externally verifiable vertical slice and update the issue/progress notes with what remains.

## Rules

1. Only do one issue at a time.
2. Build vertical slices, not horizontal-only refactors.
3. Search before implementing. Check whether the codebase already has relevant contract, proxy, frontend, SDK, or test code.
4. Preserve useful v1 concepts, but do not preserve plaintext numeric policy fields in the final confidential execution path.
5. Write actual code, not placeholders.
6. For contract work, write or update tests first where practical, then implement.
7. For Jupiter work, record DX notes while implementing. These notes feed the Jupiter DX report.
8. For Encrypt work, be honest about pre-alpha limitations. Do not claim production-grade privacy.
9. Run relevant tests after implementation. If a test cannot run, document the blocker clearly.
10. Update `docs/progress.txt` after implementation.
11. If committing, use: `[issue-XXX] <short description>`.

## Implementation Priorities

Critical path:

1. `001-confidential-smart-wallet-core`
2. `002-confidential-numeric-policy-enforcement`
3. `003-pda-token-custody-usdc-sol-dca`
4. `004-jupiter-strategy-gateway`
5. `005-confidential-dca-execution-path`

Submission polish:

6. `006-agent-sdk-strategy-intents`
7. `007-consumer-demo-frontend`
8. `009-real-agent-runtime-integration`
9. `010-multichain-agentic-wallet-intents`
10. `011-ika-bridgeless-execution-request`
11. `012-hybrid-agent-demo-jupiter-ika-encrypt`
12. `008-hackathon-docs-and-dx-report`

Stretch:

- None.

## Progress Tracking

When an issue is completed:

- Move it from In Progress to Done in `docs/progress.txt`.
- Add a brief note about what changed.
- Add test results or blockers.
- If follow-up is needed, add it under Blocked or Notes.

When an issue is blocked:

- Mark it under Blocked.
- State the exact blocker.
- State the smallest next action to unblock it.

## Current Issue Sources

Local issue specs live in `docs/issues/`.

These files are the source of truth until they are mirrored to GitHub Issues:

- `001-confidential-smart-wallet-core.md`
- `002-confidential-numeric-policy-enforcement.md`
- `003-pda-token-custody-usdc-sol-dca.md`
- `004-jupiter-strategy-gateway.md`
- `005-confidential-dca-execution-path.md`
- `006-agent-sdk-strategy-intents.md`
- `007-consumer-demo-frontend.md`
- `008-hackathon-docs-and-dx-report.md`
- `009-real-agent-runtime-integration.md`
- `010-multichain-agentic-wallet-intents.md`
- `011-ika-bridgeless-execution-request.md`
- `012-hybrid-agent-demo-jupiter-ika-encrypt.md`

## Demo Constants

- Pair: USDC -> SOL
- Normal DCA run: 5 USDC
- Confidential max per run: 10 USDC
- Confidential daily cap: 20 USDC
- Block scenario: 25 USDC
- Allow scenario: 5 USDC

## Non-Goals

- Do not create a separate v2 contract.
- Do not build a generic landing page as the primary deliverable.
- Do not implement encrypted allowlist/blocklist membership before numeric confidential policy.
- Do not claim Encrypt pre-alpha gives production confidentiality.
- Do not prioritize real OpenClaw/Hermes runtime integration before the core MVP works.
- Do not claim real mainnet Jupiter swap execution from the devnet demo.
- Do not claim real Ika settlement until an actual Ika request/execution path is verified.
