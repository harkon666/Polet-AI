import type { TranslationKey } from '#/locale/dictionary'
import { useLocale } from '#/hooks/use-locale'

/**
 * GateOrb, the centerpiece of the Policy Gate flow canvas.
 *
 * Pure visual primitive — receives a `verdict` prop and renders:
 *   - a circular conic + radial gradient surface,
 *   - two dashed orbit rings rotating at different rates,
 *   - a centered word: `READY`, `…` (evaluating), `ALLOW`, or `BLOCK`.
 *
 * Verdict tones:
 *   - `idle`  → teal (lagoon) — the default unblocked-but-untested state.
 *   - `evaluating` → teal, with a `…` glyph instead of a verdict word.
 *   - `allow` → palm (green) gradient + rings.
 *   - `block` → coral (red) gradient + rings.
 *
 * All motion (ring rotation) is disabled by the global
 * `@media (prefers-reduced-motion: reduce)` rule. The component itself
 * doesn't depend on any context — driver wiring lives in `<FlowCanvas>`.
 */
export type GateOrbVerdict = 'idle' | 'evaluating' | 'allow' | 'block'

const WORD_KEY: Record<GateOrbVerdict, TranslationKey> = {
  idle: 'portal.gate.orb.ready',
  evaluating: 'portal.gate.orb.evaluating',
  allow: 'portal.gate.orb.allow',
  block: 'portal.gate.orb.block',
}

/**
 * `data-verdict` value used by `.pl-gate-orb` to swap gradient tones.
 * `evaluating` falls back to the default (teal) palette since it's
 * conceptually still on the idle gradient — it just has a different
 * centered glyph.
 */
function dataVerdict(v: GateOrbVerdict): 'idle' | 'allow' | 'block' {
  if (v === 'allow') return 'allow'
  if (v === 'block') return 'block'
  return 'idle'
}

function wordToneClass(v: GateOrbVerdict): string {
  if (v === 'allow') return 'text-palm'
  if (v === 'block') return 'text-coral'
  return 'text-ink'
}

export function GateOrb({ verdict = 'idle' }: { verdict?: GateOrbVerdict }) {
  const { t } = useLocale()
  return (
    <div
      className="pl-gate-orb my-4 mx-auto"
      data-verdict={dataVerdict(verdict)}
      data-testid="gate-orb"
      role="img"
      aria-label={`Policy gate verdict: ${t(WORD_KEY[verdict])}`}
    >
      <div className="relative z-[1] grid place-items-center gap-1.5 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {t('portal.gate.orb.kicker')}
        </span>
        <span
          data-testid="gate-orb-word"
          data-verdict={verdict}
          className={`font-sans text-2xl font-extrabold leading-none tracking-[-0.04em] md:text-3xl ${wordToneClass(verdict)}`}
        >
          {t(WORD_KEY[verdict])}
        </span>
      </div>
    </div>
  )
}
