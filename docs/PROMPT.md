# Agent Prompt - Polet AI

You are working in the Polet AI repository.

Read these files first, in this order:

1. `docs/progress.txt`
2. `docs/prd.md`
3. The specific `docs/issues/*.md` file for the issue you will work on
4. The README and module docs only when they are relevant to the issue

Local markdown issues are the source of truth until they are mirrored to GitHub Issues. Do not assume the old 001-012 roadmap is current; the repo now contains issues through `079`.

## Product Direction

Polet AI is a production-oriented confidential Solana smart wallet for AI agent trading.

Core thesis:

> Users can deposit USDC/native SOL into a Polet smart wallet, authorize a manual external AI agent wallet, and let that agent auto-execute only policy-approved trades without exposing private spending guardrails or giving agents unlimited wallet authority.

Current product shape:

- One Solana smart wallet contract is the policy and custody boundary.
- Owners initialize a Polet wallet PDA, deposit USDC/native SOL, set confidential numeric policy, and grant temporary agent session keys.
- The production default agent session is a manual external owner-controlled agent wallet: its public key is the session key, its private key stays in the agent runtime, and it holds only small SOL for gas.
- Principal and profit stay in smart-wallet custody. Agent wallet pays trade gas only.
- Agents submit DCA or multichain strategy intents through the SDK/proxy and auto-execute only after policy allow plus successful transaction simulation.
- Jupiter is the Solana strategy rail. Use swap quote for trade-specific policy valuation, Price API for dashboard display, and route/build inputs for execution; do not call Jupiter quote/price an oracle.
- Ika is the Sui-primary dWallet signed-intent approval rail, with optional Ethereum destination artifacts.
- Encrypt is the confidential policy rail. The masked-witness XOR path is only a legacy/dev compatibility fixture. The primary hackathon path must use official Encrypt pre-alpha ciphertext accounts, graph execution, pending output ciphertexts, and verified allowed/blocked lifecycle results.
- Shared Ika approval quorum, recovery authority, route-risk guardrails, and passkey co-approval prototype support exist in the codebase and must be respected.
- Legacy public policy routes remain quarantined under explicit legacy names and must not be exposed in the primary demo path.

## Demo Contract

The existing hackathon demo must preserve these outcomes while production work moves toward real custody and auto-execution:

- A 25 USDC request is blocked without revealing policy thresholds, witness bytes, dWallet approval data, MessageApproval data, or Jupiter execution payloads.
- A 5 USDC Jupiter DCA request is approved as a route/build preview plus an unsigned policy-gated transaction.
- A 5 USDC-equivalent Sui Ika request is approved as a canonical bridgeless order plus an unsigned Polet `approve_ika_message_as_session` transaction.
- Missing shared Ika quorum returns `needs-approval` progress instead of preparing approval data.
- Official Encrypt lifecycle states are represented as `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`, but these states must be backed by official Encrypt ciphertext/graph evidence for the hackathon core integration path.

Production smart-wallet target:

- Owner deposits USDC and native SOL into smart-wallet custody.
- Owner sets public operational guardrails plus confidential numeric policy.
- Owner authorizes a manual external agent wallet as the session signer.
- Owner funds that agent wallet with small SOL for gas.
- Agent requests a trade, receives an allowed unsigned transaction, simulates, signs, and broadcasts from its own signer.
- Contract re-checks session, policy, quote bounds, custody balance, daily-spent state, and native SOL reserve during execution.
- Trade output and profit return to smart-wallet custody.

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

1. `071-deposit-and-balance-readiness`
2. `073-agent-gas-wallet-funding`
3. `074-quote-based-policy-valuation`
4. `075-policy-gated-custody-trade-execution`
5. `076-agent-auto-execute-runtime`
6. `077-session-revoke-invalidates-pending-tx`
7. `078-frontend-production-readiness-command-center`
8. `079-production-copy-and-docs-alignment`

Current Ralph execution queue is maintained in `docs/progress.txt`. If it differs from the list above, follow `docs/progress.txt`; `070-production-smart-wallet-agent-trading-prd` is the production epic and `052-hackathon-ika-encrypt-prealpha-integration` is the older hackathon Ika x Encrypt umbrella, not the next executable issue.

Stretch work:

- `072-owner-withdraw-from-smart-wallet-custody` after `071`
- `076-agent-auto-execute-runtime` after `075`
- `077-session-revoke-invalidates-pending-tx` after `075`
- `078-frontend-production-readiness-command-center` after `071`, `072`, `073`, `076`, and `077`
- `079-production-copy-and-docs-alignment` after `074`, `075`, and `076`

If `docs/progress.txt` has changed, follow the newer progress file instead of this list.

## Your Task Loop

1. Find the highest-priority incomplete issue that is unblocked.
2. Read the issue spec and nearby code before editing.
3. Implement exactly one issue end to end.
4. If the issue is too large, complete the smallest externally verifiable vertical slice and update the issue/progress notes with what remains.
5. Run the relevant verification commands for the changes you made.
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
8. Use TDD/test-first for smart contract changes. For frontend, proxy, and SDK work, do not default to TDD unless the issue explicitly asks for it, behavior changes need regression coverage, or the user requests TDD/test-first work.
9. For frontend work, preserve the operational command-center feel. Do not turn the app into a generic landing page.
10. For SDK/proxy work, keep response types explicit about `allowed`, `blocked`, `needs-approval`, `not-supported`, `not-executed`, and Encrypt lifecycle states.
11. For docs, keep wording precise and do not overclaim production privacy, MPC, settlement, or mainnet trading.

## Boundary Rules

Encrypt:

- Current masked-witness XOR enforcement is legacy/dev simulation, not official Encrypt and not production privacy.
- Official Encrypt graph work should use ciphertext accounts, `#[encrypt_fn]` graph bytes, `execute_graph`, pending output ciphertexts, executor/decryption results, and verified allowed/blocked lifecycle states per `docs/encrypt/raw.md`.
- Do not imply that static `[1..32]` witness bytes are generated by official Encrypt or qualify as FHE.
- Do not replace live official Encrypt evidence with synthetic local evidence. If live devnet/gRPC/faucet/executor/decryptor availability blocks the run, record the exact command, endpoint, error, and retry action.
- Pending or verified-blocked Encrypt states must suppress Jupiter execution payloads and Ika approval data.
- Do not claim production FHE or production private custody.

Ika:

- Ika is Pre-Alpha signed-intent approval, not production MPC settlement.
- Sui/SUI is the primary destination shape.
- Ethereum/ETH is optional and must be labeled as optional.
- Destination digest artifacts are separate from Ika MessageApproval lookup hashes.
- The proxy/frontend/SDK must not sign, broadcast, or claim bridgeless settlement unless a specific issue implements and verifies that behavior.

Jupiter:

- Jupiter is used for token metadata, dashboard price context, quote-based trade valuation, Recurring compatibility notes, and Swap build route previews/inputs.
- Trade policy valuation should use Jupiter swap quote. Dashboard/balance display should use Jupiter Price API. Do not call either an independent oracle.
- Recurring is currently incompatible with immediate policy-gated spend.
- Do not claim mainnet Jupiter swap execution from a devnet or unsigned preview demo.

Production smart-wallet custody:

- Production custody scope is USDC and native SOL only until a later issue expands it.
- Deposit to Smart Wallet means principal/profit custody funding. Fund Agent Gas Wallet means small SOL transferred to the manual external agent wallet for fees. Keep these flows separate in API, UI, and docs.
- Withdraw is owner-only. Agent generic withdraw/transfer is out of scope.
- Native SOL custody must preserve a minimum reserve for agent execution policy.
- Agent auto-execution is the target mode; frontend is the setup/readiness/activity surface, not the execution loop.
- Revoked sessions must invalidate pending unsigned transactions through current on-chain session checks.

Legacy:

- Public policy templates, plaintext evaluation, and transfer-style legacy flows stay under `/legacy/*` routes and legacy modules.
- Do not surface legacy policy routes in the primary frontend demo.

Security:

- Never put private keys, seed phrases, keypair files, or production secrets in docs, tests, logs, prompts, or agent context.
- Keep all returned transaction payloads clearly marked as unsigned unless code actually signs them.
- Prefer devnet/localnet boundaries for demo and tests.

## Verification Expectations

Do not automatically use TDD for every issue. Use TDD/test-first by default only when the issue changes smart contract behavior. For frontend, proxy, and SDK work, the user will explicitly request TDD/test-first work when they want that workflow.

After implementation, run the smallest verification set that is practical for the files changed and the risk of the change:

- Contract: when contract behavior changed, run `cd contract && NO_DNA=1 cargo test`; when IDL/build changed, also run `NO_DNA=1 anchor build`
- Proxy: when proxy behavior or public types changed, run targeted `cd proxy && bun test ./tests/<file>.test.ts` or `bun test`; run `bun run build` when types changed
- SDK: when SDK behavior or public types changed, run targeted `cd sdk && bun test ./tests/<file>.test.ts` or `bun test`; run `bun run build` when public types changed
- Frontend: when UI behavior/types changed, run targeted Vitest files or `cd frontend && bun run test`; run `bun run build` when UI/types changed; run Playwright when workflow/responsive behavior changed

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
- Do not treat the agent wallet as a custody destination for principal or profit.
- Do not merge smart-wallet custody deposits with agent gas wallet funding.
- Do not call Jupiter quote or Price API an oracle.
- Do not implement encrypted allowlist/blocklist membership before numeric confidential policy is stable.
- Do not claim Encrypt pre-alpha gives production confidentiality.
- Do not claim production Ika MPC, production bridgeless settlement, or destination-chain asset movement.
- Do not claim real mainnet Jupiter swap execution from route/build previews.
- Do not make passkeys direct authority over wallet funds, dWallet authority, or policy execution.
- Do not remove legacy compatibility code unless a separate cleanup issue owns it.
