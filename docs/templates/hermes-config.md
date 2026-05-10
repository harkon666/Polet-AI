# Hermes Agent — Polet MCP config template

After running `polet-agent.json` export from the Polet frontend, configure Hermes Agent to spawn the Polet MCP server:

```bash
# Required one-time install
hermes setup            # install Hermes Agent: https://hermes-agent.nousresearch.com/docs/getting-started/quickstart

# Point Hermes at the Polet MCP binary (absolute path to your Polet-AI checkout)
hermes config set mcp.servers.polet.command node
hermes config set mcp.servers.polet.args '["/ABSOLUTE/PATH/TO/Polet-AI/sdk/dist/mcp-server/cli.js"]'

# Paste the values from polet-agent.json
hermes config set mcp.servers.polet.env.POLET_OWNER "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_SESSION_KEY "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_AGENT_KEYPAIR "<from polet-agent.json>"
hermes config set mcp.servers.polet.env.POLET_PROXY_URL "http://localhost:3001"
hermes config set mcp.servers.polet.env.POLET_RPC_URL "https://api.devnet.solana.com"

# Start Hermes
hermes
```

Inside the Hermes TUI, try prompts like:

> Check the Polet wallet status.

> Enable Sui trading on Polet.

> Swap 5 USDC to SUI via Polet. If it is blocked by policy, try 2 USDC.

Hermes will discover `polet_status`, `polet_enable_chain`, `polet_trade`, and `polet_execute` via MCP, and the LLM will choose which to call.

## Updating

When you pull a new Polet release, rebuild the SDK dist so Hermes picks up new tools:

```bash
cd Polet-AI/sdk && bun run build
hermes mcp reload    # or restart the Hermes gateway
```

## Revoke kill switch

Session-revoke stays an owner-only action. If the agent misbehaves, open the Polet frontend → Agent Access → click revoke on the matching session key. Hermes's next `polet_execute` call returns `status: "session-revoked"` and cannot continue trading. No restart required.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Hermes reports "tool server failed to start" | Run `node /ABSOLUTE/PATH/TO/Polet-AI/sdk/dist/mcp-server/cli.js` manually; verify it prints `[polet-mcp] ready (stdio)` on stderr and no errors on stdout. |
| `polet_status` returns `setup-incomplete` | Run the frontend onboarding flow (connect wallet → init Polet → set policy → grant session → enable chain). |
| `polet_execute` returns `signer-required` | `POLET_AGENT_KEYPAIR` missing or doesn't match the session key that was granted. Regenerate via the frontend `AgentOnboardingPanel`. |
| `polet_execute` returns `gas-floor-underfunded` | Operator needs to top up the managed GasDeposit. See `docs/ika-devnet-smoke-runbook.md`. |
| Everything times out | Verify `POLET_PROXY_URL` points at a running Polet proxy (default `http://localhost:3001`). |
