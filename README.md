# Polet AI

Polet AI is a confidential Solana control layer for AI agents.

Users deposit USDC/SOL into a Polet smart wallet PDA, save confidential numeric guardrails, and let the agent request guarded strategy actions using their authorized session key. Polet blocks over-limit agent actions without revealing the user's private thresholds, allows in-limit USDC -> SOL DCA through a Jupiter route/build preview, and prepares multi-chain Ika dWallet approvals only after the same policy gate passes.

## Target Users

- **Institutional Trading Firms & Hedge Funds**: Entities that want to deploy autonomous AI trading agents but require cryptographic guarantees that their daily spending caps and trade limits remain entirely hidden from public observers to prevent MEV front-running and strategy leakage.
- **DeFi Power Users & Whales**: Users who want to automate complex cross-chain asset management without handing over unbounded wallet authority to an AI agent.
- **AI Agent Developers & Autonomous Frameworks**: Builders creating DeFi-capable AI agents who need a standardized, secure API to submit strategy intents knowing that the user's smart wallet handles execution and policy gating safely.

## The Problem: The Agent Delegation Dilemma

AI agents are incredibly powerful at automating DeFi workflows, but delegating funds to them today requires unacceptable compromises:

1. **Public Guardrails Invite Exploitation:** If an agent's spending limit or strategy is written in plaintext on a public ledger, MEV bots and competitors can perfectly front-run, sandwich, or grief the agent.
2. **Off-Chain Rules are Bypassable:** Enforcing limits via a centralized proxy or Web2 server creates a single point of failure. If the server is compromised, the agent's guardrails disappear.
3. **Unlimited Authority is the Default:** To let an agent trade or sign cross-chain transactions, users typically have to hand over a private key with unbounded access to their entire wallet.

## The Solution: A Confidential On-Chain Control Layer

Polet AI introduces a secure, confidential smart-wallet architecture on Solana that acts as an absolute on-chain policy gate for AI agents. 

By combining on-chain encrypted policies with scoped session keys, Polet ensures that:
- **Limits Stay Hidden:** Using confidential computing models, spending caps (like max-per-run and daily limits) are evaluated entirely on-chain without ever revealing the plaintext values.
- **Authority is Scoped:** Agents are granted revocable session keys that can only execute actions within the bounds of the hidden policy.
- **Bridgeless Cross-Chain is Gated:** Through Ika's MPC network, the exact same Solana-based confidential policy gate is used to authorize native signatures on other chains, ensuring cross-chain intents cannot bypass the rules.

### Execution Flow
- The owner deposits funds into a Polet smart-wallet PDA.
- The owner configures a confidential numeric policy which is encrypted and sealed on-chain.
- The owner authorizes a session key for their chosen AI agent.
- The agent submits a strategy intent (e.g., a Jupiter trade or an Ika multi-chain signature).
- The Polet contract evaluates the intent against the encrypted policy. If it passes, the contract safely executes the transaction or CPI-calls Ika for a cross-chain signature.

## How Polet Uses Encrypt

Polet is built against an Encrypt pre-alpha style confidential policy flow. The current implementation stores masked numeric policy values and a witness hash instead of plaintext max-per-run, daily-cap, or daily-spent fields in the final confidential execution path.

The same confidential numeric guardrail is used before both supported agent rails:

- **Jupiter DCA**: Any intent that exceeds the confidential policy rules is blocked on-chain before the proxy returns an executable payload.
- **Ika dWallet**: Any cross-chain intent that exceeds the confidential policy rules is blocked on-chain before any dWallet approval data is generated.
- **In-Limit Intents**: Valid requests update the encrypted daily-spend path and produce only the allowed rail's unsigned transaction or proof metadata.
- **Verifiable Decryption**: Using Encrypt's `request_decryption` feature, the owner can request decryption of the final on-chain verdict. The policy gate evaluates the ciphertext entirely blind, but the owner can securely decrypt and verify the cleartext results locally.

This is not a production privacy claim. The current path demonstrates enforcement and product shape while Encrypt is pre-alpha. Production-grade confidentiality depends on replacing the masked witness simulation with verified Encrypt primitives and their later alpha/mainnet guarantees.

Polet does not currently implement encrypted allowlist/blocklist membership. Non-numeric rules are deferred.

## Legacy Compatibility

The current product path is the confidential control-layer flow: `/wallet/set-confidential-policy`, `/intent/dca/run`, and `/intent/multichain/run`.

Plaintext allowlist/blocklist templates, public max-amount checks, and transfer-style evaluation remain only as prior foundation under `/legacy/*` routes and `legacy-*` modules. They are not part of the final confidential execution path.

## Jupiter Integration

Jupiter is the strategy execution and market intelligence layer:

- Tokens V2: token metadata and quality signals for USDC/SOL prechecks.
- Price V3: price context before the DCA run.
- Recurring: product-aligned primary DCA target, but currently recorded as incompatible for the MVP because Polet must prove policy gating immediately before each spend.
- Swap API V2 `/build`: current fallback path because it gives raw instruction control for smart-wallet composition.

The demo does not claim mainnet Jupiter swap execution. It proves that Polet can build a Jupiter route/build preview and wrap the execution payload behind the smart-wallet policy gate.

## How Polet Uses Ika

Ika is the dWallet rail for future bridgeless native-asset trading requests using the same agent intent and confidential guardrail model. The official Solana Pre-Alpha surface is pinned in `docs/ika-dwallet-prealpha-alignment.md`: devnet program id `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`, mock-signer Pre-Alpha constraints, Polet CPI authority PDA, and MessageApproval read path.

Polet follows the standard Ika dWallet lifecycle to enable secure, bridgeless cross-chain agent trading:

1. **Create a dWallet**: The Ika network runs Distributed Key Generation (DKG) and produces a public key on the desired curve (e.g., Secp256k1 for EVM or Curve25519 for Sui).
2. **Your program controls it**: The dWallet authority is transferred to Polet's CPI authority PDA (derived from seed `__ika_cpi_authority`), giving the smart contract exclusive control.
3. **Approve messages**: When an AI agent submits a multi-chain intent, Polet verifies the encrypted numeric policy. If conditions are met, Polet CPI-calls `approve_message` to authorize the destination-chain digest.
4. **Network signs**: The Ika validator network detects the approval and produces the signature via 2PC-MPC.
5. **Signature stored on-chain**: Anyone (like a relayer bot) can read the `MessageApproval` account on Solana to get the final signature and broadcast it to the destination chain.

The proxy builds the chain-specific digest artifact and unsigned Polet `approve_ika_message_as_session` transaction for approved Ika intents after confidential policy approval. It still does not broadcast, claim production MPC, claim verified Ika settlement, or move bridgeless assets.

## Repository Layout

- `contract/`: Anchor program for the single Polet smart wallet contract.
- `proxy/`: Bun/Hono proxy for wallet setup, confidential policy transactions, Jupiter gateway calls, agent intent execution, and explicitly namespaced legacy compatibility routes.
- `sdk/`: TypeScript SDK for AI agent intent builders and proxy helpers.
- `frontend/`: TanStack/Vite landing page and Polet Portal console for the confidential control-layer DCA and Ika flow.
- `docs/`: PRD, issue specs, progress tracker, Jupiter DX report, and demo script.

## Program And URLs

- Solana cluster: devnet
- Program ID: `F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p`
- Default proxy URL: `http://localhost:3001`
- Default frontend URL: `http://localhost:3000`
- Public deployment links: not configured in this repo yet.

## Environment

Proxy (`proxy/.env`):

```bash
JUPITER_API_KEY=your_jupiter_api_key
SOLANA_RPC_URL=https://api.devnet.solana.com

# 64-byte tweetnacl Ed25519 secret key (hex) used to sign Ika gRPC SignedRequestData.
POLET_IKA_SERVICE_KEYPAIR_HEX=your_generated_hex_key

# Ika gas floor (set to 0 for pre-alpha mock signer)
POLET_IKA_GAS_MIN_IKA_BASE_UNITS=0
POLET_IKA_GAS_MIN_SOL_LAMPORTS=0
```

Frontend (`frontend/.env`):

```bash
VITE_PROXY_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

If `PROXY_MASTER_KEY` is omitted, the proxy has an insecure local fallback. Do not use that fallback outside local demos.

## Install

Run installs per workspace:

```bash
cd contract && yarn install
cd ../proxy && bun install
cd ../sdk && bun install
cd ../frontend && bun install
```

## Build And Test

Contract:

```bash
cd contract
NO_DNA=1 anchor build
NO_DNA=1 cargo test
```

Proxy:

```bash
cd proxy
bun test
bun run build
```

SDK:

```bash
cd sdk
bun test
bun run build
```

Frontend:

```bash
cd frontend
bun run typecheck
bun run test
bun run build
```

## Run The MVP

Start the proxy:

```bash
cd proxy
bun run dev
```

Start the frontend:

```bash
cd frontend
bun run dev
```

Then open `http://localhost:3000`, enter `/app`, connect a devnet wallet, initialize the Polet wallet, set up demo custody, save the confidential policy, authorize an agent session key, and use the Portal pages to run the three core outcomes: 25 USDC blocked with no Ika approval, 5 USDC Jupiter DCA approved as a route/build preview, and 5 USDC-equivalent multi-chain Ika approval prepared as an unsigned Polet dWallet approval transaction.

## Documentation

- Product PRD: `docs/prd.md`
- Progress tracker: `docs/progress.txt`
- Jupiter DX report: `docs/jupiter-dx-report.md`
- Demo script: `docs/demo-script.md`
- Local agent runtime: `docs/agent-runtime.md`
- Hermes Agent quickstart (zero-to-trading, 5 steps): `docs/hermes-quickstart.md`
- Ika devnet smoke runbook: `docs/ika-devnet-smoke-runbook.md` (the "Issue 080 — Full Ika Pre-Alpha Lifecycle" section covers the end-to-end DKG → TransferOwnership → Approve → Presign → Sign → CommitSignature → destination broadcast flow with kill-switch evidence)
- Local issue specs: `docs/issues/`
