import { useLocale } from '#/hooks/use-locale'
import type { Rail } from './gate-state'

/**
 * IntentComposer, the wide hairline sentence at the top of the Gate
 * page: "Run [N USDC] through [Jupiter | Ika · Sui]".
 *
 * The amount slot is a **free-form number input** (post-issue-101 BYO
 * redesign). Scenario chips below act as presets that fill the input;
 * operators can freely type any amount so the policy gate can be
 * exercised against custom confidential caps (e.g. set cap = 1 USDC
 * and test 2 → blocked, test 0.5 → allowed).
 *
 * The rail slot remains a segmented radiogroup so keyboard/screen
 * readers can flip between Jupiter and Ika directly. Switching rails
 * does not clear the amount — operators usually want to compare the
 * same amount across rails.
 */
export function IntentComposer({
  rail,
  amountUsdc,
  onAmountChange,
  onRailChange,
}: {
  rail: Rail
  amountUsdc: string
  onAmountChange: (value: string) => void
  onRailChange: (rail: Rail) => void
}) {
  const { t } = useLocale()

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

          <div className="mt-3 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="composer-amount-input"
                className="sr-only"
              >
                {t('portal.gate.composer.amountLabel')}
              </label>
              <input
                id="composer-amount-input"
                data-testid="composer-amount-input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max="10000"
                value={amountUsdc}
                placeholder={t('portal.gate.composer.amountPlaceholder')}
                onChange={(e) => onAmountChange(e.target.value)}
                className="w-full bg-transparent font-sans text-5xl font-bold leading-none tracking-[-0.06em] text-ink outline-none placeholder:text-ink-mute/40 md:text-6xl"
              />
            </div>
            <span className="mb-1 shrink-0 rounded-full border border-lagoon-bright/30 bg-lagoon-bright/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
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
