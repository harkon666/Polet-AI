import { useEffect, useState, type ReactElement } from 'react';
import { useLocale } from '../hooks/use-locale';
import type { TranslationKey } from '../locale/dictionary';

type ThemeMode = 'light' | 'dark' | 'auto';

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto';
  }

  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }

  return 'auto';
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode;

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }

  document.documentElement.style.colorScheme = resolved;
}

const MODES: ReadonlyArray<{ mode: ThemeMode; ariaKey: TranslationKey; Icon: (props: { className?: string }) => ReactElement }> = [
  { mode: 'light', ariaKey: 'themeToggle.aria.light', Icon: SunIcon },
  { mode: 'dark', ariaKey: 'themeToggle.aria.dark', Icon: MoonIcon },
  { mode: 'auto', ariaKey: 'themeToggle.aria.auto', Icon: MonitorIcon },
];

/**
 * Segmented theme toggle: Light / Dark / Auto (system).
 *
 * Three explicit segments with sun/moon/monitor icons. Each segment is an
 * individually clickable radio button — click selects that mode directly
 * instead of cycling. Follows the Vercel/Linear/Mercury pattern used by
 * modern SaaS landing pages.
 *
 * `Auto` mode keeps the `<html>` element in sync with the user's OS
 * `prefers-color-scheme` and re-applies on media query change.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const { t } = useLocale();

  useEffect(() => {
    const initialMode = getInitialMode();
    setMode(initialMode);
    applyThemeMode(initialMode);
  }, []);

  useEffect(() => {
    if (mode !== 'auto') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('auto');

    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [mode]);

  function selectMode(next: ThemeMode) {
    if (next === mode) return;
    setMode(next);
    applyThemeMode(next);
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      // Ignore storage errors (private mode, sandboxed iframe).
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('themeToggle.aria.group')}
      className="qe-seg-toggle qe-seg-toggle--icons"
    >
      {MODES.map(({ mode: m, ariaKey, Icon }) => {
        const isActive = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t(ariaKey)}
            title={t(ariaKey)}
            onClick={() => selectMode(m)}
            className={`qe-seg-toggle__seg ${isActive ? 'qe-seg-toggle__seg--active' : ''}`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons — inline SVGs, 14px, currentColor so they adapt to light/dark/active
// ---------------------------------------------------------------------------

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="13" rx="2" ry="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
