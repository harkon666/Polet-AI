import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'

/**
 * PortalPagePlaceholder, used by Phase 1 to render every `/app/*`
 * sub-route until the corresponding phase wires the real component.
 *
 * Visual: kicker + title + 1-line sub + small "phase pending" pill
 * on the right. No card frames. Whitespace + hairline rhythm only.
 *
 * Phases 2–6 replace each call site with the real page composition.
 */
export function PortalPagePlaceholder({
  kickerKey,
  titleKey,
  subKey,
}: {
  kickerKey: TranslationKey
  titleKey: TranslationKey
  subKey: TranslationKey
}) {
  const { t } = useLocale()

  return (
    <header className="flex flex-col gap-3 border-b border-line pb-8 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-12">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
          {t(kickerKey)}
        </p>
        <h1 className="mt-3 max-w-3xl font-sans text-3xl font-bold leading-[1.04] tracking-[-0.05em] text-ink md:text-4xl lg:text-5xl">
          {t(titleKey)}
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft md:text-base">
          {t(subKey)}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        <span className="size-1.5 rounded-full bg-sunset shadow-[0_0_10px_rgba(251,191,36,0.55)]" aria-hidden="true" />
        {t('portal.placeholder.pending')}
      </span>
    </header>
  )
}
