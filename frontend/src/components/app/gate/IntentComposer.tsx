import { useLocale } from '#/hooks/use-locale'
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
 * The rail slot is a segmented radiogroup so keyboard/screen-reader users can
 * flip between Jupiter and Ika directly. Switching the rail upstream nudges the
 * active scenario to keep amount + rail consistent (handled by the parent
 * route).
 */
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
    <section
      data-testid="intent-composer"
      className="mt-10 rounded-2xl border border-line bg-surface/25 p-4 md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.gate.composer.run')}
          </p>

          {/* Amount slot — display-only static text, no <input>. */}
          <div
            data-testid="composer-amount-slot"
            data-amount={amount}
            className="mt-3 inline-flex items-end gap-3"
          >
            <span
              data-testid="composer-amount-value"
              className="font-sans text-5xl font-bold leading-none tracking-[-0.06em] text-ink md:text-6xl"
            >
              {amount}
            </span>
            <span className="mb-1 rounded-full border border-lagoon-bright/30 bg-lagoon-bright/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
              {t('portal.gate.composer.unit')}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 md:min-w-[18rem] md:items-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {t('portal.gate.composer.through')}
          </p>

          <div
            data-testid="composer-rail-control"
            role="radiogroup"
            aria-label={t('portal.gate.composer.through')}
            className="grid w-full grid-cols-2 gap-2 rounded-full border border-line bg-bg-deep/45 p-1 md:w-auto md:min-w-[18rem]"
          >
            <RailButton
              rail="jupiter"
              active={rail === 'jupiter'}
              label={t('portal.gate.rail.jupiter')}
              sublabel={t('portal.gate.flow.node1.route.jupiter')}
              onSelect={onRailChange}
            />
            <RailButton
              rail="ika"
              active={rail === 'ika'}
              label={t('portal.gate.rail.ika')}
              sublabel={t('portal.gate.flow.node1.route.ika')}
              onSelect={onRailChange}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function RailButton({
  rail,
  active,
  label,
  sublabel,
  onSelect,
}: {
  rail: Rail
  active: boolean
  label: string
  sublabel: string
  onSelect: (rail: Rail) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-testid={`composer-rail-${rail}`}
      data-active={active}
      onClick={() => onSelect(rail)}
      className={
        active
          ? 'inline-flex items-center justify-between gap-3 rounded-full border border-lagoon-bright/40 bg-lagoon-bright/15 px-4 py-2.5 text-left text-ink shadow-[0_0_24px_rgba(61,232,201,0.08)] transition'
          : 'inline-flex items-center justify-between gap-3 rounded-full border border-transparent px-4 py-2.5 text-left text-ink-soft transition hover:border-line hover:bg-surface/40 hover:text-ink'
      }
    >
      <span className="font-sans text-sm font-semibold leading-none tracking-[-0.02em]">
        {label}
      </span>
      <span
        className={
          active
            ? 'font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright'
            : 'font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute'
        }
      >
        {sublabel}
      </span>
    </button>
  )
}
