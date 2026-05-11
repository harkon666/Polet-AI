import type { TranslationKey } from '#/locale/dictionary'
import { useLocale } from '#/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import { nextBlockingStep } from '../selectors/console-selectors'

/**
 * WorkspaceHero, the top of `/app/workspace`.
 *
 * Kicker + state-aware title + one-line sub + small status pill on
 * the right. The copy is entirely driven by
 * `nextBlockingStep(state)` — when everything is done the hero
 * celebrates "all rails ready"; otherwise it names the next step in
 * operator language ("fund custody", "seal policy", …).
 *
 * Visual style mirrors `<PortalPagePlaceholder>` so the portal
 * pages stay on the same hairline/whitespace rhythm. No card frame.
 */
export function WorkspaceHero() {
  const { t } = useLocale()
  const { state } = useConsole()
  const blocking = nextBlockingStep(state)

  const titleKey: TranslationKey =
    blocking === null
      ? 'portal.workspace.title.ready'
      : blocking === 'wallet'
        ? 'portal.workspace.title.needsWallet'
        : blocking === 'custody'
          ? 'portal.workspace.title.needsCustody'
          : blocking === 'policy'
            ? 'portal.workspace.title.needsPolicy'
            : blocking === 'session'
              ? 'portal.workspace.title.needsSession'
              : 'portal.workspace.title.needsGas'

  const subKey: TranslationKey =
    blocking === null
      ? 'portal.workspace.sub.ready'
      : blocking === 'wallet'
        ? 'portal.workspace.sub.needsWallet'
        : blocking === 'custody'
          ? 'portal.workspace.sub.needsCustody'
          : blocking === 'policy'
            ? 'portal.workspace.sub.needsPolicy'
            : blocking === 'session'
              ? 'portal.workspace.sub.needsSession'
              : 'portal.workspace.sub.needsGas'

  const isReady = blocking === null
  const statusKey: TranslationKey = isReady
    ? 'portal.workspace.status.ready'
    : 'portal.workspace.status.pending'

  return (
    <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.workspace.kicker')}
        </p>
        <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
          {t(titleKey)}
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
          {t(subKey)}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] ${
          isReady
            ? 'border-palm/40 bg-palm/10 text-palm'
            : 'border-line bg-surface/40 text-ink-mute'
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            isReady
              ? 'bg-palm shadow-[0_0_10px_rgba(74,222,128,0.55)]'
              : 'bg-sunset shadow-[0_0_10px_rgba(251,191,36,0.55)]'
          }`}
          aria-hidden="true"
        />
        {t(statusKey)}
      </span>
    </header>
  )
}
