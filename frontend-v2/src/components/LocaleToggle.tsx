import { useLocale } from '#shared/hooks/use-locale'
import type { Locale } from '#shared/locale/dictionary'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'id', label: 'ID' },
  { value: 'en', label: 'EN' },
]

/**
 * Locale toggle pill — switches between ID and EN.
 * Persists via localStorage and broadcasts to all `useLocale()` instances
 * via the custom event in `#shared/hooks/use-locale.ts`.
 */
export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div
      className="inline-flex items-center rounded-full border border-line p-0.5 bg-surface/50 backdrop-blur-sm"
      role="group"
      aria-label={t('localeToggle.aria')}
    >
      {LOCALES.map(({ value, label }) => {
        const isActive = locale === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={isActive}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-full transition ${
              isActive
                ? 'bg-lagoon text-bg-base font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
