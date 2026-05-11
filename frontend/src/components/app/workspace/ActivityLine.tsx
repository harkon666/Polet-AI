import { Link } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import type { ReceiptEntry, ReceiptStatus } from '../use-console-actions'
import { latestReceipt } from '../selectors/console-selectors'

/**
 * ActivityLine, the single "latest receipt" row at the bottom of the
 * Workspace home.
 *
 * Intentionally one line — the Workspace is a launchpad, the proof
 * feed itself lives on `/app/proof`. Empty state shows a helpful
 * nudge; populated state shows a terminal-style log entry:
 *
 *   Latest · HH:MM:SS · <TAG> · <TITLE>                → Open Proof Trail
 *
 * The `<TAG>` tone is derived from `receipt.status` so operators
 * can scan the verdict at a glance (palm = allowed, coral = blocked
 * or error, lagoon-bright = info, sunset = pending).
 */
function tagClass(status: ReceiptStatus): string {
  if (status === 'allowed') return 'text-palm'
  if (status === 'blocked' || status === 'error') return 'text-coral'
  if (status === 'pending') return 'text-sunset'
  return 'text-lagoon-bright'
}

/**
 * Two-digit zero-padded time component.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * HH:MM:SS UTC from an epoch ms. Matches the terminal-style activity
 * format described in issue 100 — deterministic across locales and
 * cheap to render client-side without pulling a dep.
 */
function formatClock(ts: number): string {
  const d = new Date(ts)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(
    d.getUTCSeconds(),
  )}`
}

export function ActivityLine() {
  const { t } = useLocale()
  const { state } = useConsole()
  const entry: ReceiptEntry | null = latestReceipt(state)

  if (!entry) {
    return (
      <div
        data-testid="activity-line"
        data-state="empty"
        className="mt-10 flex flex-col gap-2 border-t border-line pt-6 md:flex-row md:items-baseline md:justify-between md:gap-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.workspace.activity.latest')}
        </p>
        <p className="font-mono text-sm text-ink-soft">
          <span className="text-ink-mute">—</span>
          <span className="mx-2 text-ink-mute">·</span>
          {t('portal.workspace.activity.empty')}
        </p>
      </div>
    )
  }

  return (
    <div
      data-testid="activity-line"
      data-state="present"
      className="mt-10 flex flex-col gap-3 border-t border-line pt-6 md:flex-row md:items-baseline md:justify-between md:gap-6"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.workspace.activity.latest')}
        </p>
        <p className="font-mono text-sm text-ink-soft">
          <span className="text-ink-mute">{formatClock(entry.timestamp)}</span>
          <span aria-hidden="true" className="mx-2 text-ink-mute">
            ·
          </span>
          <span
            data-testid="activity-tag"
            data-status={entry.status}
            className={`font-mono text-[11px] uppercase tracking-[0.18em] ${tagClass(entry.status)}`}
          >
            {entry.action}
          </span>
          {entry.description ? (
            <>
              <span aria-hidden="true" className="mx-2 text-ink-mute">
                ·
              </span>
              <span className="text-ink">{entry.description}</span>
            </>
          ) : null}
        </p>
      </div>
      <Link
        to="/app/proof"
        data-testid="activity-proof-link"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:text-lagoon"
      >
        {t('portal.workspace.activity.openProof')}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
