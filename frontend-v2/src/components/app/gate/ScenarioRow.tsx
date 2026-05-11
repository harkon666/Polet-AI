import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import type { Scenario } from './gate-state'

/**
 * ScenarioRow, three pill buttons that drive the composer state.
 *
 *   - `allow-jupiter` → amount 5, rail jupiter (the green-path demo)
 *   - `block-25`      → amount 25 (the policy-rejection demo,
 *                       rail stays at whatever the operator chose)
 *   - `ika`           → amount 5, rail ika (the cross-chain demo)
 *
 * Clicking a chip ONLY updates local composer state — it does NOT
 * fire a backend action (no auto-preview). The operator still has
 * to press "Preview gate" in `<ActionsBar>` to evaluate the intent.
 *
 * Visual style matches the landing's `.pl-scenario-pill` so the demo
 * surface feels continuous with the marketing page when an operator
 * jumps from landing → app.
 */
const SCENARIOS: Array<{ id: Scenario; labelKey: TranslationKey }> = [
  { id: 'allow-jupiter', labelKey: 'portal.gate.scenario.allowJupiter' },
  { id: 'block-25', labelKey: 'portal.gate.scenario.block25' },
  { id: 'ika', labelKey: 'portal.gate.scenario.ikaSui' },
]

export function ScenarioRow({
  active,
  onSelect,
}: {
  active: Scenario
  onSelect: (scenario: Scenario) => void
}) {
  const { t } = useLocale()
  return (
    <div
      data-testid="scenario-row"
      className="mt-6 flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={t('portal.gate.kicker')}
    >
      {SCENARIOS.map(({ id, labelKey }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={`scenario-pill-${id}`}
            data-active={isActive}
            onClick={() => onSelect(id)}
            className={
              isActive
                ? 'pl-scenario-pill inline-flex items-center rounded-full border border-line-strong bg-lagoon-bright/10 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink'
                : 'pl-scenario-pill inline-flex items-center rounded-full border border-line bg-surface/40 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft hover:border-line-strong hover:text-ink'
            }
          >
            {t(labelKey)}
          </button>
        )
      })}
    </div>
  )
}
