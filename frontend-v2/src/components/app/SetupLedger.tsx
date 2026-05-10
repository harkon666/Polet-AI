import { Fragment, useState } from 'react'
import bs58 from 'bs58'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Keypair } from '@solana/web3.js'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import { EncryptedField } from '../EncryptedField'
import { Spinner } from './Spinner'
import {
  useConsole,
  type ActionKey,
  type ConsoleData,
} from './use-console-actions'

/**
 * SetupLedger, the /app linear setup checklist.
 *
 * Four rows representing the prerequisites for running Polet's
 * confidential demo:
 *
 *   01 / WALLET   smart-wallet PDA initialization
 *   02 / CUSTODY  PDA-owned demo USDC + wSOL token accounts
 *   03 / POLICY   confidential numeric guardrails — RENDERS AS CIPHERTEXT
 *   04 / SESSION  agent session key (temporary signing authority)
 *
 * State-aware variants:
 *
 *   - DISCONNECTED → `<OnboardingWizard>`: hero card for step 01
 *     (Connect wallet) plus three ghosted "waiting for wallet" rows.
 *     The hero explains WHY (Polet stores limits as ciphertext) and
 *     points up to the header chrome (`↑ Connect to begin`). No
 *     duplicate body button.
 *
 *   - CONNECTED → `<LedgerTable>`: dense table where each row shows
 *     index + label + value + state badge + inline action button (when
 *     pending and prerequisites met). The POLICY row renders sealed
 *     values inside `<EncryptedField state="encrypted">`, the same
 *     component the landing Crypto-Blur Theater uses, so the redacted
 *     ciphertext glows with the lagoon-bright pulse.
 *
 * Day 11 wires action buttons to real proxy handlers via
 * `useConsole()`. Each click runs the linear path: prepare tx →
 * wallet signs → confirm on-chain → emit receipt → refresh state.
 */

type RowState = 'pending' | 'initialized' | 'registered' | 'sealed' | 'active'

type RowDef = {
  id: 'wallet' | 'custody' | 'policy' | 'session'
  labelKey: TranslationKey
  /** Action that advances the row from pending → done. */
  actionKey: ActionKey
  /** i18n key for the inline action button label. */
  actionLabelKey: TranslationKey
  /** i18n key shown while the action is in flight. */
  actionLoadingKey: TranslationKey
}

const ROWS: RowDef[] = [
  {
    id: 'wallet',
    labelKey: 'app.ledger.row.wallet',
    actionKey: 'wallet',
    actionLabelKey: 'app.action.initialize',
    actionLoadingKey: 'app.action.initialize.loading',
  },
  {
    id: 'custody',
    labelKey: 'app.ledger.row.custody',
    actionKey: 'custody',
    actionLabelKey: 'app.action.registerCustody',
    actionLoadingKey: 'app.action.registerCustody.loading',
  },
  {
    id: 'policy',
    labelKey: 'app.ledger.row.policy',
    actionKey: 'policy',
    actionLabelKey: 'app.action.savePolicy',
    actionLoadingKey: 'app.action.savePolicy.loading',
  },
  {
    id: 'session',
    labelKey: 'app.ledger.row.session',
    actionKey: 'session',
    actionLabelKey: 'app.action.grantSession',
    actionLoadingKey: 'app.action.grantSession.loading',
  },
]

const STATE_LABEL_KEY: Record<RowState, TranslationKey> = {
  pending:     'app.ledger.state.pending',
  initialized: 'app.ledger.state.initialized',
  registered:  'app.ledger.state.registered',
  sealed:      'app.ledger.state.sealed',
  active:      'app.ledger.state.active',
}

const STATE_BADGE_CLASSES: Record<RowState, string> = {
  pending:     'inline-flex items-center rounded-full border border-line bg-surface/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute',
  initialized: 'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  registered:  'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  sealed:      'inline-flex items-center rounded-full border border-lagoon-bright/40 bg-lagoon-bright/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright',
  active:      'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
}

/**
 * Derive a short visible hash from the on-chain policyCommitment so
 * the EncryptedField in the POLICY row visibly correlates with each
 * policy update. policyCommitment is a 32-byte number[] from
 * `getWalletData(owner).policyCommitment`. Take the first 6 bytes,
 * hex-encode, prepend `0x`, total 14 chars to match the Crypto-Blur
 * Theater fixture width.
 *
 * Falls back to a stable placeholder for tests + the brief moment
 * after wallet connect before the proxy returns the on-chain state.
 */
function derivePolicyHash(commitment: number[] | undefined): string {
  if (!commitment || commitment.length < 6) return '0x4Vk8c2ed7a1b'
  const hex = commitment
    .slice(0, 6)
    .map((b) => Math.max(0, Math.min(255, Math.trunc(b))).toString(16).padStart(2, '0'))
    .join('')
  return `0x${hex}`
}

const shortenPubkey = (s: string) =>
  s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s

const formatExpiry = (epochMs: number) => {
  const ms = epochMs - Date.now()
  if (ms <= 0) return 'expired'
  const h = ms / 3_600_000
  if (h < 24) return `exp ${Math.max(1, Math.floor(h))}h`
  return `exp ${Math.floor(h / 24)}d`
}

export function SetupLedger() {
  const { t } = useLocale()
  const { connected } = useWallet()
  const containerRef = useScrollReveal()

  return (
    <section
      ref={containerRef}
      aria-label="Polet setup ledger"
      className="border-b border-line bg-bg-base py-8 md:py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <KickerLabel tone="accent" className="pl-reveal">
          {t('app.ledger.kicker')}
        </KickerLabel>

        {connected ? <LedgerTable /> : <OnboardingWizard />}
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────
 * OnboardingWizard, the disconnected variant.
 *
 * One hero card for step 01 (Connect wallet) plus three disabled
 * "waiting for wallet" rows. The hero explains WHY ("Polet stores
 * your limits as ciphertext…") and points up to the header chrome,
 * which is where the actual `<WalletButton>` lives. We deliberately
 * do NOT render a second connect button here — the sticky header
 * is the single source of truth for the wallet control, and a
 * duplicate body button competes visually without adding a
 * different affordance. When the user connects, this whole variant
 * unmounts and `<LedgerTable>` takes over with hydrated state.
 * ────────────────────────────────────────────────────────────────── */
function OnboardingWizard() {
  const { t } = useLocale()

  return (
    <div className="mt-6 md:mt-8 space-y-3">
      {/* Step 01 hero */}
      <article
        className="pl-reveal rounded-2xl border border-lagoon-bright/30 bg-bg-deep p-6 md:p-8"
        style={{ transitionDelay: '80ms' }}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
            {`${t('app.wizard.step')} 1 ${t('app.wizard.of')} 4`}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            · {t('app.ledger.row.wallet').toUpperCase()}
          </span>
        </div>
        <h2 className="mt-2 font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
          {t('app.wizard.connect.title')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm md:text-base text-ink-soft leading-relaxed">
          {t('app.wizard.connect.body')}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
          <span aria-hidden="true" className="animate-pulse">↑</span>
          {t('app.wizard.connect.pointer')}
        </p>
      </article>

      {/* Steps 02-04, ghosted "waiting for wallet" */}
      <div className="rounded-2xl border border-line bg-bg-deep overflow-hidden divide-y divide-line/60 opacity-60">
        {ROWS.slice(1).map((row, i) => (
          <article
            key={row.id}
            className="pl-reveal flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-5"
            style={{ transitionDelay: `${160 + 80 * i}ms` }}
          >
            <div className="sm:w-44 shrink-0 flex items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                {String(i + 2).padStart(2, '0')}
              </span>
              <span className="font-sans text-base font-semibold text-ink-soft leading-tight">
                {t(row.labelKey)}
              </span>
            </div>
            <div className="flex-1 font-mono text-xs uppercase tracking-[0.22em] text-ink-mute">
              {t('app.wizard.disabled.waiting')}
            </div>
            <span className={STATE_BADGE_CLASSES.pending}>
              {t(STATE_LABEL_KEY.pending)}
            </span>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
 * LedgerTable, the connected variant.
 *
 * Reads on-chain state from `useConsole()` (single source of truth).
 * Each pending row shows an inline action button when its
 * prerequisites are met (linear gating: wallet → custody → policy →
 * session). Clicking dispatches the corresponding action through the
 * console hook, which handles tx prep + wallet sig + confirm + emit
 * receipt + refresh.
 * ────────────────────────────────────────────────────────────────── */
function LedgerTable() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const { data, loading, sessionKeypair, publicKey } = state

  const rowState = deriveRowStates(data)

  // Linear gating, only enable a row's CTA when prerequisites are met.
  const canAct: Record<RowDef['id'], boolean> = {
    wallet:  rowState.wallet === 'pending',
    custody: rowState.wallet === 'initialized' && rowState.custody === 'pending',
    policy:  rowState.custody === 'registered' && rowState.policy === 'pending',
    session: rowState.policy === 'sealed' && rowState.session === 'pending',
  }

  const dispatch: Record<RowDef['id'], () => void> = {
    wallet:  () => void actions.initializeWallet(),
    custody: () => void actions.registerCustody(),
    policy:  () => void actions.saveConfidentialPolicy(),
    session: () => void actions.grantAgentSession(),
  }

  return (
    <div className="mt-6 md:mt-8 rounded-2xl border border-line bg-bg-deep overflow-hidden divide-y divide-line/60">
      {ROWS.map((row, i) => {
        const state = rowState[row.id]
        const isLoading = loading === row.actionKey
        const showAction = canAct[row.id] || isLoading
        const labelKey = isLoading ? row.actionLoadingKey : row.actionLabelKey

        return (
          <Fragment key={row.id}>
            <article
              className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-5 hover:bg-surface/40 transition pl-reveal"
              style={{ transitionDelay: `${80 * (i + 1)}ms` }}
            >
              <div className="sm:w-44 shrink-0 flex items-baseline gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-sans text-base font-semibold text-ink leading-tight">
                  {t(row.labelKey)}
                </span>
              </div>

              <div className="flex-1 min-w-0 font-mono text-sm text-ink-soft">
                <RowValue row={row} state={state} data={data} />
              </div>

              <span className={STATE_BADGE_CLASSES[state]}>
                {t(STATE_LABEL_KEY[state])}
              </span>

              {showAction ? (
                <button
                  type="button"
                  onClick={dispatch[row.id]}
                  disabled={isLoading || loading !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-1.5 text-xs font-medium text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Spinner size={11} /> : null}
                  {t(labelKey)}
                  {!isLoading ? <span aria-hidden="true">→</span> : null}
                </button>
              ) : (
                <span aria-hidden="true" className="w-[1px] sm:w-24" />
              )}
            </article>
            {row.id === 'session' && state === 'active' && publicKey ? (
              sessionKeypair ? (
                <SessionKeypairAffordance
                  owner={publicKey.toBase58()}
                  sessionKeypair={sessionKeypair}
                />
              ) : (
                <SessionLostKeyStrip
                  onRegrant={() => void actions.regrantAgentSession()}
                  isRegranting={loading === 'regrant'}
                  disabled={loading !== null}
                />
              )
            ) : null}
          </Fragment>
        )
      })}
    </div>
  )
}

/**
 * SessionKeypairAffordance, exposes the BYO agent keypair for SDK use.
 *
 * Once `grantAgentSession()` mints + grants a fresh keypair (Day 11
 * behaviour), the agent secret lives in `useConsole()` state. Without
 * this affordance the operator can't extract it, which means they
 * can't run the SDK / MCP server / Hermes agent against the same
 * authorized session.
 *
 * Three actions:
 *   - Download `polet-agent.json` (matches v1 AgentOnboardingPanel format)
 *   - Copy public key
 *   - Copy secret base58 (with a brief reveal flow + Devnet warning)
 *
 * The keypair itself is generated client-side, so exposing the
 * secret here doesn't widen the trust boundary — anyone with React
 * DevTools could already extract it. Making it explicit is safer
 * than hiding it.
 */
function SessionKeypairAffordance({
  owner,
  sessionKeypair,
}: {
  owner: string
  sessionKeypair: Keypair
}) {
  const { t } = useLocale()
  const [copied, setCopied] = useState<'public' | 'secret' | null>(null)

  const publicKeyStr = sessionKeypair.publicKey.toBase58()
  const secretKeyBase58 = bs58.encode(sessionKeypair.secretKey)
  const proxyUrl =
    (typeof window !== 'undefined' &&
      (window as unknown as { __POLET_PROXY_URL__?: string })
        .__POLET_PROXY_URL__) ||
    'http://localhost:3001'
  const rpcUrl = 'https://api.devnet.solana.com'

  const handleDownload = () => {
    const payload = {
      POLET_OWNER: owner,
      POLET_SESSION_KEY: publicKeyStr,
      POLET_AGENT_KEYPAIR: secretKeyBase58,
      POLET_PROXY_URL: proxyUrl,
      POLET_RPC_URL: rpcUrl,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'polet-agent.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = async (kind: 'public' | 'secret', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard API blocked (insecure context / permissions); fall
      // back to a quiet no-op rather than throw at the operator.
    }
  }

  return (
    <div className="pl-reveal flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-3 bg-bg-base/40 border-t border-line/40">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral whitespace-nowrap">
        ⚠ {t('app.session.devnetWarning')}
      </span>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={() => handleCopy('public', publicKeyStr)}
          className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft hover:border-line-strong hover:text-ink transition"
        >
          {copied === 'public' ? t('app.session.copied') : t('app.session.copy.public')}
        </button>
        <button
          type="button"
          onClick={() => handleCopy('secret', secretKeyBase58)}
          className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft hover:border-line-strong hover:text-ink transition"
        >
          {copied === 'secret' ? t('app.session.copied') : t('app.session.copy.secret')}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition"
        >
          ↓ {t('app.session.download')}
        </button>
      </div>
    </div>
  )
}

/**
 * SessionLostKeyStrip, fallback affordance for stale session state.
 *
 * Appears below the SESSION row when an on-chain session is still
 * authorized but `useConsole().sessionKeypair` is null. The most common
 * cause is a page refresh AFTER the Day 11.5 polish landed but BEFORE
 * the sessionStorage persistence fix landed — the operator's session
 * was granted with the old code path, so no storage entry exists to
 * restore from.
 *
 * One CTA: "Re-grant for download →" calls
 * `actions.regrantAgentSession()` which revokes every authorized
 * session on-chain and then grants a freshly-minted client-side
 * keypair, populating the storage entry so future refreshes restore
 * cleanly via `SessionKeypairAffordance`.
 */
function SessionLostKeyStrip({
  onRegrant,
  isRegranting,
  disabled,
}: {
  onRegrant: () => void
  isRegranting: boolean
  disabled: boolean
}) {
  const { t } = useLocale()
  return (
    <div className="pl-reveal flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-3 bg-bg-base/40 border-t border-line/40">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {t('app.session.lostKeyNote')}
      </span>
      <div className="ml-auto">
        <button
          type="button"
          onClick={onRegrant}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegranting ? <Spinner size={11} /> : null}
          {isRegranting
            ? t('app.action.regrant.loading')
            : t('app.action.regrant')}
          {!isRegranting ? <span aria-hidden="true">→</span> : null}
        </button>
      </div>
    </div>
  )
}

/**
 * RowValue, render the value column for one ledger row.
 *
 * The POLICY row is special: when sealed, it renders `<EncryptedField>`
 * with phase="encrypted" so the value pulses lagoon-bright as ciphertext
 * (same component the landing DemoWidget uses).
 */
function RowValue({
  row,
  state,
  data,
}: {
  row: RowDef
  state: RowState
  data: ConsoleData | null
}) {
  if (state === 'pending') {
    return <span className="text-ink-mute">—</span>
  }

  if (row.id === 'wallet') {
    return <span>{shortenPubkey(String(data?.walletPda ?? ''))}</span>
  }

  if (row.id === 'custody') {
    return <span>USDC + wSOL</span>
  }

  if (row.id === 'policy') {
    // Real hash derived from on-chain policyCommitment (first 6 bytes
    // hex). Visibly correlates with each policy save so the operator
    // can see the ciphertext change between policy_seq updates.
    return (
      <EncryptedField
        value="•••••••••••••••"
        encryptedHash={derivePolicyHash(data?.policyCommitment)}
        state="encrypted"
        monoSize="sm"
      />
    )
  }

  if (row.id === 'session') {
    const sessions = data?.temporalKeys ?? data?.sessions ?? []
    const active = sessions.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
    )
    if (!active) return <span className="text-ink-mute">—</span>
    const sessionKey = String(active.key ?? '')
    const expiresAt = Number(active.expiresAt ?? 0) * 1000
    return (
      <span>
        {shortenPubkey(sessionKey)} · {formatExpiry(expiresAt)}
      </span>
    )
  }

  return <span className="text-ink-mute">—</span>
}

/**
 * deriveRowStates, map the loose `getWalletData` payload into our
 * row state machine. Same logic the StatStrip uses.
 *
 * Field shape (post issue-080 refactor — see proxy/src/lib/wallet-store.ts):
 *   - `walletPda`              top-level string
 *   - `demoCustody.configured` boolean (true when USDC + wSOL accounts registered)
 *   - `usdcDcaPolicy.enabled`  boolean (true when confidential policy saved)
 *   - `sessions`/`temporalKeys` array of { key, expiresAt, authorized, … }
 */
function deriveRowStates(
  data: ConsoleData | null,
): Record<RowDef['id'], RowState> {
  const wallet: RowState = data?.walletPda ? 'initialized' : 'pending'
  const custody: RowState =
    data?.demoCustody?.configured ? 'registered' : 'pending'
  const policy: RowState =
    data?.usdcDcaPolicy?.enabled ? 'sealed' : 'pending'
  const sessions = data?.temporalKeys ?? data?.sessions ?? []
  const hasActive = sessions.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) =>
      s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
  )
  const session: RowState = hasActive ? 'active' : 'pending'
  return { wallet, custody, policy, session }
}
