/**
 * ARCHIVED — Phase 7 (issue 105) moved this file out of the active
 * Polet Portal tree on 2026-05-11. Replaced by the Polet Portal
 * surface (issues 099-105). Kept on disk so future contributors can
 * reference the previous shape.
 *
 * If you're looking for the new equivalent, see:
 *   - components/app/portal/    chrome (sidebar, mobile bar, drawer)
 *   - components/app/workspace/ /app/workspace
 *   - components/app/gate/      /app/gate
 *   - components/app/funds/     /app/funds
 *   - components/app/proof/     /app/proof
 *   - components/app/bridge/    /app/bridge
 *   - components/app/selectors/console-selectors.ts (shared state derivations)
 *
 * Do not import from this file in new code. Mounted by:
 *   git log --diff-filter=A -- frontend/src/components/app/MissionRibbon.tsx
 */
import { useLocale } from '#/hooks/use-locale'
import { useConsole } from './use-console-actions'

/**
 * MissionRibbon, a single-line strip directly below AppHeader.
 *
 * Day 10 layout pivot — replaces the Day 9 full-bleed ConsoleThesis
 * section, which was eating ~900px of viewport before any operational
 * content. The ribbon compresses the same thesis ("Three rails · One
 * gate") plus pre-alpha scope ("Devnet preview · Policy-gated") into
 * one line of mono uppercase chrome that doesn't push the dashboard
 * below the fold.
 *
 * Day 12 redesign: when the operator is connected, the ribbon reads
 * live state from `useConsole()` and reports the current shape of the
 * policy gate — number of confidential constraints in force, count of
 * authorized agent sessions, available rails, and gate awake/dormant
 * status. The pulse dot stays lagoon-bright while the gate is awake
 * (policy sealed and at least one active session) and fades to a
 * sand-mute tint while the operator is still completing setup.
 */
const POLICY_CONSTRAINT_COUNT = 4

export function MissionRibbon() {
  const { t } = useLocale()
  const { state } = useConsole()
  const { connected, data } = state

  const sessionsActive = (() => {
    const sessions = (data?.temporalKeys ?? data?.sessions ?? []) as Array<{
      authorized?: unknown
      expiresAt?: unknown
    }>
    return sessions.filter(
      (s) =>
        s &&
        s.authorized === true &&
        Number(s.expiresAt ?? 0) * 1000 > Date.now(),
    ).length
  })()

  const policySealed = Boolean(data?.usdcDcaPolicy?.enabled)
  const gateAwake = connected && policySealed && sessionsActive > 0

  const dotClass = gateAwake
    ? 'size-1.5 rounded-full bg-lagoon-bright animate-pulse'
    : 'size-1.5 rounded-full bg-sand/50'

  if (!connected) {
    return (
      <div className="relative z-[5] border-b border-line bg-bg-deep">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 py-2.5 md:py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            <span aria-hidden="true" className={dotClass} />
            <span className="text-ink-soft">{t('app.ribbon.thesis')}</span>
            <span aria-hidden="true" className="text-line">·</span>
            <span>{t('app.ribbon.scope')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-[5] border-b border-line bg-bg-deep">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 py-2.5 md:py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          <span aria-hidden="true" className={dotClass} />
          <span className="text-ink-soft">
            {t('app.ribbon.dynamic.policyEnforces')}{' '}
            <span className="text-lagoon-bright">
              {POLICY_CONSTRAINT_COUNT} {t('app.ribbon.dynamic.constraints')}
            </span>
          </span>
          <span aria-hidden="true" className="text-line">·</span>
          <span>
            <span className="text-lagoon-bright">{sessionsActive}</span>{' '}
            {sessionsActive === 1
              ? t('app.ribbon.dynamic.sessionSingular')
              : t('app.ribbon.dynamic.sessionsPlural')}
          </span>
          <span aria-hidden="true" className="text-line">·</span>
          <span>
            <span className="text-lagoon-bright">2</span>{' '}
            {t('app.ribbon.dynamic.rails')}
          </span>
          <span aria-hidden="true" className="text-line">·</span>
          <span className={gateAwake ? 'text-lagoon-bright' : 'text-coral'}>
            {gateAwake
              ? t('app.ribbon.dynamic.gateAwake')
              : t('app.ribbon.dynamic.gateDormant')}
          </span>
        </div>
      </div>
    </div>
  )
}
