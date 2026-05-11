import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import {
  buildPoletAgentJson,
  isAgentBridgeReady,
} from './agent-config'

/**
 * DownloadPoletAgentJson, the small affordance that lets operators
 * download `polet-agent.json` (the SDK CLI's pre-config payload).
 *
 * Mirrors the legacy `<SessionKeypairAffordance>` download logic
 * without dragging the whole keypair-affordance card forward. When
 * no session keypair exists, the button greys out and a 1-line hint
 * links the operator to `/app/funds` to grant one first.
 */
export function DownloadPoletAgentJson() {
  const { t } = useLocale()
  const { state } = useConsole()
  const ready = isAgentBridgeReady(state)

  const handleDownload = () => {
    if (!ready) return
    const payload = buildPoletAgentJson(state)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'polet-agent.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      data-testid="bridge-download-affordance"
      data-ready={ready}
      className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6"
    >
      <button
        type="button"
        data-testid="bridge-download-button"
        onClick={handleDownload}
        disabled={!ready}
        className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lagoon-bright/15"
      >
        <span aria-hidden="true">↓</span>
        {t('portal.bridge.download.button')}
      </button>
      {ready ? (
        <p className="font-sans text-xs text-ink-mute">
          {t('portal.bridge.download.ready')}
        </p>
      ) : (
        <p className="font-sans text-xs text-ink-mute">
          {t('portal.bridge.download.needsSession')}{' '}
          <Link
            to="/app/funds"
            className="text-lagoon-bright hover:text-lagoon transition-colors"
          >
            {t('portal.bridge.download.openFunds')}
          </Link>
        </p>
      )}
    </div>
  )
}
