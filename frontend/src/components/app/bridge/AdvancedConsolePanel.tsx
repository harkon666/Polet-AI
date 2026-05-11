import { useState } from 'react'
import { useLocale } from '#/hooks/use-locale'
import { WalletDashboard } from '../WalletDashboard'
import { useConsole } from '../use-console-actions'

export function AdvancedConsolePanel() {
  const { t } = useLocale()
  const { state } = useConsole()
  const [legacyOpen, setLegacyOpen] = useState(false)
  const sessions = state.data?.temporalKeys ?? state.data?.sessions ?? []
  const walletReady = Boolean(state.data?.walletPda)
  const sessionReady = sessions.some((session) => session?.authorized === true)
  const policyReady = state.data?.usdcDcaPolicy?.enabled === true

  return (
    <div data-testid="bridge-advanced-panel" className="space-y-6">
      <div className="rounded-xl border border-line bg-bg-deep/45 p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
              {t('portal.bridge.advanced.panel.kicker')}
            </p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight tracking-[-0.04em] text-ink md:text-3xl">
              {t('portal.bridge.advanced.panel.title')}
            </h2>
            <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-ink-soft">
              {t('portal.bridge.advanced.panel.body')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <AdvancedFlowCard
              index="01"
              title={t('portal.bridge.advanced.flow.recovery.title')}
              body={t('portal.bridge.advanced.flow.recovery.body')}
            />
            <AdvancedFlowCard
              index="02"
              title={t('portal.bridge.advanced.flow.quorum.title')}
              body={t('portal.bridge.advanced.flow.quorum.body')}
            />
            <AdvancedFlowCard
              index="03"
              title={t('portal.bridge.advanced.flow.encrypt.title')}
              body={t('portal.bridge.advanced.flow.encrypt.body')}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-2 border-t border-line/70 pt-4 sm:grid-cols-3">
          <ReadinessPill
            label={t('portal.bridge.advanced.signal.wallet')}
            ready={walletReady}
          />
          <ReadinessPill
            label={t('portal.bridge.advanced.signal.policy')}
            ready={policyReady}
          />
          <ReadinessPill
            label={t('portal.bridge.advanced.signal.session')}
            ready={sessionReady}
          />
        </div>
      </div>

      <details
        data-testid="bridge-legacy-console-toggle"
        className="group rounded-xl border border-line bg-surface/25"
      >
        <summary
          className="cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden"
          onClick={() => setLegacyOpen(true)}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {t('portal.bridge.advanced.legacy.kicker')}
              </p>
              <p className="mt-1 font-sans text-sm text-ink-soft">
                {t('portal.bridge.advanced.legacy.summary')}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute transition group-open:rotate-180"
            >
              ↓
            </span>
          </div>
        </summary>
        <div className="border-t border-line/60 p-4">
          <p className="max-w-3xl font-sans text-xs leading-relaxed text-ink-mute">
            {t('portal.bridge.advanced.legacy.body')}
          </p>
          {legacyOpen ? (
            <div
              data-testid="bridge-legacy-console"
              className="mt-4 max-h-[46rem] overflow-auto rounded-xl border border-line bg-bg-deep/60 p-3"
            >
              <WalletDashboard />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  )
}

function AdvancedFlowCard({
  index,
  title,
  body,
}: {
  index: string
  title: string
  body: string
}) {
  return (
    <article className="rounded-lg border border-line bg-surface/30 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {index}
      </p>
      <h3 className="mt-3 font-sans text-sm font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-2 font-sans text-xs leading-relaxed text-ink-soft">
        {body}
      </p>
    </article>
  )
}

function ReadinessPill({
  label,
  ready,
}: {
  label: string
  ready: boolean
}) {
  const { t } = useLocale()
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-line bg-surface/25 px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
        {label}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
          ready
            ? 'bg-lagoon-bright/12 text-lagoon-bright'
            : 'bg-sand/10 text-ink-mute'
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${
            ready ? 'bg-lagoon-bright' : 'bg-ink-mute'
          }`}
        />
        {ready
          ? t('portal.bridge.advanced.signal.ready')
          : t('portal.bridge.advanced.signal.missing')}
      </span>
    </div>
  )
}
