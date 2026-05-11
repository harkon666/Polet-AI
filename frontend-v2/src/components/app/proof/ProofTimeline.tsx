import { useState } from 'react'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import {
  useConsole,
  type ReceiptEntry,
  type ReceiptStatus,
} from '../use-console-actions'
import { JupiterProofPanel } from './JupiterProofPanel'
import { IkaProofPanel } from './IkaProofPanel'
import { explorerTxUrl, formatProofClock } from './proof-format'

/**
 * ProofTimeline, the calm typographic feed of every receipt the
 * operator has produced.
 *
 * Reads `state.receipts` (chronological-reverse) and renders one row
 * per entry:
 *
 *   HH:MM:SS · TITLE · TAG
 *              Description.
 *              π_constraint refs (if applicable)
 *              [chevron] expanded → JupiterProofPanel / IkaProofPanel
 *              ↗ Solana Explorer (when signature present)
 *
 * Each row is hairline-divided. No card frame, no boxes — type and
 * whitespace carry the rhythm. Receipts with `entry.jupiterProof` or
 * `entry.ikaProof` get an expand chevron that reveals the panel.
 *
 * Empty state: a single line nudging the operator to preview the
 * gate. The Phase 1 receipt log used a "gate-awake" pulse here; the
 * timeline keeps the look quieter so the page reads as a log, not a
 * dashboard.
 */

const STATUS_TAG_CLASS: Record<ReceiptStatus, string> = {
  info: 'border-lagoon-bright/40 bg-lagoon-bright/10 text-lagoon-bright',
  allowed: 'border-palm/40 bg-palm/10 text-palm',
  blocked: 'border-coral/40 bg-coral/10 text-coral',
  pending: 'border-line bg-surface/40 text-ink-mute',
  error: 'border-coral/40 bg-coral/10 text-coral',
}

const STATUS_TAG_LABEL: Record<ReceiptStatus, TranslationKey> = {
  info: 'portal.proof.tag.info',
  allowed: 'portal.proof.tag.allowed',
  blocked: 'portal.proof.tag.blocked',
  pending: 'portal.proof.tag.pending',
  error: 'portal.proof.tag.error',
}

type ConstraintKey = 'numericLimit' | 'scopeMatch' | 'sessionActive'

const CONSTRAINT_TOOLTIP_KEY: Record<ConstraintKey, TranslationKey> = {
  numericLimit: 'app.constraint.numericLimit.tooltip',
  scopeMatch: 'app.constraint.scopeMatch.tooltip',
  sessionActive: 'app.constraint.sessionActive.tooltip',
}

const CONSTRAINT_SHORT_KEY: Record<ConstraintKey, TranslationKey> = {
  numericLimit: 'app.constraint.numericLimit.short',
  scopeMatch: 'app.constraint.scopeMatch.short',
  sessionActive: 'app.constraint.sessionActive.short',
}

const CONSTRAINT_NAME: Record<ConstraintKey, string> = {
  numericLimit: 'pi_numeric_limit',
  scopeMatch: 'pi_scope_match',
  sessionActive: 'pi_session_active',
}

function constraintIconClass(check: 'pass' | 'fail' | 'unknown'): string {
  if (check === 'pass') return 'text-palm'
  if (check === 'fail') return 'text-coral'
  return 'text-ink-mute'
}

function constraintIcon(check: 'pass' | 'fail' | 'unknown'): string {
  if (check === 'pass') return '✓'
  if (check === 'fail') return '✗'
  return '·'
}

export function ProofTimeline() {
  const { t } = useLocale()
  const { state } = useConsole()
  const { receipts } = state

  if (receipts.length === 0) {
    return (
      <div
        data-testid="proof-timeline-empty"
        className="mt-10 border-t border-line pt-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.proof.timeline.empty.title')}
        </p>
        <p className="mt-2 font-sans text-sm text-ink-soft">
          {t('portal.proof.timeline.empty.body')}
        </p>
      </div>
    )
  }

  return (
    <ul
      data-testid="proof-timeline"
      className="mt-8 grid"
      aria-label={t('portal.proof.kicker')}
    >
      {receipts.map((entry) => (
        <ProofTimelineRow key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

function ProofTimelineRow({ entry }: { entry: ReceiptEntry }) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)

  const refs = entry.constraintRefs
  const refTags: Array<{
    name: string
    check: 'pass' | 'fail' | 'unknown'
    tooltipKey: TranslationKey
    shortKey: TranslationKey
  }> = []
  if (refs) {
    const order: ConstraintKey[] = [
      'numericLimit',
      'scopeMatch',
      'sessionActive',
    ]
    for (const key of order) {
      const check = refs[key]
      if (check) {
        refTags.push({
          name: CONSTRAINT_NAME[key],
          check,
          tooltipKey: CONSTRAINT_TOOLTIP_KEY[key],
          shortKey: CONSTRAINT_SHORT_KEY[key],
        })
      }
    }
  }

  const hasProof = Boolean(entry.jupiterProof || entry.ikaProof)

  return (
    <li
      data-testid={`proof-row-${entry.id}`}
      data-status={entry.status}
      className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 last:border-b-0"
    >
      <span
        data-testid="proof-row-clock"
        className="font-mono text-xs tabular-nums text-ink-mute"
      >
        {formatProofClock(entry.timestamp)}
      </span>

      <div className="min-w-0">
        <p className="font-mono text-sm uppercase tracking-[0.16em] text-ink truncate">
          {entry.action}
        </p>
        {entry.description ? (
          <p className="mt-1 text-sm text-ink-soft leading-relaxed">
            {entry.description}
          </p>
        ) : null}
        {entry.body ? (
          <p className="mt-1 text-xs text-ink-mute leading-relaxed">
            {entry.body}
          </p>
        ) : null}
        {refTags.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5 font-mono text-[11px]">
            {refTags.map((ref) => (
              <li
                key={ref.name}
                title={t(ref.tooltipKey)}
                className="flex items-baseline gap-2"
              >
                <span
                  aria-hidden="true"
                  className={`${constraintIconClass(ref.check)} shrink-0 w-3 text-center`}
                >
                  {constraintIcon(ref.check)}
                </span>
                <span
                  className={`${constraintIconClass(ref.check)} shrink-0 tabular-nums`}
                >
                  {ref.name}
                </span>
                <span className="text-ink-mute leading-relaxed">
                  {t(ref.shortKey)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {hasProof ? (
          <button
            type="button"
            data-testid={`proof-row-toggle-${entry.id}`}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:text-lagoon"
          >
            <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
            {expanded
              ? t('portal.proof.row.collapse')
              : t('portal.proof.row.expand')}
          </button>
        ) : null}

        {hasProof && expanded ? (
          <>
            {entry.jupiterProof ? (
              <JupiterProofPanel proof={entry.jupiterProof} />
            ) : null}
            {entry.ikaProof ? <IkaProofPanel proof={entry.ikaProof} /> : null}
          </>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span
          data-testid="proof-row-tag"
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] ${STATUS_TAG_CLASS[entry.status]}`}
        >
          {t(STATUS_TAG_LABEL[entry.status])}
        </span>
        {entry.signature ? (
          <a
            data-testid="proof-row-explorer"
            href={explorerTxUrl(entry.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tabular-nums text-ink-mute hover:text-lagoon-bright transition"
            aria-label={t('portal.proof.row.explorer')}
          >
            {entry.signature.slice(0, 6)}…{entry.signature.slice(-4)}{' '}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </li>
  )
}
