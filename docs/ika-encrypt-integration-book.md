# Polet Ika + Encrypt Integration Book

Checked: 2026-05-06

## Scope

This book is the local implementation guide for Polet's Ika and Encrypt pre-alpha integration.
It complements:

- `docs/ika/**`
- `docs/encrypt/**`
- `docs/ika-dwallet-prealpha-alignment.md`
- `docs/ika-devnet-smoke-runbook.md`

Polet must not claim production private trading yet. Ika and Encrypt are both pre-alpha rails in
this codebase.

## Official Sources

- Ika introduction: https://solana-pre-alpha.ika.xyz/introduction
- Ika installation: https://solana-pre-alpha.ika.xyz/getting-started/installation
- Ika repository: https://github.com/dwallet-labs/ika-pre-alpha
- Encrypt installation: https://docs.encrypt.xyz/getting-started/installation
- Encrypt repository: https://github.com/dwallet-labs/encrypt-pre-alpha

## Installed Dependencies

Contract dependencies now follow the official pre-alpha docs:

```toml
anchor-lang = "1.0.1"
ika-dwallet-anchor = { git = "https://github.com/dwallet-labs/ika-pre-alpha", rev = "3bd7945e012950e54fb4d0057b72a7d466556fc1" }
encrypt-types = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-dsl = { package = "encrypt-solana-dsl", git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-anchor = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
```

The Ika dependency is pinned because this is a pre-alpha git dependency. The current Encrypt lockfile
pins the fetched revision through `Cargo.lock`.

## Ika Architecture

Polet is the Solana control layer. The policy-approved flow is:

1. Agent submits a bridgeless strategy intent.
2. Proxy validates chain/asset allowlist and route risk guardrails.
3. Polet contract validates session, order expiry, shared approver quorum, and confidential numeric policy.
4. Only after approval, Polet CPI-calls Ika `approve_message` through `ika_dwallet_anchor::DWalletContext`.
5. Ika creates or updates a `MessageApproval` account.
6. Ika pre-alpha network may later produce a signature. Polet does not claim settlement until this is verified.

Ika constants used by Polet:

- dWallet program id: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`
- coordinator PDA seed: `dwallet_coordinator`
- Polet CPI authority seed: `__ika_cpi_authority`
- MessageApproval seed: `message_approval`

When the real dWallet curve and public key are available, the proxy derives MessageApproval with the
official hierarchical seed shape:

```text
["dwallet", chunks(u16_le(curve) || dwallet_public_key), "message_approval", u16_le(signature_scheme), message_digest]
```

If those fields are absent, the proxy keeps a compatibility fallback:

```text
["message_approval", dwallet_account, message_digest]
```

Use the official derivation for devnet smoke tests.

## Encrypt Architecture

Encrypt docs state this is pre-alpha and not production privacy. Current official environment:

- Program id: `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`
- Solana RPC: `https://api.devnet.solana.com`
- gRPC: `https://pre-alpha-dev-1.encrypt.ika-network.net:443`
- CPI authority seed: `__encrypt_cpi_authority`

Polet now tracks these in `contract/programs/contract/src/encrypt_prealpha.rs`.

Current Polet confidential numeric policy still uses masked witness simulation for the live
allow/block execution path. That means Polet is not yet using Encrypt correctly end-to-end for the
policy decision. The codebase now includes the official dependency boundary and a compiled
`#[encrypt_fn]` policy guardrail graph in `contract/programs/contract/src/encrypt_policy_graph.rs`,
but the graph is not yet wired to `encrypt_anchor::EncryptContext::execute_graph`.

The correct next upgrade path is:

1. Represent policy values as Encrypt ciphertext accounts.
2. Use the existing `polet_policy_guardrail_graph` computation graph for amount <= max-per-run,
   daily-spent + amount <= daily-cap, and updated daily-spent output.
3. Add an Anchor instruction/accounts surface that accepts Encrypt config, deposit, network key,
   event authority, ciphertext input accounts, and ciphertext output accounts.
4. Use `encrypt_anchor::EncryptContext` to CPI `execute_graph`.
5. Store pending output ciphertext identifiers and policy decision commitments, not plaintext values.
6. Use `encrypt-solana-test` / `EncryptTestContext` for mock mode with `process_pending()`.
7. Do not claim real FHE until the docs say Alpha/mainnet
   supports it.

## Agent SDK Readiness

Hermes, OpenClaw, or another agent can use the SDK for:

- creating multichain Ika intents;
- passing dWallet account overrides;
- passing official dWallet curve and public key for MessageApproval PDA derivation;
- receiving unsigned Polet approval transactions;
- simulating unsigned transactions with `simulatePoletTransaction()`.

Agents must not sign, broadcast, or target mainnet without explicit user approval.

## Verification Commands

From `contract/`:

```bash
NO_DNA=1 cargo fmt --check
NO_DNA=1 cargo test
NO_DNA=1 cargo build-sbf -- --package contract
NO_DNA=1 cargo build-sbf -- --package mock_ika
```

From `proxy/`:

```bash
bun test ./tests/ika-bridgeless-request.test.ts ./tests/transaction-builder.test.ts
bun run build
```

From `sdk/`:

```bash
bun run build
```

## Claim Boundaries

Allowed wording:

- "Polet prepares and policy-gates Ika pre-alpha approval transactions."
- "Polet tracks official Encrypt pre-alpha dependencies and constants."
- "Polet simulates confidential numeric policy in mock/pre-alpha mode."

Disallowed wording:

- "Production private trading is live."
- "Ika settlement is verified."
- "Encrypt gives production confidentiality today."
