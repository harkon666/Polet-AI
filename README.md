# Polet AI

Polet AI is a confidential Solana control layer for AI agents.

Users deposit USDC/SOL into a Polet smart wallet PDA, save confidential numeric guardrails, grant an AI agent a temporary session key, and let the agent request guarded strategy actions. Polet blocks over-limit agent actions without revealing the user's private thresholds, allows in-limit USDC -> SOL DCA through a Jupiter route/build preview, and prepares multi-chain Ika dWallet approvals only after the same policy gate passes.

## Target Users

- Indonesian DeFi users who want safer automation without giving an AI agent unlimited wallet authority.
- AI agent developers who need a structured way to submit strategy intents and receive allow/block results.
- Hackathon reviewers evaluating confidential policy enforcement, smart-wallet custody, Jupiter API composition, and Ika dWallet Pre-Alpha integration.

## Problem

AI agents can automate DeFi workflows, but delegation is risky when spending rules are public, easy to infer, or enforced only by an off-chain service. Users need a confidential Solana control layer for AI agents so private spending guardrails stay hidden, agents never receive unlimited wallet authority, and cross-chain signing requests cannot bypass on-chain policy.

## Solution

Polet uses one Solana contract as the smart-wallet policy boundary for both local Solana strategies and Ika dWallet approval requests:

- The owner initializes a wallet PDA.
- The owner registers PDA-owned demo custody accounts for USDC and SOL/wSOL.
- The owner saves a confidential numeric policy for max-per-run and daily cap.
- The owner grants a temporary session key to an AI agent.
- The agent submits a DCA or multichain intent to the proxy.
- For Jupiter, the proxy runs token/price/swap-build prechecks and builds an unsigned policy-gated transaction.
- For Ika, the proxy prepares a multi-chain bridgeless order and an unsigned Polet `approve_ika_message_as_session` transaction.
- The contract enforces the confidential policy path before smart-wallet execution or Ika `approve_message` approval.

Demo constants:

- Pair: USDC -> SOL
- Normal run: 5 USDC
- Confidential max per run: 10 USDC
- Confidential daily cap: 20 USDC
- Block scenario: 25 USDC DCA and 25 USDC-equivalent Ika request
- Allow scenario: 5 USDC Jupiter DCA and 5 USDC-equivalent multi-chain Ika request

## How Polet Uses Encrypt

Polet is built against an Encrypt pre-alpha style confidential policy flow. The current implementation stores masked numeric policy values and a witness hash instead of plaintext max-per-run, daily-cap, or daily-spent fields in the final confidential execution path.

The same confidential numeric guardrail is used before both supported agent rails:

- Jupiter DCA: over-limit 25 USDC requests are blocked before the proxy returns an executable payload.
- Ika dWallet: over-limit 25 USDC-equivalent requests are blocked before any dWallet approval data is returned.
- In-limit 5 USDC requests update the masked daily-spend path and produce only the allowed rail's unsigned transaction/proof metadata.

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

Polet uses Ika as follows:

- A Curve25519/Ed25519-compatible dWallet is created or imported through the official Ika Pre-Alpha flow.
- The dWallet authority is transferred to Polet's CPI authority PDA derived from seed `__ika_cpi_authority` under the Polet program id.
- The agent submits a Solana USDC -> multi-chain intent.
- The proxy maps the approved canonical order into a destination-chain sign-only digest. These stay destination signing artifacts. The Ika MessageApproval lookup hash is a separate Keccak-256 hash over Polet's approval preimage.
- Optional multisig-lite shared access can require M-of-N co-approver approval before Ika approval data is prepared and before the contract CPI-calls Ika; missing quorum returns `needs-approval` progress such as `1/2` without exposing confidential numeric thresholds.
- Polet verifies session freshness, order expiry, policy sequence, and confidential numeric policy before CPI-calling Ika `approve_message`.
- The resulting MessageApproval account can be fetched on devnet; when the Pre-Alpha mock signer writes a signature, the signature proof can be inspected.

The proxy builds the chain-specific digest artifact and unsigned Polet `approve_ika_message_as_session` transaction for approved Ika intents after confidential policy approval. It still does not sign, broadcast, claim production MPC, claim verified Ika settlement, or move bridgeless assets.

## Repository Layout

- `contract/`: Anchor program for the single Polet smart wallet contract.
- `proxy/`: Bun/Hono proxy for wallet setup, confidential policy transactions, Jupiter gateway calls, agent intent execution, and explicitly namespaced legacy compatibility routes.
- `sdk/`: TypeScript SDK for AI agent intent builders and proxy helpers.
- `frontend/`: TanStack/Vite consumer demo for the confidential control-layer DCA and Ika flow.
- `docs/`: PRD, issue specs, progress tracker, Jupiter DX report, and demo script.

## Program And URLs

- Solana cluster: devnet
- Program ID: `F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p`
- Default proxy URL: `http://localhost:3001`
- Default frontend URL: `http://localhost:3000`
- Public deployment links: not configured in this repo yet.

## Environment

Proxy:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
JUPITER_API_KEY=your_jupiter_api_key
PROXY_MASTER_KEY=64_hex_chars_for_local_demo_key_encryption
PORT=3001
```

Optional Ika devnet smoke configuration:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
# The Ika Pre-Alpha program id is pinned in code/docs:
# 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
# Allowed /intent/multichain/run responses include an unsigned Polet approval transaction.
# A separate session signer flow must simulate/sign/send it; the proxy will not sign or broadcast.
```

Frontend:

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

Then open `http://localhost:3000`, connect a devnet wallet, initialize the Polet wallet, set up demo custody, save the confidential policy, grant an agent session key, and use the Demo tab to run the three core outcomes: 25 USDC blocked with no Ika approval, 5 USDC Jupiter DCA approved as a route/build preview, and 5 USDC-equivalent multi-chain Ika approval prepared as an unsigned Polet dWallet approval transaction.

## Documentation

- Product PRD: `docs/prd.md`
- Progress tracker: `docs/progress.txt`
- Jupiter DX report: `docs/jupiter-dx-report.md`
- Demo script: `docs/demo-script.md`
- Local agent runtime: `docs/agent-runtime.md`
- Ika devnet smoke runbook: `docs/ika-devnet-smoke-runbook.md`
- Local issue specs: `docs/issues/`
