import { createFileRoute } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { BridgeConfigPanel } from '../components/app/bridge/BridgeConfigPanel'
import { DownloadPoletAgentJson } from '../components/app/bridge/DownloadPoletAgentJson'
import { WalletDashboard } from '../components/app/WalletDashboard'

/**
 * /app/bridge — Polet Portal Agent Bridge.
 *
 * The developer surface where operators copy MCP config, download
 * `polet-agent.json`, and (via the Advanced collapse) reach the
 * legacy v1 `<WalletDashboard>` for power flows not yet ported to the
 * portal (recovery, shared quorum, Encrypt graph).
 *
 * Composition:
 *   PageHead (kicker, title, sub, MCP·SDK·polet-agent.json pill)
 *   <BridgeConfigPanel> — paste-ready mcp.json + 5 MCP tools
 *   <DownloadPoletAgentJson> — small download affordance
 *   <details>
 *     summary: "Advanced · Legacy v1 console"
 *     body: <WalletDashboard /> (kept for recovery / quorum / encrypt)
 *   </details>
 *
 * Phase 1 archived AgentIntegrationPanel from the active tree but
 * left it on disk; Phase 7 archives it to `_archived/`. The new
 * config builder lives in `bridge/agent-config.ts` and is the single
 * source of truth for the JSON shape.
 */
export const Route = createFileRoute('/app/bridge')({
  component: AppBridgePage,
})

export function AppBridgePage() {
  const { t } = useLocale()
  return (
    <section data-testid="bridge-page">
      <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.bridge.kicker')}
          </p>
          <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
            {t('portal.bridge.title')}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
            {t('portal.bridge.sub')}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.bridge.pill')}
        </span>
      </header>

      <BridgeConfigPanel />
      <DownloadPoletAgentJson />

      <details
        data-testid="bridge-advanced-collapse"
        className="mt-12 group rounded-lg border border-line bg-surface/30"
      >
        <summary className="cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {t('portal.bridge.advanced.kicker')}
              </p>
              <p className="mt-1 font-sans text-sm text-ink-soft">
                {t('portal.bridge.advanced.summary')}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute group-open:rotate-180 transition"
            >
              ↓
            </span>
          </div>
        </summary>
        <div
          data-testid="bridge-advanced-body"
          className="border-t border-line/60 px-2 py-4 sm:px-4"
        >
          <WalletDashboard />
        </div>
      </details>
    </section>
  )
}
