# Production Smart Wallet Agent Trading PRD

Labels: `needs-triage`, `product`, `smart-wallet`, `custody`, `agent-runtime`, `policy`, `jupiter`, `ika`, `encrypt`

Type: `HITL`

Status: `IN PROGRESS`

## Problem Statement

Polet currently proves the core control-layer thesis through wallet initialization, policy setup, agent session authorization, allow/block guardrails, Jupiter route/build previews, and Ika approval preparation. That is useful for a hackathon demo, but it still reads like a policy simulator unless the smart wallet becomes the real custody and execution boundary for agent trading.

Users need a production-facing smart wallet where they can deposit USDC and native SOL, set policy rules, authorize a secondary owner-controlled agent wallet, and let that agent auto-execute approved trades without receiving custody over the principal or profit. The agent should pay its own gas from a small SOL balance, while the smart wallet keeps trading funds, profits, policy accounting, and recovery/withdrawal authority under the owner-controlled custody boundary.

The product must also stay honest about current infrastructure limits. Jupiter quote and price APIs can support MVP quote-based valuation, but they are not independent oracle guarantees. Ika should remain a policy-gated signing or approval rail for cross-chain intent, not a claim of full bridgeless custody settlement. Encrypt should remain the forward confidential numeric policy path for private max-per-trade, daily-cap, and daily-spent values.

## Solution

Polet will become a production-oriented Solana smart wallet for AI agent trading. The owner creates a Polet smart wallet, deposits USDC and native SOL into smart-wallet custody, configures public operational guardrails and confidential numeric spending rules, grants a manual external agent wallet as a session signer, and optionally funds that agent wallet with a small amount of SOL for gas.

The agent runtime uses the Polet SDK/proxy to request trades. For each trade, Polet fetches a Jupiter swap quote for trade-specific USDC-equivalent valuation, applies public route and risk guardrails, requires confidential numeric policy approval, builds a short-lived unsigned transaction, simulates it, and lets the agent sign and broadcast only if the simulation passes. The contract remains the final authority: execution re-checks session state, policy sequence, quote bounds, balance, daily-spent state, and native SOL reserve in the same successful transaction that mutates spend accounting.

Frontend becomes the command center for setup and operations, not the execution loop. It should expose create wallet, deposit to smart wallet, set policy, grant/revoke session, fund agent gas wallet, readiness checks, balance views, activity history, owner-only withdraw, and recovery controls. Agent auto-execution is the primary runtime mode; manual frontend execution is not required for the production MVP.

## User Stories

1. As a wallet owner, I want to create a Polet smart wallet, so that my agent trading funds are controlled by a policy-enforced custody boundary.
2. As a wallet owner, I want to deposit USDC into smart-wallet custody, so that the agent can trade from controlled principal.
3. As a wallet owner, I want to deposit native SOL into smart-wallet custody, so that the wallet can hold SOL trading funds and profits.
4. As a wallet owner, I want deposit flows to build transfer transactions for me, so that I do not accidentally send USDC to the wrong account.
5. As a wallet owner, I want to see USDC balance, total SOL balance, reserved SOL, and tradable SOL, so that I understand what the agent can use.
6. As a wallet owner, I want to withdraw USDC at any time, so that I retain custody control over my funds.
7. As a wallet owner, I want to withdraw native SOL above the required reserve, so that I can recover funds without breaking operational invariants.
8. As a wallet owner, I want owner admin actions to use my owner wallet for fees, so that custody SOL remains portfolio value rather than a fee bucket.
9. As a wallet owner, I want to configure a minimum SOL reserve, so that agent trading cannot drain native SOL custody below the reserve.
10. As a wallet owner, I want public guardrails for supported assets, venues, slippage, route type, and SOL reserve, so that non-secret operational rules are auditable.
11. As a wallet owner, I want private max-per-trade and daily-cap policy values, so that my spending limits are not exposed to the agent or public UI.
12. As a wallet owner, I want daily-spent accounting to update only after successful execution, so that failed previews or failed transactions do not consume quota.
13. As a wallet owner, I want stale policy-sequence requests rejected, so that old approvals cannot execute after policy changes.
14. As a wallet owner, I want to authorize a manual external agent wallet as a session signer, so that Polet/proxy does not need custody of the agent private key.
15. As a wallet owner, I want the agent wallet to pay gas from its own small SOL balance, so that trading fees are separated from smart-wallet custody funds.
16. As a wallet owner, I want to fund the agent gas wallet from the frontend, so that auto-execution is ready without confusing gas funding with custody deposit.
17. As a wallet owner, I want trade output and profit to return to smart-wallet custody, so that the agent wallet never receives principal or profit by default.
18. As a wallet owner, I want to revoke an individual agent session, so that I can stop one agent without rebuilding the whole wallet.
19. As a wallet owner, I want revoked sessions to invalidate pending unsigned transactions, so that an agent cannot execute stale artifacts after access is removed.
20. As a wallet owner, I want owner-only withdrawals to remain possible while a session is active, so that I can manage funds without revoking the agent.
21. As an AI agent operator, I want the agent wallet public key to be the session key, so that authorization matches the signer that will pay gas and broadcast trades.
22. As an AI agent operator, I want the private key to stay inside the agent runtime, so that Polet/proxy only sees the public session signer.
23. As an AI agent, I want to request a Jupiter trade through the Polet SDK, so that the policy boundary builds and checks the execution path for me.
24. As an AI agent, I want to auto-execute only after policy allow and transaction simulation succeed, so that normal trading does not depend on frontend clicks.
25. As an AI agent, I want blocked responses to be normalized, so that I can stop, retry later, or reduce trade size without learning private thresholds.
26. As an AI agent, I want stale quote failures to require rebuild, so that I do not execute against an old market assumption.
27. As an AI agent, I want insufficient custody balance to be a normal failure, so that owner withdrawals or depleted balances do not create unsafe behavior.
28. As an AI agent developer, I want a short-lived unsigned transaction artifact, so that approval cannot be stored and executed long after quote or policy context changes.
29. As an AI agent developer, I want simulation helpers to support unsigned preview and signed verification modes, so that runtimes can verify before broadcast.
30. As an AI agent developer, I want required signer reporting, so that the runtime can detect when the configured agent wallet cannot sign a returned transaction.
31. As a DeFi user, I want SOL trades to be valued using Jupiter quote-based USDC-equivalent exposure, so that SOL and USDC spending share one policy budget.
32. As a DeFi user, I want dashboard balances to use Jupiter Price API, so that displayed portfolio value is useful without pretending to be the execution oracle.
33. As a DeFi user, I want quote-based valuation labeled clearly, so that I understand it is not an independent oracle.
34. As a DeFi user, I want quote TTL, slippage, minimum output, and route metadata bound to execution, so that stale or unsafe trades fail instead of silently executing.
35. As a DeFi user, I want concurrent trades to resolve by first confirmed execution winning and later over-cap executions failing, so that daily cap enforcement remains authoritative.
36. As a reviewer, I want Ika to remain a policy-gated approval rail, so that Polet does not overclaim full cross-chain custody execution before it exists.
37. As a reviewer, I want no Ika approval data returned when policy is pending or blocked, so that cross-chain signing artifacts cannot bypass Polet policy.
38. As a maintainer, I want custody, quote valuation, policy execution, agent runtime, and frontend readiness as deep modules, so that each boundary can be tested independently.
39. As a maintainer, I want legacy guardrail demo paths kept separate, so that production smart-wallet semantics are not confused with earlier preview-only behavior.
40. As a maintainer, I want production claims reflected in docs and UI copy, so that Polet does not claim oracle security, mainnet settlement, or proxy-held key safety it does not provide.

## Implementation Decisions

- Smart wallet custody supports only USDC and native SOL for the production MVP.
- USDC custody uses a PDA-owned token account. Native SOL custody uses lamports held by the smart-wallet PDA or the program-approved custody account shape selected during implementation.
- Native SOL custody has a minimum reserve. Agent trading can only use SOL above the reserve.
- Deposit is permissionless at the protocol level, but the primary frontend flow builds owner-signed transfer transactions for USDC and SOL.
- Withdraw is owner-only for the MVP. Agent generic withdraw and generic transfer are not supported.
- Owner admin actions are paid by the owner wallet. Agent trade actions are paid by the agent wallet. Smart-wallet custody SOL is not used for transaction fees by default.
- The agent wallet is a secondary owner-controlled wallet. Its public key is the session key. Its private key remains in the external agent runtime.
- Polet/proxy-generated session keys are demo-compatible but should not be the production default unless a production-grade signer custody design is explicitly added.
- Agent auto-execution is the primary production runtime mode. Frontend manual execution is not required for the MVP.
- Trade principal and profit return to smart-wallet custody, not to the agent wallet.
- Public operational guardrails include supported assets, supported venues, slippage bounds, quote TTL, route type, session expiry, and native SOL reserve.
- Confidential numeric policy covers max-per-trade USD, daily-cap USD, daily-spent USD, and future per-asset numeric caps where needed.
- Jupiter swap quote is the source for trade-specific USDC-equivalent valuation. Jupiter Price API is used for dashboard and balance display only.
- Jupiter quote and price data must be described as quote-based valuation, not as an independent oracle.
- Quote-bound execution must bind input amount, output amount or minimum output, slippage, route metadata where practical, quote freshness, policy sequence, and current spend state.
- Stale quotes or stale unsigned transactions must fail or require rebuild.
- Daily-spent accounting updates atomically inside successful policy-gated execution, not during preview or request preparation.
- Concurrent trade previews are advisory. On-chain execution is authoritative: first confirmed execution updates state, and later transactions fail if they exceed current cap or balance.
- Revoking a session must invalidate any pending unsigned transaction from that session through current session-state checks in the execution instruction.
- Ika remains a policy-gated signing or approval rail for the MVP. It is not the primary custody executor and should not be described as full bridgeless settlement.
- Frontend readiness requires smart wallet created, custody funded or intentionally empty, policy active, agent session active, agent gas wallet funded, and SOL reserve satisfied before agent auto-execution is presented as ready.

## Testing Decisions

- Good tests should verify external behavior and security invariants at the contract, proxy, SDK, and frontend boundaries. They should not assert private helper structure unless that structure is the public compatibility contract.
- Contract tests should cover USDC custody registration, native SOL reserve enforcement, owner-only withdrawal, session authorization, session revoke invalidating stale execution, daily-spent mutation on successful execution, and concurrent over-cap failure behavior.
- Proxy tests should cover deposit and withdrawal transaction builders, Jupiter quote-based valuation, quote TTL rejection, slippage/min-output binding, public guardrail failures, and suppression of execution artifacts when policy is blocked or pending.
- SDK tests should cover agent auto-execute after allowed plus successful simulation, signer-required failures, blocked response normalization, stale quote rebuild behavior, and insufficient balance handling.
- Frontend tests should cover readiness state, deposit USDC/SOL UX, agent gas funding UX, balance panels, revoke session action, owner-only withdraw, policy copy that distinguishes quote valuation from oracle guarantees, and no confusing merge of custody deposits with agent gas funding.
- Existing tests for guarded strategy execution, Jupiter gateway, agent runtime, transaction simulation, session authorization, confidential policy, and frontend demo flows are prior art and should be extended rather than bypassed.

## Out of Scope

- Multi-asset custody beyond USDC and native SOL.
- Generic agent withdrawals or arbitrary transfers.
- Proxy-held production signer custody, MPC, or managed private-key infrastructure.
- Manual frontend execution as the primary runtime mode.
- Independent oracle integration for SOL/USD or token/USD valuation.
- Full cross-chain settlement claims through Ika.
- Production mainnet Jupiter swap execution claims until the custody execution path is verified end to end.
- Global wallet pause or revoke-all-session kill switch. The MVP starts with individual session revoke.
- Agent profit payout to the agent wallet.
- Using smart-wallet custody SOL as the default fee payer for agent trades.

## Further Notes

The product position should shift from "guardrail demo" to "agent-safe spending account." The strongest production story is:

Owner creates Polet smart wallet, deposits USDC/SOL, sets policy, authorizes a secondary owner-controlled agent wallet, funds that agent wallet with small SOL for gas, and lets the agent auto-execute only policy-approved trades. The smart wallet holds principal and profit, while the agent only supplies strategy requests and transaction signatures under session authority.

This PRD should be broken into tracer-bullet issues after review. Each slice should be independently demoable and preserve the custody boundary, rather than implementing isolated horizontal layers that cannot prove end-to-end behavior.
