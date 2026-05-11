import { useLocale } from '#/hooks/use-locale'

/**
 * Trust strip, infinite right-to-left marquee of partner/integration logos.
 *
 * Behaviour:
 * - Continuous loop: animation runs forever, no pause-on-hover.
 * - Starts from middle position via animation-delay -20s (half of 40s loop).
 * - Seamless: track contains 2 identical sets of items; when first set
 *   exits left, second set takes over without visible cut.
 * - Fade mask on left/right edges so items appear/disappear softly.
 * - Reduced-motion: animation disabled, items shown static & centered.
 *
 * 6 brand items, all SVG/PNG from public brand kits:
 * - Solana, Jupiter, Colosseum (white-on-dark variants from official kits)
 * - Anchor (icon + circle gradient from anchor-lang.com)
 * - Ika (white icon from docs.ika.xyz)
 * - Encrypt (E-mark SVG, dark by default, inverted via CSS filter)
 */

type TrustItem = {
  src: string
  alt: string
  height: number
  /** Optional text wordmark rendered AFTER the image (for brands whose
   *  SVG is icon-only, like Encrypt's E-mark). Styled in PP Mori Semibold. */
  suffixLabel?: string
}

const TRUST_ITEMS: TrustItem[] = [
  { src: '/brand/solana.svg', alt: 'Solana Foundation', height: 22 },
  { src: '/brand/anchor.svg', alt: 'Anchor', height: 28, suffixLabel: 'Anchor' },
  { src: '/brand/encrypt.svg', alt: 'Encrypt', height: 28, suffixLabel: 'Encrypt' },
  { src: '/brand/ika.svg', alt: 'Ika', height: 22 },
  { src: '/brand/jupiter.svg', alt: 'Jupiter', height: 28 },
  { src: '/brand/colosseum.svg', alt: 'Colosseum', height: 26 },
]

function TrustItemRender({ item }: { item: TrustItem }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <img
        src={item.src}
        alt={item.alt}
        height={item.height}
        style={{ height: `${item.height}px` }}
        className="w-auto"
      />
      {item.suffixLabel ? (
        <span
          className="font-semibold text-ink text-xl tracking-tight whitespace-nowrap"
          style={{ fontFamily: '"Space Grotesk Variable", "Space Grotesk", sans-serif' }}
        >
          {item.suffixLabel}
        </span>
      ) : null}
    </div>
  )
}

export function TrustStrip() {
  const { t } = useLocale()

  return (
    <section
      aria-label={t('trust.kicker')}
      className="border-t border-line bg-bg-deep py-12 md:py-14"
    >
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-mute">
          {t('trust.kicker')}
        </p>
        <div className="pl-trust-marquee">
          <div className="pl-trust-track" aria-hidden="true">
            {/* Set 1 */}
            {TRUST_ITEMS.map((item, i) => (
              <div key={`a-${i}`} className="pl-trust-item">
                <TrustItemRender item={item} />
              </div>
            ))}
            {/* Set 2 (duplicate for seamless loop) */}
            {TRUST_ITEMS.map((item, i) => (
              <div key={`b-${i}`} className="pl-trust-item">
                <TrustItemRender item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
