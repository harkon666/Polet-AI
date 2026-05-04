# Polet AI

Polet AI is a confidential DCA smart wallet for AI agents on Solana.

Users deposit USDC/SOL into a Polet smart wallet PDA, save confidential numeric guardrails, grant an AI agent a temporary session key, and let the agent request USDC -> SOL DCA runs. Polet blocks over-limit agent actions without revealing the user's private thresholds, and allows in-limit actions through a Jupiter route/build preview plus a policy-gated smart-wallet execution payload.

## Target Users

- Indonesian DeFi users who want safer automation without giving an AI agent unlimited wallet authority.
- AI agent developers who need a structured way to submit strategy intents and receive allow/block results.
- Hackathon reviewers evaluating confidential policy enforcement, smart-wallet custody, and Jupiter API composition.

## Problem

AI agents can automate DeFi workflows, but delegation is risky when spending rules are public, easy to infer, or enforced only by an off-chain service. Users should not have to reveal exact per-run limits, daily caps, remaining allowance, or risk thresholds to let an agent run a routine strategy.

## Solution

Polet uses one Solana contract as the smart-wallet policy boundary:

- The owner initializes a wallet PDA.
- The owner registers PDA-owned demo custody accounts for USDC and SOL/wSOL.
- The owner saves a confidential numeric policy for max-per-run and daily cap.
- The owner grants a temporary session key to an AI agent.
- The agent submits a DCA intent to the proxy.
- The proxy runs Jupiter token/price/swap-build prechecks and builds an unsigned policy-gated transaction.
- The contract enforces the confidential policy path before the smart wallet can execute.

Demo constants:

- Pair: USDC -> SOL
- Normal run: 5 USDC
- Confidential max per run: 10 USDC
- Confidential daily cap: 20 USDC
- Block scenario: 25 USDC
- Allow scenario: 5 USDC

## Confidentiality Boundary

Polet is built against an Encrypt pre-alpha style confidential policy flow. The current implementation stores masked numeric policy values and a witness hash instead of plaintext max-per-run, daily-cap, or daily-spent fields in the final confidential execution path.

This is not a production privacy claim. The current path demonstrates enforcement and product shape while Encrypt is pre-alpha. Production-grade confidentiality depends on replacing the masked witness simulation with verified Encrypt primitives and their later alpha/mainnet guarantees.

Polet does not currently implement encrypted allowlist/blocklist membership. Non-numeric rules are deferred.

## Jupiter Integration

Jupiter is the strategy execution and market intelligence layer:

- Tokens V2: token metadata and quality signals for USDC/SOL prechecks.
- Price V3: price context before the DCA run.
- Recurring: product-aligned primary DCA target, but currently recorded as incompatible for the MVP because Polet must prove policy gating immediately before each spend.
- Swap API V2 `/build`: current fallback path because it gives raw instruction control for smart-wallet composition.

The demo does not claim mainnet Jupiter swap execution. It proves that Polet can build a Jupiter route/build preview and wrap the execution payload behind the smart-wallet policy gate.

## Ika Boundary

Ika is the target rail for future bridgeless native-asset trading requests using the same agent intent and confidential guardrail model. This repo currently documents Ika as the multichain direction only. It does not claim verified Ika settlement or production bridgeless execution until the Ika request/execution path is implemented and tested.

## Repository Layout

- `contract/`: Anchor program for the single Polet smart wallet contract.
- `proxy/`: Bun/Hono proxy for wallet setup, policy transactions, Jupiter gateway calls, and agent intent execution.
- `sdk/`: TypeScript SDK for AI agent intent builders and proxy helpers.
- `frontend/`: TanStack/Vite consumer demo for the confidential DCA flow.
- `docs/`: PRD, issue specs, progress tracker, Jupiter DX report, and demo script.

## Program And URLs

- Solana cluster: devnet
- Program ID: `J1AmhNEsVQukD8cvRh7zRD9jh56QocsoGCBrfTvTmAus`
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

Then open `http://localhost:3000`, connect a devnet wallet, initialize the Polet wallet, set up demo custody, save the confidential policy, grant an agent session key, and use the Demo tab to run the 25 USDC blocked path and the 5 USDC allowed path.

## Documentation

- Product PRD: `docs/prd.md`
- Progress tracker: `docs/progress.txt`
- Jupiter DX report: `docs/jupiter-dx-report.md`
- Demo script: `docs/demo-script.md`
- Local agent runtime: `docs/agent-runtime.md`
- Local issue specs: `docs/issues/`
