import { useCallback, useEffect, useState } from 'react';
import {
  type Locale,
  type TranslationKey,
  getTranslation,
  isSupportedLocale,
} from '../locale/dictionary';

const STORAGE_KEY = 'polet.locale';
const CHANGE_EVENT = 'polet:locale-change';

/**
 * Detect the initial locale on first paint.
 *
 * Order of precedence:
 *   1. Stored value in localStorage (user previously chose)
 *   2. `navigator.language` — if it starts with 'id' → Indonesian, else English
 *   3. SSR/non-browser fallback → English
 */
function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // localStorage may be blocked (private mode, sandboxed iframe). Fall through.
  }

  const navLang = window.navigator?.language ?? '';
  return navLang.toLowerCase().startsWith('id') ? 'id' : 'en';
}

interface UseLocaleResult {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
}

/**
 * Read & write the active marketing locale.
 *
 * Multiple components calling `useLocale()` stay in sync via a custom window
 * event — when one component updates locale, every other instance receives
 * the change and re-renders. localStorage persists the choice across sessions.
 *
 * The hook also keeps `<html lang>` in sync so the document root reflects
 * the active language for assistive tech and SEO.
 */
export function useLocale(): UseLocaleResult {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  // Subscribe to cross-component locale changes
  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (isSupportedLocale(next)) {
        setLocaleState(next);
      }
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  // Reflect locale in <html lang> on every change (and initial paint)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isSupportedLocale(next)) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors — locale still updates in-memory.
    }

    // Update local state immediately and notify other instances
    setLocaleState(next);
    window.dispatchEvent(new CustomEvent<Locale>(CHANGE_EVENT, { detail: next }));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => getTranslation(locale, key),
    [locale]
  );

  return { locale, setLocale, t };
}
