import { createFileRoute } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import { useConsole } from '../components/app/use-console-actions'
import { ProofTimeline } from '../components/app/proof/ProofTimeline'

/**
 * /app/proof — Polet Portal Proof Trail page.
 *
 * Calm typographic timeline of every receipt the operator has
 * produced (chronological-reverse). Each row reads as one log line —
 * timestamp, action title, description, status tag, optional
 * expandable proof panel.
 *
 * No card walls, no boxes — hairline dividers between rows.
 *
 * Proof panels (`<JupiterProofPanel>` / `<IkaProofPanel>`) are now
 * extracted from the legacy `<ReceiptLog>` and live under
 * `components/app/proof/`. They're consumed here and (optionally) by
 * the Policy Gate page's rail-output node.
 */
export const Route = createFileRoute('/app/proof')({
  component: AppProofPage,
})

export function AppProofPage() {
  const { t } = useLocale()
  const { state } = useConsole()
  const count = state.receipts.length
  const pillKey =
    count === 0
      ? 'portal.proof.pill.empty'
      : count === 1
        ? 'portal.proof.pill.singular'
        : 'portal.proof.pill.plural'
  return (
    <section data-testid="proof-page">
      <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.proof.kicker')}
          </p>
          <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
            {t('portal.proof.title')}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
            {t('portal.proof.sub')}
          </p>
        </div>
        <span
          data-testid="proof-receipts-pill"
          data-count={count}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft"
        >
          {count > 0 ? (
            <span className="font-mono tabular-nums text-ink">{count}</span>
          ) : null}
          {t(pillKey)}
        </span>
      </header>
      <ProofTimeline />
    </section>
  )
}
