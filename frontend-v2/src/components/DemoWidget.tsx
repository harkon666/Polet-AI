import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

type Outcome = 'block' | 'jupiter' | 'ika'
type Status = 'idle' | 'running' | 'result'

const RUN_DURATION_MS = 1100

/**
 * Polet v2 Demo widget — interactive simulation of the policy gate.
 *
 * 3 actions: BLOCK (over-limit), JUPITER DCA (in-limit), IKA (in-limit
 * multi-chain). Each fires a simulated 1.1s "policy gate evaluating"
 * pause then renders the appropriate result panel (red for blocked,
 * teal for approved). All in mock — no Solana RPC calls. The "Run live"
 * link routes to /app for the actual devnet flow.
 *
 * Anchor #demo so header nav scrolls here.
 */
export function DemoWidget() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const [status, setStatus] = useState<Status>('idle')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const fire = (next: Outcome) => {
    if (status === 'running') return
    setOutcome(next)
    setStatus('running')
    setTimeout(() => setStatus('result'), RUN_DURATION_MS)
  }

  const reset = () => {
    setStatus('idle')
    setOutcome(null)
  }

  return (
    <section
      ref={containerRef}
      id="demo"
      className="border-t border-line bg-bg-deep py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
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

        {/* Widget panel */}
        <div
          className="pl-reveal mt-12 md:mt-14 rounded-2xl border border-line bg-surface overflow-hidden"
          style={{ transitionDelay: '240ms' }}
        >
          {/* Widget header bar */}
          <div className="flex items-center justify-between px-5 md:px-6 py-3 bg-bg-base border-b border-line">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="size-2 rounded-full bg-coral/60" />
                <span className="size-2 rounded-full bg-sunset/60" />
                <span className="size-2 rounded-full bg-palm/60" />
              </div>
              <span className="ml-2 font-mono text-xs text-ink-mute uppercase tracking-wider">
                {t('demoWidget.header.badge')}
              </span>
            </div>
            <span className="font-mono text-xs text-ink-mute">
              {t('demoWidget.header.noWallet')}
            </span>
          </div>

          {/* 3 action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 md:p-6 border-b border-line bg-bg-deep">
            <ActionButton
              tone="block"
              onClick={() => fire('block')}
              disabled={status === 'running'}
              isActive={outcome === 'block'}
              label="Block 25 USDC"
              sub={t('demo.pill.block.desc')}
              ariaLabel={t('demoWidget.button.block.ariaLabel')}
            />
            <ActionButton
              tone="allow"
              onClick={() => fire('jupiter')}
              disabled={status === 'running'}
              isActive={outcome === 'jupiter'}
              label="Jupiter DCA · 5 USDC"
              sub={t('demo.pill.dca.desc')}
              ariaLabel={t('demoWidget.button.jupiter.ariaLabel')}
            />
            <ActionButton
              tone="allow"
              onClick={() => fire('ika')}
              disabled={status === 'running'}
              isActive={outcome === 'ika'}
              label="Ika · 5 USDC X-chain"
              sub={t('demo.pill.ika.desc')}
              ariaLabel={t('demoWidget.button.ika.ariaLabel')}
            />
          </div>

          {/* State display */}
          <div className="p-5 md:p-6 min-h-[260px] bg-surface">
            {status === 'idle' && <IdleState />}
            {status === 'running' && <RunningState />}
            {status === 'result' && outcome === 'block' && <BlockedResult onReset={reset} />}
            {status === 'result' && outcome === 'jupiter' && <JupiterResult onReset={reset} />}
            {status === 'result' && outcome === 'ika' && <IkaResult onReset={reset} />}
          </div>

          {/* Footer — simulation badge + live deeplink */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 md:px-6 py-4 bg-bg-base border-t border-line">
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-mute">
              <span className="size-1.5 rounded-full bg-lagoon-bright animate-pulse" />
              {t('demoWidget.simulation.badge')}
            </span>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright hover:text-lagoon transition"
            >
              {t('demoWidget.live.cta')}
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

function ActionButton({
  tone,
  onClick,
  disabled,
  isActive,
  label,
  sub,
  ariaLabel,
}: {
  tone: 'block' | 'allow'
  onClick: () => void
  disabled: boolean
  isActive: boolean
  label: string
  sub: string
  ariaLabel: string
}) {
  const toneClasses = tone === 'block'
    ? 'border-coral/30 hover:border-coral/60 hover:bg-coral/5'
    : 'border-line-strong hover:border-lagoon hover:bg-surface-raised'

  const activeClasses = isActive
    ? tone === 'block'
      ? 'border-coral bg-coral/10'
      : 'border-lagoon bg-surface-raised'
    : ''

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`group/btn relative rounded-xl border bg-surface text-left p-4 transition disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses} ${activeClasses}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
            tone === 'block'
              ? 'bg-coral/15 text-coral'
              : 'bg-lagoon-bright/15 text-lagoon-bright'
          }`}
        >
          {tone === 'block' ? 'block' : 'allow'}
        </span>
      </div>
      <div className="mt-3 font-sans font-semibold text-ink text-sm md:text-base">
        {label}
      </div>
      <div className="mt-1 text-xs text-ink-soft leading-snug">
        {sub}
      </div>
    </button>
  )
}

function IdleState() {
  const { t } = useLocale()
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8">
      <div className="size-12 rounded-full border border-line-strong flex items-center justify-center text-ink-mute font-mono text-xl">
        ?
      </div>
      <h3 className="mt-4 font-sans text-lg font-semibold text-ink">
        {t('demoWidget.state.idle.title')}
      </h3>
      <p className="mt-2 text-sm text-ink-soft max-w-sm">
        {t('demoWidget.state.idle.desc')}
      </p>
    </div>
  )
}

function RunningState() {
  const { t } = useLocale()
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-lagoon-bright animate-spin" />
      </div>
      <h3 className="mt-4 font-mono text-sm uppercase tracking-wider text-lagoon-bright">
        {t('demoWidget.state.running.label')}
      </h3>
    </div>
  )
}

function BlockedResult({ onReset }: { onReset: () => void }) {
  const { t } = useLocale()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-8 rounded-full bg-coral/15 text-coral">
          ✕
        </span>
        <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-coral/15 text-coral font-semibold">
          {t('demoWidget.state.blocked.badge')}
        </span>
      </div>

      <p className="text-sm md:text-base text-ink-soft">
        {t('demoWidget.state.blocked.reason.jupiter')}
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs pt-2 border-t border-line">
        <DataRow
          label={t('demoWidget.state.blocked.field.code')}
          value="POLET_E_LIMIT_EXCEEDED"
          tone="coral"
        />
        <DataRow
          label={t('demoWidget.state.blocked.field.leak')}
          value={t('demoWidget.state.blocked.field.leakValue')}
          tone="palm"
        />
        <DataRow
          label={t('demoWidget.state.blocked.field.approval')}
          value={t('demoWidget.state.blocked.field.approvalValue')}
          tone="ink"
        />
      </dl>

      <ResetButton onClick={onReset} />
    </div>
  )
}

function JupiterResult({ onReset }: { onReset: () => void }) {
  const { t } = useLocale()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-8 rounded-full bg-lagoon-bright/15 text-lagoon-bright">
          ✓
        </span>
        <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-lagoon-bright/15 text-lagoon-bright font-semibold">
          {t('demoWidget.state.allowed.jupiter.badge')}
        </span>
      </div>

      <p className="text-sm md:text-base text-ink-soft">
        {t('demoWidget.state.allowed.jupiter.body')}
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs pt-2 border-t border-line">
        <DataRow
          label={t('demoWidget.state.allowed.jupiter.field.input')}
          value="5.00 USDC"
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.jupiter.field.output')}
          value="~0.0287 SOL"
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.jupiter.field.route')}
          value="Whirlpool → Raydium"
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.jupiter.field.execution')}
          value="unsigned tx ready"
          tone="palm"
        />
      </dl>

      <ResetButton onClick={onReset} />
    </div>
  )
}

function IkaResult({ onReset }: { onReset: () => void }) {
  const { t } = useLocale()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-8 rounded-full bg-lagoon-bright/15 text-lagoon-bright">
          ✓
        </span>
        <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-lagoon-bright/15 text-lagoon-bright font-semibold">
          {t('demoWidget.state.allowed.ika.badge')}
        </span>
      </div>

      <p className="text-sm md:text-base text-ink-soft">
        {t('demoWidget.state.allowed.ika.body')}
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs pt-2 border-t border-line">
        <DataRow
          label={t('demoWidget.state.allowed.ika.field.amount')}
          value="5.00 USDC"
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.ika.field.target')}
          value={t('demoWidget.state.allowed.ika.field.targetValue')}
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.ika.field.messageHash')}
          value="0xa1b2…f9e0"
          tone="ink"
        />
        <DataRow
          label={t('demoWidget.state.allowed.ika.field.scheme')}
          value="2PC-MPC ECDSA"
          tone="palm"
        />
      </dl>

      <ResetButton onClick={onReset} />
    </div>
  )
}

function DataRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'ink' | 'coral' | 'palm'
}) {
  const valueClass = {
    ink: 'text-ink',
    coral: 'text-coral',
    palm: 'text-palm',
  }[tone]

  return (
    <>
      <dt className="text-ink-mute uppercase tracking-wider whitespace-nowrap">{label}</dt>
      <dd className={`${valueClass} text-right sm:text-left`}>{value}</dd>
    </>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale()
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong text-sm text-ink-soft hover:text-ink hover:bg-surface-raised transition"
      >
        ↺ {t('demoWidget.reset')}
      </button>
    </div>
  )
}
