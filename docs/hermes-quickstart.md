# Hermes Agent — Polet Quickstart

Zero-to-trading in 5 steps. Target: let Hermes Agent (Nous Research) call `polet_execute` and reach the Polet confidential policy gate + Ika multi-chain signer.

Non-custodial BYO-wallet model: the owner generates the agent wallet in the Polet frontend, grants it as a temporary session key on-chain, and exports the credentials as `polet-agent.json`. Hermes holds the agent secret locally — the Polet proxy never sees it and has no server-side key store.

Devnet program IDs:

- Polet: `9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc`
- Ika Pre-Alpha dWallet: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`

Pre-alpha disclaimer: Ika uses a single mock signer, destination broadcast is Sui devnet / Ethereum Sepolia only, Polet does not claim production MPC or real-asset settlement.

## 1. Start the Polet stack

Two terminals:

```bash
# Terminal A — proxy
cd Polet-AI/proxy
bun install
bun run dev    # listens on http://localhost:3001

# Terminal B — frontend
cd Polet-AI/frontend
bun install
bun run dev    # listens on http://localhost:3000
```

If you intend to execute a full Ika trade (not just reach the policy gate), also set these proxy env vars before starting the proxy:

```bash
export POLET_IKA_SERVICE_KEYPAIR_HEX=<64-byte tweetnacl hex>
export POLET_IKA_MANAGED_FIXTURE_PATH=.polet/ika-managed-fixture.json   # see docs/ika-devnet-smoke-runbook.md

# Ika pre-alpha does not enforce its GasDeposit for Sign today. Set both
# floors to 0 so the Polet gas gate lets the lifecycle through. Tighten
# them if/when the Ika alpha gas model lands.
export POLET_IKA_GAS_MIN_SOL_LAMPORTS=0
export POLET_IKA_GAS_MIN_IKA_BASE_UNITS=0

# Destination broadcast stays disabled by default. Enable with one of:
#   export POLET_DESTINATION_BROADCAST_MODE=demo-memo     # Solana memo proof, clearly labelled non-settlement
#   export POLET_DESTINATION_BROADCAST_MODE=live          # Sui devnet / Sepolia (stretch goal)
```

Without these, Hermes can still reach `polet_status`, `polet_enable_chain`, `polet_trade`. `polet_execute` on the Jupiter rail works end-to-end (returns `executed-preview`). `polet_execute` on the Ika rail returns `gas-floor-underfunded` until the two floor vars are set, then `broadcast-disabled` (signature committed on-chain) until you flip on a broadcast mode.

## 2. Onboard an owner and generate agent credentials

1. Open `http://localhost:3000/app`.
2. Connect a devnet-funded wallet (Phantom / Backpack) as the **owner**. You never expose the owner secret to Hermes — only the short-lived agent session is given to the agent.
3. Click **Initialize Polet smart wallet** → owner signs.
4. Click **Register demo USDC/SOL custody** → owner signs (PDA-owned custody accounts).
5. Click **Set confidential policy** → owner signs (encrypts max-per-run + daily-cap).
6. Scroll to **Agent credentials (for Hermes / Claude / Cursor / SendAI)** panel.
7. Click **Generate agent keypair** → the browser generates a fresh Ed25519 keypair locally. Nothing is sent to the proxy.
8. Click **Grant as Polet session** → owner signs the on-chain `grant_session_key` tx. The session is time-bounded (24h default) and revocable.
9. Click **Download polet-agent.json** → you now have `{ POLET_OWNER, POLET_SESSION_KEY, POLET_AGENT_KEYPAIR, POLET_PROXY_URL, POLET_RPC_URL }`.
10. (Optional, for multi-chain trades) click **Enable Sui devnet** in the Multi-chain signer panel. This maps the owner's wallet PDA to a managed Ika dWallet.
11. Fund the agent with a small devnet SOL balance (e.g. ~0.5 SOL) so it can pay the ~3-5 tx fees per trade. In BYO mode the agent always pays its own gas.

The agent secret is shown once in the panel and embedded in the downloaded JSON. Copy it before closing the dialog. The owner can revoke the session any time — the next `polet_execute` will surface `session-revoked` or `session-revoked-midflight` to Hermes cleanly.

## 3. Build the Polet MCP server

```bash
cd Polet-AI/sdk
bun install
bun run build   # outputs dist/mcp-server/cli.js (executable)
```

Sanity check outside Hermes (both bun and node runtimes are verified):

```bash
POLET_OWNER=<from json> POLET_SESSION_KEY=<from json> POLET_PROXY_URL=http://localhost:3001 \
  bun run tests/mcp-subprocess-smoke.ts
# → ✓ MCP subprocess smoke passed (runtime = bun)

POLET_OWNER=<from json> POLET_SESSION_KEY=<from json> POLET_PROXY_URL=http://localhost:3001 \
  bun run tests/mcp-subprocess-smoke.ts --node
# → ✓ MCP subprocess smoke passed (runtime = node)
```

The smoke asserts the startup banner lands on stderr (not stdout), `initialize` + `tools/list` return the 4 Polet tools, and a `polet_trade` round-trip reaches the running proxy.

## 4. Wire Polet into Hermes

```bash
# One-time Hermes install (see https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# Register Polet as an MCP server
hermes config set mcp.servers.polet.command node
hermes config set mcp.servers.polet.args '["/ABSOLUTE/PATH/TO/Polet-AI/sdk/dist/mcp-server/cli.js"]'
hermes config set mcp.servers.polet.env.POLET_OWNER "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_SESSION_KEY "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_AGENT_KEYPAIR "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_PROXY_URL "http://localhost:3001"
hermes config set mcp.servers.polet.env.POLET_RPC_URL "https://api.devnet.solana.com"

# Pick an LLM provider (any OpenAI / Anthropic / OpenRouter / Nous Portal key)
hermes model
```

## 5. Try trading from Hermes

```bash
hermes
```

Sample prompts inside Hermes:

> Use Polet. Start by calling `polet_status` and tell me what is ready.

> Now call `polet_trade` with `{"from":"USDC","to":"SOL","amount":5,"rail":"jupiter"}` and show me the decision.

> If the Polet wallet looks healthy, call `polet_execute` with `{"from":"USDC","to":"SUI","amount":5,"rail":"ika"}` and explain what happened.

> Try `polet_execute` with `{"from":"USDC","to":"SUI","amount":25,"rail":"ika"}`. Tell me whether Polet blocked it.

Expected behaviour (live-verified on devnet, commit `8513825`):

- **5 USDC USDC→SOL via Jupiter** → `executed-preview` (route/build ready, owner signs nothing; the agent would sign the final Jupiter swap transaction).
- **5 USDC USDC→SUI via Ika** → `broadcast-disabled` with `ok: true`, returning `signatureHex` (64 bytes) + `messageApprovalPda`. Destination broadcast is off by default. Enable `POLET_DESTINATION_BROADCAST_MODE=live` or `demo-memo` to submit the signed tx to Sui/Sepolia.
- **25 USDC over-cap** → `policy-blocked` with `recoverable: true`. No threshold leakage — Hermes cannot extract the private cap from any response field.
- **Revoke the session from the Polet frontend mid-flight** → the next `polet_execute` returns `session-revoked-midflight` with the exact phase (`pre-presign` / `pre-sign` / `post-sign-pre-broadcast`) so Hermes can reason about what did / did not happen on-chain.

Sample `broadcast-disabled` payload:

```json
{
  "status": "broadcast-disabled",
  "ok": true,
  "rail": "ika",
  "signatureHex": "3feca30b898609e4f5f5b0792af973b4b8706a86661cd3a1b1b4639f24f46e104d7961d2bf65773570d5b981eeeaf8a8a7e46c5ea1654ab3a352cbb660a05d02",
  "messageApprovalPda": "7ZFKUWAeUc91NetzCaKj7V7J6zbsjuHHzH7RiYtcXzFw",
  "approvalTxSignature": "AAHd7aBGJpDWpJ7vRw7hdeqj4vyDTNGJ1h1MV9Heo4oZTg11ASw3ZrZ7UebV5eiy5oMM3kVePyh1HueCJQJLfaC",
  "reason": "Destination broadcast disabled on proxy."
}
```

## What Hermes sees

Every Polet tool returns a discriminated `status`. Hermes's LLM can reason about the next step:

| `status` | Meaning | Agent next move |
|---|---|---|
| `ok` / `executed` | Success | Report the tx hash / explorer URL |
| `executed-preview` | Jupiter route/build preview | Session signer needed for final submission |
| `policy-blocked` | Private policy rejected | Replan with smaller amount (`recoverable: true`) |
| `session-revoked` | Session expired or revoked before trade | Stop and ask the human for a new session |
| `session-revoked-midflight` | Owner pulled the kill switch during Ika signing | Stop; no broadcast happened |
| `needs-approval` | Shared multisig-lite quorum pending | Wait for co-approvers |
| `gas-floor-underfunded` | Ika GasDeposit under the proxy floor | Ask operator to top up |
| `signer-required` | `POLET_AGENT_KEYPAIR` not wired | Fix config |
| `lifecycle-error` | Presign/Sign/CommitSignature failed | Escalate; not automatically recoverable |
| `broadcast-disabled` | Lifecycle succeeded, broadcast off (pre-alpha) | Report signature hex; operator decides |
| `broadcast-failed` | Destination RPC rejected | Retry later, maybe with different amount |

Private policy thresholds never appear in any branch. Prompt injection cannot extract them through the MCP surface.

## Updating

```bash
cd Polet-AI && git pull
cd sdk && bun run build
hermes mcp reload      # or restart Hermes gateway
```

## Related docs

- Full multi-runtime recipes (OpenClaw, Claude Desktop, Cursor, Zed, SendAI, OpenAI, LangChain): `docs/agent-runtime.md`.
- Polet proxy API surface (`/wallet/*`, `/intent/*`, `/ika/*`): `docs/prd.md`.
- Ika Pre-Alpha managed demo mode + full lifecycle: `docs/ika-devnet-smoke-runbook.md`.
- Issue 080 end-to-end wiring: `docs/issues/080-ika-pre-alpha-full-lifecycle-integration.md`.
