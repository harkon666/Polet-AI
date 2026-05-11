import { createFileRoute } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import { FundsList } from '../components/app/funds/FundsList'
import { QuickActions } from '../components/app/funds/QuickActions'
import { OwnerSetupList } from '../components/app/funds/OwnerSetupList'

/**
 * /app/funds — Polet Portal Funds & Setup page.
 *
 * Two calm columns of list rows + a quick-actions row, no card walls.
 *
 *   Left column:  <FundsList>   — balances (USDC · SOL · gas · Ika)
 *                 <QuickActions> — Deposit · Withdraw · Fund gas ·
 *                                  Enable chain (fires existing
 *                                  useConsole() actions with the
 *                                  same hard-coded amounts the legacy
 *                                  CustodyFundsStrip / ChainStatusStrip
 *                                  already use).
 *   Right column: <OwnerSetupList> — 5 rows (PDA · custody · policy ·
 *                                  session · authority) with inline
 *                                  action buttons when a row is
 *                                  pending.
 *
 * Mobile (< md): the two columns stack vertically.
 *
 * Both columns read from the shared `console-selectors.ts` + the
 * Phase 4 helpers in `components/app/funds/funds-selectors.ts` so
 * status interpretation never drifts between sides.
 */
export const Route = createFileRoute('/app/funds')({
  component: AppFundsPage,
})

export function AppFundsPage() {
  const { t } = useLocale()
  return (
    <section data-testid="funds-page">
      <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.funds.kicker')}
          </p>
          <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
            {t('portal.funds.title')}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
            {t('portal.funds.sub')}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.funds.pill')}
        </span>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-12 md:mt-12 md:grid-cols-2 md:gap-14">
        <div data-testid="funds-column-left">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {t('portal.funds.column.fundsTitle')}
          </p>
          <FundsList />
          <QuickActions />
        </div>
        <div data-testid="funds-column-right">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {t('portal.funds.column.setupTitle')}
          </p>
          <OwnerSetupList />
        </div>
      </div>
    </section>
  )
}
