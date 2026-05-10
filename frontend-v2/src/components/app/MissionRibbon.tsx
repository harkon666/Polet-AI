import { useLocale } from '#shared/hooks/use-locale'

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
 * Pulse dot is lagoon-bright with a slow opacity breathe, matching
 * the Hero's MetaPill devnet treatment.
 */
export function MissionRibbon() {
  const { t } = useLocale()
  return (
    <div className="relative z-[5] border-b border-line bg-bg-deep">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 py-2.5 md:py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-lagoon-bright animate-pulse"
          />
          <span className="text-ink-soft">{t('app.ribbon.thesis')}</span>
          <span aria-hidden="true" className="text-line">·</span>
          <span>{t('app.ribbon.scope')}</span>
        </div>
      </div>
    </div>
  )
}
