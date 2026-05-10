import { useLocale } from '../hooks/use-locale';
import { type Locale } from '../locale/dictionary';

const ORDER: Locale[] = ['en', 'id'];

/**
 * Segmented locale toggle: EN / ID.
 *
 * Each locale is an individually clickable radio button — click selects
 * that locale directly. Uses the shared `.qe-seg-toggle` primitive so
 * visual styling stays in lock-step with `ThemeToggle`.
 */
export default function LocaleToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="radiogroup"
      aria-label={t('localeToggle.aria')}
      className="qe-seg-toggle"
    >
      {ORDER.map((loc) => {
        const isActive = loc === locale;
        const labelKey = `localeToggle.${loc}` as const;
        const label = t(labelKey);
        return (
          <button
            key={loc}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => setLocale(loc)}
            className={`qe-seg-toggle__seg ${isActive ? 'qe-seg-toggle__seg--active' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
