import { useLocale } from '../hooks/use-locale';

/**
 * Hero product preview — static mock "console" rendered inside a
 * macOS-style window frame. Gives reviewers a concrete visual anchor for
 * the abstract hero copy without depending on /app being screenshot-ready.
 *
 * Design rules (from issue 083):
 * - Single focal visual, no floating composition.
 * - Mock content is decorative — internal text is `aria-hidden`, a single
 *   `aria-label` summarizes the visual for screen readers.
 * - No auto-animation. Optional fade-in respects `prefers-reduced-motion`.
 */
export function HeroPreview() {
  const { t } = useLocale();

  return (
    <div
      className="qe-product-frame"
      role="img"
      aria-label={t('hero.preview.aria')}
    >
      <div className="qe-product-frame__chrome" aria-hidden="true">
        <div className="qe-product-frame__dots">
          <span className="qe-product-frame__dot qe-product-frame__dot--close" />
          <span className="qe-product-frame__dot qe-product-frame__dot--min" />
          <span className="qe-product-frame__dot qe-product-frame__dot--max" />
        </div>
        <div className="qe-product-frame__url">polet.ai/app</div>
      </div>

      <div className="qe-product-frame__viewport" aria-hidden="true">
        <div className="qe-preview-card">
          <div className="qe-preview-card__header">
            <span className="qe-preview-card__kicker">
              {t('hero.preview.card.title')}
            </span>
            <span className="qe-preview-card__alpha-badge">Pre-Alpha</span>
          </div>

          <dl className="qe-preview-card__rows">
            <div className="qe-preview-card__row">
              <dt>{t('hero.preview.row.maxPerRun')}</dt>
              <dd className="qe-preview-card__masked">••• USDC</dd>
            </div>
            <div className="qe-preview-card__row">
              <dt>{t('hero.preview.row.dailyCap')}</dt>
              <dd className="qe-preview-card__masked">••• USDC</dd>
            </div>
          </dl>

          <hr className="qe-preview-card__divider" />

          <div className="qe-preview-card__session">
            <span className="qe-status-dot qe-status-dot--palm" aria-hidden="true" />
            <span className="qe-preview-card__session-label">
              {t('hero.preview.row.sessionLabel')}
            </span>
            <span className="qe-preview-card__session-key">sess_7f3a…e2b1</span>
          </div>

          <div className="qe-preview-card__blocked">
            <span className="qe-preview-card__amount">25 USDC</span>
            <span className="qe-preview-card__blocked-label">
              {t('hero.preview.row.blockedLabel')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
