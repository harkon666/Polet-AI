# Hermes Agent — Polet Quickstart

Zero-to-trading in 5 steps. Target: let Hermes Agent (Nous Research) call `polet_execute` and reach the Polet confidential policy gate + Ika multi-chain signer.

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
export POLET_IKA_SUBSIDY_KEYPAIR_PATH=/path/to/subsidy.json            # optional: auto-funds GasDeposit
export POLET_DESTINATION_BROADCAST_MODE=demo-memo                       # or `live` once Sui/Sepolia RPC is ready
```

Without these, Hermes can still reach `polet_status`, `polet_enable_chain`, `polet_trade` — `polet_execute` on the Ika rail will return a specific `lifecycle-error` or `gas-floor-underfunded` so Hermes sees the full taxonomy.

## 2. Onboard an owner and generate agent credentials

1. Open `http://localhost:3000/app`.
2. Connect a devnet-funded wallet (Phantom / Backpack) as the **owner**.
3. Click **Initialize Polet smart wallet** → sign.
4. Click **Set confidential policy** → sign.
5. Scroll to **Agent credentials (for Hermes / Claude / Cursor / SendAI)** panel.
6. Click **Generate agent keypair** → browser generates a fresh Ed25519 keypair.
7. Click **Grant as Polet session** → owner signs the on-chain grant.
8. Click **Download polet-agent.json** → you now have `{ POLET_OWNER, POLET_SESSION_KEY, POLET_AGENT_KEYPAIR, POLET_PROXY_URL, POLET_RPC_URL }`.
9. (Optional, for multi-chain trades) click **Enable Sui devnet** in the Multi-chain signer panel.

The agent secret is shown once in the panel. Copy it now if you plan to paste into Hermes config manually. The downloaded JSON file also contains it.

## 3. Build the Polet MCP server

```bash
cd Polet-AI/sdk
bun install
bun run build   # outputs dist/mcp-server/cli.js (executable)
```

Sanity check outside Hermes:

```bash
POLET_OWNER=<from json> POLET_SESSION_KEY=<from json> POLET_PROXY_URL=http://localhost:3001 \
  bun run tests/mcp-subprocess-smoke.ts
```

You should see `✓ MCP subprocess smoke passed (runtime = bun)`.

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

Expected behaviour:
- 5 USDC → executed (`status: "executed"`, Sui tx hash returned) OR `broadcast-disabled` when destination broadcast is off.
- 25 USDC → `policy-blocked` with `recoverable: true` and no threshold leakage.
- Revoke the session from the Polet frontend mid-flight → next `polet_execute` returns `session-revoked-midflight`.

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
| `broadcast-disabled` | Lifecycle succeeded, broadcast off | Report signature hex; operator decides |
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
