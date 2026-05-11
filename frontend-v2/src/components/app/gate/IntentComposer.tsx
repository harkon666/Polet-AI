import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import type { Scenario, Rail } from './gate-state'
import { amountForScenario } from './gate-state'

/**
 * IntentComposer, the wide hairline sentence at the top of the Gate
 * page: "Run [N USDC] through [Jupiter | Ika · Sui]".
 *
 * IMPORTANT — the amount slot is **display-only**, NOT an `<input>`.
 * Phase 3 issue 101 decision A: scenarios drive the visible number
 * (`allow-jupiter` → 5, `block-25` → 25, `ika` → 5). Backend actions
 * (`runJupiterAllow`, `runJupiterBlock`, …) are hardcoded 5/25, so a
 * real free-form input would lie to the operator. Switching scenarios
 * via `<ScenarioRow>` is the only way to change the visible amount.
 *
 * The rail slot is a real `<select>` so keyboard users can flip between
 * Jupiter and Ika directly. Switching the rail upstream nudges the
 * active scenario to keep amount + rail consistent (handled by the
 * parent route).
 */
const RAIL_LABEL_KEY: Record<Rail, TranslationKey> = {
  jupiter: 'portal.gate.rail.jupiter',
  ika: 'portal.gate.rail.ika',
}

export function IntentComposer({
  rail,
  scenario,
  onRailChange,
}: {
  rail: Rail
  scenario: Scenario
  onRailChange: (rail: Rail) => void
}) {
  const { t } = useLocale()
  const amount = amountForScenario(scenario)

  return (
    <div
      data-testid="intent-composer"
      className="mt-10 flex flex-wrap items-end gap-x-4 gap-y-3 text-3xl leading-[1.05] tracking-[-0.05em] md:text-4xl lg:text-5xl"
    >
      <span className="text-ink-soft">{t('portal.gate.composer.run')}</span>

      {/* Amount slot — display-only static text, no <input>. */}
      <span
        data-testid="composer-amount-slot"
        data-amount={amount}
        className="inline-flex items-baseline gap-2 border-b border-line-strong px-1.5 pb-1 text-ink"
      >
        <span data-testid="composer-amount-value">{amount}</span>
        <span className="font-mono text-base uppercase tracking-[0.22em] text-lagoon-bright md:text-lg">
          {t('portal.gate.composer.unit')}
        </span>
      </span>

      <span className="text-ink-soft">{t('portal.gate.composer.through')}</span>

      {/* Rail slot — real <select> for keyboard users. */}
      <span className="inline-flex items-center border-b border-line-strong px-1.5 pb-1 text-ink focus-within:border-lagoon-bright">
        <select
          data-testid="composer-rail-select"
          value={rail}
          onChange={(e) => onRailChange(e.target.value as Rail)}
          aria-label={t('portal.gate.composer.through')}
          className="appearance-none bg-transparent pr-6 font-sans text-3xl tracking-[-0.05em] text-ink outline-none md:text-4xl lg:text-5xl"
        >
          <option value="jupiter">{t(RAIL_LABEL_KEY.jupiter)}</option>
          <option value="ika">{t(RAIL_LABEL_KEY.ika)}</option>
        </select>
      </span>
    </div>
  )
}
