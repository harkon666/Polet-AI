# PRD: Polet AI — Policy-Enforced Smart Wallet for AI Agents

## Problem Statement

AI agent wallets (e.g., OpenClaw, Eliza, GOAT) are being drained due to:
- **Hallucination**: AI makes unintended transactions
- **Prompt injection**: Malicious instructions injected into AI context
- **Negligence**: No spending limits or safeguards
- **Rogue behavior**: AI acts beyond user intent

Users have no way to enforce policy rules (allowlist, blocklist, rate limits, amount limits) on their AI agent wallets. When a private key is in a `.env` file, any compromise or AI misbehavior drains the entire wallet.

## Solution

Polet AI is a **secure settlement layer for AI autonomy** — a policy-enforcing smart wallet that gives users granular control over what their AI agents can do with funds.

At a high level:
- Users create a **Program Derived Address (PDA)** wallet on Solana
- Users define **policy rules** (allow/block, amount limits, rate limits, time locks)
- Users grant AI agents a **temporal session key** with configurable expiry
- AI agents submit **intent JSON** via SDK; the policy engine evaluates and enforces rules
- **Fail-secure by default**: transactions without valid policy attestation are rejected on-chain

## User Stories

### End User (Wallet Owner)

1. As a **crypto holder using AI agents**, I want to create a policy-enforced smart wallet, so that I can let AI agents transact on my behalf without risking total wallet drain.

2. As a **crypto holder**, I want to set whitelist-only mode, so that my AI agent can only interact with pre-approved token accounts or programs.

3. As a **crypto holder**, I want to set blocklist rules, so that my AI agent cannot send funds to known malicious addresses.

4. As a **crypto holder**, I want to set daily/weekly/monthly spending limits, so that blast radius is contained if my AI agent is compromised.

5. As a **crypto holder**, I want to set per-transaction amount limits, so that a single errant transaction cannot empty my wallet.

6. As a **crypto holder**, I want to grant temporary session keys to AI agents with configurable expiry, so that access automatically expires and I don't forget to revoke.

7. As a **crypto holder**, I want to revoke session keys instantly via `revoke_session`, so that I can kill agent access immediately in an emergency.

8. As a **crypto holder**, I want to use natural language or templates to define policies, so that I don't need to understand smart contract internals.

9. As a **crypto holder**, I want to see a dashboard of policy evaluation analytics, so that I can understand how my AI agent is behaving.

10. As a **crypto holder**, I want my wallet to sponsor its own gas via a deposit "gas tank" model, so that AI agents can transact without me signing every transaction.

11. As a **crypto holder on paid tier**, I want the platform to sponsor gas as a Paymaster Relayer, so that I don't need to pre-fund my wallet for AI operations.

12. As a **privacy-conscious user**, I want transaction privacy (mixer, stealth addresses), so that my on-chain activity cannot be surveilled.

13. As a **privacy-conscious user**, I want policy privacy (policy details hidden on-chain), so that others cannot see my security rules.

14. As a **beginner user**, I want template-based policy configuration, so that I can set up secure policies without deep knowledge.

### AI Agent Developer

15. As an **AI agent developer**, I want a framework-agnostic SDK (`@polet-ai/ai-plugin`), so that I can integrate policy-enforced wallets into OpenClaw, LangChain, Eliza, or GOAT without rewriting core logic.

16. As an **AI agent developer**, I want to submit **intent JSON** instead of crafting raw Solana transactions, so that I don't need to write Rust or understand Solana RPC.

17. As an **AI agent developer**, I want the infrastructure to handle policy evaluation, ZKP generation, and transaction construction, so that I can focus on AI logic.

18. As an **AI agent developer on free tier**, I want limited policy evaluations per month, so that I can evaluate the product before paying.

19. As an **AI agent developer on paid tier**, I want TEE-based (Trusted Execution Environment) policy evaluation, so that policy logic remains confidential and tamper-proof.

20. As an **AI agent developer**, I want clear error messages when a transaction is blocked, so that I can debug why my agent's action was rejected.

21. As an **AI agent developer**, I want multi-sig support for high-value operations, so that critical actions require human approval.

22. As an **AI agent developer**, I want time-lock on large transfers, so that I have a window to cancel before funds move.

### Platform / System

23. As the **Polet AI platform**, I want cryptographic attestation from the Policy Engine Proxy on every transaction, so that even direct RPC bypass attempts are rejected.

24. As the **Polet AI platform**, I want ZK proof generation via SP1 zkVM, so that off-chain policy evaluation can be verified on-chain without revealing policy details.

25. As the **Polet AI platform**, I want to commit policy hashes on-chain, so that the policy state is verifiable without exposing plaintext rules.

26. As the **Polet AI platform**, I want TEE (Phala Network for MVP) for off-chain policy evaluation, so that complex policy logic runs confidentially.

27. As the **Polet AI platform**, I want a simulated TEE for demo purposes, so that the system works even before full TEE integration.

28. As the **Polet AI platform**, I want admin-upgradeable contracts initially (Phase 1), so we can iterate fast, with a path to DAO governance (Phase 2).

## Implementation Decisions

### Architecture Overview

```
AI Agent → Intent JSON → SDK → Off-Chain Proxy (TEE) → ZKP Generation → Solana Program (PDA)
```

### On-Chain (Solana Program / PDA)

- **Policy rules committed on-chain as hash** (blake3 of policy JSON)
- **Temporal key management**: expiry timestamp, authorization state stored in PDA account
- **Authorization state**: `Authorized` / `Revoked` / `Expired`
- **Stateful limits enforced on-chain**: daily累计 amount tracked in account
- **ZKP verification instruction**: verifies SP1 proof of policy compliance
- **Source of truth for all authorization state**

### Off-Chain (Policy Engine Proxy)

- **Intent parsing and routing**: parses intent JSON, determines action type
- **Policy evaluation**: evaluates intent against stored policy rules
- **ZKP generation**: uses SP1 zkVM to generate compliance proof
- **Transaction construction**: builds and signs Solana transaction after approval
- **Rate limiting and anomaly detection**: in-memory counters + pattern analysis

### Modules to Build

1. **Solana PDA Wallet Program** (`contract/programs/contract/`)
   - `initialize`: Create wallet PDA with owner
   - `set_policy`: Commit policy hash to wallet
   - `grant_temporal_key`: Create temporal key with expiry + rules
   - `revoke_session`: Immediately revoke temporal key
   - `execute_intent`: Execute if attestation valid + policy passes
   - `verify_proof`: Verify ZKP from off-chain evaluation
   - Account structs: `Wallet`, `TemporalKey`, `Policy`

2. **Off-Chain Proxy** (`proxy/`)
   - Bun + Hono + Neon (edge-compatible)
   - Intent parsing endpoint
   - Policy evaluation engine
   - SP1 proof generation
   - Transaction construction + submission

3. **SDK** (`sdk/`)
   - `@polet-ai/ai-plugin` npm package
   - Intent JSON builder
   - Session key management
   - Examples for OpenClaw, LangChain

4. **Frontend** (`frontend/`)
   - Vite + React + shadcn/ui
   - Wallet creation + policy configuration UI
   - Template + natural language policy builder
   - Temporal key grant flow
   - Analytics dashboard

### Key Account State

```rust
// Wallet account
struct Wallet {
    owner: Pubkey,
    policy_hash: [u8; 32],
    temporal_keys: Vec<TemporalKey>,
    daily_spent: u64,
    last_reset: i64,
}

// Temporal key
struct TemporalKey {
    key: Pubkey,
    expires_at: i64,
    authorized: bool,
    daily_limit: u64,
}
```

### Security Model

- **Fail-secure**: Program requires valid attestation from Policy Engine Proxy; no attestation = tx reverts
- **Blast radius containment**: temporal keys have per-key daily limits
- **Kill switch**: `revoke_session` immediately sets `authorized = false`
- **Policy hash on-chain**: prevents tampering with policy rules without breaking attestation

### ZK Strategy

- **SP1 (Succinct Labs) zkVM** for policy proof generation
- Policy committed as hash; TEE has plaintext for evaluation
- Proof proves: "this intent complies with the policy at this hash"
- On-chain verification is O(1), evaluation is O(n) in TEE

### TEE Strategy (Simulated for MVP)

- **Phase 1 MVP**: Simulated TEE — policy engine runs as regular Bun server
- **Phase 2**: Phala Network (hosted TEE, easier onboarding)
- **Phase 3**: AWS Nitro Enclave (production)

### Gas Model

- **Free tier**: User deposits SOL to Session Key address as "gas tank"; AI agent burns its own SOL
- **Paid tier**: Platform acts as Paymaster Relayer; sponsors gas, deducts from subscription

### Business Model (Freemium)

- **Free Tier**: Basic policy (allow/block, amount limits), limited evaluations/month, non-TEE
- **Paid Tier**: TEE privacy, unlimited evaluations, priority support, multi-sig, analytics

## Testing Decisions

### Good Test Characteristics

- **Test external behavior only**: do not test internal implementation details
- **Test through SDK interface**: real integration test via intent JSON flow
- **Test on localnet**: use `litesvm` for fast iteration without mainnet

### Modules to Test

1. **Solana Program** — unit tests via Anchor's `#[derive(Accounts)]` and `Result` return checks
2. **Intent Routing** — integration test: send intent JSON, verify policy evaluation result
3. **Policy Engine** — table-driven tests: policy rules × intent → expected allow/block/modify
4. **ZKP Generation + Verification** — integration test: generate proof, verify on-chain

### Test Patterns

- Policy evaluation: given policy X and intent Y, expect result Z
- Temporal key expiry: advance clock, verify `execute_intent` fails
- Revocation: call `revoke_session`, verify key immediately rejected
- Attestation bypass: send tx without valid attestation, expect revert

## Out of Scope

- **TEE integration in MVP**: will use simulated TEE for demo (real Phala integration post-hackathon)
- **ZK proof generation in MVP**: off-chain evaluation without ZKP (ZKP added when SP1 integration is ready)
- **Privacy features**: stealth addresses, transaction mixer (paid tier feature)
- **Multi-sig**: paid tier feature, human button press for critical ops
- **Time-lock on transfers**: paid tier feature, delay window for cancellation
- **DAO governance**: Phase 2 upgrade, current contract is admin-upgradeable
- **Analytics dashboard**: post-MVP, basic transaction history only in MVP
- **AI agent SDK integration**: OpenClaw/LangChain SDK wrappers (post-MVP or community)
- **Paid gas sponsorship (Paymaster Relayer)**: free tier uses gas tank model only

## Further Notes

- **Hackathon Demo Focus**: The "wow moment" is the policy BLOCK demo — AI agent tries to drain wallet, policy rejects in real-time with visible "BLOCKED" state.
- **Demo Transaction**: AI agent attempts to send $500, policy limit is $50/day — transaction rejected.
- **Build Priority**: Week 1 focuses on Solana PDA wallet program + temporal key flow. Off-chain proxy and SDK come in Week 2.
- **Framework Agnostic**: SDK positioned as industry standard, works with OpenClaw, LangChain, Eliza, GOAT — not competing with AI brain frameworks.