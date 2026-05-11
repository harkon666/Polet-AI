import { useState } from 'react'
import { useLocale } from '#/hooks/use-locale'
import { Spinner } from '../Spinner'
import { useConsole } from '../use-console-actions'
import type { PolicyRevealKind } from '#/lib/api'

/**
 * PolicyRulesSection, the confidential policy update + reveal surface
 * on `/app/workspace`.
 *
 * Shows the current max-per-run, daily-cap, and daily-spent in three
 * hairline-divided rows. Each row has a Reveal button that requests
 * the owner-side Encrypt decryption flow (owner signs, ciphertext is
 * resolved through the Encrypt decryptor network, and the plaintext
 * lands in ephemeral tab-local state via `revealPolicyValue`). The
 * operator can then Hide it to drop from memory, or overwrite with
 * new values via the Update form below. Updating rotates every
 * ciphertext — previously-revealed values are cleared automatically.
 *
 * The Update form accepts max-per-run + daily-cap in USDC. Saving
 * calls `saveConfidentialPolicyCustom` which bumps policySeq on-chain.
 *
 * Visual language mirrors the rest of `/app/workspace`:
 *   - hairline-divided rows, no card walls
 *   - `font-mono text-[10px] uppercase tracking-[0.22em]` for kicker
 *   - palm = sealed, sunset = pending, ink-mute = not initialized
 *   - primary CTA: `border-lagoon-bright bg-lagoon-bright/15`
 *   - destructive / warn UI: coral (N/A here — all rows read-only)
 *
 * i18n: all strings via `portal.workspace.policyRules.*` keys.
 */
const REVEAL_ACTION_KEY: Record<
  PolicyRevealKind,
  'policy-reveal-max-per-run' | 'policy-reveal-daily-cap' | 'policy-reveal-daily-spent'
> = {
  'max-per-run': 'policy-reveal-max-per-run',
  'daily-cap': 'policy-reveal-daily-cap',
  'daily-spent': 'policy-reveal-daily-spent',
}

interface PolicyRow {
  kind: PolicyRevealKind
  labelKey:
    | 'portal.workspace.policyRules.field.maxPerRun.label'
    | 'portal.workspace.policyRules.field.dailyCap.label'
    | 'portal.workspace.policyRules.field.dailySpent.label'
  helpKey:
    | 'portal.workspace.policyRules.field.maxPerRun.help'
    | 'portal.workspace.policyRules.field.dailyCap.help'
    | null
}

const ROWS: PolicyRow[] = [
  {
    kind: 'max-per-run',
    labelKey: 'portal.workspace.policyRules.field.maxPerRun.label',
    helpKey: 'portal.workspace.policyRules.field.maxPerRun.help',
  },
  {
    kind: 'daily-cap',
    labelKey: 'portal.workspace.policyRules.field.dailyCap.label',
    helpKey: 'portal.workspace.policyRules.field.dailyCap.help',
  },
  {
    kind: 'daily-spent',
    labelKey: 'portal.workspace.policyRules.field.dailySpent.label',
    helpKey: null,
  },
]

export function PolicyRulesSection() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const [maxPerRunDraft, setMaxPerRunDraft] = useState('10')
  const [dailyCapDraft, setDailyCapDraft] = useState('20')

  const owner = state.publicKey
  const data = state.data
  const sealed = Boolean(data?.usdcDcaPolicy?.enabled)
  const policySeq = Number(data?.policySeq ?? 0)
  const walletExists = Boolean(data?.walletPda)
  const custodyConfigured = Boolean(data?.demoCustody?.configured)
  const canEdit = Boolean(owner) && walletExists && custodyConfigured
  const revealedPolicyValues = state.revealedPolicyValues ?? {}
  const saveBusy = state.loading === 'policy-custom'
  const anyLoading = state.loading !== null

  const statusPill = sealed ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-palm/40 bg-palm/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-palm">
      <span
        className="size-1.5 rounded-full bg-palm shadow-[0_0_10px_rgba(74,222,128,0.55)]"
        aria-hidden="true"
      />
      {t('portal.workspace.policyRules.status.sealed')}
      {policySeq}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
      <span className="size-1.5 rounded-full bg-ink-mute/60" aria-hidden="true" />
      {t('portal.workspace.policyRules.status.notSealed')}
    </span>
  )

  const renderRow = (row: PolicyRow) => {
    const revealed = revealedPolicyValues[row.kind]
    const revealBusy = state.loading === REVEAL_ACTION_KEY[row.kind]
    return (
      <li
        key={row.kind}
        data-testid={`policy-rules-row-${row.kind}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-4 last:border-b-0"
      >
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-ink">
            {t(row.labelKey)}
          </p>
          {row.helpKey ? (
            <p className="mt-1 max-w-xl font-sans text-xs leading-relaxed text-ink-mute">
              {t(row.helpKey)}
            </p>
          ) : null}
          {revealed ? (
            <p
              data-testid={`policy-rules-revealed-${row.kind}`}
              className="mt-2 font-mono text-sm tabular-nums text-palm"
            >
              {revealed} USDC
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {t('portal.workspace.policyRules.revealedNote')}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {revealed ? (
            <button
              type="button"
              data-testid={`policy-rules-hide-${row.kind}`}
              onClick={() => actions.hidePolicyValue(row.kind)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink"
            >
              {t('portal.workspace.policyRules.hide')}
            </button>
          ) : (
            <button
              type="button"
              data-testid={`policy-rules-reveal-${row.kind}`}
              onClick={() => void actions.revealPolicyValue(row.kind)}
              disabled={!sealed || anyLoading}
              className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright/60 bg-lagoon-bright/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revealBusy ? <Spinner size={10} /> : null}
              {t('portal.workspace.policyRules.reveal')}
            </button>
          )}
        </div>
      </li>
    )
  }

  const handleSubmit = async () => {
    const max = maxPerRunDraft.trim()
    const cap = dailyCapDraft.trim()
    if (!max || !cap) return
    const maxNum = Number(max)
    const capNum = Number(cap)
    if (!Number.isFinite(maxNum) || maxNum <= 0) return
    if (!Number.isFinite(capNum) || capNum < maxNum) return
    await actions.saveConfidentialPolicyCustom({
      maxPerRunUsdc: max,
      dailyCapUsdc: cap,
    })
  }

  const submitDisabled = (() => {
    if (!canEdit || saveBusy || anyLoading) return true
    const maxNum = Number(maxPerRunDraft)
    const capNum = Number(dailyCapDraft)
    if (!Number.isFinite(maxNum) || maxNum <= 0) return true
    if (!Number.isFinite(capNum) || capNum < maxNum) return true
    return false
  })()

  return (
    <section
      data-testid="policy-rules-section"
      className="mt-12 border-t border-line pt-10"
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.workspace.policyRules.kicker')}
          </p>
          <h2 className="mt-2 font-sans text-xl font-bold tracking-[-0.02em] text-ink md:text-2xl">
            {t('portal.workspace.policyRules.title')}
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft">
            {t('portal.workspace.policyRules.sub')}
          </p>
        </div>
        {statusPill}
      </header>

      {!canEdit ? (
        <p
          data-testid="policy-rules-not-initialized"
          className="mt-6 font-sans text-sm leading-relaxed text-sunset"
        >
          {t('portal.workspace.policyRules.notInitialized')}
        </p>
      ) : null}

      <ul className="mt-6" aria-label={t('portal.workspace.policyRules.title')}>
        {ROWS.map(renderRow)}
      </ul>

      <div
        data-testid="policy-rules-form"
        className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <div>
          <label
            htmlFor="policy-rules-max-per-run"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
          >
            {t('portal.workspace.policyRules.field.maxPerRun.label')}
          </label>
          <input
            id="policy-rules-max-per-run"
            data-testid="policy-rules-max-input"
            type="number"
            step="1"
            min="0"
            value={maxPerRunDraft}
            onChange={(e) => setMaxPerRunDraft(e.target.value)}
            disabled={!canEdit || saveBusy}
            className="w-full rounded-md border border-line bg-surface/40 px-3 py-2 font-mono text-sm tabular-nums text-ink focus:border-lagoon-bright focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="policy-rules-daily-cap"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute"
          >
            {t('portal.workspace.policyRules.field.dailyCap.label')}
          </label>
          <input
            id="policy-rules-daily-cap"
            data-testid="policy-rules-cap-input"
            type="number"
            step="1"
            min="0"
            value={dailyCapDraft}
            onChange={(e) => setDailyCapDraft(e.target.value)}
            disabled={!canEdit || saveBusy}
            className="w-full rounded-md border border-line bg-surface/40 px-3 py-2 font-mono text-sm tabular-nums text-ink focus:border-lagoon-bright focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          data-testid="policy-rules-submit"
          onClick={() => void handleSubmit()}
          disabled={submitDisabled}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveBusy ? <Spinner size={10} /> : null}
          {t('portal.workspace.policyRules.submit')}
        </button>
      </div>
    </section>
  )
}
