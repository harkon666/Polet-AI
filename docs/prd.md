# PRD: Polet AI Confidential DCA Smart Wallet

## Problem Statement

AI agents can help users manage DeFi strategies, but users cannot safely delegate funds if their policy rules are public, easy to infer, or enforced only by an off-chain service. A user who wants an agent to run a DCA strategy should not have to reveal their exact spending limits, daily cap, remaining allowance, or risk threshold on a public blockchain.

Polet AI currently has a strong public policy wallet foundation: wallet PDA custody, owner-controlled policy setup, temporal session keys, intent parsing, policy templates, Merkle commitments, proxy routing, frontend configuration, and SDK intent builders. However, the existing policy model stores and evaluates important rules in plaintext. That weakens the product's fit for the Encrypt/Ika track, where privacy must be core rather than decorative.

The new direction is to turn Polet AI into a single-contract confidential smart wallet for AI agents. The wallet should custody funds directly, enforce confidential numeric policy rules before execution, and let an AI agent run a Jupiter-powered DCA strategy without exposing the user's private policy parameters.

## Solution

Polet AI will become a confidential DCA smart wallet for AI agents.

The user deposits funds into a smart wallet PDA, configures confidential spending policy rules, grants an AI agent a temporary session key, and creates a DCA strategy. The agent can request strategy execution, but the smart wallet only executes when the confidential policy check passes.

The primary demo strategy is USDC to SOL DCA:

- Normal strategy run: 5 USDC to SOL.
- Confidential max per run: 10 USDC.
- Confidential daily cap: 20 USDC.
- Block scenario: the agent attempts 25 USDC and is blocked.
- Allow scenario: the agent attempts 5 USDC and is allowed.

The Jupiter integration should be more than a basic swap. The product should use Jupiter as the execution and market intelligence layer:

- Tokens API for token metadata, verification, risk, and quality signals.
- Price API for pricing and volatility checks.
- Recurring API as the primary DCA integration if compatible with the smart wallet flow.
- Swap V2 `/build` as the fallback and immediate execution path, because it gives raw instruction control for smart wallet composition.

The Encrypt integration should focus first on confidential numeric policy rules:

- Max per execution.
- Daily cap.
- Daily spent.
- Risk threshold if feasible.

Allowlists and blocklists should not be the first FHE target. They can remain represented by public commitments or Merkle roots for the first milestone, because encrypted membership checks are more complex and higher risk within the hackathon timeline.

## User Stories

1. As an Indonesian DeFi user, I want to delegate a DCA strategy to an AI agent, so that I can automate investing without constantly signing every action.
2. As a wallet owner, I want to deposit funds into a Polet smart wallet, so that the smart wallet can execute approved actions directly.
3. As a wallet owner, I want my AI agent's per-run spending limit to remain private, so that observers cannot infer my risk tolerance.
4. As a wallet owner, I want my daily spending cap to remain private, so that my financial constraints are not exposed on-chain.
5. As a wallet owner, I want daily spent to be tracked confidentially, so that public observers cannot reconstruct my agent budget.
6. As a wallet owner, I want to grant a temporary session key to an AI agent, so that the agent can act without receiving my main wallet authority.
7. As a wallet owner, I want to revoke an AI session key, so that I can stop agent access immediately.
8. As a wallet owner, I want a kill switch for all sessions, so that I can respond quickly if an agent behaves unexpectedly.
9. As a wallet owner, I want to configure DCA from USDC to SOL, so that the first product flow is simple and easy to understand.
10. As a wallet owner, I want a "Run Agent Now" button, so that the demo can trigger the same flow without waiting for a real interval.
11. As a wallet owner, I want automatic DCA scheduling if available, so that the product can support real ongoing strategies.
12. As a wallet owner, I want the system to block a DCA run that exceeds my confidential max per run, so that the agent cannot overspend.
13. As a wallet owner, I want the system to block a DCA run that exceeds my confidential daily cap, so that repeated small actions cannot drain the wallet.
14. As a wallet owner, I want the UI to show that a policy exists without revealing exact private values after saving, so that my confidential setup remains confidential.
15. As a wallet owner, I want to see whether an agent action was approved or blocked, so that I can understand agent behavior.
16. As a wallet owner, I want blocked actions to show a safe explanation without revealing the exact private threshold, so that the UI does not leak the policy.
17. As a wallet owner, I want to choose between Indonesian and English UI, so that the product fits the National Campus Hackathon audience.
18. As a wallet owner, I want the app to feel like a working consumer product, so that the value is clear beyond technical infrastructure.
19. As an AI agent, I want to submit a structured DCA intent, so that I do not need to construct Solana transactions manually.
20. As an AI agent, I want to submit a risk-gated swap intent, so that Polet can decide whether the action is allowed.
21. As an AI agent, I want a simple SDK interface for creating strategy intents, so that OpenClaw, Hermes, and similar runtimes can integrate quickly.
22. As an AI agent developer, I want example code for DCA intents, so that I can understand how to integrate Polet into an agent runtime.
23. As an AI agent developer, I want a submit helper in the SDK, so that I can send intents to the Polet proxy without hand-rolling request code.
24. As a hackathon judge, I want to see a live functional MVP, so that I can verify Polet is more than a design mockup.
25. As a hackathon judge, I want to see the smart wallet execute from its PDA, so that custody and policy enforcement are real.
26. As a hackathon judge, I want to see confidential policy enforcement as a core feature, so that the Encrypt integration is fundamental.
27. As a hackathon judge, I want to see Jupiter APIs used in a composed strategy flow, so that the Jupiter integration is deeper than a basic swap.
28. As a hackathon judge, I want to see honest pre-alpha disclaimers, so that the project does not overclaim production confidentiality.
29. As a Jupiter reviewer, I want a clear DX report, so that I can understand what worked and what blocked development.
30. As a Jupiter reviewer, I want feedback on API onboarding, docs, API keys, and AI tooling, so that the report is actionable.
31. As a Jupiter reviewer, I want to see Tokens, Price, Recurring, and Swap V2 considered together, so that the project demonstrates creative API composition.
32. As an Encrypt/Ika reviewer, I want to see private policy rules used in the critical execution path, so that Encrypt is not superficial.
33. As an Encrypt/Ika reviewer, I want the README to disclose pre-alpha limitations, so that the project is technically honest.
34. As a developer maintaining Polet AI, I want the final contract to avoid plaintext numeric policy fields, so that the privacy claim is not contradicted by state.
35. As a developer maintaining Polet AI, I want to preserve useful v1 concepts, so that the rewrite does not lose proven domain behavior.
36. As a developer maintaining Polet AI, I want policy logic isolated behind testable modules, so that FHE and non-FHE behavior can be verified.
37. As a developer maintaining Polet AI, I want Jupiter integration isolated behind a gateway module, so that API changes are contained.
38. As a developer maintaining Polet AI, I want SDK intent builders to remain backwards-compatible where practical, so that existing examples still work.
39. As a demo presenter, I want an allow scenario and a block scenario, so that the core value is obvious in under five minutes.
40. As a demo presenter, I want the demo to work even if real scheduling is slow, so that the video is reliable.

## Implementation Decisions

- Polet AI will use one contract, not separate v1/v2 programs. "v2" is a product direction, not an on-chain versioning strategy.
- The final contract can be substantially refactored. Plaintext policy fields that contradict the confidentiality claim should be removed from the final execution path.
- The smart wallet PDA must custody funds and execute actions directly. Polet is not only a policy gate for an external wallet.
- The first confidential policy scope is numeric: max per run, daily cap, daily spent, and optionally risk threshold.
- Allowlist and blocklist privacy is deferred. The first milestone can use commitments or Merkle roots for non-numeric rules.
- The main demo pair is USDC to SOL.
- The main demo strategy is DCA.
- Jupiter Recurring is the primary DCA target if it supports the required smart wallet flow.
- Polet scheduler plus Jupiter Swap V2 `/build` is the fallback path for DCA execution.
- Swap V2 `/build` is preferred over `/order` plus `/execute` for smart wallet execution because Polet needs raw instruction control.
- The Jupiter integration should include Tokens and Price checks before execution.
- The frontend should include a "Run Agent Now" control to trigger the strategy flow during demos.
- The SDK should keep existing general intent builders while adding DCA and risk-gated swap builders.
- OpenClaw/Hermes support is required as an agent-compatible SDK example. Real runtime integration is a stretch goal after the core flow works.
- The product should be positioned for three aligned opportunities: Encrypt/Ika as the primary technical track, Jupiter as a complex API integration and DX report track, and Indonesia National Campus Hackathon as a Consumer App/DeFi product for Indonesian users.
- The README and pitch must be honest about Encrypt pre-alpha limitations. The implementation should be described as built against Encrypt pre-alpha confidential policy flow, not as production-grade private custody.

Major modules to build or modify:

- Confidential policy module: owns encrypted numeric policy state, policy checks, and daily spend updates behind a small interface.
- Smart wallet custody module: owns deposits, PDA authority, token account management, session authorization, revocation, and execution gating.
- Jupiter strategy gateway: owns Tokens, Price, Recurring, and Swap V2 `/build` calls and normalizes responses for the proxy.
- Agent strategy module: turns DCA and risk-gated swap intents into executable strategy requests.
- Proxy execution module: coordinates agent intent parsing, Jupiter prechecks, confidential contract calls, and response formatting.
- SDK intent module: exposes DCA and risk-gated swap builders plus submit/evaluate helpers.
- Frontend strategy UI: supports deposit, policy setup, strategy setup, run-now demo, activity log, and ID/EN copy.
- DX report module/documentation: records Jupiter onboarding time, API friction, AI stack usage, docs gaps, edge cases, and requested platform improvements.

## Testing Decisions

Good tests should validate externally observable behavior rather than implementation details. The important behaviors are: a confidential policy allows an in-limit action, blocks an over-limit action, tracks daily spend correctly, honors session revocation, and prevents execution when Jupiter or policy preconditions fail.

The contract tests should cover:

- Wallet initialization and PDA authority.
- Deposit and custody assumptions.
- Session grant, expiry, and revocation.
- Confidential policy setup.
- In-limit DCA execution approval.
- Over max-per-run block.
- Over daily-cap block.
- Daily spent update after allowed execution.
- Kill switch behavior.
- Jupiter CPI or instruction execution path at the smallest reliable integration scope.

The proxy tests should cover:

- DCA intent parsing.
- Risk-gated swap intent parsing.
- Jupiter Tokens and Price precheck behavior.
- Recurring primary path selection.
- Swap V2 fallback path selection.
- Safe error handling when Jupiter APIs fail.
- Blocked responses that do not reveal private policy thresholds.

The SDK tests should cover:

- Existing intent builders remain valid.
- DCA intent builder emits the expected shape.
- Risk-gated swap intent builder emits the expected shape.
- Submit/evaluate helpers call the expected proxy endpoints and handle errors.

The frontend tests should cover:

- Policy setup hides saved confidential values.
- Run Agent Now displays allow and block outcomes.
- Activity log does not leak private thresholds.
- ID/EN toggle updates key user-facing flows.

Prior art exists in the current codebase for policy templates, policy engine tests, intent parser tests, Merkle tree tests, SDK intent builder tests, and end-to-end policy block tests. New tests should follow those behavioral patterns while adapting to the confidential policy architecture.

## Out of Scope

- Full encrypted allowlist or blocklist membership checks.
- Production confidentiality guarantees beyond Encrypt pre-alpha capabilities.
- Mainnet deployment.
- Full OpenClaw/Hermes runtime integration before the core MVP is stable.
- Multi-token strategy portfolio optimization.
- Perps, lending, prediction markets, or flashloan strategies.
- Cross-chain Ika custody beyond what is needed to explain future direction.
- A separate v2 contract or parallel legacy program.
- A generic marketing landing page as the main deliverable.

## Further Notes

The strongest demo is a two-part sequence:

1. The agent attempts to DCA 25 USDC to SOL. Polet blocks the action because it violates confidential policy, but the UI does not reveal the exact max-per-run or daily cap.
2. The agent attempts to DCA 5 USDC to SOL. Polet approves the action and executes through the smart wallet flow.

The pitch should emphasize that Polet AI solves the delegation problem for AI finance: users can let agents act without revealing their private guardrails or surrendering unlimited wallet authority.

The Jupiter DX report is a required deliverable for the Jupiter bounty. It should be written during implementation, not after, so onboarding time, API errors, confusing docs, and AI stack feedback are captured while fresh.

The Encrypt/Ika messaging must remain precise. Polet should claim it is built on Encrypt pre-alpha to demonstrate confidential policy enforcement, while clearly stating that production privacy depends on Encrypt's later alpha/mainnet guarantees.
