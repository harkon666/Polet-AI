# PRD: Polet AI Production Alignment — Phase 1 Implementation

## Problem Statement

The current Polet AI codebase is in hackathon/demo state with critical production gaps:

1. **Wallet store uses mock data** — `getWalletData()` returns permissive mock for any owner, `isSessionAuthorized()` returns `true` when no temporal keys registered
2. **Policy bypass in proxy** — `isDemo = !!body.policy` allows any intent through when policy is passed in body
3. **Weak hash function** — `policy-engine.ts` uses `Math.abs()` with integer overflow, not cryptographically safe
4. **Fake addresses in templates** — gambling-block template uses placeholder addresses
5. **Type mismatch** — frontend `Intent.policy` is `Policy` object, proxy parses as string
6. **Hardcoded localhost RPC** — `transaction-builder.ts` defaults to `127.0.0.1:8899`
7. **No real attestation signature** — `generateAttestation()` produces unsigned mock attestation
8. **No wallet initialization flow** — frontend lacks Create Wallet button

## Solution

Production-ready Phase 1 implementation following the [GRILL-SESSION.md](GRILL-SESSION.md) decisions (2026-05-03):

- **Architecture**: SP1-2FA hybrid (ZK + TEE) + Hybrid On-Chain/Off-Chain
- **Contract**: Add proxy_pk, merkle_root, policy_seq, last_revoked_slot to Wallet; SetProxyKey instruction; Merkle proof + TEE attestation verification
- **Proxy**: Session key generation + AES encryption; Merkle tree builder; SHA-256 policy hash; wallet management endpoints; Solana devnet RPC
- **Frontend**: Wallet initialization flow; DemoTab with real addresses; on-chain policy and temporal key flows
- **Build approach**: Contract TDD first, then vertical slices per feature (contract → proxy → frontend)

## User Stories

### End User (Wallet Owner)

1. As a **wallet owner**, I want to create a new wallet with proxy-generated session key, so that my wallet is secured by a unique proxy key from initialization.
2. As a **wallet owner**, I want to set policy rules that never leave a TEE enclave, so that my policy logic remains confidential and tamper-proof.
3. As a **wallet owner**, I want the contract to verify both ZK proof and TEE attestation, so that neither alone can bypass policy.
4. As a **wallet owner**, I want my policy rules committed as a Merkle root on-chain (depth 10, max 1024 leaves), so that policy compliance can be proven without revealing rules.
5. As a **wallet owner**, I want slot-based session revocation, so that a compromised session is immediately rejected on-chain.
6. As a **wallet owner**, I want policy sequence tracking, so that policy changes invalidate old attestations.
7. As a **wallet owner**, I want to update my wallet's proxy public key, so that I can rotate keys if compromised.
8. As a **wallet owner**, I want to grant temporal session keys that the proxy signs transactions with, so that AI agents can act on my behalf without holding my signing key.
9. As a **wallet owner**, I want per-agent auth key registration, so that each AI agent has its own identity key separate from session signing.
10. As a **wallet owner**, I want a dashboard with Create Wallet button, so that I can initialize my smart wallet explicitly.
11. As a **wallet owner**, I want real-time policy evaluation feedback, so that I can see why an intent was allowed or blocked.
12. As a **wallet owner**, I want blocklist and allowlist with real Solana addresses, so that my AI agent cannot interact with unknown or malicious programs.

### AI Agent Developer

13. As an **AI agent developer**, I want to register my auth public key with the proxy during onboarding, so that I can authenticate with wallet-based auth.
14. As an **AI agent developer**, I want to submit intent JSON and receive a signed transaction, so that I don't handle raw Solana transaction construction.
15. As an **AI agent developer**, I want clear error codes (POLICY_BLOCKED, SESSION_NOT_AUTHORIZED), so that I can debug blocked intents.
16. As an **AI agent developer**, I want the proxy to sign transactions with the session key, so that my agent never sees the owner's funds directly.

### Platform / System

17. As the **platform**, I want to generate a unique Ed25519 keypair per wallet at initialize, so that each wallet has its own proxy signing key.
18. As the **platform**, I want session key AES-encryption with PROXY_MASTER_KEY, so that keys are stored securely at rest.
19. As the **platform**, I want SHA-256 policy hashing, so that policy commitments are cryptographically secure.
20. As the **platform**, I want the contract to verify Merkle proofs, so that policy compliance is verifiable on-chain.
21. As the **platform**, I want SP1 boolean proof (ALLOWED/BLOCKED only), so that policy rules are never revealed.
22. As the **platform**, I want local SP1 prover for MVP devnet, so that we don't depend on Succinct Prover Network during development.
23. As the **platform**, I want TEE (Phala Network) for MVP devnet, so that policy evaluation is confidential and hardware-attested.

## Implementation Decisions

### Architecture

```
AI Agent → Intent JSON → SDK → Proxy (TEE enclave) → SP1 Prover → Solana Program (PDA)
                                                         ↓
                                          Ed25519 TEE attestation + Merkle proof
```

**SP1-2FA Hybrid**: Both TEE attestation AND ZK proof must verify on-chain. Boolean proof proves intent is ALLOWED or BLOCKED without rule disclosure.

### Contract Changes (Rust/Anchor)

1. **New Wallet fields**:
   - `proxy_pk: Pubkey` — proxy's public key for this wallet
   - `merkle_root: [u8; 32]` — committed Merkle root (depth 10, max 1024 leaves)
   - `policy_seq: u64` — increments on each policy change
   - `last_revoked_slot: u64` — slot at which last revocation occurred

2. **New instruction**: `SetProxyKey` — owner-only, updates `proxy_pk`

3. **Modified `execute_intent_as_session`**:
   - Verifies Ed25519 TEE attestation signature
   - Verifies Merkle proof against `wallet.merkle_root`
   - Verifies `attestation.policy_seq == wallet.policy_seq`
   - Verifies `attestation.slot > wallet.last_revoked_slot`

4. **Immutable contract for devnet** — admin upgrade post-MVP

### Proxy Key Model

- **Platform-generated**: Proxy generates unique Ed25519 keypair per wallet at initialize
- **Storage**: AES-encrypted file at `proxy/keys/{wallet}/`, master key from `PROXY_MASTER_KEY` env var
- **Key rotation**: `set_proxy_key` instruction lets owner update proxy_pk anytime

### Session Key Model

- **Proxy generates**: Session keypair generated by proxy, private key AES-encrypted at rest
- **Proxy signs**: Proxy uses session key to sign transactions server-side (Paymaster model)
- **Agent auth keypair**: Separate Ed25519 keypair per agent, registered with proxy during onboarding

### Policy Privacy

- **TEE (Phala Network)**: Confidential policy evaluation — policy rules never leave enclave
- **ZK (SP1 zkVM)**: Circuit proves compliance without revealing policy rules
- **Merkle tree**: Policy rules committed on-chain as Merkle root (depth 10, max 1024 leaves)
- **Boolean proof**: Circuit proves intent is ALLOWED or BLOCKED without rule disclosure

### Session Revocation

- **Slot-based**: Attestation includes slot number at evaluation time
- Contract checks: `attestation.slot > wallet.last_revoked_slot`
- On revocation: `last_revoked_slot` updated to current slot

### Policy Updates

- **Policy sequence number**: Each policy change increments `wallet.policy_seq`
- Attestation includes `policy_seq` at evaluation time
- Contract verifies `attestation.policy_seq == wallet.policy_seq`

### Modules to Build

#### Phase 1: Contract (TDD first)

1. Add `proxy_pk`, `merkle_root`, `policy_seq`, `last_revoked_slot` to Wallet struct
2. Add `SetProxyKey` instruction
3. Add Merkle proof verification to `execute_intent_as_session`
4. Add TEE attestation verification (mock in unit tests, real in integration)
5. Rust/Anchor tests with mock attestation verifier

#### Phase 2: Proxy (after contract IDL)

1. Session key generation + AES-encrypted storage
2. Merkle tree builder + proof generator (depth 10, fixed order)
3. SP1 prover inside TEE (local prover mode for MVP)
4. Replace `policy-engine.ts` hash with SHA-256
5. Remove demo bypass logic (`body.policy`, `isDemo`)
6. Add wallet management endpoints (`/wallet/initialize`, `/wallet/set-policy`, `/wallet/grant-key`)
7. Wire to Solana devnet RPC (public endpoint)
8. Agent auth key registration flow

#### Phase 3: Frontend (after proxy endpoints)

1. Create Wallet button + explicit initialize flow
2. Fix DemoTab — real Solana addresses, real proxy calls
3. Policy application flow (on-chain via proxy)
4. Temporal key grant flow (on-chain via proxy)

### API Contracts

#### POST /wallet/initialize
Request: `{ owner: string }`
Response: `{ success: true, data: { wallet: string, proxyKey: string } }`

#### POST /wallet/set-policy
Request: `{ owner: string, policy: Policy }`
Response: `{ success: true, data: { merkleRoot: string, policySeq: number } }`

#### POST /wallet/grant-key
Request: `{ owner: string, sessionKey: string, expiresAt: number, dailyLimit: number }`
Response: `{ success: true, data: { transaction: string } }`

#### POST /intent/evaluate
Request: `{ id: string, owner: string, sessionKey: string, action: string, params: object, timestamp: number }`
Response: `{ success: true, data: { allowed: boolean, reason?: string, code?: string, attestation?: object } }`

#### POST /intent/execute
Request: `{ id: string, owner: string, sessionKey: string, action: string, params: object, timestamp: number }`
Response: `{ success: true, data: { allowed: boolean, transaction?: object, blockHash?: string, slot?: number } }`

### Schema Changes

#### Wallet Account (Rust)
```rust
struct Wallet {
    owner: Pubkey,
    proxy_pk: Pubkey,           // NEW: proxy's public key
    merkle_root: [u8; 32],       // NEW: Merkle root for policy rules
    policy_seq: u64,             // NEW: policy sequence number
    last_revoked_slot: u64,       // NEW: slot-based revocation
    policy_hash: [u8; 32],
    policy_data: Vec<u8>,
    daily_spent: u64,
    last_reset: i64,
    daily_limit: u64,
    temporal_keys: Vec<TemporalKey>,
}
```

#### Attestation
```typescript
interface Attestation {
  owner: string;
  sessionKey: string;
  policyHash: string;
  intentHash: string;
  blockHash: string;
  slot: number;
  timestamp: number;
  // NEW: TEE fields
  teeAttestation?: string;      // Ed25519 signature from TEE
  zkProof?: string;             // SP1 proof bytes
  policySeq: number;             // included in attestation
}
```

### Key Security Invariants

1. **Fail-secure by default**: No attestation = transaction reverts
2. **Both TEE + ZK required**: On-chain rejects if either fails
3. **Slot revocation**: Attestation with slot ≤ `last_revoked_slot` rejected
4. **Policy sequence**: Attestation with stale `policy_seq` rejected
5. **Owner-only proxy key**: Only wallet owner can call `set_proxy_key`
6. **Agent auth separate**: Auth key ≠ session signing key

## Testing Decisions

### Contract TDD

- **Rust/Anchor unit tests first** — mock attestation verifier in unit tests
- Test Merkle proof verification with known Merkle roots
- Test slot-based revocation with controlled slot numbers
- Test policy sequence validation
- Test `SetProxyKey` ownership

### SP1 Circuit Tests

- **Local prover mode** — no Succinct Prover Network needed for devnet MVP
- Test boolean proof generation (ALLOWED/BLOCKED)
- Test proof verification on-chain

### Integration Tests

- **Full end-to-end with Phala TEE** — not unit tests
- Test intent → attestation → transaction flow
- Test revocation propagation

### Proxy Tests

- Table-driven policy evaluation: policy rules × intent → expected allow/block
- Session key generation and encryption/decryption
- Merkle tree construction and proof generation
- SHA-256 hash consistency

### Frontend Tests

- Wallet initialization flow (mock RPC responses)
- Policy application with real template data
- Temporal key grant/revoke UI flow

## Out of Scope

- **ZK SP1 circuit for production**: post-MVP when circuit is stable
- **Real Phala TEE integration**: simulated for MVP devnet
- **Admin upgrade mechanism**: Phase 2 post-MVP
- **DAO governance**: Phase 2 post-MVP
- **Gas Paymaster sponsorship**: Phase 2 post-MVP
- **Analytics dashboard**: Phase 2 post-MVP
- **Stealth addresses / transaction mixer**: Phase 2 post-MVP
- **Time-lock on large transfers**: Phase 2 post-MVP
- **Multi-sig for critical ops**: Phase 2 post-MVP

## Further Notes

- **Build priority**: Week 1 = Contract TDD + proxy session key flow. Week 2 = frontend + integration.
- **Demo wow moment**: Policy BLOCK demo — AI agent tries $500 transfer, $50/day limit, visible BLOCKED state.
- **Immutable contract**: Contract deployed with admin key, upgrade authority removed post-MVP.
