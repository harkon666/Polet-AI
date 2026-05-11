import type { TranslationKey } from '#/locale/dictionary'
import { useLocale } from '#/hooks/use-locale'
import type { Scenario, Rail } from './gate-state'

/**
 * ScenarioRow, three preset chips that set the amount + rail in the
 * composer.
 *
 * Post-issue-101 redesign: chips no longer drive a scenario state —
 * they just nudge the composer amount + rail so operators can jump
 * to a canonical demo value (5, 25) with one click while still being
 * free to edit the amount input afterwards.
 *
 *   - `allow-jupiter` → amount 5, rail jupiter (the green-path demo)
 *   - `block-25`      → amount 25 (the policy-rejection demo)
 *   - `ika`           → amount 5, rail ika (the cross-chain demo)
 *
 * The chip visually tracks `active` so operators see which preset
 * matches current state, but editing the amount input manually will
 * clear the highlight when the amount no longer matches any preset.
 */
const SCENARIOS: Array<{
  id: Scenario
  labelKey: TranslationKey
  amount: string
  rail: Rail | null
}> = [
  {
    id: 'allow-jupiter',
    labelKey: 'portal.gate.scenario.allowJupiter',
    amount: '5',
    rail: 'jupiter',
  },
  {
    id: 'block-25',
    labelKey: 'portal.gate.scenario.block25',
    amount: '25',
    rail: null,
  },
  {
    id: 'ika',
    labelKey: 'portal.gate.scenario.ikaSui',
    amount: '5',
    rail: 'ika',
  },
]

export function ScenarioRow({
  active,
  onPresetSelect,
}: {
  active: Scenario | null
  onPresetSelect: (preset: { amount: string; rail: Rail | null }) => void
}) {
  const { t } = useLocale()
  return (
    <div
      data-testid="scenario-row"
      className="mt-6 flex flex-wrap gap-2"
      role="radiogroup"
      aria-label={t('portal.gate.kicker')}
    >
      {SCENARIOS.map(({ id, labelKey, amount, rail }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={`scenario-pill-${id}`}
            data-active={isActive}
            onClick={() => onPresetSelect({ amount, rail })}
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
