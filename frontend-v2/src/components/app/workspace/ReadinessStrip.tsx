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
 * The strip is a read-only summary — clicking a pill does nothing
 * here (the `<ContinueCTA>` owns navigation). Pills scroll
 * horizontally on narrow viewports instead of wrapping so the
 * canonical order stays legible on mobile.
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

/** Dot + text tone per readiness value — palm (done), coral (needs), mute (pending). */
function toneClass(value: ReadinessValue): string {
  if (value === 'done') return 'border-palm/40 bg-palm/10 text-palm'
  if (value === 'needs') return 'border-coral/40 bg-coral/10 text-coral'
  return 'border-line bg-surface/40 text-ink-mute'
}

function dotClass(value: ReadinessValue): string {
  if (value === 'done') return 'bg-palm shadow-[0_0_8px_rgba(74,222,128,0.5)]'
  if (value === 'needs') return 'bg-coral shadow-[0_0_8px_rgba(239,68,68,0.5)]'
  return 'bg-ink-mute/60'
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
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] ${toneClass(
            value,
          )}`}
        >
          <span className={`size-1.5 rounded-full ${dotClass(value)}`} aria-hidden="true" />
          <span className="text-ink">{t(LABEL_BY_SLOT[slot])}</span>
          <span aria-hidden="true" className="text-ink-mute">
            ·
          </span>
          <span>{t(STATE_LABEL[value])}</span>
        </span>
      ))}
    </div>
  )
}
