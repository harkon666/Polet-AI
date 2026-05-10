import { useLocale } from '#shared/hooks/use-locale'
import type { Locale } from '#shared/locale/dictionary'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'id', label: 'ID' },
  { value: 'en', label: 'EN' },
]

/**
 * LocaleToggle, a quiet 2-state segmented control for ID/EN.
 *
 * Calm visual: active button gets a subtle teal halo (bg-lagoon-bright/10)
 * with lagoon-bright text. Inactive sits at ink-mute, lifts to ink-soft
 * on hover. 200ms colour crossfade so the locale switch reads as
 * deliberate rather than abrupt.
 *
 * Touch targets are ~36 px outer (32 px tap area + container padding)
 * with `touch-manipulation` to suppress double-tap zoom on mobile.
 */
export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div
      role="group"
      aria-label={t('localeToggle.aria')}
      className="inline-flex w-fit items-center gap-0.5 rounded-full border border-line bg-surface/40 p-0.5 backdrop-blur-sm"
    >
      {LOCALES.map(({ value, label }) => {
        const isActive = locale === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={isActive}
            className={`inline-flex items-center justify-center min-w-[36px] min-h-[32px] rounded-full px-3 font-mono text-xs uppercase tracking-wider transition-colors duration-200 touch-manipulation ${
              isActive
                ? 'bg-lagoon-bright/10 text-lagoon-bright'
                : 'text-ink-mute hover:text-ink-soft'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
