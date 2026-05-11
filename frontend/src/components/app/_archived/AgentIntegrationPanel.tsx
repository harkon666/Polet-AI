/**
 * ARCHIVED — Phase 7 (issue 105) moved this file out of the active
 * Polet Portal tree on 2026-05-11. Replaced by the Polet Portal
 * surface (issues 099-105). Kept on disk so future contributors can
 * reference the previous shape.
 *
 * If you're looking for the new equivalent, see:
 *   - components/app/portal/    chrome (sidebar, mobile bar, drawer)
 *   - components/app/workspace/ /app/workspace
 *   - components/app/gate/      /app/gate
 *   - components/app/funds/     /app/funds
 *   - components/app/proof/     /app/proof
 *   - components/app/bridge/    /app/bridge
 *   - components/app/selectors/console-selectors.ts (shared state derivations)
 *
 * Do not import from this file in new code. Mounted by:
 *   git log --diff-filter=A -- frontend/src/components/app/AgentIntegrationPanel.tsx
 */
import { useMemo, useState } from 'react'
import bs58 from 'bs58'
import { useLocale } from '#/hooks/use-locale'
import type { TranslationKey } from '#/locale/dictionary'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import { useConsole } from './use-console-actions'

const MCP_TOOLS: Array<{ name: string; descriptionKey: TranslationKey }> = [
  { name: 'polet_balance', descriptionKey: 'app.agent.tool.balance' },
  { name: 'polet_status', descriptionKey: 'app.agent.tool.status' },
  { name: 'polet_enable_chain', descriptionKey: 'app.agent.tool.enableChain' },
  { name: 'polet_trade', descriptionKey: 'app.agent.tool.trade' },
  { name: 'polet_execute', descriptionKey: 'app.agent.tool.execute' },
]

function proxyUrl() {
  return (
    (typeof window !== 'undefined' &&
      (window as unknown as { __POLET_PROXY_URL__?: string })
        .__POLET_PROXY_URL__) ||
    'http://localhost:3001'
  )
}

export function AgentIntegrationPanel() {
  const { t } = useLocale()
  const { state } = useConsole()
  const { connected, publicKey, sessionKeypair } = state
  const [copied, setCopied] = useState(false)
  const containerRef = useScrollReveal()
  const config = useMemo(() => {
    const sessionPublicKey =
      sessionKeypair?.publicKey.toBase58() ?? '<grant-session-first>'
    const sessionSecret = sessionKeypair
      ? bs58.encode(sessionKeypair.secretKey)
      : '<download-polet-agent-json-first>'
    return JSON.stringify(
      {
        mcpServers: {
          polet: {
            command: 'bunx',
            args: ['@polet-ai/sdk', 'polet-mcp'],
            env: {
              POLET_OWNER: publicKey?.toBase58() ?? '<owner-wallet-pubkey>',
              POLET_SESSION_KEY: sessionPublicKey,
              POLET_AGENT_KEYPAIR: sessionSecret,
              POLET_PROXY_URL: proxyUrl(),
              POLET_RPC_URL: 'https://api.devnet.solana.com',
            },
          },
        },
      },
      null,
      2,
    )
  }, [publicKey, sessionKeypair])

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(config)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
    }
  }

  return (
    <section
      ref={containerRef}
      aria-label="Polet agent integration"
      className={connected ? 'border-b border-line bg-bg-base py-8 md:py-12' : 'hidden'}
    >
      {connected ? (
        <div className="mx-auto max-w-6xl px-6">
          <details className="pl-reveal group rounded-2xl border border-line bg-bg-deep">
            <summary className="cursor-pointer list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <KickerLabel tone="accent">{t('app.agent.kicker')}</KickerLabel>
                  <h2 className="mt-2 font-sans text-lg md:text-xl font-semibold text-ink">
                    {t('app.agent.title')}
                  </h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute group-open:rotate-180 transition">
                  ↓
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm text-ink-soft leading-relaxed">
                {t('app.agent.body')}
              </p>
            </summary>

            <div className="border-t border-line/60 px-6 py-5 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
                  {t('app.agent.tools')}
                </p>
                <ul className="mt-3 space-y-2">
                  {MCP_TOOLS.map((tool) => (
                    <li
                      key={tool.name}
                      className="rounded-lg border border-line/70 bg-bg-base/40 p-3"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
                        {tool.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-mute leading-relaxed">
                        {t(tool.descriptionKey)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
                    {t('app.agent.config')}
                  </p>
                  <button
                    type="button"
                    onClick={copyConfig}
                    className="inline-flex items-center rounded border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft hover:border-line-strong hover:text-ink transition"
                  >
                    {copied ? t('app.agent.copied') : t('app.agent.copy')}
                  </button>
                </div>
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-line bg-bg-base p-4 font-mono text-[11px] leading-relaxed text-ink-soft">
                  {config}
                </pre>
                <p className="mt-3 text-xs text-ink-mute leading-relaxed">
                  {sessionKeypair
                    ? t('app.agent.ready')
                    : t('app.agent.needsSession')}
                </p>
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </section>
  )
}
