import { createFileRoute, Link } from '@tanstack/react-router';
import { LandingDemoWidget } from '../components/LandingDemoWidget';
import { StatsCounter } from '../components/StatsCounter';
import { FlowDiagram } from '../components/FlowDiagram';
import { RailMockup } from '../components/RailMockup';
import { BrandLogo } from '../components/BrandLogo';
import { HeroPreview } from '../components/HeroPreview';
import { useLocale } from '../hooks/use-locale';
import { useScrollReveal } from '../hooks/useScrollReveal';
import type { TranslationKey } from '../locale/dictionary';
import landingStatsJson from '../data/landing-stats.json';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// ---------------------------------------------------------------------------
// Static data — brand identifiers and structure only. All user-facing copy
// is referenced via TranslationKey and resolved through t() at render time.
// ---------------------------------------------------------------------------

const TRUST_PARTNERS = [
  { brand: 'solana', label: 'Solana' },
  { brand: 'encrypt', label: 'Encrypt Pre-Alpha' },
  { brand: 'ika', label: 'Ika dWallet' },
  { brand: 'jupiter', label: 'Jupiter API' },
  { brand: 'anchor', label: 'Anchor 1.0' },
] as const;

const STATS: Array<{ value: number; labelKey: TranslationKey; subKey: TranslationKey }> = (
  landingStatsJson.items as Array<{ key: string; value: number }>
).map((item) => ({
  value: item.value,
  labelKey: `${item.key}.label` as TranslationKey,
  subKey: `${item.key}.sub` as TranslationKey,
}));

const PROBLEMS: Array<{ n: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
  { n: '01', titleKey: 'manifesto.problem1.title', descKey: 'manifesto.problem1.desc' },
  { n: '02', titleKey: 'manifesto.problem2.title', descKey: 'manifesto.problem2.desc' },
  { n: '03', titleKey: 'manifesto.problem3.title', descKey: 'manifesto.problem3.desc' },
];

const SECURITY_FACTS: Array<{ icon: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
  { icon: 'PDA', titleKey: 'security.fact.pda.title', descKey: 'security.fact.pda.desc' },
  { icon: 'KEY', titleKey: 'security.fact.session.title', descKey: 'security.fact.session.desc' },
  { icon: '↻', titleKey: 'security.fact.replay.title', descKey: 'security.fact.replay.desc' },
  { icon: 'M·N', titleKey: 'security.fact.quorum.title', descKey: 'security.fact.quorum.desc' },
];

type RailId = 'encrypt' | 'ika' | 'jupiter';

interface RailConfig {
  id: RailId;
  n: string;
  label: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  bulletKeys: TranslationKey[];
  refKey: TranslationKey;
  href: string;
  railClass: string;
}

const RAILS: RailConfig[] = [
  {
    id: 'encrypt',
    n: '01',
    label: 'Encrypt',
    titleKey: 'rail.encrypt.title',
    bodyKey: 'rail.encrypt.body',
    bulletKeys: [
      'rail.encrypt.bullet.1',
      'rail.encrypt.bullet.2',
      'rail.encrypt.bullet.3',
      'rail.encrypt.bullet.4',
    ],
    refKey: 'rail.encrypt.ref',
    href: 'https://github.com/dwallet-labs/encrypt-pre-alpha',
    railClass: 'qe-rail--encrypt',
  },
  {
    id: 'ika',
    n: '02',
    label: 'Ika dWallet',
    titleKey: 'rail.ika.title',
    bodyKey: 'rail.ika.body',
    bulletKeys: [
      'rail.ika.bullet.1',
      'rail.ika.bullet.2',
      'rail.ika.bullet.3',
      'rail.ika.bullet.4',
    ],
    refKey: 'rail.ika.ref',
    href: 'https://docs.ika.xyz/',
    railClass: 'qe-rail--ika',
  },
  {
    id: 'jupiter',
    n: '03',
    label: 'Jupiter',
    titleKey: 'rail.jupiter.title',
    bodyKey: 'rail.jupiter.body',
    bulletKeys: [
      'rail.jupiter.bullet.1',
      'rail.jupiter.bullet.2',
      'rail.jupiter.bullet.3',
      'rail.jupiter.bullet.4',
    ],
    refKey: 'rail.jupiter.ref',
    href: 'https://jup.ag/',
    railClass: 'qe-rail--jupiter',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function HomePage() {
  const revealRef = useScrollReveal();
  const { t } = useLocale();

  return (
    <main ref={revealRef}>
      {/* ============================================================
          HERO — type-driven + product preview (2-col on md+)
         ============================================================ */}
      <section className="qe-hero qe-hero--type">
        <div className="page-wrap relative px-4 pb-16 pt-12 md:pb-20 md:pt-16 lg:pt-20">
          <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 lg:gap-16">
            <div>
              <p className="qe-hero-kicker">{t('hero.kicker')}</p>

              <h1 className="qe-hero-headline">
                <span className="block">{t('hero.headline.line1')}</span>
                <span className="block">{t('hero.headline.line2')}</span>
              </h1>

              <p className="qe-hero-subhead">{t('hero.subhead')}</p>

              <div className="qe-hero-cta-row">
                <Link to="/app" className="qe-button qe-button--primary qe-button--xl">
                  {t('hero.cta.primary')}
                  <span aria-hidden="true">→</span>
                </Link>
                <a
                  href="#demo-widget"
                  className="qe-button qe-button--secondary qe-button--xl"
                >
                  {t('hero.cta.secondary')}
                </a>
              </div>

              <div className="qe-hero-meta">
                <span className="qe-badge qe-badge--devnet">
                  <span className="qe-status-dot" aria-hidden="true" />
                  {t('hero.meta.devnet')}
                </span>
                <span className="qe-badge qe-badge--alpha">{t('hero.meta.preAlpha')}</span>
                <span className="qe-hero-meta__sep">·</span>
                <span className="qe-hero-meta__item">{t('hero.meta.programLabel')} 3bJjt…bkeN</span>
                <span className="qe-hero-meta__sep">·</span>
                <span className="qe-hero-meta__item">{t('hero.meta.testsPassing')}</span>
                <span className="qe-hero-meta__sep">·</span>
                <span className="qe-hero-meta__item">{t('hero.meta.e2eVerified')}</span>
              </div>
            </div>

            <div className="md:pl-4">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST STRIP
         ============================================================ */}
      <section className="qe-trust-strip qe-reveal">
        <div className="page-wrap px-4">
          <p className="mt-7 mb-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--kicker)]">
            {t('trust.kicker')}
          </p>
        </div>
        <div className="qe-trust-strip__marquee" aria-label={t('trust.kicker')}>
          <div className="qe-trust-strip__track">
            {TRUST_PARTNERS.map((p) => (
              <span key={`a-${p.label}`} className="qe-trust-strip__item">
                <BrandLogo brand={p.brand} size={22} />
                {p.label}
              </span>
            ))}
            {TRUST_PARTNERS.map((p) => (
              <span
                key={`b-${p.label}`}
                className="qe-trust-strip__item"
                aria-hidden="true"
              >
                <BrandLogo brand={p.brand} size={22} />
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* Colosseum badge — separate "participating in" signal */}
        <div className="page-wrap mt-4 flex justify-center px-4 pb-6">
          <a
            href="https://colosseum.com/frontier"
            target="_blank"
            rel="noreferrer"
            className="qe-colosseum-badge"
          >
            <img
              src="/brand/colosseum-symbol.svg"
              alt=""
              width={18}
              height={18}
              aria-hidden="true"
            />
            <span>{t('trust.colosseum.label')}</span>
          </a>
        </div>
      </section>

      {/* ============================================================
          STATS COUNTER
         ============================================================ */}
      <section className="page-wrap px-4 py-16 md:py-24">
        <div className="qe-stats qe-reveal-stagger">
          {STATS.map((s) => (
            <div key={s.labelKey} className="qe-stat">
              <span className="qe-stat__value">
                <StatsCounter target={s.value} />
              </span>
              <span className="qe-stat__label">{t(s.labelKey)}</span>
              <span className="qe-stat__sub">{t(s.subKey)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          MANIFESTO / PROBLEM
         ============================================================ */}
      <section className="border-y border-[var(--line)] bg-[var(--foam)] qe-reveal">
        <div className="page-wrap grid gap-12 px-4 py-16 md:grid-cols-[5fr_7fr] md:gap-16 md:py-24">
          <div>
            <p className="island-kicker mb-4">{t('manifesto.kicker')}</p>
            <h2 className="display-title text-3xl font-bold leading-[1.1] tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
              {t('manifesto.headlineLead')}{' '}
              <span className="text-[var(--sea-ink-soft)]">
                {t('manifesto.headlineRest')}
              </span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[var(--sea-ink-soft)]">
              {t('manifesto.body')}
            </p>
          </div>
          <ul className="space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p.n} className="qe-card flex items-start gap-5">
                <span
                  className="flex-shrink-0 font-mono text-2xl font-extrabold leading-none text-[var(--lagoon)]"
                  aria-hidden="true"
                >
                  {p.n}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--sea-ink)]">{t(p.titleKey)}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--sea-ink-soft)]">{t(p.descKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================
          HOW YOU USE POLET — 3 steps before the architecture diagram
         ============================================================ */}
      <section className="page-wrap px-4 pt-16 md:pt-24 qe-reveal">
        <div className="mb-10 max-w-3xl">
          <p className="island-kicker mb-3">{t('howto.kicker')}</p>
          <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
            {t('howto.headline')}
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3 md:gap-6 qe-reveal-stagger">
          {[
            { n: '01', titleKey: 'howto.step.1.title' as const, descKey: 'howto.step.1.desc' as const },
            { n: '02', titleKey: 'howto.step.2.title' as const, descKey: 'howto.step.2.desc' as const },
            { n: '03', titleKey: 'howto.step.3.title' as const, descKey: 'howto.step.3.desc' as const },
          ].map((step) => (
            <li key={step.n} className="qe-card flex flex-col gap-3 p-6">
              <span className="font-mono text-2xl font-extrabold leading-none text-[var(--lagoon)]" aria-hidden="true">
                {step.n}
              </span>
              <h3 className="text-base font-semibold leading-tight text-[var(--sea-ink)]">
                {t(step.titleKey)}
              </h3>
              <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                {t(step.descKey)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============================================================
          ARCHITECTURE FLOW DIAGRAM
         ============================================================ */}
      <section className="page-wrap px-4 py-16 md:py-24 qe-reveal-scale">
        <div className="mb-10 max-w-3xl">
          <p className="island-kicker mb-3">{t('flow.kicker')}</p>
          <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
            {t('flow.headline.lead')}
            <br />
            <span className="text-[var(--lagoon)]">{t('flow.headline.rest')}</span>
          </h2>
        </div>

        <div className="qe-card overflow-x-auto p-4 sm:p-8">
          <FlowDiagram />
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--sea-ink-soft)]">
          {t('flow.body')}
        </p>
      </section>

      {/* ============================================================
          RAIL SECTIONS — alternating left/right
         ============================================================ */}
      {RAILS.map((rail, idx) => {
        const reversed = idx % 2 === 1;
        return (
          <section
            key={rail.id}
            className={`qe-rail-section ${rail.railClass} border-t border-[var(--line)] ${idx % 2 === 0 ? 'qe-reveal-left' : 'qe-reveal-right'}`}
            style={
              {
                background:
                  idx % 2 === 0 ? 'var(--surface)' : 'var(--foam)',
              } as React.CSSProperties
            }
          >
            <div
              className={`page-wrap grid gap-10 px-4 py-16 md:gap-16 md:py-24 ${
                reversed ? 'md:grid-cols-[7fr_5fr]' : 'md:grid-cols-[5fr_7fr]'
              }`}
            >
              <div className={reversed ? 'md:order-2' : 'md:order-1'}>
                <RailMockup variant={rail.id} />
              </div>

              <div className={reversed ? 'md:order-1' : 'md:order-2'}>
                <span className="qe-rail-kicker mb-5">
                  <span className="qe-rail-kicker__icon" aria-hidden="true">
                    <BrandLogo brand={rail.id} size={12} />
                  </span>
                  <span className="qe-rail-kicker__num">RAIL {rail.n}</span>
                  <span>·</span>
                  <span>{rail.label}</span>
                </span>
                <h3 className="display-title mt-4 text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl md:text-4xl">
                  {t(rail.titleKey)}
                </h3>
                <p className="mt-5 max-w-xl text-base leading-7 text-[var(--sea-ink-soft)]">
                  {t(rail.bodyKey)}
                </p>
                <ul className="mt-7 space-y-1.5">
                  {rail.bulletKeys.map((bKey) => (
                    <li
                      key={bKey}
                      className="qe-rail-bullet text-sm leading-6 text-[var(--sea-ink)]"
                    >
                      <span>{t(bKey)}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={rail.href}
                  target="_blank"
                  rel="noreferrer"
                  className="qe-link mt-7 text-sm"
                >
                  {t(rail.refKey)}
                  <span className="qe-link__arrow">↗</span>
                </a>
              </div>
            </div>
          </section>
        );
      })}

      {/* ============================================================
          SECURITY 4-QUADRANT
         ============================================================ */}
      <section className="border-y border-[var(--line)] bg-[var(--bg-base)] qe-reveal">
        <div className="page-wrap px-4 py-16 md:py-24">
          <div className="mb-10 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <p className="island-kicker mb-3">{t('security.kicker')}</p>
              <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
                {t('security.headline')}
              </h2>
            </div>
            <p className="text-base leading-7 text-[var(--sea-ink-soft)] md:max-w-md md:justify-self-end">
              {t('security.body')}
            </p>
          </div>

          <div className="mb-10 max-w-3xl rounded-xl border-l-4 border-[var(--lagoon)] bg-[var(--lagoon-soft)] px-5 py-4">
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              {t('security.threat.intro')}
            </p>
          </div>

          <div className="qe-quadrant qe-reveal-stagger">
            {SECURITY_FACTS.map((f) => (
              <div key={f.titleKey} className="qe-quadrant__cell">
                <span className="qe-quadrant__icon" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="text-lg font-semibold leading-tight text-[var(--sea-ink)]">
                  {t(f.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          INTERACTIVE DEMO WIDGET
         ============================================================ */}
      <section id="demo-widget" className="border-b border-[var(--line)] bg-[var(--foam)] qe-reveal">
        <div className="page-wrap grid gap-12 px-4 py-16 md:grid-cols-[5fr_7fr] md:gap-12 md:py-24">
          <div>
            <p className="island-kicker mb-3">{t('demo.kicker')}</p>
            <h2 className="display-title text-3xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-4xl md:text-5xl">
              {t('demo.headline')}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--sea-ink-soft)]">
              {t('demo.body')}
            </p>
            <div className="mt-7 space-y-3">
              <div className="flex items-start gap-3">
                <span className="qe-pill qe-pill--success mt-0.5 flex-shrink-0">5 USDC</span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  {t('demo.pill.dca.desc')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="qe-pill qe-pill--success mt-0.5 flex-shrink-0">5 USDC</span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  {t('demo.pill.ika.desc')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="qe-pill mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                >
                  25 USDC
                </span>
                <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">
                  {t('demo.pill.block.desc')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <LandingDemoWidget />
          </div>
        </div>
      </section>

      {/* ============================================================
          HONEST DISCLAIMER
         ============================================================ */}
      <section className="page-wrap px-4 py-16 md:py-24 qe-reveal">
        <div className="qe-card border-2 border-dashed border-[var(--line-strong)] bg-[var(--sand)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="qe-badge qe-badge--alpha">{t('disclaimer.badge')}</span>
            <p className="island-kicker m-0" style={{ color: 'var(--sunset)' }}>
              {t('disclaimer.kicker')}
            </p>
          </div>
          <h2 className="display-title text-2xl font-bold leading-tight tracking-tight text-[var(--sea-ink)] sm:text-3xl">
            {t('disclaimer.headline')}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--sea-ink-soft)]">
            {t('disclaimer.intro')}
          </p>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--palm)]">
                {t('disclaimer.real.heading')}
              </h3>
              <ul className="space-y-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                <li>· {t('disclaimer.real.item.1')}</li>
                <li>· {t('disclaimer.real.item.2')}</li>
                <li>· {t('disclaimer.real.item.3')}</li>
                <li>· {t('disclaimer.real.item.4')}</li>
                <li>· {t('disclaimer.real.item.5')}</li>
              </ul>
            </div>
            <div>
              <h3
                className="mb-3 text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--coral)' }}
              >
                {t('disclaimer.notclaimed.heading')}
              </h3>
              <ul className="space-y-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                <li>· {t('disclaimer.notclaimed.item.1')}</li>
                <li>· {t('disclaimer.notclaimed.item.2')}</li>
                <li>· {t('disclaimer.notclaimed.item.3')}</li>
                <li>· {t('disclaimer.notclaimed.item.4')}</li>
                <li>· {t('disclaimer.notclaimed.item.5')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA — audience-split 3-path
         ============================================================ */}
      <section className="page-wrap px-4 pt-16 pb-16 md:pt-24 md:pb-24 qe-reveal-scale">
        <div className="qe-cta-panel">
          <h2 className="display-title mx-auto max-w-2xl text-3xl font-extrabold sm:text-4xl md:text-5xl">
            {t('cta.heading')}
          </h2>
          <p className="mx-auto max-w-xl text-base leading-7 md:text-lg">
            {t('cta.body')}
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-3 md:gap-4">
            <Link to="/app" className="qe-cta-path qe-cta-path--primary">
              <span className="qe-cta-path__kicker">{t('cta.path.build.audience')}</span>
              <span className="qe-cta-path__title">{t('cta.path.build.title')}</span>
              <span className="qe-cta-path__action">{t('cta.path.build.cta')}</span>
            </Link>
            <a
              href="https://github.com/harkon666/Polet-AI/blob/main/docs/demo-script.md"
              target="_blank"
              rel="noreferrer"
              className="qe-cta-path"
            >
              <span className="qe-cta-path__kicker">{t('cta.path.review.audience')}</span>
              <span className="qe-cta-path__title">{t('cta.path.review.title')}</span>
              <span className="qe-cta-path__action">{t('cta.path.review.cta')}</span>
            </a>
            <a href="#demo-widget" className="qe-cta-path">
              <span className="qe-cta-path__kicker">{t('cta.path.explore.audience')}</span>
              <span className="qe-cta-path__title">{t('cta.path.explore.title')}</span>
              <span className="qe-cta-path__action">{t('cta.path.explore.cta')}</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
