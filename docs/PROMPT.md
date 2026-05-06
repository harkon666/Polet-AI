# Agent Prompt - Polet AI

You are working in the Polet AI repository.

Read these files first, in this order:

1. `docs/progress.txt`
2. `docs/prd.md`
3. The specific `docs/issues/*.md` file for the issue you will work on
4. The README and module docs only when they are relevant to the issue

Local markdown issues are the source of truth until they are mirrored to GitHub Issues. Do not assume the old 001-012 roadmap is current; the repo now contains issues through `050`.

## Product Direction

Polet AI is a confidential Solana control layer for AI agents.

Core thesis:

> Users can delegate DeFi and cross-chain strategy requests to AI agents without exposing private spending guardrails or giving agents unlimited wallet authority.

Current product shape:

- One Solana smart wallet contract is the policy boundary.
- Owners initialize a Polet wallet PDA, register demo custody, set confidential numeric policy, and grant temporary agent session keys.
- Agents submit DCA or multichain strategy intents through the SDK/proxy.
- Jupiter is the Solana strategy rail for USDC -> SOL route/build previews.
- Ika is the Sui-primary dWallet signed-intent rail, with optional Ethereum destination artifacts.
- Encrypt is the confidential policy rail. The masked-witness path is a pre-alpha simulation and compatibility boundary; the official Encrypt policy graph lifecycle is the forward path.
- Shared Ika approval quorum, recovery authority, route-risk guardrails, and passkey co-approval prototype support exist in the codebase and must be respected.
- Legacy public policy routes remain quarantined under explicit legacy names and must not be exposed in the primary demo path.

## Demo Contract

The primary demo must preserve these outcomes:

- A 25 USDC request is blocked without revealing policy thresholds, witness bytes, dWallet approval data, MessageApproval data, or Jupiter execution payloads.
- A 5 USDC Jupiter DCA request is approved as a route/build preview plus an unsigned policy-gated transaction.
- A 5 USDC-equivalent Sui Ika request is approved as a canonical bridgeless order plus an unsigned Polet `approve_ika_message_as_session` transaction.
- Missing shared Ika quorum returns `needs-approval` progress instead of preparing approval data.
- Official Encrypt lifecycle states are represented as `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`.

Demo constants:

- Pair: USDC -> SOL
- Ika primary target: Sui/SUI
- Optional Ika target: Ethereum/ETH
- Normal run: 5 USDC
- Confidential max per run: 10 USDC
- Confidential daily cap: 20 USDC
- Block scenario: 25 USDC
- Allow scenario: 5 USDC

## Current Priorities

Use `docs/progress.txt` as the final priority list. At the time this prompt was updated, the important next work was:

1. `050-contract-official-encrypt-verified-ika-cpi-lifecycle`
2. Continue `041-official-encrypt-policy-graph-execution`
3. `042-frontend-shared-ika-approval-ui`
4. `046-frontend-ethereum-ika-optional-route-ui`
5. `048-frontend-official-encrypt-status-surface`

Stretch work:

- `043-frontend-recovery-authority-ui`
- `044-frontend-passkey-coapproval-demo-ui`
- `045-frontend-ika-destination-broadcast-ui`
- `047-frontend-route-risk-guardrail-controls`
- `049-frontend-demo-command-center-polish`

If `docs/progress.txt` has changed, follow the newer progress file instead of this list.

## Your Task Loop

1. Find the highest-priority incomplete issue that is unblocked.
2. Read the issue spec and nearby code before editing.
3. Implement exactly one issue end to end.
4. If the issue is too large, complete the smallest externally verifiable vertical slice and update the issue/progress notes with what remains.
5. Run the relevant tests or builds.
6. Update `docs/progress.txt` with the result, verification, and any blockers.

Do not start multiple issues in one pass unless the selected issue explicitly requires updating code across modules as one vertical slice.

## Engineering Rules

1. Build vertical slices, not horizontal-only refactors.
2. Search before implementing. Check contract, proxy, SDK, frontend, and tests for existing modules before adding new ones.
3. Prefer established modules and patterns over new abstractions.
4. Preserve useful prior-foundation code, but keep it explicitly legacy when it contradicts the confidential product path.
5. Do not reintroduce plaintext numeric policy fields into the final confidential execution path.
6. Write actual behavior, not placeholders.
7. Keep blocked responses non-leaking: no thresholds, witness bytes, private remaining caps, dWallet approval data, MessageApproval data, or executable payloads.
8. For contract work, update or add tests first where practical, then implement.
9. For frontend work, preserve the operational command-center feel. Do not turn the app into a generic landing page.
10. For SDK/proxy work, keep response types explicit about `allowed`, `blocked`, `needs-approval`, `not-supported`, `not-executed`, and Encrypt lifecycle states.
11. For docs, keep wording precise and do not overclaim production privacy, MPC, settlement, or mainnet trading.

## Boundary Rules

Encrypt:

- Current masked-witness enforcement is pre-alpha simulation, not production privacy.
- Official Encrypt graph work should use pending, verified allowed, and verified blocked lifecycle states.
- Pending or verified-blocked Encrypt states must suppress Jupiter execution payloads and Ika approval data.
- Do not claim production FHE or production private custody.

Ika:

- Ika is Pre-Alpha signed-intent approval, not production MPC settlement.
- Sui/SUI is the primary destination shape.
- Ethereum/ETH is optional and must be labeled as optional.
- Destination digest artifacts are separate from Ika MessageApproval lookup hashes.
- The proxy/frontend/SDK must not sign, broadcast, or claim bridgeless settlement unless a specific issue implements and verifies that behavior.

Jupiter:

- Jupiter is used for token metadata, price context, Recurring compatibility notes, and Swap build route previews.
- Recurring is currently incompatible with immediate policy-gated spend.
- Do not claim mainnet Jupiter swap execution from a devnet or unsigned preview demo.

Legacy:

- Public policy templates, plaintext evaluation, and transfer-style legacy flows stay under `/legacy/*` routes and legacy modules.
- Do not surface legacy policy routes in the primary frontend demo.

Security:

- Never put private keys, seed phrases, keypair files, or production secrets in docs, tests, logs, prompts, or agent context.
- Keep all returned transaction payloads clearly marked as unsigned unless code actually signs them.
- Prefer devnet/localnet boundaries for demo and tests.

## Verification Expectations

Run the smallest test set that proves the issue:

- Contract: `cd contract && NO_DNA=1 cargo test` and, when IDL/build changed, `NO_DNA=1 anchor build`
- Proxy: `cd proxy && bun test` or targeted `bun test ./tests/<file>.test.ts`; run `bun run build` when types changed
- SDK: `cd sdk && bun test`; run `bun run build` when public types changed
- Frontend: `cd frontend && bun run test` or targeted Vitest files; run `bun run build` when UI/types changed; run Playwright when workflow/responsive behavior changed

If a test cannot run, document:

- The command attempted
- The exact failure or environment blocker
- Whether the implementation was otherwise typechecked or covered by narrower tests

## Progress Tracking

When an issue is completed:

- Move or update its entry in `docs/progress.txt`.
- Add a concise implementation note.
- Add verification commands and results.
- Add any follow-up issue references.

When an issue is partially completed:

- Keep it under In Progress or update the relevant issue notes.
- State exactly what landed.
- State exactly what remains.
- State the smallest next action.

When an issue is blocked:

- Put it under Blocked.
- State the exact blocker.
- State the smallest action needed to unblock it.

If committing, use:

```text
[issue-XXX] <short description>
```

## Non-Goals

- Do not create a separate v2 contract.
- Do not build a generic landing page as the primary deliverable.
- Do not implement encrypted allowlist/blocklist membership before numeric confidential policy is stable.
- Do not claim Encrypt pre-alpha gives production confidentiality.
- Do not claim production Ika MPC, production bridgeless settlement, or destination-chain asset movement.
- Do not claim real mainnet Jupiter swap execution from route/build previews.
- Do not make passkeys direct authority over wallet funds, dWallet authority, or policy execution.
- Do not remove legacy compatibility code unless a separate cleanup issue owns it.
