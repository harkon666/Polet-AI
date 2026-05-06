# PRD: Polet AI Confidential Control Layer

Labels: `needs-triage`

## Problem Statement

AI agents can help users execute DeFi and cross-chain strategies, but delegation is unsafe when the agent receives broad wallet authority, policy limits are public, or cross-chain signing requests can bypass the same policy boundary that protects local Solana actions.

Polet AI has evolved beyond the older DCA-only PRD. The current codebase is a confidential Solana control layer for AI agents: it has a PDA smart wallet, owner-controlled sessions, confidential numeric guardrails, Jupiter route/build previews, Ika dWallet approval preparation, shared Ika approval quorum, recovery authority controls, passkey co-approval prototype support, route-risk guardrails, and an in-progress official Encrypt policy graph lifecycle.

The remaining product problem is to make this control-layer shape coherent end to end. A user should be able to give an AI agent limited authority, keep numeric spend guardrails private, prove allowed and blocked outcomes without leaking thresholds, and prepare Jupiter or Ika actions only after Polet's policy boundary approves them. The product must also be honest about current pre-alpha limits: masked-witness policy simulation and official Encrypt graph integration are not production privacy guarantees, and Ika Pre-Alpha approval is not production MPC settlement.

## Solution

Polet AI will be positioned and completed as a confidential Solana control layer for agentic finance.

The owner initializes a Polet smart wallet PDA, registers demo custody, configures confidential numeric policy, optionally configures recovery and shared Ika approvers, and grants an AI agent a temporary session key. The agent submits structured strategy intents through the SDK or proxy. Polet validates session freshness, policy sequence, amount, route allowlist, risk metadata, and shared approval quorum before returning any executable or approval payload.

The primary demo sequence remains:

- 25 USDC request is blocked without revealing max-per-run, daily cap, daily spent, dWallet approval data, or Jupiter execution payload.
- 5 USDC Jupiter USDC to SOL DCA request is approved as a route/build preview and unsigned session transaction.
- 5 USDC-equivalent Sui Ika request is approved as a canonical bridgeless order and unsigned Polet dWallet approval transaction.
- Missing shared Ika quorum returns `needs-approval` progress instead of preparing approval data.
- Official Encrypt lifecycle states return pending, verified allowed, or verified blocked outcomes without witness bytes or private thresholds.

The product should keep one single Polet contract as the authority boundary. Jupiter remains the Solana strategy and market-intelligence rail. Ika remains the dWallet signed-intent rail for Sui-primary and Ethereum-optional destination artifacts. Encrypt remains the confidential policy rail, with the current masked-witness path treated as pre-alpha simulation while the official policy graph lifecycle becomes the forward path.

## User Stories

1. As an Indonesian DeFi user, I want to delegate strategy execution to an AI agent, so that I can automate finance without handing over unlimited wallet authority.
2. As a wallet owner, I want to initialize a Polet smart wallet PDA, so that policy enforcement and custody share one Solana authority boundary.
3. As a wallet owner, I want to register demo USDC and SOL custody accounts, so that the app can show where strategy funds are controlled.
4. As a wallet owner, I want to configure confidential max-per-run and daily-cap values, so that my private risk limits are not shown in the activity log.
5. As a wallet owner, I want daily spend to update through the confidential policy path, so that repeated small agent actions cannot bypass my cap.
6. As a wallet owner, I want saved policy values redacted after setup, so that the UI does not leak my thresholds.
7. As a wallet owner, I want to grant a temporary session key to an agent, so that the agent can request actions without using my main wallet.
8. As a wallet owner, I want to revoke one session key, so that I can stop a specific agent.
9. As a wallet owner, I want to revoke all sessions, so that I can shut down agent access quickly.
10. As a wallet owner, I want stale policy-sequence requests rejected, so that an agent cannot reuse old approvals after policy changes.
11. As a wallet owner, I want expired sessions rejected, so that unattended authority naturally ends.
12. As a wallet owner, I want to configure a recovery authority, so that compromised sessions can be revoked and access can be restored.
13. As a wallet owner, I want recovery to stage dWallet controller migration metadata, so that emergency flows can be prepared without claiming live settlement.
14. As a wallet owner, I want a Jupiter DCA run for USDC to SOL, so that the Solana strategy rail is easy to understand.
15. As a wallet owner, I want a 25 USDC Jupiter request blocked, so that I can prove the agent cannot exceed policy.
16. As a wallet owner, I want a 5 USDC Jupiter request approved, so that I can see the allowed path.
17. As a wallet owner, I want Jupiter token and price context before a run, so that the route is not a blind transaction.
18. As a wallet owner, I want Jupiter route/build preview metadata, so that I can inspect what would be executed.
19. As a wallet owner, I want the app to state that Jupiter swaps are previewed or unsigned when they are not broadcast, so that the demo does not overclaim execution.
20. As a wallet owner, I want to request a Sui-primary Ika signed intent, so that the same Solana policy can control a bridgeless destination action.
21. As a wallet owner, I want optional Ethereum route support clearly separated from the primary Sui demo, so that risk and scope stay understandable.
22. As a wallet owner, I want Ika approval data suppressed when policy blocks, so that a blocked request cannot continue off-chain.
23. As a wallet owner, I want Ika approval data suppressed while Encrypt graph execution is pending, so that unresolved policy output cannot prepare signing data.
24. As a wallet owner, I want verified-blocked Encrypt output to suppress all execution payloads, so that final blocked states are safe.
25. As a wallet owner, I want verified-allowed Encrypt output to carry safe policy attestation metadata, so that approved actions can proceed without revealing thresholds.
26. As a wallet owner, I want shared Ika approval quorum, so that sensitive dWallet approvals can require additional humans or devices.
27. As a wallet owner, I want missing shared approvals to show required, received, and missing counts, so that I know what is needed without leaking policy values.
28. As a wallet owner, I want to revoke a shared Ika approver, so that stale co-approvers lose approval power.
29. As a wallet owner, I want passkey co-approval available as a UX helper, so that shared approvals can feel consumer-friendly.
30. As a wallet owner, I want passkeys to remain outside the authority boundary, so that Solana signatures and contract checks still decide access.
31. As a wallet owner, I want chain and asset allowlist guardrails, so that agents can only request supported routes.
32. As a wallet owner, I want route-risk guardrails for slippage, price impact, liquidity, and risk level, so that bridgeless requests are constrained before Ika approval.
33. As an AI agent, I want to create DCA and multichain strategy intents with a typed SDK, so that I do not hand-roll proxy payloads.
34. As an AI agent, I want a high-level trade adapter, so that simple Jupiter and Ika requests can be integrated into agent runtimes.
35. As an AI agent, I want blocked responses to be normalized, so that I can react without learning private policy thresholds.
36. As an AI agent, I want pending Encrypt responses to be explicit, so that I do not treat unresolved policy as approval.
37. As an AI agent developer, I want canonical bridgeless order hashes, so that dWallet signing inputs are deterministic.
38. As an AI agent developer, I want Sui and Ethereum destination digest artifacts separated from Ika MessageApproval hashes, so that signing semantics are not confused.
39. As an AI agent developer, I want local runtime examples, so that OpenClaw or Hermes-style integrations can be demonstrated.
40. As a frontend user, I want a compact command-center workflow, so that I can run setup, block, allow, and Ika demos from one operational surface.
41. As a frontend user, I want Indonesian and English copy, so that the demo fits the local hackathon audience.
42. As a frontend user, I want an activity log that never displays witness bytes, private thresholds, or raw private policy data, so that privacy is preserved in the UX.
43. As a frontend user, I want clear status cards for blocked, pending, approved, needs-approval, and not-executed states, so that I understand each boundary.
44. As a frontend user, I want mobile and desktop layouts to remain readable, so that the demo works during judging.
45. As a hackathon reviewer, I want to see Polet block an over-limit agent action on-chain or through the policy boundary, so that the core control-layer value is credible.
46. As a hackathon reviewer, I want to see Jupiter integrated beyond a basic token swap, so that token metadata, price context, and route/build composition are visible.
47. As a hackathon reviewer, I want to see Ika Pre-Alpha integration use the official approval vocabulary, so that Polet's dWallet story is grounded in the real interface.
48. As an Encrypt reviewer, I want masked-witness simulation clearly distinguished from official Encrypt policy graph execution, so that the project does not overclaim confidentiality.
49. As an Ika reviewer, I want dWallet approval preparation clearly distinguished from production MPC settlement, so that the project does not overclaim bridgeless trading.
50. As a maintainer, I want legacy public policy routes quarantined, so that the main product path does not contradict the confidential positioning.
51. As a maintainer, I want deep policy, execution, Ika, Jupiter, SDK, and frontend modules, so that each boundary can be tested independently.
52. As a maintainer, I want current docs and issues to share the same vocabulary, so that future work can be picked up by humans or AFK agents.

## Implementation Decisions

- Polet is a single-contract Solana control layer, not separate DCA and Ika products.
- The smart wallet PDA remains the policy and custody boundary for the demo.
- The current product routes are confidential wallet setup, DCA run, multichain run, Ika destination broadcast demo, passkey co-approval, shared Ika approval configuration, and recovery operations.
- Legacy public policy templates and plaintext evaluation stay explicitly namespaced as prior-foundation compatibility. They are not part of the primary product path.
- Confidential numeric policy is the core private policy surface: max-per-run, daily cap, daily spent, policy commitment, policy sequence, and safe attestation metadata.
- The masked-witness path remains a pre-alpha simulation and compatibility fallback until official Encrypt graph setup, execution, and verification are complete.
- The official Encrypt path uses a policy graph lifecycle with pending execution, verified allowed, and verified blocked states.
- Pending or verified-blocked Encrypt states must not return Jupiter unsigned execution payloads, Ika dWallet metadata, MessageApproval data, or private witness material.
- Jupiter is the Solana execution and market-intelligence rail. Tokens and price checks are part of the strategy plan; Recurring remains incompatible with the current immediate policy-gated spend model; Swap build is the practical route/build fallback.
- Jupiter responses are route/build previews and unsigned policy-gated payloads unless a later signer/broadcast flow explicitly executes them.
- Ika is the dWallet signed-intent rail. The primary destination is Sui/SUI; Ethereum/ETH is optional and must stay clearly labeled.
- Ika requests use a canonical bridgeless order and separate destination-chain digest artifacts. Destination digest artifacts are not the same as the Ika MessageApproval lookup hash.
- The Polet Ika approval path must validate session freshness, expiry, policy sequence, confidential policy approval, route guardrails, risk guardrails, and shared approver quorum before any Ika approval data is prepared.
- Shared Ika approval is M-of-N signer quorum. Passkey co-approval is a UX helper and does not replace Solana signer authority.
- Recovery authority can revoke compromised sessions, advance revocation state, rotate shared approval metadata, and stage controller migration metadata without touching confidential policy values.
- The SDK should expose both low-level intent builders and a higher-level agent trade API.
- The frontend should remain an operational fintech command center, not a marketing landing page.
- Documentation must keep pre-alpha disclaimers explicit for Encrypt, Ika, and destination broadcast demos.

Major modules to build or modify:

- Confidential policy module: owns masked-witness compatibility, official Encrypt lifecycle state, policy-sequence validation, safe attestation output, and non-leaking block semantics.
- Official Encrypt graph module: owns graph submission, ciphertext identifiers, pending output tracking, verified result consumption, and test executor integration.
- Smart wallet identity and session module: owns PDA derivation, wallet initialization, temporal keys, session revocation, stale-session rejection, and recovery authority.
- Jupiter strategy gateway: owns token metadata, price context, Recurring compatibility notes, Swap build requests, and normalized strategy previews.
- Guarded execution module: owns the shared allow/block orchestration for DCA and Ika rails.
- Ika bridgeless approval module: owns canonical orders, Ika message hashes, dWallet approval accounts, approval transaction building, destination digest artifacts, and pre-alpha boundaries.
- Shared approval module: owns M-of-N co-approval policy, challenge construction, signature verification, quorum progress, and safe `needs-approval` output.
- Route guardrail module: owns supported chain/asset rules and bridgeless route-risk checks.
- Recovery module: owns recovery authority updates, compromised-session revocation, shared approver rotation, and staged dWallet controller migration.
- Passkey co-approval module: owns passkey challenge and verification UX support while preserving Solana authority boundaries.
- SDK agent module: owns typed intent builders, local agent runtime, high-level trade adapters, response normalization, and redaction.
- Frontend command-center module: owns wallet setup, policy setup, custody setup, DCA demo, Ika demo, shared approval UI, recovery UI, Encrypt lifecycle display, and activity redaction.

## Testing Decisions

Good tests should validate external behavior and security boundaries rather than private implementation details. A test should prove what the user, agent, proxy, or contract observes: allowed actions produce only the correct safe payload, blocked actions suppress sensitive data, pending states cannot be treated as approval, revoked sessions fail, and pre-alpha limitations are visible.

The contract tests should cover:

- Wallet initialization and PDA authority.
- Demo custody registration and PDA-owned token-account validation.
- Session grant, expiry, single revocation, and revoke-all behavior.
- Stale policy sequence rejection.
- Masked-witness confidential numeric policy allow, block, daily-spend update, and day reset behavior while it remains supported.
- Official Encrypt graph pending, verified allowed, and verified blocked lifecycle.
- Ika approval lifecycle under official Encrypt verified output.
- Shared Ika quorum enforcement with missing and sufficient co-approver signers.
- Recovery authority setup and recover-access behavior.
- Expired order and invalid Ika approval rejection.

The proxy tests should cover:

- Wallet setup transaction builders for initialization, confidential policy, custody, shared approvers, recovery, and session operations.
- DCA intent parsing and guarded execution responses.
- Jupiter token, price, and route/build fallback behavior with deterministic fetch injection.
- Official Encrypt lifecycle response mapping.
- Ika route and risk guardrail blocks.
- Canonical bridgeless order hashing and destination digest construction.
- Ika approval transaction construction without signing or broadcasting.
- Shared approval challenge, signature verification, missing quorum, and ready quorum.
- Passkey co-approval challenge and verification boundaries.
- Destination broadcast demo disabled-by-default behavior.
- Legacy route quarantine.

The SDK tests should cover:

- DCA, risk-gated swap, and multichain strategy intent builders.
- High-level agent `trade` adapters for Jupiter and Ika.
- Local runtime scenarios for allow, block, Ika Sui, and hybrid flows.
- Redaction of confidential witnesses and private params in returned agent results.
- Normalization of blocked, not-supported, preview-ready, request-prepared, needs-approval, and not-executed outcomes.
- Canonical order helpers and session helper compatibility.

The frontend tests should cover:

- Linear setup checklist and CTA gating.
- Confidential policy redaction after save.
- 25 USDC blocked path with no leaked thresholds or approval payloads.
- 5 USDC Jupiter allowed path with route/build preview and unsigned transaction boundary.
- 5 USDC-equivalent Ika allowed path with pre-alpha approval transaction metadata and non-settlement boundary.
- Missing and ready shared Ika approval UI states.
- Official Encrypt pending, verified allowed, and verified blocked states.
- Recovery authority and passkey co-approval UI once exposed.
- Desktop and mobile readability through component and Playwright coverage.

Prior art already exists across contract tests, proxy unit tests, SDK unit tests, frontend component tests, and Playwright E2E tests. New tests should extend those suites using deterministic injected dependencies where possible.

## Out of Scope

- Production confidentiality guarantees.
- Claims that Encrypt pre-alpha is production FHE or production private custody.
- Production Ika MPC, production bridgeless settlement, or real destination-chain asset movement.
- Mainnet trading as the default demo path.
- Encrypted allowlist or blocklist membership checks.
- Generic multi-strategy portfolio management.
- Perps, lending, prediction markets, or flashloan strategies.
- Passkeys as direct wallet, dWallet, or policy authority.
- A marketing landing page as the main deliverable.
- Removing legacy compatibility code unless a separate cleanup issue owns that migration.

## Further Notes

The strongest demo remains a short control-layer sequence: initialize wallet, set confidential policy, grant agent session, block 25 USDC, approve 5 USDC Jupiter preview, show missing or ready shared Ika approval, then prepare a 5 USDC-equivalent Sui Ika approval transaction only after policy approval.

The highest-priority technical follow-through is finishing the official Encrypt graph lifecycle: policy ciphertext account setup, deterministic test executor coverage, frontend lifecycle display, and migration of the Ika CPI boundary away from masked-witness immediate approval when official Encrypt policy is configured.

All product copy should use precise language: Polet prepares or previews actions unless a signer/broadcast flow actually executes them; Ika artifacts are Pre-Alpha signed-intent proofs, not production settlement; Encrypt integration is pre-alpha and must not be described as production privacy.
