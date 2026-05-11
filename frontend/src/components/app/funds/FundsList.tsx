import { useLocale } from '#/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import {
  getAgentGasStatus,
  getCustodyBalances,
  getIkaDwalletStatus,
} from './funds-selectors'

/**
 * FundsList, the left column of the `/app/funds` page.
 *
 * Four list rows (no card frame, hairline dividers):
 *   - USDC custody balance
 *   - SOL custody balance
 *   - Agent gas (heuristic — palm when keypair + fund-gas receipt seen,
 *     sunset when session active but unfunded, mute when no session)
 *   - Ika dWallet status (Sui managed today; Ethereum row deferred)
 *
 * Values are right-aligned with `tabular-nums` so the column never
 * jitter when balances update. Glyph marks (`$`, `◎`, `⚡`, `↗`) on
 * the left echo the v3 mockup's list-mark style.
 */

function dotTone(status: 'done' | 'needs' | 'pending' | 'mute'): string {
  if (status === 'done') return 'bg-palm shadow-[0_0_8px_rgba(52,211,153,0.5)]'
  if (status === 'needs') return 'bg-sunset shadow-[0_0_8px_rgba(251,191,36,0.5)]'
  return 'bg-ink-mute/60'
}

function rowClass(): string {
  return 'flex items-center gap-4 border-b border-line py-4 last:border-b-0'
}

export function FundsList() {
  const { t } = useLocale()
  const { state } = useConsole()

  const custody = getCustodyBalances(state)
  const gasStatus = getAgentGasStatus(state)
  const ika = getIkaDwalletStatus(state)

  return (
    <ul
      data-testid="funds-list"
      className="grid"
      aria-label={t('portal.funds.list.label')}
    >
      <li className={rowClass()} data-testid="funds-row-usdc">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-lagoon-bright font-mono text-sm"
        >
          $
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink">
            {t('portal.funds.row.usdc.title')}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {t('portal.funds.row.usdc.sub')}
          </p>
        </div>
        <span className="font-mono text-base tabular-nums text-ink">
          {custody.usdc}
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            USDC
          </span>
        </span>
      </li>

      <li className={rowClass()} data-testid="funds-row-sol">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-lagoon-bright font-mono text-sm"
        >
          ◎
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink">
            {t('portal.funds.row.sol.title')}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {t('portal.funds.row.sol.sub')}
          </p>
        </div>
        <span className="font-mono text-base tabular-nums text-ink">
          {custody.sol}
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            SOL
          </span>
        </span>
      </li>

      <li className={rowClass()} data-testid="funds-row-gas">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-lagoon-bright font-mono text-sm"
        >
          ⚡
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink">
            {t('portal.funds.row.gas.title')}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {t('portal.funds.row.gas.sub')}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft"
          data-status={gasStatus}
        >
          <span
            className={`size-1.5 rounded-full ${dotTone(gasStatus)}`}
            aria-hidden="true"
          />
          {t(
            gasStatus === 'done'
              ? 'portal.funds.row.gas.value.done'
              : gasStatus === 'needs'
                ? 'portal.funds.row.gas.value.needs'
                : 'portal.funds.row.gas.value.pending',
          )}
        </span>
      </li>

      <li className={rowClass()} data-testid="funds-row-ika">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-lagoon-bright font-mono text-sm"
        >
          ↗
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink">
            {t('portal.funds.row.ika.title')}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute">
            {t('portal.funds.row.ika.sub')}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft"
          data-status={ika ? 'done' : 'pending'}
        >
          <span
            className={`size-1.5 rounded-full ${dotTone(ika ? 'done' : 'pending')}`}
            aria-hidden="true"
          />
          {ika ? ika.label : t('portal.funds.row.ika.value.pending')}
        </span>
      </li>
    </ul>
  )
}
