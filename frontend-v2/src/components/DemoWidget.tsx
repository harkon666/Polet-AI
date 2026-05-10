import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'
import { EncryptedField } from './EncryptedField'

type Scenario = 'block' | 'jupiter' | 'ika'
type Phase =
  | 'idle'
  | 'cleartext'
  | 'encrypting'
  | 'encrypted'
  | 'evaluating'
  | 'result'
  | 'revealing'
  | 'revealed'

/**
 * DemoWidget, Crypto-Blur Theater.
 *
 * Visualizes Polet's confidential numeric policy: agent request fields
 * (amount, target, route) GLITCH-SCRAMBLE to encrypted hex; policy gate
 * evaluates the ciphertext without decrypting; outputs ALLOW or BLOCK.
 * User can click "Reveal" to un-scramble back to cleartext (server can't).
 *
 * Phase machine:
 *   idle       → user picks scenario
 *   cleartext  → show fields in clear (1000ms, "this is what the agent sees")
 *   encrypting → fields glitch-scramble to hex (1000ms, chromatic aberration)
 *   encrypted  → settled hex blobs glow (500ms, sealed)
 *   evaluating → policy gate progress + constraint rows stagger (1200ms)
 *   result     → ALLOWED/BLOCKED badge + reset/reveal CTAs
 *   revealing  → un-scramble back (700ms, allow only)
 *   revealed   → cleartext visible, "you decrypted, server can't"
 *
 * Anchor #demo so header nav scrolls here.
 */
const PHASE_TIMINGS = {
  cleartext: 1000,
  encrypting: 1000,
  encrypted: 500,
  evaluating: 1200,
  revealing: 700,
} as const

type ScenarioData = {
  fields: { action: string; amount: string; target: string; route: string }
  encrypted: { action: string; amount: string; target: string; route: string }
  outcome: 'allow' | 'block'
  rail?: 'jupiter' | 'ika'
  blockReason?: string
  approvalNote?: string
  approvalDetail?: string
}

const SCENARIOS: Record<Scenario, ScenarioData> = {
  block: {
    fields: {
      action: 'send',
      amount: '25.00 USDC',
      target: 'Whirlpool LP',
      route: 'USDC → SOL → meme',
    },
    encrypted: {
      action: '0x4f',
      amount: '0xa3f1c7',
      target: '0x4d8b9e',
      route: '0xc2f7a1',
    },
    outcome: 'block',
    blockReason: 'POLET_E_LIMIT_EXCEEDED',
  },
  jupiter: {
    fields: {
      action: 'jupiter.dca',
      amount: '5.00 USDC',
      target: 'Whirlpool → Raydium',
      route: 'best route Σ',
    },
    encrypted: {
      action: '0x1c',
      amount: '0xb89f2a',
      target: '0x6c3e7d',
      route: '0xe8a1d4',
    },
    outcome: 'allow',
    rail: 'jupiter',
    approvalNote: 'unsigned tx ready',
    approvalDetail: '~0.0287 SOL est.',
  },
  ika: {
    fields: {
      action: 'ika.sign',
      amount: '5.00 USDC',
      target: 'Sui mainnet',
      route: '2PC-MPC ECDSA',
    },
    encrypted: {
      action: '0x21',
      amount: '0xd4f792',
      target: '0x91d4c7',
      route: '0x7f2b4a',
    },
    outcome: 'allow',
    rail: 'ika',
    approvalNote: 'msg hash 0xa1b2…f9e0',
    approvalDetail: 'cross-chain ready',
  },
}

export function DemoWidget() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const runScenario = (next: Scenario) => {
    clearTimeouts()
    setScenario(next)
    setPhase('cleartext')

    const { cleartext, encrypting, encrypted, evaluating } = PHASE_TIMINGS
    const t1 = setTimeout(() => setPhase('encrypting'), cleartext)
    const t2 = setTimeout(() => setPhase('encrypted'), cleartext + encrypting)
    const t3 = setTimeout(() => setPhase('evaluating'), cleartext + encrypting + encrypted)
    const t4 = setTimeout(
      () => setPhase('result'),
      cleartext + encrypting + encrypted + evaluating,
    )
    timeoutsRef.current = [t1, t2, t3, t4]
  }

  const reset = () => {
    clearTimeouts()
    setScenario(null)
    setPhase('idle')
  }

  const reveal = () => {
    if (phase !== 'result') return
    clearTimeouts()
    setPhase('revealing')
    const t = setTimeout(() => setPhase('revealed'), PHASE_TIMINGS.revealing)
    timeoutsRef.current = [t]
  }

  useEffect(() => () => clearTimeouts(), [])

  // Field state derived from phase
  const fieldState =
    phase === 'cleartext' || phase === 'idle'
      ? 'clear'
      : phase === 'encrypting'
      ? 'encrypting'
      : phase === 'revealing'
      ? 'revealing'
      : phase === 'revealed'
      ? 'clear'
      : 'encrypted' // encrypted, evaluating, result

  return (
    <section
      ref={containerRef}
      id="demo"
      className="relative border-t border-line bg-bg-deep py-20 md:py-28 lg:py-32 overflow-hidden"
    >
      <EncryptedNoiseLayer />
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center md:text-left max-w-3xl">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('demo.kicker')}
          </KickerLabel>
          <h2
            className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ transitionDelay: '80ms' }}
          >
            {t('demo.headline')}
          </h2>
          <p
            className="pl-reveal mt-6 text-base md:text-lg text-ink-soft leading-relaxed"
            style={{ transitionDelay: '160ms' }}
          >
            {t('demo.body')}
          </p>
        </div>

        {/* Theater, Glass Holographic Plate (no outer frame).
            Content floats on radial halo backdrop with top accent line. */}
        <div
          className="pl-reveal pl-holographic-plate relative max-w-3xl mx-auto mt-10 md:mt-12"
          style={{ transitionDelay: '240ms' }}
        >
          {/* Header, floating identifier strip, no container */}
          <div className="px-2 md:px-3 pt-6 pb-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <span className="pl-blueprint-id text-lagoon-bright">
                {t('demoWidget.theater.header.title')}
              </span>
              <span className="inline-flex items-center gap-2 pl-blueprint-id text-ink-soft">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 rounded-full bg-lagoon-bright animate-ping opacity-60" />
                  <span className="relative size-1.5 rounded-full bg-lagoon-bright" />
                </span>
                {t('demoWidget.theater.header.devnet')}
              </span>
            </div>
          </div>

          {/* Stage, glass card */}
          <div className="pl-glass-card-strong rounded-xl px-5 md:px-6 pt-5 pb-5 min-h-[340px] flex flex-col">
            {phase === 'idle' ? (
              <IdleStage />
            ) : (
              <ActiveStage
                scenario={SCENARIOS[scenario!]}
                phase={phase}
                fieldState={fieldState}
                onReset={reset}
                onReveal={reveal}
              />
            )}
          </div>

          {/* Scenario picker, header + pill grid, no outer card */}
          <div className="mt-5 px-2 md:px-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="pl-blueprint-id text-ink-mute">
                {t('demoWidget.theater.pick')}
              </span>
              <span className="flex-1 h-px bg-line" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <ScenarioPill
                scenario="block"
                label={t('demoWidget.scenario.block.label')}
                hint={t('demoWidget.scenario.block.hint')}
                isActive={scenario === 'block'}
                disabled={isRunning(phase)}
                onClick={() => runScenario('block')}
              />
              <ScenarioPill
                scenario="jupiter"
                label={t('demoWidget.scenario.jupiter.label')}
                hint={t('demoWidget.scenario.jupiter.hint')}
                isActive={scenario === 'jupiter'}
                disabled={isRunning(phase)}
                onClick={() => runScenario('jupiter')}
              />
              <ScenarioPill
                scenario="ika"
                label={t('demoWidget.scenario.ika.label')}
                hint={t('demoWidget.scenario.ika.hint')}
                isActive={scenario === 'ika'}
                disabled={isRunning(phase)}
                onClick={() => runScenario('ika')}
              />
            </div>
          </div>

          {/* Footer, floating, no container */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-5 px-2 md:px-3">
            <span className="inline-flex items-center gap-2 pl-blueprint-id text-ink-soft">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-lagoon-bright animate-ping opacity-75" />
                <span className="relative size-1.5 rounded-full bg-lagoon-bright" />
              </span>
              {t('demoWidget.simulation.badge')}
            </span>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright hover:text-lagoon transition group"
            >
              {t('demoWidget.live.cta')}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================
   Internal components
   ============================================ */

/**
 * Encrypted noise layer, scattered cipher fragments in section bg.
 * Tells encryption story even in negative space. Each fragment has its
 * own opacity, duration, and delay for organic varied breathing.
 *
 * Hidden on mobile (sm: only) to keep small viewports clean.
 * `aria-hidden` since this is purely decorative.
 */
const NOISE_FRAGMENTS: Array<{
  text: string
  x: string
  y: string
  size: number
  opacity: number
  duration: number
  delay: number
}> = [
  // Left margin
  { text: '0xa3f1c7d9', x: '4%', y: '14%', size: 11, opacity: 0.10, duration: 7, delay: 0 },
  { text: 'π_in_band ✓', x: '8%', y: '30%', size: 10, opacity: 0.14, duration: 5, delay: 1.2 },
  { text: 'commit:0x7c5b2e0a', x: '3%', y: '52%', size: 11, opacity: 0.08, duration: 8, delay: 2.5 },
  { text: 'H(amount)', x: '10%', y: '72%', size: 11, opacity: 0.12, duration: 6, delay: 3.4 },
  { text: 'enc(σ_session)', x: '5%', y: '88%', size: 10, opacity: 0.09, duration: 7, delay: 1.7 },

  // Right margin
  { text: '0xb89f2a4d', x: '86%', y: '11%', size: 11, opacity: 0.10, duration: 6.5, delay: 0.8 },
  { text: '[CIPHERTEXT]', x: '88%', y: '26%', size: 10, opacity: 0.14, duration: 5.5, delay: 1.8 },
  { text: 'enc(target)', x: '85%', y: '46%', size: 11, opacity: 0.09, duration: 7.5, delay: 2.2 },
  { text: 'π_scope_match', x: '87%', y: '64%', size: 10, opacity: 0.12, duration: 6, delay: 3.8 },
  { text: '0x4d8b9eef', x: '90%', y: '82%', size: 11, opacity: 0.08, duration: 8, delay: 0.5 },

  // Above widget
  { text: 'dWallet · 2PC-MPC ECDSA', x: '38%', y: '4%', size: 10, opacity: 0.07, duration: 9, delay: 1.5 },

  // Below widget
  { text: '[GATE_OK]', x: '30%', y: '94%', size: 11, opacity: 0.11, duration: 6, delay: 2.8 },
  { text: 'Σ_route', x: '58%', y: '92%', size: 11, opacity: 0.13, duration: 5, delay: 0.3 },
]

function EncryptedNoiseLayer() {
  return (
    <div className="pl-encrypted-noise hidden md:block" aria-hidden="true">
      {NOISE_FRAGMENTS.map((f, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pl-noise-fragment"
          style={
            {
              left: f.x,
              top: f.y,
              fontSize: `${f.size}px`,
              '--noise-opacity': f.opacity,
              '--noise-duration': `${f.duration}s`,
              '--noise-delay': `${f.delay}s`,
            } as React.CSSProperties
          }
        >
          {f.text}
        </span>
      ))}
    </div>
  )
}

/* ============================================
   Stage components
   ============================================ */

function isRunning(phase: Phase): boolean {
  return (
    phase === 'cleartext' ||
    phase === 'encrypting' ||
    phase === 'encrypted' ||
    phase === 'evaluating' ||
    phase === 'revealing'
  )
}

function IdleStage() {
  const { t } = useLocale()
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
      <div className="relative size-11 inline-flex items-center justify-center mb-4">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-line-strong animate-ping opacity-40"
          style={{ animationDuration: '2.5s' }}
        />
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-lagoon-bright relative animate-bounce"
          style={{ animationDuration: '1.8s' }}
          aria-hidden="true"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </div>
      <h3 className="font-sans text-base font-semibold text-ink">
        {t('demoWidget.theater.idle.title')}
      </h3>
      <p className="mt-2 text-sm text-ink-soft max-w-md leading-relaxed">
        {t('demoWidget.theater.idle.desc')}
      </p>
    </div>
  )
}

function ActiveStage({
  scenario,
  phase,
  fieldState,
  onReset,
  onReveal,
}: {
  scenario: ScenarioData
  phase: Phase
  fieldState: 'clear' | 'encrypting' | 'encrypted' | 'revealing'
  onReset: () => void
  onReveal: () => void
}) {
  const { t } = useLocale()

  // Header label changes per phase to narrate
  const stageLabel =
    phase === 'cleartext'
      ? t('demoWidget.theater.label.agentRequest')
      : phase === 'encrypting'
      ? t('demoWidget.theater.label.sealing')
      : phase === 'encrypted'
      ? t('demoWidget.theater.label.sealed')
      : phase === 'evaluating'
      ? t('demoWidget.theater.label.evaluating')
      : phase === 'revealing'
      ? t('demoWidget.theater.label.decrypting')
      : phase === 'revealed'
      ? t('demoWidget.theater.label.revealed')
      : t('demoWidget.theater.label.result')

  const showGate = phase === 'evaluating' || phase === 'result' || phase === 'revealing' || phase === 'revealed'
  const showResult = phase === 'result' || phase === 'revealing' || phase === 'revealed'

  return (
    <div className="flex-1 flex flex-col gap-4 pt-4">
      {/* Stage header */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright">
          {stageLabel}
        </span>
        <span className="flex-1 h-px bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          {phaseHint(phase, t)}
        </span>
      </div>

      {/* Field grid */}
      <FieldGrid scenario={scenario} fieldState={fieldState} />

      {/* Gate process, appears from evaluating phase */}
      {showGate && (
        <GatePanel
          scenario={scenario}
          phase={phase}
        />
      )}

      {/* Result badge + actions */}
      {showResult && (
        <ResultBadge
          scenario={scenario}
          phase={phase}
          onReset={onReset}
          onReveal={onReveal}
        />
      )}
    </div>
  )
}

function phaseHint(phase: Phase, t: ReturnType<typeof useLocale>['t']) {
  if (phase === 'cleartext') return t('demoWidget.theater.hint.cleartext')
  if (phase === 'encrypting') return t('demoWidget.theater.hint.encrypting')
  if (phase === 'encrypted') return t('demoWidget.theater.hint.encrypted')
  if (phase === 'evaluating') return t('demoWidget.theater.hint.evaluating')
  if (phase === 'result') return t('demoWidget.theater.hint.result')
  if (phase === 'revealing') return t('demoWidget.theater.hint.revealing')
  if (phase === 'revealed') return t('demoWidget.theater.hint.revealed')
  return ''
}

function FieldGrid({
  scenario,
  fieldState,
}: {
  scenario: ScenarioData
  fieldState: 'clear' | 'encrypting' | 'encrypted' | 'revealing'
}) {
  const { t } = useLocale()
  const rows: Array<['action' | 'amount' | 'target' | 'route', string]> = [
    ['action', t('demoWidget.theater.field.action')],
    ['amount', t('demoWidget.theater.field.amount')],
    ['target', t('demoWidget.theater.field.target')],
    ['route', t('demoWidget.theater.field.route')],
  ]

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 items-baseline">
      {rows.map(([key, label]) => (
        <FieldRow
          key={key}
          label={label}
          value={scenario.fields[key]}
          encrypted={scenario.encrypted[key]}
          state={fieldState}
          isAmount={key === 'amount'}
        />
      ))}
    </dl>
  )
}

function FieldRow({
  label,
  value,
  encrypted,
  state,
  isAmount,
}: {
  label: string
  value: string
  encrypted: string
  state: 'clear' | 'encrypting' | 'encrypted' | 'revealing'
  isAmount?: boolean
}) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        {label}
      </dt>
      <dd>
        <EncryptedField
          value={value}
          encryptedHash={encrypted}
          state={state}
          monoSize={isAmount ? 'md' : 'sm'}
          className={isAmount ? 'font-semibold' : ''}
        />
      </dd>
    </>
  )
}

function GatePanel({
  scenario,
  phase,
}: {
  scenario: ScenarioData
  phase: Phase
}) {
  const { t } = useLocale()
  const isEvaluating = phase === 'evaluating'
  const isSettled = phase === 'result' || phase === 'revealing' || phase === 'revealed'

  // Constraint check rows, block scenario fails numeric_limit
  const constraints: Array<{ key: string; label: string; outcome: 'pass' | 'fail' }> = [
    {
      key: 'numericLimit',
      label: t('demoWidget.theater.constraint.numericLimit'),
      outcome: scenario.outcome === 'block' ? 'fail' : 'pass',
    },
    {
      key: 'scopeMatch',
      label: t('demoWidget.theater.constraint.scopeMatch'),
      outcome: 'pass',
    },
    {
      key: 'sessionActive',
      label: t('demoWidget.theater.constraint.sessionActive'),
      outcome: 'pass',
    },
  ]

  return (
    <div className="border-t border-line pt-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-lagoon-bright"
          aria-hidden="true"
        >
          <rect x="3" y="6" width="8" height="6" rx="1" />
          <path d="M5 6V4a2 2 0 0 1 4 0v2" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright">
          {t('demoWidget.theater.gate.title')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="pl-progress-bar mb-3" aria-hidden="true" />

      {/* Constraint check rows, staggered */}
      <div className="space-y-1.5 font-mono text-[11px]">
        {constraints.map((c, i) => (
          <div
            key={c.key}
            className="pl-constraint-row flex items-center justify-between"
            style={{ animationDelay: `${300 + i * 220}ms` }}
          >
            <span className="text-ink-soft">{c.label}</span>
            <span className="flex items-center gap-2">
              {isEvaluating && i >= 1 ? (
                <span className="text-ink-mute">·</span>
              ) : (
                <ConstraintIcon outcome={c.outcome} settled={isSettled || isEvaluating} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConstraintIcon({
  outcome,
  settled,
}: {
  outcome: 'pass' | 'fail'
  settled: boolean
}) {
  if (!settled) {
    return <span className="text-ink-mute">·</span>
  }
  if (outcome === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 text-palm">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="2 6 5 9 10 3" />
        </svg>
        ok
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-coral">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="3" y1="3" x2="9" y2="9" />
        <line x1="9" y1="3" x2="3" y2="9" />
      </svg>
      fail
    </span>
  )
}

function ResultBadge({
  scenario,
  phase,
  onReset,
  onReveal,
}: {
  scenario: ScenarioData
  phase: Phase
  onReset: () => void
  onReveal: () => void
}) {
  const { t } = useLocale()
  const isAllow = scenario.outcome === 'allow'
  const isRevealed = phase === 'revealed'
  const isRevealing = phase === 'revealing'

  return (
    <div
      className={`rounded-lg border px-4 py-3 relative overflow-hidden ${
        isAllow
          ? 'border-palm/30 bg-palm/5 pl-result-allow pl-allow-burst'
          : 'border-coral/30 bg-coral/5 pl-result-block pl-block-pulse'
      }`}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span
            className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] font-semibold ${
              isAllow ? 'text-palm' : 'text-coral'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center size-5 rounded-full ${
                isAllow ? 'bg-palm/20' : 'bg-coral/20'
              }`}
            >
              {isAllow ? '✓' : '✕'}
            </span>
            {isAllow
              ? `${t('demoWidget.theater.result.allowed')} · ${
                  scenario.rail === 'jupiter'
                    ? 'Jupiter'
                    : scenario.rail === 'ika'
                    ? 'Ika'
                    : ''
                }`
              : t('demoWidget.theater.result.blocked')}
          </span>
          <p className="mt-2 text-sm text-ink leading-relaxed">
            {isAllow
              ? t('demoWidget.theater.result.allowed.body')
              : t('demoWidget.theater.result.blocked.body')}
          </p>
          {!isAllow && scenario.blockReason && (
            <p className="mt-2 font-mono text-xs">
              <span className="text-ink-mute uppercase tracking-wider">
                {t('demoWidget.theater.result.code')}
              </span>{' '}
              <span className="text-coral">{scenario.blockReason}</span>
            </p>
          )}
          {isAllow && scenario.approvalNote && (
            <p className="mt-2 font-mono text-xs">
              <span className="text-ink-mute uppercase tracking-wider">
                {t('demoWidget.theater.result.tx')}
              </span>{' '}
              <span className="text-palm">{scenario.approvalNote}</span>
              {scenario.approvalDetail && (
                <span className="text-ink-soft"> · {scenario.approvalDetail}</span>
              )}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          {isAllow && !isRevealed && (
            <button
              type="button"
              onClick={onReveal}
              disabled={isRevealing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-lagoon-bright/30 bg-lagoon-bright/5 hover:bg-lagoon-bright/10 hover:border-lagoon-bright transition text-sm font-medium text-lagoon-bright disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
              {t('demoWidget.theater.reveal.cta')}
            </button>
          )}
          {isRevealed && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-lagoon-bright/30 bg-lagoon-bright/10 text-sm font-medium text-lagoon-bright">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 7l3 3 7-7" />
              </svg>
              {t('demoWidget.theater.reveal.confirmed')}
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong text-sm text-ink-soft hover:text-ink hover:border-lagoon transition"
          >
            <span aria-hidden="true">↺</span>
            {t('demoWidget.theater.reset')}
          </button>
        </div>
      </div>

      {/* Reveal note, appears after reveal */}
      {isRevealed && (
        <p className="mt-3 pt-3 border-t border-lagoon-bright/15 font-mono text-[11px] text-ink-mute relative z-10">
          {t('demoWidget.theater.reveal.note')}
        </p>
      )}
    </div>
  )
}

function ScenarioPill({
  scenario: _,
  label,
  hint,
  isActive,
  disabled,
  onClick,
}: {
  scenario: Scenario
  label: string
  hint: string
  isActive: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-active={isActive}
      className={`pl-scenario-pill text-left rounded-lg px-3 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? 'pl-glass-card-strong border border-lagoon-bright bg-lagoon-bright/10'
          : 'pl-glass-card hover:border-lagoon hover:bg-lagoon-bright/[0.04]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center size-5 rounded-full font-mono text-[10px] ${
            isActive ? 'bg-lagoon-bright/20 text-lagoon-bright' : 'bg-line text-ink-mute'
          }`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className={`font-sans text-sm font-semibold ${isActive ? 'text-ink' : 'text-ink-soft'}`}>
          {label}
        </span>
      </div>
      <p className="mt-1 ml-7 text-xs text-ink-mute leading-snug">{hint}</p>
    </button>
  )
}
