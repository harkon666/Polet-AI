import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import { MCPToolsList } from './MCPToolsList'
import {
  buildPoletMcpConfig,
  isAgentBridgeReady,
} from './agent-config'

/**
 * BridgeConfigPanel, the two-column heart of `/app/bridge`.
 *
 *   Left:  paste-ready `mcp.json` block + Copy button
 *   Right: `<MCPToolsList>` (the 5 tools the proxy exposes)
 *
 * No card frame. Hairline divider between columns at md+; columns
 * stack on mobile.
 *
 * The JSON is rebuilt with `buildPoletMcpConfig(state)` whenever
 * `publicKey` or `sessionKeypair` changes — so as soon as the
 * operator grants a session on `/app/funds`, this page reflects it
 * without a refresh. When no session exists, the JSON shows
 * placeholder strings (`<grant-session-first>`,
 * `<download-polet-agent-json-first>`) plus a 1-line nudge linking
 * to Funds & Setup.
 */
export function BridgeConfigPanel() {
  const { t } = useLocale()
  const { state } = useConsole()
  const [copied, setCopied] = useState(false)

  const config = useMemo(() => buildPoletMcpConfig(state), [state])
  const ready = isAgentBridgeReady(state)

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(config)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked (insecure context / permissions); silent fail
    }
  }

  return (
    <section
      data-testid="bridge-config-panel"
      data-ready={ready}
      className="mt-8 grid grid-cols-1 gap-12 md:mt-12 md:grid-cols-[1.1fr_0.9fr] md:gap-14"
    >
      <div data-testid="bridge-config-mcp" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.bridge.config.title')}
          </p>
          <button
            type="button"
            data-testid="bridge-copy-button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink"
          >
            {copied
              ? t('portal.bridge.config.copied')
              : t('portal.bridge.config.copy')}
          </button>
        </div>
        <pre
          data-testid="bridge-config-json"
          className="mt-3 max-h-[28rem] overflow-auto rounded-lg border border-line bg-bg-deep/60 p-4 font-mono text-[11px] leading-relaxed text-ink-soft"
        >
          {config}
        </pre>
        {ready ? (
          <p className="mt-3 font-sans text-xs text-ink-mute leading-relaxed">
            {t('portal.bridge.config.ready')}
          </p>
        ) : (
          <p className="mt-3 font-sans text-xs text-ink-mute leading-relaxed">
            {t('portal.bridge.config.needsSession')}{' '}
            <Link
              to="/app/funds"
              className="text-lagoon-bright hover:text-lagoon transition-colors"
            >
              {t('portal.bridge.config.openFunds')}
            </Link>
          </p>
        )}
      </div>

      <div data-testid="bridge-config-tools" className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.bridge.tools.title')}
        </p>
        <div className="mt-3">
          <MCPToolsList />
        </div>
      </div>
    </section>
  )
}
