# Polet AI — Agent Integration Guide

Polet AI allows you to connect any AI agent (or external script) to a Solana smart wallet protected by Confidential Policies (FHE). The agent gets a temporary, limited-access "session key" and can execute trades or intents on your behalf without ever having access to your main funds.

This guide explains how to integrate your custom agent runtime with the Polet AI SDK.

## Prerequisites: Environment Variables

## Prerequisites: Setup & Authorization

Before an agent can trade, its public key must be authorized by the Smart Wallet owner. This is a one-time on-chain transaction.

### 1. Generate & Authorize (via Web Dashboard)
1. Go to the **Polet AI Web Dashboard**.
2. Navigate to **Workspace**.
3. Search the **Authorize Agent Wallet** and input Agent public key solana wallet (wallet address).
4. Click **"Authorize Agent"** (this triggers a Solana transaction from your owner wallet).
5. Once confirmed on-chain, your agent is now a "Session Key" with limited permissions.

### 2. Configure your Agent
Download the `polet-agent.json` or copy the environment variables:

```env
POLET_OWNER="<Smart Wallet Owner Public Key>"
POLET_SESSION_KEY="<Agent's Public Session Key>"
POLET_AGENT_KEYPAIR="<Agent's Private Key in Base58>"
POLET_PROXY_URL="https://proxy.polet.ai" # Or your local proxy URL
POLET_RPC_URL="https://api.devnet.solana.com"
```

> **Security Note:** The `POLET_AGENT_KEYPAIR` is the private key of the Agent wallet. It **never** leaves your agent's local environment. The agent uses this key to sign execution requests, which the Polet proxy then validates against the on-chain FHE policy before broadcasting.

---

## Method 1: Model Context Protocol (MCP)

**Best for:** LLM-based agents (Claude Desktop, Cursor, Zed, Eliza, etc.)

If your agent framework supports the Model Context Protocol (MCP), integration is zero-code. The Polet SDK includes a built-in MCP server that exposes tools like `polet_trade`, `polet_status`, and `polet_balance` directly to the LLM.

Add the following to your agent's MCP configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "polet": {
      "command": "bunx",
      "args": ["@polet-ai/sdk", "polet-mcp"],
      "env": {
        "POLET_OWNER": "...",
        "POLET_SESSION_KEY": "...",
        "POLET_AGENT_KEYPAIR": "...",
        "POLET_PROXY_URL": "...",
        "POLET_RPC_URL": "..."
      }
    }
  }
}
```

Once connected, the LLM can autonomously say: *"Execute a trade of 5 USDC to SOL"* and the MCP server will handle the complex transaction building and FHE verification.

---

## Method 2: TypeScript / Node.js Library

**Best for:** Custom agent runtimes built with Node.js, Bun, or Deno.

If you are writing the agent logic yourself, you can use the Polet SDK programmatically via the `PoletKit` class.

### 1. Installation

*(Note: Assuming the package is published or linked locally)*
```bash
npm install @polet-ai/sdk
# or
bun add @polet-ai/sdk
```

### 2. Usage Example

```typescript
import { PoletKit } from '@polet-ai/sdk';

// 1. Initialize the Kit with your agent's credentials
const kit = new PoletKit({
  owner: process.env.POLET_OWNER,
  sessionKey: process.env.POLET_SESSION_KEY,
  agentKeypair: process.env.POLET_AGENT_KEYPAIR,
  proxyUrl: process.env.POLET_PROXY_URL,
});

async function runAgent() {
  // 2. Check if the session is still active and policy is configured
  const status = await kit.status();
  if (!status.ok) {
    console.error("Agent is not ready:", status.diagnostics);
    return;
  }

  console.log("Agent is ready. Wallet PDA:", status.walletPda);

  // 3. Execute a trade (e.g., DCA 5 USDC to SOL via Jupiter)
  try {
    const tradeResult = await kit.trade({
      inputMint: "USDC", // or actual mint address
      outputMint: "SOL", // or actual mint address
      amount: "5",       // Amount in human-readable UI units
    });

    if (tradeResult.allowed) {
      console.log("Trade executed successfully!");
    } else {
      // The trade might be pending FHE verification or blocked by the policy
      console.log("Trade status:", tradeResult.status);
      console.log("Reason:", tradeResult.reason);
    }
  } catch (error) {
    console.error("Trade failed:", error);
  }
}

runAgent();
```

---

## Method 3: Command Line Interface (CLI)

**Best for:** Bash scripts, CI/CD pipelines, or lightweight automation.

The SDK exposes a CLI that you can call directly.

```bash
# Export the environment variables first
export POLET_OWNER="..."
export POLET_SESSION_KEY="..."
export POLET_AGENT_KEYPAIR="..."
export POLET_PROXY_URL="..."

# Check readiness
bunx @polet-ai/sdk polet-status

# Execute a trade
bunx @polet-ai/sdk polet-trade --amount 5 --input USDC --output SOL
```

---

## How it works under the hood

1. **Agent Intent**: The agent decides to make a trade and calls the SDK.
2. **Pre-flight & Routing**: The SDK talks to the Polet Proxy to find the best route (e.g., Jupiter for Solana, Ika for multichain).
3. **Agent Signature**: The SDK builds the transaction and signs it *locally* using the `POLET_AGENT_KEYPAIR`.
4. **FHE Verification**: The signed transaction is sent to the proxy/contract. The Solana smart contract uses Fully Homomorphic Encryption (FHE) to verify if the trade amount is within the user's hidden policy limits.
5. **Execution**: If the FHE check passes (or is pending verification), the transaction is processed. If it violates the limit, it is blocked, and the agent's signature is rejected.
