import { useLocale } from '#/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'
import type { ActionKey } from '../use-console-actions'
import {
  getActiveIkaChain,
  hasActiveSession,
} from '../selectors/console-selectors'
import type { Rail, Scenario } from './gate-state'

/**
 * ActionsBar, the Policy Gate page's primary action surface.
 *
 * Three buttons (left-to-right):
 *   1. **Preview gate** — fires the rail's `…Allow` action. Equivalent
 *      to the existing `<RailCard>` allow button. Disabled when no
 *      active session.
 *   2. **Try blocked amount** — switches the parent scenario to
 *      `block-25` and fires the rail's `…Block` action. Mirrors the
 *      blocked demo path in `<TwoRailConsole>`.
 *   3. **Execute with session key** — fires the rail's execute action.
 *      Disabled when no active session, no session keypair in memory,
 *      or (Ika) when no managed Sui dWallet has been registered.
 *
 * All three buttons stay disabled while any console action is in flight
 * to prevent double-fires. Loading spinners reuse the existing
 * `<Spinner>` primitive so the visual language matches `<RailCard>`.
 *
 * Wiring policy:
 *   - Direct calls into `useConsole().actions` — no intermediate
 *     handlers per the issue 101 acceptance criteria ("reuse existing
 *     rail action functions on `useConsole()` as-is").
 *   - The parent route owns scenario state, so "Try blocked amount"
 *     calls `onScenarioChange('block-25')` before kicking off the
 *     block action.
 */

function previewActionKey(rail: Rail): ActionKey {
  return rail === 'jupiter' ? 'jupiter-allow' : 'ika-allow'
}

function blockActionKey(rail: Rail): ActionKey {
  return rail === 'jupiter' ? 'jupiter-block' : 'ika-block'
}

function executeActionKey(rail: Rail): ActionKey {
  return rail === 'jupiter' ? 'jupiter-execute' : 'ika-execute'
}

export function ActionsBar({
  rail,
  onScenarioChange,
}: {
  rail: Rail
  onScenarioChange: (scenario: Scenario) => void
}) {
  const { t } = useLocale()
  const { state, actions } = useConsole()

  const sessionActive = hasActiveSession(state)
  const sessionKeypairReady = state.sessionKeypair !== null
  const ikaChain = getActiveIkaChain(state)
  const anyLoading = state.loading !== null

  const previewLoading = state.loading === previewActionKey(rail)
  const blockLoading = state.loading === blockActionKey(rail)
  const executeLoading = state.loading === executeActionKey(rail)

  const previewDisabled = !sessionActive || anyLoading
  const blockDisabled = !sessionActive || anyLoading
  const executeDisabled =
    !sessionActive ||
    anyLoading ||
    !sessionKeypairReady ||
    (rail === 'ika' && ikaChain !== 'sui')

  // Disabled-reason hint — surfaced via title attribute so hovering an
  // ineligible button explains why. Mirrors how `<RailCard>` reasons
  // about its disabled state without inventing new language.
  const executeDisabledHint = !sessionActive
    ? t('portal.gate.actions.disabledNoSession')
    : !sessionKeypairReady
      ? t('portal.gate.actions.disabledNoSessionKey')
      : rail === 'ika' && ikaChain !== 'sui'
        ? t('portal.gate.actions.disabledNoIkaChain')
        : undefined

  const handlePreview = () => {
    if (rail === 'jupiter') void actions.runJupiterAllow()
    else void actions.runIkaAllow()
  }

  const handleTryBlocked = () => {
    onScenarioChange('block-25')
    if (rail === 'jupiter') void actions.runJupiterBlock()
    else void actions.runIkaBlock()
  }

  const handleExecute = () => {
    if (rail === 'jupiter') void actions.executeJupiter()
    else void actions.executeIka()
  }

  return (
    <div
      data-testid="gate-actions-bar"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 md:mt-12 md:pt-8"
    >
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="gate-action-preview"
          onClick={handlePreview}
          disabled={previewDisabled}
          title={previewDisabled && !anyLoading ? t('portal.gate.actions.disabledNoSession') : undefined}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          {previewLoading ? <Spinner size={11} /> : null}
          {t('portal.gate.actions.preview')}
        </button>

        <button
          type="button"
          data-testid="gate-action-try-blocked"
          onClick={handleTryBlocked}
          disabled={blockDisabled}
          title={blockDisabled && !anyLoading ? t('portal.gate.actions.disabledNoSession') : undefined}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-coral/40 hover:text-coral disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          {blockLoading ? <Spinner size={11} /> : null}
          {t('portal.gate.actions.tryBlocked')}
        </button>
      </div>

      <button
        type="button"
        data-testid="gate-action-execute"
        onClick={handleExecute}
        disabled={executeDisabled}
        title={executeDisabled && !anyLoading ? executeDisabledHint : undefined}
        className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lagoon-bright/15"
      >
        {executeLoading ? <Spinner size={11} /> : null}
        {t('portal.gate.actions.execute')}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}
