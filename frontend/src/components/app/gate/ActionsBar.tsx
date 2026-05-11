import { useLocale } from '#/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'
import {
  getActiveIkaChain,
  hasActiveSession,
} from '../selectors/console-selectors'
import type { Rail } from './gate-state'

/**
 * ActionsBar, the Policy Gate page's single-action surface.
 *
 * Post-BYO redesign: the gate page is now an **owner self-test
 * surface**. The operator enters a free-form USDC amount and presses
 * a single primary button that fires
 * `useConsole().actions.executeAsOwnerSession({ rail, amountUsdc })`.
 *
 * The action:
 *   1. Checks that the connected wallet (owner) is registered as an
 *      authorized session on-chain — if not, the button is swapped
 *      for an "Authorize yourself as session" CTA that calls
 *      `grantAgentSessionByo({ agentPubkey: owner.toBase58() })` so
 *      the owner pubkey becomes a valid session entry alongside any
 *      BYO agent pubkeys (Hermes / Claude / Cursor can coexist via
 *      their own session entries; revoke-all is the global kill).
 *   2. Evaluates the confidential policy at the chosen amount. If
 *      blocked → emits a blocked receipt, stops.
 *   3. If allowed → signs + broadcasts the smart-wallet transaction
 *      via Phantom (single signature fulfils both fee-payer and
 *      session-signer roles since owner == session for this path).
 *      For Ika, then progresses the lifecycle so a real signature is
 *      committed on-chain.
 *
 * The previous "Preview / Try blocked / Execute with session key"
 * triad is gone — scenario chips drive the amount input (presets),
 * and the amount input itself is free-form so operators can test
 * their confidential policy against any value.
 */
export function ActionsBar({
  rail,
  amountUsdc,
}: {
  rail: Rail
  amountUsdc: string
}) {
  const { t } = useLocale()
  const { state, actions } = useConsole()

  const sessionActive = hasActiveSession(state)
  const ownerPubkey = state.publicKey?.toBase58()
  const sessions =
    (state.data?.temporalKeys ?? state.data?.sessions ?? []) as Array<{
      key?: unknown
      authorized?: unknown
      expiresAt?: unknown
      grantedSlot?: unknown
    }>
  const lastRevokedSlot = Number(state.data?.lastRevokedSlot ?? 0)
  const ownerIsSession =
    !!ownerPubkey &&
    sessions.some(
      (s) =>
        s &&
        String(s.key ?? '') === ownerPubkey &&
        s.authorized === true &&
        Number(s.expiresAt ?? 0) * 1000 > Date.now() &&
        Number(s.grantedSlot ?? 0) >= lastRevokedSlot,
    )

  const ikaChain = getActiveIkaChain(state)
  const anyLoading = state.loading !== null
  const runLoading =
    state.loading ===
    (rail === 'jupiter' ? 'test-policy-jupiter' : 'test-policy-ika')
  const authorizeLoading = state.loading === 'session-byo'

  const amountNum = Number(amountUsdc)
  const amountValid = Number.isFinite(amountNum) && amountNum > 0

  const runDisabled =
    !sessionActive ||
    !ownerIsSession ||
    !amountValid ||
    anyLoading ||
    (rail === 'ika' && ikaChain !== 'sui')

  const runDisabledHint = !sessionActive
    ? t('portal.gate.actions.disabledNoSession')
    : !ownerIsSession
      ? t('portal.gate.actions.disabledOwnerNotSession')
      : !amountValid
        ? t('portal.gate.actions.disabledInvalidAmount')
        : rail === 'ika' && ikaChain !== 'sui'
          ? t('portal.gate.actions.disabledNoIkaChain')
          : undefined

  const handleRun = () => {
    void actions.executeAsOwnerSession({ rail, amountUsdc })
  }

  const handleAuthorizeSelf = () => {
    if (!ownerPubkey) return
    void actions.grantAgentSessionByo({
      agentPubkey: ownerPubkey,
      expiresInHours: 24,
      dailyLimitSol: 0.05,
    })
  }

  return (
    <div
      data-testid="gate-actions-bar"
      className="mt-10 flex flex-col gap-4 border-t border-line pt-6 md:mt-12 md:pt-8"
    >
      {!ownerIsSession && ownerPubkey ? (
        <div
          data-testid="gate-authorize-banner"
          className="flex flex-col gap-3 rounded-xl border border-sunset/40 bg-sunset/10 p-4 md:flex-row md:items-center md:justify-between"
        >
          <p className="max-w-2xl font-sans text-sm leading-relaxed text-ink">
            <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.22em] text-sunset">
              {t('portal.gate.actions.authorizeSelf.kicker')}
            </span>
            {t('portal.gate.actions.authorizeSelf.body')}
          </p>
          <button
            type="button"
            data-testid="gate-action-authorize-self"
            onClick={handleAuthorizeSelf}
            disabled={anyLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-sunset/60 bg-sunset/20 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-sunset transition-colors hover:bg-sunset/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {authorizeLoading ? <Spinner size={11} /> : null}
            {t('portal.gate.actions.authorizeSelf.button')}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl font-sans text-xs leading-relaxed text-ink-mute">
          {t('portal.gate.actions.footnote')}
        </p>
        <button
          type="button"
          data-testid="gate-action-run"
          onClick={handleRun}
          disabled={runDisabled}
          title={runDisabled && !anyLoading ? runDisabledHint : undefined}
          className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lagoon-bright/15"
        >
          {runLoading ? <Spinner size={11} /> : null}
          {t('portal.gate.actions.run')}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}
