import type { TranslationKey } from '#/locale/dictionary'
import { useLocale } from '#/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'
import type { ActionKey } from '../use-console-actions'
import {
  getActiveIkaChain,
  hasActiveSession,
} from '../selectors/console-selectors'
import { getCustodyBalances } from './funds-selectors'

/**
 * QuickActions, the underline-style action row beneath `<FundsList>`.
 *
 * Four buttons fire the existing `useConsole().actions.*` handlers
 * with the same fixed amounts the legacy `<CustodyFundsStrip>` and
 * `<ChainStatusStrip>` already use (5 USDC deposit/1 USDC withdraw,
 * 0.05 SOL agent gas fund, Sui chain enable). No free-form inputs
 * here — keep parity with the policy gate decision (display-only
 * amounts when wired to hardcoded backend calls).
 *
 * Preconditions per button (mirror legacy rules):
 *   - Deposit:  custody must be registered (`demoCustody.configured`).
 *   - Withdraw: custody must be registered AND positive USDC balance.
 *   - Fund gas: an active session must exist.
 *   - Enable chain: action available when not yet registered. Once
 *     Sui is active the button greys out.
 *
 * All four are disabled while any console action is in flight.
 */
type Variant = 'deposit' | 'withdraw' | 'fund-gas' | 'enable-chain'

const LABEL_KEY: Record<Variant, TranslationKey> = {
  deposit: 'portal.funds.actions.deposit',
  withdraw: 'portal.funds.actions.withdraw',
  'fund-gas': 'portal.funds.actions.fundGas',
  'enable-chain': 'portal.funds.actions.enableChain',
}

const LOADING_KEY: Record<Variant, ActionKey> = {
  deposit: 'custody-deposit-usdc',
  withdraw: 'custody-withdraw-usdc',
  'fund-gas': 'fund-gas',
  'enable-chain': 'ika-enable-sui',
}

export function QuickActions() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const balances = getCustodyBalances(state)
  const anyLoading = state.loading !== null
  const custodyRegistered = Boolean(state.data?.demoCustody?.configured)
  const sessionActive = hasActiveSession(state)
  const ikaChain = getActiveIkaChain(state)

  const deposit = {
    disabled: !custodyRegistered || anyLoading,
    onClick: () => void actions.depositCustody('USDC', '5'),
    loading: state.loading === LOADING_KEY.deposit,
  }
  const withdraw = {
    disabled: !custodyRegistered || !balances.hasUsdc || anyLoading,
    onClick: () => void actions.withdrawCustody('USDC', '1'),
    loading: state.loading === LOADING_KEY.withdraw,
  }
  const fundGas = {
    disabled: !sessionActive || anyLoading,
    onClick: () => void actions.fundAgentGas('0.05'),
    loading: state.loading === LOADING_KEY['fund-gas'],
  }
  const enableChain = {
    disabled: ikaChain !== null || anyLoading,
    onClick: () => void actions.enableIkaChain('sui'),
    loading: state.loading === LOADING_KEY['enable-chain'],
  }

  const variants: Array<{
    id: Variant
    cfg: typeof deposit
  }> = [
    { id: 'deposit', cfg: deposit },
    { id: 'withdraw', cfg: withdraw },
    { id: 'fund-gas', cfg: fundGas },
    { id: 'enable-chain', cfg: enableChain },
  ]

  return (
    <div
      data-testid="funds-quick-actions"
      className="mt-6 flex flex-wrap gap-2 border-t border-line pt-6"
    >
      {variants.map(({ id, cfg }) => (
        <button
          key={id}
          type="button"
          data-testid={`funds-action-${id}`}
          onClick={cfg.onClick}
          disabled={cfg.disabled}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          {cfg.loading ? <Spinner size={11} /> : null}
          {t(LABEL_KEY[id])}
        </button>
      ))}
    </div>
  )
}
