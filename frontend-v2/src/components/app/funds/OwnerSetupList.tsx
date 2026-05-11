import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'
import type { ActionKey } from '../use-console-actions'
import {
  deriveReadiness,
  hasActiveSession,
} from '../selectors/console-selectors'
import {
  getActiveSessionInfo,
  getOwnerAuthority,
} from './funds-selectors'

/**
 * OwnerSetupList, the right column of the `/app/funds` page.
 *
 * Five hairline-divided rows in canonical order:
 *   1. Smart-wallet PDA — initializeWallet
 *   2. Custody funds   — registerCustody (status reflects funded too)
 *   3. Confidential policy — saveConfidentialPolicy
 *   4. Agent session   — grantAgentSession (re-grant strip when keypair
 *                        was lost on refresh)
 *   5. Authority       — read-only "owner" today; future recovery work
 *                        introduces variants (issue 045).
 *
 * Each row: status dot · name + 1-line sub · right-side value. When
 * the row is `pending`, an inline action button surfaces; otherwise
 * the row shows the realized value (PDA short, custody summary,
 * policy seq, session pubkey + expiry, "owner").
 */

type Row = 'pda' | 'custody' | 'policy' | 'session' | 'authority'

const NAME_KEY: Record<Row, TranslationKey> = {
  pda: 'portal.funds.setup.pda.title',
  custody: 'portal.funds.setup.custody.title',
  policy: 'portal.funds.setup.policy.title',
  session: 'portal.funds.setup.session.title',
  authority: 'portal.funds.setup.authority.title',
}

const SUB_KEY: Record<Row, TranslationKey> = {
  pda: 'portal.funds.setup.pda.sub',
  custody: 'portal.funds.setup.custody.sub',
  policy: 'portal.funds.setup.policy.sub',
  session: 'portal.funds.setup.session.sub',
  authority: 'portal.funds.setup.authority.sub',
}

const ACTION_LABEL_KEY: Record<
  Exclude<Row, 'authority'>,
  TranslationKey
> = {
  pda: 'portal.funds.setup.pda.action',
  custody: 'portal.funds.setup.custody.action',
  policy: 'portal.funds.setup.policy.action',
  session: 'portal.funds.setup.session.action',
}

const ACTION_KEY_MAP: Record<Exclude<Row, 'authority'>, ActionKey> = {
  pda: 'wallet',
  custody: 'custody',
  policy: 'policy',
  session: 'session',
}

function shortenPubkey(s: string): string {
  return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s
}

function formatExpiry(epochMs: number): string {
  const ms = epochMs - Date.now()
  if (ms <= 0) return 'expired'
  const h = ms / 3_600_000
  if (h < 24) return `exp ${Math.max(1, Math.floor(h))}h`
  return `exp ${Math.floor(h / 24)}d`
}

function dotTone(value: 'done' | 'needs' | 'pending'): string {
  if (value === 'done')
    return 'bg-palm shadow-[0_0_8px_rgba(52,211,153,0.5)]'
  if (value === 'needs')
    return 'bg-sunset shadow-[0_0_8px_rgba(251,191,36,0.5)]'
  return 'bg-ink-mute/60'
}

function valueToneClass(value: 'done' | 'needs' | 'pending'): string {
  if (value === 'done') return 'text-ink'
  if (value === 'needs') return 'text-sunset'
  return 'text-ink-mute'
}

function rowClass(): string {
  return 'flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-4 last:border-b-0'
}

export function OwnerSetupList() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const readiness = deriveReadiness(state)
  const sessionActive = hasActiveSession(state)
  const anyLoading = state.loading !== null
  const session = getActiveSessionInfo(state)
  const authority = getOwnerAuthority(state)
  const walletPda = state.data?.walletPda
  const policySeq = Number(state.data?.policySeq ?? 0)
  const policySealed = Boolean(state.data?.usdcDcaPolicy?.enabled)
  const sessionKeypairLost = sessionActive && state.sessionKeypair === null

  const inlineActionHandler = (row: Exclude<Row, 'authority'>) => {
    if (row === 'pda') return () => void actions.initializeWallet()
    if (row === 'custody') return () => void actions.registerCustody()
    if (row === 'policy') return () => void actions.saveConfidentialPolicy()
    return () => void actions.grantAgentSession()
  }

  /** Render the right-side value or inline action button for each row. */
  const renderRowValue = (row: Row) => {
    const value =
      row === 'pda'
        ? readiness.wallet
        : row === 'custody'
          ? readiness.custody
          : row === 'policy'
            ? readiness.policy
            : row === 'session'
              ? readiness.session
              : 'done'

    if (row === 'authority') {
      return (
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink">
          {authority}
        </span>
      )
    }

    if (value !== 'done') {
      const handler = inlineActionHandler(row)
      const loading = state.loading === ACTION_KEY_MAP[row]
      return (
        <button
          type="button"
          data-testid={`setup-action-${row}`}
          onClick={handler}
          disabled={anyLoading}
          className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Spinner size={10} /> : null}
          {t(ACTION_LABEL_KEY[row])}
        </button>
      )
    }

    // done states — surface the realized value
    if (row === 'pda') {
      return (
        <span className="font-mono text-[11px] tabular-nums text-ink">
          {walletPda ? shortenPubkey(walletPda) : ''}
        </span>
      )
    }
    if (row === 'custody') {
      return (
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-palm">
          {t('portal.funds.setup.custody.value.funded')}
        </span>
      )
    }
    if (row === 'policy') {
      return (
        <span className="font-mono text-[11px] tabular-nums text-ink">
          {policySealed ? `sealed #${policySeq}` : ''}
        </span>
      )
    }
    if (row === 'session') {
      const pubkey = session?.pubkey ?? null
      const expiry = session
        ? formatExpiry(session.expiresAtMs)
        : ''
      return (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-ink">
            {pubkey ? shortenPubkey(pubkey) : ''}
            <span className="ml-2 text-ink-mute">{expiry}</span>
          </span>
          {sessionKeypairLost ? (
            <button
              type="button"
              data-testid="setup-action-regrant"
              onClick={() => void actions.regrantAgentSession()}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-sunset transition-colors hover:bg-sunset/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.loading === 'regrant' ? <Spinner size={10} /> : null}
              {t('portal.funds.setup.session.regrant')}
            </button>
          ) : null}
        </span>
      )
    }
    return null
  }

  const renderRow = (row: Row) => {
    const value =
      row === 'pda'
        ? readiness.wallet
        : row === 'custody'
          ? readiness.custody
          : row === 'policy'
            ? readiness.policy
            : row === 'session'
              ? readiness.session
              : 'done'
    return (
      <li
        key={row}
        data-testid={`setup-row-${row}`}
        data-state={value}
        className={rowClass()}
      >
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${dotTone(value)}`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`font-sans text-sm font-semibold ${valueToneClass(
              value,
            )}`}
          >
            {t(NAME_KEY[row])}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {t(SUB_KEY[row])}
          </p>
        </div>
        <div className="shrink-0">{renderRowValue(row)}</div>
      </li>
    )
  }

  return (
    <ul
      data-testid="owner-setup-list"
      className="grid"
      aria-label={t('portal.funds.setup.label')}
    >
      {(['pda', 'custody', 'policy', 'session', 'authority'] as Row[]).map(
        renderRow,
      )}
    </ul>
  )
}
