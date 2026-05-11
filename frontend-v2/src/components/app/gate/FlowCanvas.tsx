import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { EncryptedField } from '../../EncryptedField'
import { useConsole } from '../use-console-actions'
import type { GatePillState } from '../selectors/console-selectors'
import {
  getGatePillState,
  hasActiveSession,
} from '../selectors/console-selectors'
import type { GateOrbVerdict } from './GateOrb'
import { GateOrb } from './GateOrb'
import type { Rail, Scenario } from './gate-state'
import { amountForScenario } from './gate-state'

/**
 * FlowCanvas, the three-node policy-gated flow rendered as a wide
 * horizontal grid with hairline pulse-dot connectors between nodes.
 *
 * Node grid (desktop):
 *   [ 01 Agent request ] — pulse — [ 02 Sealed gate / Orb ] — pulse — [ 03 Rail output ]
 *
 * On mobile the grid collapses to a single column; connectors hide so
 * the three nodes stack cleanly without sideways pulse dots.
 *
 * Driven by:
 *   - `<IntentComposer>` rail + scenario (passed in)
 *   - `useConsole().state` for live policy seq + session state + verdict
 *
 * The orb verdict mirrors the page-hero pill so the operator always
 * sees one canonical verdict per rail.
 */

const NODE1_TITLE_KEY: Record<Rail, TranslationKey> = {
  jupiter: 'portal.gate.flow.node1.title.jupiter',
  ika: 'portal.gate.flow.node1.title.ika',
}

const NODE1_BODY_KEY: Record<Rail, TranslationKey> = {
  jupiter: 'portal.gate.flow.node1.body.jupiter',
  ika: 'portal.gate.flow.node1.body.ika',
}

const NODE1_ROUTE_KEY: Record<Rail, TranslationKey> = {
  jupiter: 'portal.gate.flow.node1.route.jupiter',
  ika: 'portal.gate.flow.node1.route.ika',
}

const NODE3_TITLE_KEY: Record<Rail, TranslationKey> = {
  jupiter: 'portal.gate.flow.node3.title.jupiter',
  ika: 'portal.gate.flow.node3.title.ika',
}

const NODE3_BODY_KEY: Record<GatePillState, TranslationKey> = {
  ready: 'portal.gate.flow.node3.body.idle',
  allowed: 'portal.gate.flow.node3.body.allowed',
  blocked: 'portal.gate.flow.node3.body.blocked',
  evaluating: 'portal.gate.flow.node3.body.evaluating',
}

const NODE3_VERDICT_KEY: Record<GatePillState, TranslationKey> = {
  ready: 'portal.gate.flow.node3.verdict.idle',
  allowed: 'portal.gate.flow.node3.verdict.allow',
  blocked: 'portal.gate.flow.node3.verdict.block',
  evaluating: 'portal.gate.flow.node3.verdict.evaluating',
}

function pillToOrbVerdict(s: GatePillState): GateOrbVerdict {
  if (s === 'allowed') return 'allow'
  if (s === 'blocked') return 'block'
  if (s === 'evaluating') return 'evaluating'
  return 'idle'
}

function verdictToneClass(s: GatePillState): string {
  if (s === 'allowed') return 'text-palm'
  if (s === 'blocked') return 'text-coral'
  if (s === 'evaluating') return 'text-lagoon-bright'
  return 'text-ink-mute'
}

function verdictDotClass(s: GatePillState): string {
  if (s === 'allowed') return 'bg-palm'
  if (s === 'blocked') return 'bg-coral'
  if (s === 'evaluating') return 'bg-lagoon-bright animate-pulse'
  return 'bg-ink-mute/60'
}

function derivePolicyHash(commitment: number[] | undefined): string {
  if (!commitment || commitment.length < 12) {
    return '0x000000000000000000000000'
  }
  const hex = commitment
    .slice(0, 12)
    .map((b) =>
      Math.max(0, Math.min(255, Math.trunc(b))).toString(16).padStart(2, '0'),
    )
    .join('')
  return `0x${hex}`
}

function shortenPubkey(s: string): string {
  return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s
}

export function FlowCanvas({
  rail,
  scenario,
}: {
  rail: Rail
  scenario: Scenario
}) {
  const { t } = useLocale()
  const { state } = useConsole()
  const amount = amountForScenario(scenario)
  const pillState = getGatePillState(state, rail)
  const sessionActive = hasActiveSession(state)
  const policySeq = Number(state.data?.policySeq ?? 0)
  const policySealed = Boolean(state.data?.usdcDcaPolicy?.enabled)
  const policyLabel = policySealed
    ? `#${policySeq} ${t('portal.gate.flow.node2.value.policyFresh')}`
    : t('portal.gate.flow.node2.value.policyEmpty')
  const sessionLabel = sessionActive
    ? t('portal.gate.flow.node2.value.sessionActive')
    : t('portal.gate.flow.node2.value.sessionInactive')

  // Session pubkey for node-1 row — derive from sessionKeypair when
  // present, else fall back to a `pending` placeholder so the row
  // never goes blank.
  const sessionPubkey = state.sessionKeypair?.publicKey?.toBase58?.() ?? null
  const sessionDisplay = sessionPubkey
    ? shortenPubkey(sessionPubkey)
    : t('portal.gate.flow.node1.session.placeholder')

  return (
    <section
      data-testid="flow-canvas"
      aria-label={t('portal.gate.kicker')}
      className="mt-8 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)_72px_minmax(0,1fr)] md:items-start md:gap-0"
    >
      {/* Node 1 — Agent request */}
      <div className="min-w-0 md:px-4" data-testid="flow-node-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.gate.flow.node1.kicker')}
        </p>
        <h3 className="mt-2 font-sans text-lg font-bold leading-tight text-ink md:text-xl">
          {t(NODE1_TITLE_KEY[rail])}
        </h3>
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
          {t(NODE1_BODY_KEY[rail])}
        </p>
        <dl className="mt-4 grid gap-[2px]">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-lagoon-bright/10 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node1.row.amount')}</dt>
            <dd className="text-ink">
              {amount} {t('portal.gate.composer.unit')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-lagoon-bright/10 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node1.row.route')}</dt>
            <dd className="text-ink">{t(NODE1_ROUTE_KEY[rail])}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node1.row.session')}</dt>
            <dd className={sessionPubkey ? 'text-ink' : 'text-ink-mute'}>
              {sessionDisplay}
            </dd>
          </div>
        </dl>
      </div>

      {/* Connector 1 → 2 */}
      <div
        aria-hidden="true"
        className="relative hidden min-h-[60px] place-items-center md:grid"
      >
        <div className="absolute inset-x-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-lagoon-bright/55 to-transparent" />
        <span className="pl-flow-pulse" />
      </div>

      {/* Node 2 — Sealed gate */}
      <div
        className="flex min-w-0 flex-col items-center text-center md:px-4"
        data-testid="flow-node-2"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.gate.flow.node2.kicker')}
        </p>
        <GateOrb verdict={pillToOrbVerdict(pillState)} />
        <dl className="mt-2 grid w-full max-w-xs gap-[2px] text-left">
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-lagoon-bright/10 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node2.check.session')}</dt>
            <dd className={sessionActive ? 'text-palm' : 'text-ink-mute'}>
              {sessionLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-lagoon-bright/10 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node2.check.policy')}</dt>
            <dd className={policySealed ? 'text-ink' : 'text-ink-mute'}>
              {policyLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2 font-mono text-[11px] text-ink-soft">
            <dt>{t('portal.gate.flow.node2.check.limit')}</dt>
            <dd>
              <EncryptedField
                value="•••••••••••••••"
                encryptedHash={derivePolicyHash(state.data?.policyCommitment)}
                state="encrypted"
                monoSize="sm"
              />
            </dd>
          </div>
        </dl>
      </div>

      {/* Connector 2 → 3 */}
      <div
        aria-hidden="true"
        className="relative hidden min-h-[60px] place-items-center md:grid"
      >
        <div className="absolute inset-x-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-lagoon-bright/55 to-transparent" />
        <span className="pl-flow-pulse" />
      </div>

      {/* Node 3 — Rail output */}
      <div className="min-w-0 md:px-4" data-testid="flow-node-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.gate.flow.node3.kicker')}
        </p>
        <h3 className="mt-2 font-sans text-lg font-bold leading-tight text-ink md:text-xl">
          {t(NODE3_TITLE_KEY[rail])}
        </h3>
        <p
          data-testid="flow-verdict-line"
          data-state={pillState}
          className={`mt-4 inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] ${verdictToneClass(pillState)}`}
        >
          <span
            className={`size-1.5 rounded-full ${verdictDotClass(pillState)}`}
            aria-hidden="true"
          />
          {t(NODE3_VERDICT_KEY[pillState])}
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
          {t(NODE3_BODY_KEY[pillState])}
        </p>
      </div>
    </section>
  )
}
