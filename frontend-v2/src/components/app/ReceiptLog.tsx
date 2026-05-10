import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import {
  useConsole,
  type ReceiptEntry,
  type ReceiptStatus,
} from './use-console-actions'

/**
 * ReceiptLog, append-only feed of every action the operator runs.
 *
 * Reads from the console state context. Each receipt is one row:
 *
 *   HH:MM:SS   ACTION TITLE          [status badge]
 *              Description line.
 *              π_constraint refs (if applicable)
 *              ↗ Solana Explorer (if signature present)
 *
 * Constraints follow the landing's DemoWidget vocabulary:
 *   pi_numeric_limit · pi_scope_match · pi_session_active
 *
 * The receipt log NEVER displays witness bytes, private thresholds,
 * or raw policy values (US42 in `docs/prd.md`). Action titles +
 * descriptions are derived in `useConsole()` so that contract is
 * enforced upstream.
 *
 * Day 11 ships local-only state — the feed clears on page reload.
 * Day 12+ may persist to localStorage if the Receipts panel grows
 * a "session history" affordance.
 */

const STATUS_BADGE_CLASSES: Record<ReceiptStatus, string> = {
  info:    'inline-flex items-center rounded-full border border-lagoon-bright/40 bg-lagoon-bright/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright',
  allowed: 'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  blocked: 'inline-flex items-center rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-coral',
  pending: 'inline-flex items-center rounded-full border border-line bg-surface/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute',
  error:   'inline-flex items-center rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-coral',
}

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  info:    'INFO',
  allowed: 'ALLOWED',
  blocked: 'BLOCKED',
  pending: 'PENDING',
  error:   'ERROR',
}

const formatTime = (epochMs: number) => {
  const d = new Date(epochMs)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const explorerUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`

export function ReceiptLog() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const { state } = useConsole()
  const { receipts } = state

  return (
    <section
      ref={containerRef}
      aria-label="Polet receipt log"
      className="border-b border-line bg-bg-base py-8 md:py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('app.log.kicker')}
          </KickerLabel>
          <p
            className="pl-reveal font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
            style={{ transitionDelay: '80ms' }}
          >
            {t('app.log.tagline')}
          </p>
        </div>

        <div
          className="pl-reveal mt-6 md:mt-8 rounded-2xl border border-line bg-bg-deep overflow-hidden"
          style={{ transitionDelay: '160ms' }}
        >
          {receipts.length === 0 ? (
            <p className="px-6 py-10 text-center font-mono text-xs uppercase tracking-[0.22em] text-ink-mute">
              {t('app.log.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {receipts.map((entry, i) => (
                <ReceiptRow key={entry.id} entry={entry} index={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function ReceiptRow({ entry, index }: { entry: ReceiptEntry; index: number }) {
  const refs = entry.constraintRefs
  const refTags = refs
    ? [
        refs.numericLimit && { name: 'pi_numeric_limit', check: refs.numericLimit },
        refs.scopeMatch && { name: 'pi_scope_match', check: refs.scopeMatch },
        refs.sessionActive && { name: 'pi_session_active', check: refs.sessionActive },
      ].filter(Boolean) as Array<{ name: string; check: 'pass' | 'fail' | 'unknown' }>
    : []

  return (
    <li
      className="pl-reveal px-6 py-4 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 items-baseline"
      style={{ transitionDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* Timestamp */}
      <span className="font-mono text-xs text-ink-mute tabular-nums">
        {formatTime(entry.timestamp)}
      </span>

      {/* Action title + description */}
      <div className="min-w-0">
        <p className="font-mono text-sm uppercase tracking-[0.16em] text-ink truncate">
          {entry.action}
        </p>
        <p className="mt-1 text-sm text-ink-soft leading-relaxed">
          {entry.description}
        </p>
        {entry.body ? (
          <p className="mt-1 text-xs text-ink-mute leading-relaxed">
            {entry.body}
          </p>
        ) : null}
        {refTags.length > 0 ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-mute">
            {refTags.map((ref) => (
              <span
                key={ref.name}
                className={
                  ref.check === 'pass'
                    ? 'text-palm'
                    : ref.check === 'fail'
                      ? 'text-coral'
                      : 'text-ink-mute'
                }
              >
                {ref.name}{' '}
                <span aria-hidden="true">
                  {ref.check === 'pass' ? '✓' : ref.check === 'fail' ? '✗' : '·'}
                </span>
              </span>
            ))}
          </p>
        ) : null}
      </div>

      {/* Status badge + explorer arrow */}
      <div className="flex flex-col items-end gap-1.5">
        <span className={STATUS_BADGE_CLASSES[entry.status]}>
          {STATUS_LABEL[entry.status]}
        </span>
        {entry.signature ? (
          <a
            href={explorerUrl(entry.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-ink-mute hover:text-lagoon-bright transition tabular-nums"
            aria-label="View transaction on Solana Explorer"
          >
            {entry.signature.slice(0, 6)}…{entry.signature.slice(-4)}{' '}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </li>
  )
}
