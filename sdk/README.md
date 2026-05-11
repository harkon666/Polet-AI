# @polet-ai/sdk

Agent-friendly TypeScript SDK for [Polet AI](../README.md) — the confidential Solana control layer for AI agents. Lets an autonomous agent request multi-chain trades, hit the confidential policy gate, and execute end-to-end through Ika Pre-Alpha signing and destination broadcast, with every decision point exposed as a machine-readable discriminated union.

Pre-alpha disclaimer: Ika uses a single mock signer, not production MPC. Destination broadcast targets Sui devnet and Ethereum Sepolia only. See [`docs/ika-devnet-smoke-runbook.md`](../docs/ika-devnet-smoke-runbook.md).

## Who this is for

- Developers wiring AI agents (Hermes Agent, OpenClaw, Solana Agent Kit, Claude Desktop, Cursor, LangChain, OpenAI function-calling) into Solana-native multi-chain trading.
- Hackathon reviewers inspecting how Polet combines Ika (bridgeless signing) + Encrypt (confidential policy) for agent safety rails.

## Install

```bash
bun add @polet-ai/sdk
# or
npm install @polet-ai/sdk
```

## End-to-end in 5 steps (Hermes / Claude / Cursor)

Detailed guide: [`docs/INTEGRATION.md`](../docs/INTEGRATION.md). Summary:

1. Start `proxy` + `frontend` locally.
2. In the frontend, connect owner wallet → **Workspace** tab → **Authorize Agent Wallet** → paste Agent public key → **Authorize Agent**.
3. `cd sdk && bun run build` to emit `dist/mcp-server/cli.js`.
   > **Note:** If cloning from GitHub, this build step is mandatory to generate the `dist/` folder required by MCP clients.
4. Point your agent (Claude/Cursor/Hermes) at the CLI and use the values from the dashboard (or `polet-agent.json`).
5. In the agent runtime, ask: *"Check Polet status, then trade 5 USDC to SOL."*

Pre-run sanity check:

```bash
POLET_OWNER=... POLET_SESSION_KEY=... POLET_PROXY_URL=... \
  node sdk/dist/bin/readiness.js
```

The helper verifies proxy reachable + wallet onboarded + session authorized + managed fixture loaded before Hermes spawns the MCP server.

## Quickstart (20 lines)

```ts
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createPoletAgentKit } from '@polet-ai/sdk';

const kit = createPoletAgentKit({
  owner: process.env.POLET_OWNER!,
  sessionKey: process.env.POLET_SESSION_KEY!,
  baseUrl: process.env.POLET_PROXY_URL ?? 'http://localhost:3001',
  rpcUrl: process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com',
  connection: new Connection(process.env.POLET_RPC_URL!, 'confirmed'),
  agentSigner: Keypair.fromSecretKey(bs58.decode(process.env.POLET_AGENT_KEYPAIR!)),
});

const result = await kit.execute({ from: 'USDC', to: 'SUI', amount: 5, rail: 'ika' });
if (result.status === 'executed') {
  console.log(`✓ ${result.destinationChain} tx: ${result.destinationTxHash}`);
  console.log(result.destinationExplorerUrl);
} else {
  console.log(`Polet returned ${result.status}: ${result.message}`);
}
```

## Why `execute()` is agent-friendly

`kit.execute()` wraps the full lifecycle (`trade` → sign Polet approval → `progressIkaLifecycle` → destination broadcast) into a single call that returns a discriminated union. The agent switches on `result.status`:

```ts
switch (result.status) {
  case 'executed':                  // fully done on-chain on Sui/Sepolia
    break;
  case 'executed-preview':          // Jupiter route/build preview (Solana-only)
    break;
  case 'policy-blocked':            // confidential policy rejected; `recoverable: true`
    break;
  case 'session-revoked':           // session key no longer valid (pre-flight)
    break;
  case 'session-revoked-midflight': // revoke landed while lifecycle was running
    break;                          // `revokePhase` tells where the kill switch fired
  case 'needs-approval':            // shared access quorum pending
    break;
  case 'gas-floor-underfunded':     // GasDeposit under proxy floor
    break;
  case 'signer-required':           // agentSigner missing / insufficient
    break;
  case 'broadcast-disabled':        // signature committed, broadcast disabled
    break;
  case 'broadcast-failed':          // signature committed, broadcast errored
    break;
  case 'lifecycle-error':           // Presign/Sign/CommitSignature failed
    break;
}
```

Private policy thresholds never appear in any of these branches — the agent learns "request blocked" but not "the cap is 10 USDC".

Prefer `throw` semantics? Pass `throwOnFailure: true` and catch subclasses of `PoletAgentError`:

```ts
try {
  await kit.execute(input, { throwOnFailure: true });
} catch (err) {
  if (err instanceof PoletPolicyBlockedError && err.recoverable) {
    // replan with smaller amount
  }
}
```

## Core concepts

- **Polet smart wallet** — Solana PDA that holds USDC/SOL + enforces confidential policy. Owned by a human user.
- **Session key** — ephemeral keypair granted to the AI agent. Scoped by policy, revokable instantly.
- **Ika dWallet** — cross-chain signing key controlled by Polet's CPI authority PDA. Managed demo mode reuses one dWallet per curve; production will DKG per-user via WASM.
- **`agent.execute()`** — agent-facing unified action. Uses the configured `agentSigner` to land the Polet approval transaction, then drives Ika through Presign/Sign/CommitSignature/broadcast.
- **Kill switch** — `revoke_session` lands on-chain; Polet's lifecycle aborts at `pre-presign` / `pre-sign` / `post-sign-pre-broadcast` and returns `session-revoked-midflight` without leaking policy values.

## Framework adapters

### Model Context Protocol (MCP) — Claude Desktop, Cursor, Hermes, OpenClaw

Spin up the Polet MCP server and declare it in the MCP client config. One command, multiple runtimes.

```bash
POLET_OWNER=… POLET_SESSION_KEY=… POLET_AGENT_KEYPAIR=… \
POLET_PROXY_URL=http://localhost:3001 \
  bunx @polet-ai/sdk polet-mcp
```

Claude Desktop / Cursor / Zed config:

```json
{
  "mcpServers": {
    "polet": {
      "command": "bunx",
      "args": ["@polet-ai/sdk", "polet-mcp"],
      "env": {
        "POLET_OWNER": "…",
        "POLET_SESSION_KEY": "…",
        "POLET_AGENT_KEYPAIR": "…",
        "POLET_PROXY_URL": "https://polet.example/proxy"
      }
    }
  }
}
```

Hermes Agent (`hermes config set mcp.servers.polet.command bunx` + args) and OpenClaw skill wrapping an MCP client call both work via the same server — see [`docs/agent-runtime.md`](../docs/agent-runtime.md).

Exposed tools: `polet_status`, `polet_enable_chain`, `polet_trade`, `polet_execute`.

### Solana Agent Kit (SendAI)

```ts
import { SolanaAgentKit } from 'solana-agent-kit';
import { createPoletSolanaAgentKitActions } from '@polet-ai/sdk/adapters/solana-agent-kit';

const sendai = new SolanaAgentKit(privateKey, rpcUrl, { OPENAI_API_KEY });
const poletActions = createPoletSolanaAgentKitActions(poletKit);
for (const action of poletActions) sendai.actions[action.name] = action;
```

### OpenAI function-calling / Assistants API

```ts
import OpenAI from 'openai';
import { createPoletOpenAiTools, invokePoletOpenAiTool } from '@polet-ai/sdk/adapters/openai';

const openai = new OpenAI();
const polet = createPoletOpenAiTools(poletKit);

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  tools: polet.tools,
});

for (const toolCall of completion.choices[0]?.message?.tool_calls ?? []) {
  const content = await invokePoletOpenAiTool(polet, toolCall);
  messages.push({ role: 'tool', tool_call_id: toolCall.id, content });
}
```

### LangChain / LangGraph

```ts
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createPoletLangChainTools } from '@polet-ai/sdk/adapters/langchain';

const tools = createPoletLangChainTools(poletKit).map(
  (t) => new DynamicStructuredTool(t)
);
```

## Error handling

All failure paths carry:

- `code` — stable string identifier.
- `recoverable` — hint whether an agent retry (smaller amount, wait for approval, top up gas) might succeed.

Classes exported from `@polet-ai/sdk`:

| Class | Code | Recoverable |
|---|---|---|
| `PoletPolicyBlockedError` | `POLICY_BLOCKED` | yes |
| `PoletSessionRevokedError` | `SESSION_REVOKED` | no |
| `PoletSessionRevokedMidflightError` | `SESSION_REVOKED_MIDFLIGHT` | no |
| `PoletNeedsApprovalError` | `NEEDS_APPROVAL` | yes |
| `PoletGasFloorError` | `GAS_FLOOR_UNDERFUNDED` | yes |
| `PoletSignerRequiredError` | `SIGNER_REQUIRED` | no |
| `PoletLifecycleError` | `LIFECYCLE_ERROR` | no |
| `PoletBroadcastError` | `BROADCAST_FAILED` | yes |
| `PoletBroadcastDisabledError` | `BROADCAST_DISABLED` | no |
| `PoletSimulationError` | `SIMULATION_FAILED` | yes |
| `PoletUnsupportedRailError` | `UNSUPPORTED_RAIL` | no |
| `PoletDwalletNotEnabledError` | `DWALLET_NOT_ENABLED` | no |
| `PoletManagedFixtureMissingError` | `MANAGED_FIXTURE_MISSING` | no |
| `PoletProxyUnreachableError` | `PROXY_UNREACHABLE` | yes |

Use `toPoletAgentError(err)` to coerce any thrown value into the structured hierarchy.

## Examples

Runnable scripts under [`sdk/examples/`](./examples):

- `01-hello-agent.ts` — minimum end-to-end.
- `02-reasoning-agent.ts` — agent replans with smaller amount when `policy-blocked`.
- `03-mcp-server-example.ts` — drives the MCP server in-process for smoke tests.
- `04-solana-agent-kit.ts` — prints Polet action descriptors in SendAI shape.

Run any of them with the shared env vars:

```bash
POLET_OWNER=… POLET_SESSION_KEY=… POLET_AGENT_KEYPAIR=… \
POLET_PROXY_URL=http://localhost:3001 \
  bun run sdk/examples/01-hello-agent.ts
```

## Configuration reference

| Env var | Purpose |
|---|---|
| `POLET_OWNER` | Solana public key of the Polet smart wallet owner (human user). |
| `POLET_SESSION_KEY` | Session key public key granted to this agent. Must match a live `session.key` on-chain. |
| `POLET_AGENT_KEYPAIR` | Base58 or JSON-array secret key for the Agent wallet (held locally by the agent). |
| `POLET_PROXY_URL` | Polet proxy base URL. Defaults to `http://localhost:3001`. |
| `POLET_RPC_URL` | Solana RPC URL. Defaults to `https://api.devnet.solana.com`. |

## Status & roadmap

- ✅ Confidential policy gate (Jupiter DCA + Ika multi-chain)
- ✅ Ika Pre-Alpha full lifecycle (Presign → Sign → CommitSignature → broadcast) per [issue 080](../docs/issues/080-ika-pre-alpha-full-lifecycle-integration.md)
- ✅ Managed demo mode (one-click `enable-chain`)
- ✅ MCP server + SendAI + OpenAI + LangChain adapters
- 🛠 Production WASM DKG for per-user zero-trust dWallets
- 🛠 REFHE primitive computations on encrypted ciphertext beyond the current masked-witness simulation

## License

MIT. See the repo-level [`README.md`](../README.md) for the product narrative and demo script.
