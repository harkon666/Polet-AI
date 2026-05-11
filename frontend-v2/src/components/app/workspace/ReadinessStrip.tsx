import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import type { ReadinessSlot, ReadinessValue } from '../selectors/console-selectors'
import { getReadinessPills } from '../selectors/console-selectors'

/**
 * ReadinessStrip, the 5-pill horizontal row below the WorkspaceHero.
 *
 * One pill per slot (wallet · custody · policy · session · gas).
 * Each pill renders:
 *   - a status dot tinted by the slot's readiness value, and
 *   - the localized slot label + state word ("ready", "needs funds",
 *     "pending").
 *
 * The pill chrome is intentionally uniform (neutral surface +
 * hairline border) so 5 pills in a row never feel like a rainbow.
 * Only the DOT carries the semantic color (palm if done, sunset if
 * needs attention, mute if not-yet-started), which matches the
 * established app language where `palm` = ready, `sunset` = attention,
 * and `coral` is reserved for destructive / error states
 * (see `SetupLedger.tsx`, `ChainStatusStrip.tsx`, `ReceiptLog.tsx`).
 *
 * Pills scroll horizontally on narrow viewports instead of wrapping
 * so the canonical order stays legible on mobile.
 */
const LABEL_BY_SLOT: Record<ReadinessSlot, TranslationKey> = {
  wallet: 'portal.readiness.label.wallet',
  custody: 'portal.readiness.label.custody',
  policy: 'portal.readiness.label.policy',
  session: 'portal.readiness.label.session',
  gas: 'portal.readiness.label.gas',
}

const STATE_LABEL: Record<ReadinessValue, TranslationKey> = {
  done: 'portal.readiness.state.done',
  needs: 'portal.readiness.state.needs',
  pending: 'portal.readiness.state.pending',
}

/**
 * Dot colour per readiness value. Only the dot is coloured — the
 * surrounding pill stays neutral so a row of 5 pills reads as one
 * scannable line, not a rainbow.
 */
function dotClass(value: ReadinessValue): string {
  if (value === 'done') return 'bg-palm shadow-[0_0_8px_rgba(52,211,153,0.45)]'
  if (value === 'needs') return 'bg-sunset shadow-[0_0_8px_rgba(251,191,36,0.45)]'
  return 'bg-ink-mute/60'
}

/**
 * State-word colour — subtle tonal hint only (not the bright dot
 * colour) so the row feels calm even when multiple states are
 * blocked. Done stays palm because a small green word reinforces the
 * "this is safe" signal without fighting the dot.
 */
function stateTextClass(value: ReadinessValue): string {
  if (value === 'done') return 'text-palm'
  if (value === 'needs') return 'text-sunset'
  return 'text-ink-mute'
}

export function ReadinessStrip() {
  const { t } = useLocale()
  const { state } = useConsole()
  const pills = getReadinessPills(state)

  return (
    <div
      className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      data-testid="readiness-strip"
    >
      {pills.map(({ slot, value }) => (
        <span
          key={slot}
          data-testid={`readiness-pill-${slot}`}
          data-state={value}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft"
        >
          <span className={`size-1.5 rounded-full ${dotClass(value)}`} aria-hidden="true" />
          <span className="text-ink">{t(LABEL_BY_SLOT[slot])}</span>
          <span aria-hidden="true" className="text-ink-mute/60">
            ·
          </span>
          <span className={stateTextClass(value)}>{t(STATE_LABEL[value])}</span>
        </span>
      ))}
    </div>
  )
}
