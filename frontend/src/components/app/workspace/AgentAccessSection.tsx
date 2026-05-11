import { useState } from 'react'
import { useLocale } from '#/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'

/**
 * AgentAccessSection, the BYO-agent authorization surface on
 * `/app/workspace`.
 *
 * Lists every authorized (or previously revoked) session, lets the
 * owner paste an externally-generated agent wallet pubkey, pick an
 * expiry + legacy native-SOL daily limit, and grant. Revoke is
 * per-row. When a row is active, the operator can expand a config
 * panel containing the `polet-agent.json`, Claude Desktop / Cursor /
 * Zed MCP JSON, and Hermes CLI commands — all pre-filled with the
 * authorized session pubkey but leaving the private key as a
 * `<PASTE …>` placeholder. Polet never sees the agent private key.
 *
 * Visual language mirrors the rest of `/app/workspace`:
 *   - hairline-divided rows, no card walls
 *   - `font-mono text-[10px] uppercase tracking-[0.22em]` for kicker
 *   - palm dot = active, coral dot = revoked, sunset chip = expiring
 *   - primary CTA: `border-lagoon-bright bg-lagoon-bright/15`
 *
 * i18n: all strings via `portal.workspace.agentAccess.*` keys.
 */
interface SessionRow {
  key: string
  expiresAt: number
  authorized: boolean
  dailyLimit: number
  grantedSlot: number
}

function shortPubkey(s: string): string {
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s
}

function msUntil(epochSec: number): number {
  return epochSec * 1000 - Date.now()
}

function formatCountdown(epochSec: number): string {
  const ms = msUntil(epochSec)
  if (ms <= 0) return ''
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function AgentAccessSection() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const [showForm, setShowForm] = useState(false)
  const [pubkeyDraft, setPubkeyDraft] = useState('')
  const [expiresInHours, setExpiresInHours] = useState(24)
  const [dailyLimitSol, setDailyLimitSol] = useState(0.05)
  const [expandedConfigKey, setExpandedConfigKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const owner = state.publicKey?.toBase58()
  const rawSessions =
    (state.data?.temporalKeys ?? state.data?.sessions ?? []) as unknown[]
  const sessions: SessionRow[] = rawSessions
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
    .map((s) => ({
      key: String(s.key ?? ''),
      expiresAt: Number(s.expiresAt ?? 0),
      authorized: Boolean(s.authorized),
      dailyLimit: Number(s.dailyLimit ?? 0),
      grantedSlot: Number(s.grantedSlot ?? 0),
    }))
    .filter((s) => s.key)

  const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001'
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

  const buildPoletAgentJson = (sessionKey: string): string =>
    JSON.stringify(
      {
        POLET_OWNER: owner ?? '<owner wallet pubkey>',
        POLET_SESSION_KEY: sessionKey,
        POLET_AGENT_KEYPAIR: '<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>',
        POLET_PROXY_URL: proxyUrl,
        POLET_RPC_URL: rpcUrl,
      },
      null,
      2,
    )

  const buildMcpConfigJson = (sessionKey: string): string =>
    JSON.stringify(
      {
        mcpServers: {
          polet: {
            command: 'bunx',
            args: ['@polet-ai/sdk', 'polet-mcp'],
            env: {
              POLET_OWNER: owner ?? '<owner wallet pubkey>',
              POLET_SESSION_KEY: sessionKey,
              POLET_AGENT_KEYPAIR:
                '<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>',
              POLET_PROXY_URL: proxyUrl,
              POLET_RPC_URL: rpcUrl,
            },
          },
        },
      },
      null,
      2,
    )

  const buildHermesCommands = (sessionKey: string): string =>
    [
      'hermes config set mcp.servers.polet.command bunx',
      `hermes config set mcp.servers.polet.args '["@polet-ai/sdk", "polet-mcp"]'`,
      `hermes config set mcp.servers.polet.env.POLET_OWNER "${owner ?? '<owner wallet pubkey>'}"`,
      `hermes config set mcp.servers.polet.env.POLET_SESSION_KEY "${sessionKey}"`,
      `hermes config set mcp.servers.polet.env.POLET_AGENT_KEYPAIR "<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>"`,
      `hermes config set mcp.servers.polet.env.POLET_PROXY_URL "${proxyUrl}"`,
      `hermes config set mcp.servers.polet.env.POLET_RPC_URL "${rpcUrl}"`,
    ].join('\n')

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      /* noop */
    }
  }

  const grantBusy = state.loading === 'session-byo'
  const anyLoading = state.loading !== null

  const handleSubmit = async () => {
    if (!pubkeyDraft.trim()) return
    await actions.grantAgentSessionByo({
      agentPubkey: pubkeyDraft.trim(),
      expiresInHours,
      dailyLimitSol,
    })
    setPubkeyDraft('')
    setShowForm(false)
  }

  const rowDot = (s: SessionRow): string => {
    if (!s.authorized)
      return 'bg-coral shadow-[0_0_8px_rgba(251,113,133,0.45)]'
    if (msUntil(s.expiresAt) <= 0) return 'bg-ink-mute/60'
    return 'bg-palm shadow-[0_0_8px_rgba(52,211,153,0.5)]'
  }

  const rowStateLabel = (s: SessionRow): string => {
    if (!s.authorized) return t('portal.workspace.agentAccess.row.revoked')
    if (msUntil(s.expiresAt) <= 0)
      return t('portal.workspace.agentAccess.row.expired')
    return t('portal.workspace.agentAccess.row.active')
  }

  return (
    <section
      data-testid="agent-access-section"
      className="mt-12 border-t border-line pt-10"
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.workspace.agentAccess.kicker')}
          </p>
          <h2 className="mt-2 font-sans text-xl font-bold tracking-[-0.02em] text-ink md:text-2xl">
            {t('portal.workspace.agentAccess.title')}
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft">
            {t('portal.workspace.agentAccess.sub')}
          </p>
        </div>
        <button
          type="button"
          data-testid="agent-access-toggle-form"
          onClick={() => setShowForm((v) => !v)}
          disabled={!owner || anyLoading}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showForm
            ? t('portal.workspace.agentAccess.form.cancel')
            : t('portal.workspace.agentAccess.authorize')}
        </button>
      </header>

      {showForm ? (
        <div
          data-testid="agent-access-form"
          className="mt-6 border-b border-line pb-6"
        >
          <label
            htmlFor="agent-access-pubkey"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
          >
            {t('portal.workspace.agentAccess.form.pubkey.label')}
          </label>
          <input
            id="agent-access-pubkey"
            data-testid="agent-access-pubkey-input"
            type="text"
            placeholder={t(
              'portal.workspace.agentAccess.form.pubkey.placeholder',
            )}
            value={pubkeyDraft}
            onChange={(e) => setPubkeyDraft(e.target.value)}
            className="w-full rounded-md border border-line bg-surface/40 px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-mute/60 focus:border-lagoon-bright focus:outline-none"
          />
          <p className="mt-1.5 max-w-xl font-sans text-xs leading-relaxed text-ink-mute">
            {t('portal.workspace.agentAccess.form.pubkey.help')}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="agent-access-expires"
                className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
              >
                {t('portal.workspace.agentAccess.form.expires.label')}
              </label>
              <select
                id="agent-access-expires"
                data-testid="agent-access-expires-select"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-line bg-surface/40 px-3 py-2 font-mono text-sm text-ink focus:border-lagoon-bright focus:outline-none"
              >
                <option value={1}>
                  {t('portal.workspace.agentAccess.form.expires.option1h')}
                </option>
                <option value={24}>
                  {t('portal.workspace.agentAccess.form.expires.option24h')}
                </option>
                <option value={168}>
                  {t('portal.workspace.agentAccess.form.expires.option7d')}
                </option>
              </select>
            </div>
            <div>
              <label
                htmlFor="agent-access-daily"
                className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
              >
                {t('portal.workspace.agentAccess.form.dailyLimit.label')}
              </label>
              <input
                id="agent-access-daily"
                data-testid="agent-access-daily-input"
                type="number"
                step="0.01"
                min="0"
                value={dailyLimitSol}
                onChange={(e) =>
                  setDailyLimitSol(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-full rounded-md border border-line bg-surface/40 px-3 py-2 font-mono text-sm text-ink focus:border-lagoon-bright focus:outline-none"
              />
              <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-mute">
                {t('portal.workspace.agentAccess.form.dailyLimit.help')}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="agent-access-submit"
              onClick={() => void handleSubmit()}
              disabled={!pubkeyDraft.trim() || grantBusy || !owner}
              className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {grantBusy ? <Spinner size={10} /> : null}
              {t('portal.workspace.agentAccess.form.submit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setPubkeyDraft('')
              }}
              disabled={grantBusy}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('portal.workspace.agentAccess.form.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      <ul
        data-testid="agent-access-list"
        className="mt-6"
        aria-label={t('portal.workspace.agentAccess.title')}
      >
        {sessions.length === 0 ? (
          <li
            data-testid="agent-access-empty"
            className="py-6 font-sans text-sm leading-relaxed text-ink-mute"
          >
            {t('portal.workspace.agentAccess.empty')}
          </li>
        ) : (
          sessions.map((s) => {
            const countdown = formatCountdown(s.expiresAt)
            const revokeBusy =
              state.loading === 'session-revoke' ||
              state.loading === 'regrant'
            const configExpanded = expandedConfigKey === s.key
            return (
              <li
                key={s.key}
                data-testid={`agent-access-row-${s.key.slice(0, 8)}`}
                className="border-b border-line py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${rowDot(s)}`}
                  />
                  <span className="font-mono text-[13px] tabular-nums text-ink">
                    {shortPubkey(s.key)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    {rowStateLabel(s)}
                  </span>
                  {s.authorized && countdown ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                      {t('portal.workspace.agentAccess.row.expiresIn')}{' '}
                      <span className="text-ink">{countdown}</span>
                    </span>
                  ) : null}
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    {s.authorized ? (
                      <>
                        <button
                          type="button"
                          data-testid={`agent-access-config-${s.key.slice(0, 8)}`}
                          onClick={() =>
                            setExpandedConfigKey(
                              configExpanded ? null : s.key,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink"
                        >
                          {configExpanded
                            ? t('portal.workspace.agentAccess.row.hideConfig')
                            : t('portal.workspace.agentAccess.row.showConfig')}
                        </button>
                        <button
                          type="button"
                          data-testid={`agent-access-revoke-${s.key.slice(0, 8)}`}
                          onClick={() => void actions.revokeAgentSessionByo(s.key)}
                          disabled={anyLoading}
                          className="inline-flex items-center gap-2 rounded-full border border-coral/40 bg-coral/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-coral transition-colors hover:bg-coral/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {revokeBusy ? <Spinner size={10} /> : null}
                          {t('portal.workspace.agentAccess.row.revoke')}
                        </button>
                      </>
                    ) : null}
                  </span>
                </div>

                {configExpanded && s.authorized ? (
                  <div className="mt-4 space-y-4 rounded-md border border-line bg-surface/30 p-4">
                    <p className="font-sans text-xs leading-relaxed text-sunset">
                      {t('portal.workspace.agentAccess.config.warning')}
                    </p>

                    {(
                      [
                        {
                          id: `${s.key}-polet`,
                          label: t('portal.workspace.agentAccess.config.polet'),
                          content: buildPoletAgentJson(s.key),
                        },
                        {
                          id: `${s.key}-mcp`,
                          label: t('portal.workspace.agentAccess.config.mcp'),
                          content: buildMcpConfigJson(s.key),
                        },
                        {
                          id: `${s.key}-hermes`,
                          label: t('portal.workspace.agentAccess.config.hermes'),
                          content: buildHermesCommands(s.key),
                        },
                      ] as const
                    ).map((block) => (
                      <div key={block.id}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                            {block.label}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyText(block.content, block.id)}
                            className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:text-lagoon"
                          >
                            {copiedId === block.id
                              ? t('portal.workspace.agentAccess.config.copied')
                              : t('portal.workspace.agentAccess.config.copy')}
                          </button>
                        </div>
                        <pre className="overflow-x-auto rounded border border-line bg-surface/60 p-3 font-mono text-[11px] leading-relaxed text-ink">
                          {block.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
