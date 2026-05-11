import bs58 from 'bs58'
import type { TranslationKey } from '#/locale/dictionary'
import type { ConsoleState } from '../use-console-actions'

/**
 * Phase 6 — shared MCP / SDK config builder + tool list constants.
 *
 * Extracted from the legacy `<AgentIntegrationPanel>` so the new
 * `/app/bridge` page can render the same JSON shape (and so future
 * SDK runners can import the builder without depending on a portal
 * UI module).
 *
 * Pure module: no React, no DOM. Builders take a `ConsoleState`
 * snapshot and return strings / arrays. Side effects (download,
 * copy-to-clipboard) live in the components that wrap these.
 */

/**
 * The 5 MCP tools the proxy exposes. Each has an i18n description
 * key — the bridge UI looks them up via `useLocale().t(...)`.
 */
export const MCP_TOOLS: ReadonlyArray<{
  name: string
  descriptionKey: TranslationKey
}> = [
  { name: 'polet_balance', descriptionKey: 'app.agent.tool.balance' },
  { name: 'polet_status', descriptionKey: 'app.agent.tool.status' },
  { name: 'polet_enable_chain', descriptionKey: 'app.agent.tool.enableChain' },
  { name: 'polet_trade', descriptionKey: 'app.agent.tool.trade' },
  { name: 'polet_execute', descriptionKey: 'app.agent.tool.execute' },
]

const DEFAULT_PROXY_URL = 'http://localhost:3001'
const DEVNET_RPC_URL = 'https://api.devnet.solana.com'

/**
 * The `__POLET_PROXY_URL__` window override is what the existing
 * AgentIntegrationPanel + SetupLedger use; preserve the same lookup
 * so e2e overrides keep working unchanged.
 */
export function getProxyUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_PROXY_URL
  return (
    (window as unknown as { __POLET_PROXY_URL__?: string })
      .__POLET_PROXY_URL__ ?? DEFAULT_PROXY_URL
  )
}

/**
 * The flat env-var record agents consume. Falls back to placeholder
 * strings (`<owner-wallet-pubkey>`, `<grant-session-first>`,
 * `<download-polet-agent-json-first>`) when state hasn't been
 * populated yet so the operator can still see what shape the agent
 * runtime expects.
 */
export type PoletAgentEnv = {
  POLET_OWNER: string
  POLET_SESSION_KEY: string
  POLET_AGENT_KEYPAIR: string
  POLET_PROXY_URL: string
  POLET_RPC_URL: string
}

export function buildPoletAgentEnv(state: ConsoleState): PoletAgentEnv {
  const owner = state.publicKey?.toBase58() ?? '<owner-wallet-pubkey>'
  const sessionKeypair = state.sessionKeypair
  const sessionPublicKey = sessionKeypair?.publicKey
    ? sessionKeypair.publicKey.toBase58()
    : '<grant-session-first>'
  const sessionSecret = sessionKeypair
    ? bs58.encode(sessionKeypair.secretKey)
    : '<download-polet-agent-json-first>'
  return {
    POLET_OWNER: owner,
    POLET_SESSION_KEY: sessionPublicKey,
    POLET_AGENT_KEYPAIR: sessionSecret,
    POLET_PROXY_URL: getProxyUrl(),
    POLET_RPC_URL: DEVNET_RPC_URL,
  }
}

/**
 * Full MCP config JSON, ready for paste into Claude Desktop's
 * `mcpServers` block. Format is byte-identical to the legacy
 * `<AgentIntegrationPanel>` output so existing operator
 * documentation stays accurate.
 */
export function buildPoletMcpConfig(state: ConsoleState): string {
  const env = buildPoletAgentEnv(state)
  return JSON.stringify(
    {
      mcpServers: {
        polet: {
          command: 'bunx',
          args: ['@polet-ai/sdk', 'polet-mcp'],
          env,
        },
      },
    },
    null,
    2,
  )
}

/**
 * The flat `polet-agent.json` payload the SDK CLI consumes. Used by
 * the download affordance on the bridge page.
 */
export function buildPoletAgentJson(state: ConsoleState): string {
  return JSON.stringify(buildPoletAgentEnv(state), null, 2)
}

/**
 * Convenience helper: true when the state has enough context to
 * produce a real (non-placeholder) config. Drives the "needs grant"
 * hint on the bridge page.
 */
export function isAgentBridgeReady(state: ConsoleState): boolean {
  return Boolean(state.publicKey) && Boolean(state.sessionKeypair)
}
