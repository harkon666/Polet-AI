# Polet AI Frontend

TanStack Router / Vite workspace for the Polet landing page and Polet Portal `/app` console.

- Default dev URL: **http://localhost:3000**
- Requires the proxy running on **http://localhost:3001** (see `proxy/README.md`)

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- A Phantom (or compatible) wallet browser extension connected to **Solana devnet**
- Proxy running locally or deployed (see `proxy/README.md`)

---

## Step 1 — Install dependencies

```bash
cd frontend
bun install
```

---

## Step 2 — Configure environment

Create a `.env` file:

```bash
# URL of the running Polet proxy
VITE_PROXY_URL=http://localhost:3001

# Solana RPC endpoint
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

If `VITE_PROXY_URL` is omitted, the frontend defaults to `http://localhost:3001`.

---

## Step 3 — Start dev server

```bash
bun run dev
```

Open `http://localhost:3000`.

---

## Portal walkthrough (`/app`)

The Portal is the owner self-test surface. Full flow:

1. **Connect wallet** — Phantom on devnet. The app will not proceed without a connected wallet.
2. **Workspace → Initialize** — Creates the Polet smart-wallet PDA on-chain. One-time per owner.
3. **Workspace → Setup custody** — Registers demo USDC/SOL token accounts under the wallet PDA.
4. **Workspace → Policy Rules** — Saves the confidential numeric policy (max-per-run + daily cap) on-chain via the Encrypt pre-alpha path.
5. **Workspace → Agent Access** — Grants a temporary session key to an AI agent (BYO pattern) or authorizes the owner wallet as a session for self-testing.
6. **Gate** — Run the policy gate:
   - Enter a USDC amount and select a rail (Jupiter or Ika).
   - Click **Run trade**. The proxy evaluates the confidential policy.
   - **Blocked** → receipt shows the gate said no without revealing the threshold.
   - **Allowed (Jupiter)** → receipt shows "Policy allowed. Unsigned smart-wallet tx ready." Go to **Proof Trail** to expand the receipt and copy the unsigned tx base64 + policy commitment hash.
   - **Allowed (Ika)** → proxy runs the full Ika lifecycle (approve_message CPI + gRPC presign/sign). Receipt shows the on-chain signature.
7. **Proof Trail** (`/app/proof`) — Chronological log of all receipts. Expand any APPROVED entry to see Jupiter route details, unsigned tx, policy commitment, or Ika dWallet proof artifacts.
8. **Funds** — Deposit/withdraw USDC and SOL to/from the custody accounts.
9. **Bridge** — Agent MCP configuration panel.

---

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/app` | Portal shell (redirects to `/app/workspace`) |
| `/app/workspace` | Wallet init, custody setup, policy, session management |
| `/app/gate` | Policy gate composer — run Jupiter or Ika trades |
| `/app/funds` | Custody deposit / withdraw |
| `/app/proof` | Proof trail — expandable receipt log with unsigned tx + policy artifacts |
| `/app/bridge` | Agent MCP configuration |

---

## Verify

```bash
bun run typecheck   # TypeScript check
bun run test        # Vitest unit tests
bun run build       # Production build
bun run e2e         # Playwright smoke tests (requires dev server running)
```

---

## Deploying to Vercel / Netlify

Set the following environment variables in the dashboard:

```
VITE_PROXY_URL=https://your-proxy-url.onrender.com
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Build command: `bun run build`
Output directory: `dist`

> The frontend is a pure static SPA — no server-side runtime needed. Only the proxy requires a persistent server (see `proxy/README.md`).

---

## Demo boundary

The frontend proves the devnet policy-gated flow and displays Jupiter route/build details plus Ika approval preparation for approved runs. It does not claim production Encrypt privacy, mainnet swap execution, production MPC, or verified Ika settlement.
