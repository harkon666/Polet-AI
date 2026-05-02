# Polet AI — Product Grill Session Summary

**Date:** 2026-05-02
**Grill Duration:** 31 questions across product, architecture, business model, security, and execution

---

## Problem Statement

**Core Problem:** AI agent wallets are being drained due to hallucination, negligence, prompt injection, or rogue behavior. Users of products like OpenClaw currently use wallets without policy rules for prevention, making wallets vulnerable.

**Target Users:** Both end users (people who have AI agents and grant wallet access) and AI agent developers (who want to integrate secure wallet with policy into their products).

---

## Product Requirements

### User-Facing Features

| Feature | Description |
|---------|-------------|
| Policy Rules (Free) | Basic whitelist/blacklist, simple allow/block |
| Policy Rules (Paid) | Rate limiting, amount modification, time lock, require confirmation, analytics dashboard, multi-sig |
| Privacy | Transaction privacy (mixer, stealth addresses) + Policy privacy (policy details hidden from public) |
| UX | Beginner-friendly, template + natural language policy configuration |
| Temporal Key | User grants temporary key to AI agent with configurable expiry |

### Developer-Facing Features

| Feature | Description |
|---------|-------------|
| SDK | Framework-agnostic SDK/plugin (like `@wallet-name/ai-plugin`) |
| Intent Model | AI agent submits intent JSON, infrastructure handles execution |
| Developer Tiers | Free tier (limited evaluations) + Paid subscription |

---

## Business Model

**Freemium with Usage Limits + Feature Gating**

- **Free Tier:** Basic policy features, limited policy evaluations per month, non-TEE evaluation
- **Paid Tier:** TEE-based privacy, unlimited policy evaluations, priority support
- **Pricing Model:** SDK licensing / API quota untuk developer; gas fee sponsorship untuk end user

### TEE Cost Recovery

| Model | Description |
|-------|-------------|
| Model 1: Pay-as-you-go | User deposits SOL for "AI Operational Fee" — cada transaction deducts small fee for TEE |
| Model 2: Subscription | Developer pays $X/month for N policy evaluations, platform covers TEE cost as COGS |

---

## Technical Architecture

### Hybrid On-Chain + Off-Chain + ZK

```
AI Agent → Intent JSON → SDK → Off-Chain Proxy (TEE) → ZKP Generation → Solana Program (PDA)
```

**On-Chain (Solana Program/PDA):**
- Policy rules committed on-chain as hash
- Temporal key management (expiry, authorization state)
- Absolute policy enforcement (stateful limits)
- ZKP verification (stateless/complex rules)
- Source of Truth for authorization state

**Off-Chain (TEE Proxy):**
- Policy evaluation (complex logic)
- Intent parsing and routing
- ZKP generation
- Transaction construction
- Rate limiting and anomaly detection

**ZK Strategy:**
- Use **SP1** (Succinct Labs) zkVM for policy proof generation
- Policy committed on-chain as hash
- Proxy has plaintext policy for evaluation, generates ZKP proving compliance

### TEE Strategy

- **MVP:** Phala Network (hosted TEE, easy onboarding)
- **Production:** AWS Nitro Enclave

### Two-Tier Gas System

| Tier | Mechanism |
|------|-----------|
| Free | User deposits SOL to Session Key address as "gas tank" — AI agent burns its own SOL |
| Paid (Pro/Enterprise) | Platform acts as Paymaster Relayer — sponsor gas for agent, deducted from subscription |

---

## Security Model

### Threats & Mitigations

| Threat | Mitigation |
|--------|------------|
| AI Agent bypasses proxy | Solana Program requires cryptographic attestation from Policy Engine Proxy — fail-secure by default |
| Temporal key theft | Blast radius containment (limited to daily_limit), kill switch via `revoke_session` instruction |
| TEE enclave breach | Assumes zero-trust, damage limited by policy constraints |
| Policy manipulation | Admin can update rules anytime, temporal key authorization is separate |

### Fail-Secure Design

> "Even if hacker bypasses SDK and goes directly to RPC, Solana Program will revert transaction because it lacks cryptographic attestation from Policy Engine Proxy."

### Upgrade Path

- **Phase 1:** Admin upgradeable (single admin key)
- **Phase 2:** DAO/governance upgrade

---

## Competitive Analysis

### Landscape

| Competitor | Position | Gap |
|------------|----------|-----|
| OpenClaw, Eliza, GOAT, Solana Agent Kit | AI "brain" frameworks | Security nightmare — private key in .env |
| Cobo, MoonPay Agents | Institutional MPC | Custodial/semi-custodial, expensive, not Solana-native |
| Squads V4, Ledger DMK | Multisig & hardware guardrails | Require human button press, not designed for high-frequency AI intent routing |

### Moat

1. **Core Competency Focus:** OpenClaw focused on AI brain; Polet AI focused on secure vault. Not competitors — complementary.
2. **Framework Agnostic:** SDK works with OpenClaw, LangChain, Eliza, GOAT — network effect as industry standard.
3. **Technical Barrier:** Combining Solana PDA + TEE + Intent routing is non-trivial engineering — high liability for AI frameworks to build themselves.

### Positioning

> "Stripe for AI Agents" — the secure settlement layer for AI autonomy

---

## MVP Scope (2 Weeks, Solo Developer)

### Build Sequence

```
Week 1:
1. Solana PDA wallet program (basic policy: allow/block)
2. Temporal key grant flow (UI + on-chain)
3. Off-chain proxy (basic, no TEE yet)

Week 2:
4. SDK/plugin (intent JSON routing)
5. Policy UI (template + NL)
6. TEE integration (Phala)
7. End-to-end demo dengan AI agent trading
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Rust + Anchor |
| Off-chain Proxy | Bun + Hono + Neon (Edge-compatible) |
| Frontend | Vite + React + shadcn/ui |
| TEE | Phala Network (MVP) |
| ZK | SP1 (Succinct Labs) |
| AI Agent SDK | OpenClaw integration |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TEE integration too complex | Use simulated TEE for demo |
| OpenClaw integration undocumented | Mock AI agent until real integration ready |

---

## Demo Strategy

**Format:** Hybrid — pre-recorded video for complex flow, live demo for "wow moment"

**Live Wow Moment:** Policy BLOCK
- AI agent tries to drain wallet
- Policy rejects in real-time
- User sees "BLOCKED" on screen

**Demo Transaction:** AI agent attempts to send $500, policy limit is $50/day — transaction rejected

---

## Hackathon Pitch Points

### Why Solana?

- Native PDA (Program Derived Address) — not ERC-4337 copy-paste
- Parallel execution enables thousands of AI agent transactions per day
- Near-zero fees enable micro-transactions impossible on EVM
- Solana is where AI agents will live in 2026

### Why Judges Should Pick Polet AI?

1. **Solana-Native AI Autonomy** — leverages pure Solana primitives, not EVM port
2. **ZK-Coprocessor + TEE Architecture** — engineering maturity beyond hackathon level
3. **Intent-Centric DX** — developers don't need to learn Rust, just send JSON intent
4. **Solves Real Problem** — AI wallet drain is happening NOW, solution is needed NOW

---

## Open Questions

- Product name: **Polet AI**
- Tagline: Not yet defined
- Domain: Not yet registered
- Pricing tiers: Not yet finalized ($ amount not defined)

---

## Next Steps

1. [ ] Define pricing tiers (free vs paid limits)
2. [ ] Define tagline and secure domain
3. [ ] Start Week 1: Build Solana PDA wallet program
4. [ ] Implement temporal key grant flow
5. [ ] Build basic off-chain proxy
6. [ ] Test "BLOCKED" demo scenario FIRST
7. [ ] Continue with SDK, policy UI, TEE