import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../hooks/use-locale';
import ThemeToggle from './ThemeToggle';
import LocaleToggle from './LocaleToggle';

/**
 * Combined theme + locale preferences menu.
 *
 * Renders as a single gear-icon trigger in the header. Clicking opens a
 * popover panel that contains the full ThemeToggle and LocaleToggle
 * controls. Saves header horizontal space compared to rendering both
 * toggles inline, and matches the pattern used by modern SaaS headers
 * (Linear, Vercel, Supabase).
 *
 * Accessibility:
 * - Trigger has `aria-haspopup="menu"` + `aria-expanded`
 * - Closes on outside click, Escape key
 * - Panel is keyboard-reachable; individual toggles keep their own
 *   `role="radiogroup"` semantics
 * - Motion gated by `prefers-reduced-motion`
 */
export default function PreferencesMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="qe-prefs">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('prefs.aria.trigger')}
        title={t('prefs.aria.trigger')}
        className="qe-prefs__trigger"
      >
        <GearIcon />
      </button>

      {isOpen && (
        <div className="qe-prefs__panel" role="menu">
          <div className="qe-prefs__section">
            <p className="qe-prefs__label">{t('prefs.theme.label')}</p>
            <ThemeToggle />
          </div>
          <hr className="qe-prefs__divider" />
          <div className="qe-prefs__section">
            <p className="qe-prefs__label">{t('prefs.locale.label')}</p>
            <LocaleToggle />
          </div>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
