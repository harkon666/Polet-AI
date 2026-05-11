# Polet AI Frontend

Canonical TanStack/Vite workspace for the Polet landing page and Polet Portal `/app` console.

The landing page explains the confidential Solana control layer for AI agents. The Portal lets an owner connect a devnet wallet, initialize a Polet smart-wallet PDA, configure funds/policy/session readiness, inspect policy-gate outcomes, review proof trails, and bridge into agent/MCP configuration.

## Environment

```bash
VITE_PROXY_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Run

```bash
bun install
bun run dev
```

The default dev URL is `http://localhost:3000`.

## Verify

```bash
bun run typecheck
bun run test
bun run build
```

Playwright smoke tests:

```bash
bun run e2e
```

## Routes

- `/` — landing page.
- `/about` — internal redirect to `/#how-it-works`.
- `/app` — Polet Portal shell.
- `/app/workspace`, `/app/gate`, `/app/funds`, `/app/proof`, `/app/bridge` — Portal pages.

## Demo Boundary

The frontend proves the devnet policy-gated flow and displays Jupiter route/build details plus Ika approval preparation for approved runs. It does not claim production Encrypt privacy, mainnet swap execution, production MPC, or verified Ika settlement.
