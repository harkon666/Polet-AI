import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { KickerLabel } from './primitives/KickerLabel'

type Rail = {
  id: 'encrypt' | 'ika' | 'jupiter'
  titleKey: TranslationKey
  bodyKey: TranslationKey
  bulletKeys: TranslationKey[]
  refKey: TranslationKey
  mockTitleKey: TranslationKey
  /** Brand mark icon path served from /brand */
  iconSrc: string
  /** Inline mockup content rendered in the bottom code/api panel */
  mockup: React.ReactNode
}

/* ============================================
   Per-rail mini-mockups: a tiny code/api preview
   styled in Geist Mono with monospace tokens.
   ============================================ */

function EncryptMockup() {
  return (
    <div className="font-mono text-[11px] leading-[1.55] text-ink-soft space-y-1">
      <div className="text-ink-mute">// contract/confidential_policy.rs</div>
      <div>
        <span className="text-coral">fn</span>{' '}
        <span className="text-lagoon-bright">enforce_confidential_numeric_policy</span>
        (
      </div>
      <div className="pl-4">witness: <span className="text-ink">&[u8]</span>,</div>
      <div className="pl-4">amount: <span className="text-ink">u64</span>,</div>
      <div>) -&gt; <span className="text-lagoon-bright">Result</span>&lt;<span className="text-ink">()</span>&gt; &#123;</div>
      <div className="pl-4 text-ink-mute">// verify sha256 commitment</div>
      <div className="pl-4">
        <span className="text-coral">require</span>(
        <span className="text-ink">verify_witness</span>(witness));
      </div>
      <div>&#125;</div>
    </div>
  )
}

function IkaMockup() {
  return (
    <div className="font-mono text-[11px] leading-[1.55] text-ink-soft space-y-1">
      <div className="text-ink-mute">POST /intent/multichain/run</div>
      <div>&#123;</div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"executionRail"</span>:{' '}
        <span className="text-ink">"ika"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"messageHash"</span>:{' '}
        <span className="text-ink">"0xa1b2…f9e0"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"approvalPDA"</span>:{' '}
        <span className="text-ink">"MsgApvl…D8q4"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"status"</span>:{' '}
        <span className="text-palm">"approved"</span>,
      </div>
      <div>&#125;</div>
    </div>
  )
}

function JupiterMockup() {
  return (
    <div className="font-mono text-[11px] leading-[1.55] text-ink-soft space-y-1">
      <div className="text-ink-mute">POST /intent/dca/run · 5 USDC → SOL</div>
      <div>&#123;</div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"input"</span>:{' '}
        <span className="text-ink">"5.00 USDC"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"output"</span>:{' '}
        <span className="text-ink">"~0.0287 SOL"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"route"</span>:{' '}
        <span className="text-ink">"Whirlpool → Raydium"</span>,
      </div>
      <div className="pl-3">
        <span className="text-lagoon-bright">"execution"</span>:{' '}
        <span className="text-palm">"unsigned tx ready"</span>,
      </div>
      <div>&#125;</div>
    </div>
  )
}

const RAILS: Rail[] = [
  {
    id: 'encrypt',
    titleKey: 'rail.encrypt.title',
    bodyKey: 'rail.encrypt.body',
    bulletKeys: [
      'rail.encrypt.bullet.1',
      'rail.encrypt.bullet.2',
      'rail.encrypt.bullet.3',
      'rail.encrypt.bullet.4',
    ],
    refKey: 'rail.encrypt.ref',
    mockTitleKey: 'rail.encrypt.mockTitle',
    iconSrc: '/brand/encrypt.svg',
    mockup: <EncryptMockup />,
  },
  {
    id: 'ika',
    titleKey: 'rail.ika.title',
    bodyKey: 'rail.ika.body',
    bulletKeys: [
      'rail.ika.bullet.1',
      'rail.ika.bullet.2',
      'rail.ika.bullet.3',
      'rail.ika.bullet.4',
    ],
    refKey: 'rail.ika.ref',
    mockTitleKey: 'rail.ika.mockTitle',
    iconSrc: '/brand/ika.svg',
    mockup: <IkaMockup />,
  },
  {
    id: 'jupiter',
    titleKey: 'rail.jupiter.title',
    bodyKey: 'rail.jupiter.body',
    bulletKeys: [
      'rail.jupiter.bullet.1',
      'rail.jupiter.bullet.2',
      'rail.jupiter.bullet.3',
      'rail.jupiter.bullet.4',
    ],
    refKey: 'rail.jupiter.ref',
    mockTitleKey: 'rail.jupiter.mockTitle',
    iconSrc: '/brand/jupiter.svg',
    mockup: <JupiterMockup />,
  },
]

/**
 * Rails section — 3 integration rails (Encrypt / Ika / Jupiter), each its
 * own card with brand mark + title + body + 4 bullets + mini mockup +
 * reference link.
 *
 * Anchor #rails so header nav scrolls here.
 */
export function RailsSection() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()

  return (
    <section
      ref={containerRef}
      id="rails"
      className="border-t border-line bg-bg-base py-20 md:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('rails.kicker')}
          </KickerLabel>
        </div>

        <h2
          className="pl-reveal mt-5 font-sans font-bold text-ink tracking-tight leading-[1.1] text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center md:text-left"
          style={{ transitionDelay: '80ms' }}
        >
          <span className="block">{t('rails.headline.lead')}</span>
          <span className="block text-ink-soft">
            {t('rails.headline.rest')}
          </span>
        </h2>

        <p
          className="pl-reveal mt-6 max-w-3xl text-base md:text-lg text-ink-soft leading-relaxed text-center md:text-left mx-auto md:mx-0"
          style={{ transitionDelay: '160ms' }}
        >
          {t('rails.body')}
        </p>

        {/* 3 rail cards */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {RAILS.map((rail, i) => (
            <article
              key={rail.id}
              className="pl-reveal group relative rounded-2xl border border-line bg-surface overflow-hidden hover:border-line-strong transition flex flex-col"
              style={{ transitionDelay: `${240 + i * 80}ms` }}
            >
              <div className="p-6 md:p-7 flex-1 flex flex-col">
                {/* Brand mark */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="inline-flex items-center justify-center size-10 rounded-xl bg-bg-deep border border-line-strong">
                    <img
                      src={rail.iconSrc}
                      alt=""
                      className="h-5 w-auto"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-mute">
                    Rail {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Title + body */}
                <h3 className="font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
                  {t(rail.titleKey)}
                </h3>
                <p className="mt-3 text-sm md:text-base text-ink-soft leading-relaxed">
                  {t(rail.bodyKey)}
                </p>

                {/* Bullets */}
                <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                  {rail.bulletKeys.map((bk) => (
                    <li key={bk} className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1 rounded-full bg-lagoon-bright shrink-0"
                      />
                      <span>{t(bk)}</span>
                    </li>
                  ))}
                </ul>

                {/* Mockup panel */}
                <div className="mt-6 rounded-lg border border-line bg-bg-deep p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                      {t(rail.mockTitleKey)}
                    </span>
                    <div className="flex gap-1.5">
                      <span className="size-1.5 rounded-full bg-coral/60" />
                      <span className="size-1.5 rounded-full bg-sunset/60" />
                      <span className="size-1.5 rounded-full bg-palm/60" />
                    </div>
                  </div>
                  {rail.mockup}
                </div>

                {/* Reference link */}
                <div className="mt-auto pt-5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-lagoon-bright">
                    {t(rail.refKey)}
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
