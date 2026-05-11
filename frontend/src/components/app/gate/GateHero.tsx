import type { TranslationKey } from '#/locale/dictionary'
import { useLocale } from '#/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import type { GatePillState } from '../selectors/console-selectors'
import { getGatePillState } from '../selectors/console-selectors'
import type { Rail } from './gate-state'

/**
 * GateHero, the Policy Gate page head — kicker + title + sub +
 * right-side live verdict pill driven by `getGatePillState(state, rail)`.
 *
 * Verdict pill states map to a (tone, label) pair:
 *   - `ready`      → mute + "READY TO PREVIEW"
 *   - `allowed`    → palm + "ALLOWED BY POLICY"
 *   - `blocked`    → coral + "BLOCKED BY POLICY"
 *   - `evaluating` → lagoon-bright + "EVALUATING"
 *
 * The pill always reflects the *currently selected* rail, not the
 * latest receipt across all rails — switching the composer rail
 * updates the pill immediately so the operator sees rail-scoped state.
 */
const STATUS_LABEL_KEY: Record<GatePillState, TranslationKey> = {
  ready: 'portal.gate.status.ready',
  allowed: 'portal.gate.status.allowed',
  blocked: 'portal.gate.status.blocked',
  evaluating: 'portal.gate.status.evaluating',
}

function pillToneClass(s: GatePillState): string {
  if (s === 'allowed') return 'border-palm/40 bg-palm/10 text-palm'
  if (s === 'blocked') return 'border-coral/40 bg-coral/10 text-coral'
  if (s === 'evaluating')
    return 'border-lagoon-bright/40 bg-lagoon-bright/10 text-lagoon-bright'
  return 'border-line bg-surface/40 text-ink-mute'
}

function dotClass(s: GatePillState): string {
  if (s === 'allowed') return 'bg-palm shadow-[0_0_8px_rgba(52,211,153,0.5)]'
  if (s === 'blocked') return 'bg-coral shadow-[0_0_8px_rgba(248,113,113,0.5)]'
  if (s === 'evaluating')
    return 'bg-lagoon-bright shadow-[0_0_8px_rgba(45,212,191,0.55)] animate-pulse'
  return 'bg-sunset shadow-[0_0_10px_rgba(251,191,36,0.55)]'
}

export function GateHero({ rail }: { rail: Rail }) {
  const { t } = useLocale()
  const { state } = useConsole()
  const pillState = getGatePillState(state, rail)

  return (
    <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.gate.kicker')}
        </p>
        <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
          {t('portal.gate.title')}
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
          {t('portal.gate.sub')}
        </p>
      </div>
      <span
        data-testid="gate-verdict-pill"
        data-state={pillState}
        className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] ${pillToneClass(pillState)}`}
      >
        <span
          className={`size-1.5 rounded-full ${dotClass(pillState)}`}
          aria-hidden="true"
        />
        {t(STATUS_LABEL_KEY[pillState])}
      </span>
    </header>
  )
}
