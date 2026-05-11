import { useMemo } from 'react'

type ParticleLayerProps = {
  count: number
  seed: number
  sizeMin: number
  sizeMax: number
  opacityMin: number
  opacityMax: number
  twinkleRatio: number
  className: string
}

/**
 * Seeded particle field, one layer of tiny dots scattered across a canvas.
 * Stable seed = SSR-consistent positions.
 *
 * Two layers compose the typical parallax dust treatment:
 *   - foreground: bigger / more opaque / faster drift
 *   - background: smaller / dimmer / slower drift, opposite direction
 *
 * Color: 70% lagoon-bright, 30% white-ish. A small fraction of dots have
 * a slow opacity twinkle (SMIL-driven, staggered).
 */
function ParticleLayer({
  count,
  seed,
  sizeMin,
  sizeMax,
  opacityMin,
  opacityMax,
  twinkleRatio,
  className,
}: ParticleLayerProps) {
  const particles = useMemo(() => {
    let s = seed
    const rng = () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
    return Array.from({ length: count }).map(() => {
      const isTeal = rng() < 0.7
      const isTwinkle = rng() < twinkleRatio
      return {
        cx: rng() * 100,
        cy: rng() * 60,
        r: sizeMin + rng() * (sizeMax - sizeMin),
        opacity: opacityMin + rng() * (opacityMax - opacityMin),
        color: isTeal ? 'rgb(45 212 191)' : 'rgb(255 255 255)',
        twinkle: isTwinkle
          ? {
              dur: 2.4 + rng() * 3.6,
              begin: -(rng() * 6),
            }
          : null,
      }
    })
  }, [count, seed, sizeMin, sizeMax, opacityMin, opacityMax, twinkleRatio])

  return (
    <svg
      aria-hidden="true"
      className={`${className} pointer-events-none`}
      preserveAspectRatio="none"
      viewBox="0 0 100 60"
    >
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={p.color}
          opacity={p.twinkle ? undefined : p.opacity}
        >
          {p.twinkle ? (
            <animate
              attributeName="opacity"
              values={`${p.opacity};${(p.opacity * 0.1).toFixed(2)};${p.opacity}`}
              dur={`${p.twinkle.dur}s`}
              begin={`${p.twinkle.begin}s`}
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
      ))}
    </svg>
  )
}

/**
 * ParticleField, 2-layer parallax dust field used by the Rails section
 * and the Footer to give a continuous "dust on a dark surface" feel.
 *
 * Default seeds give a stable, hand-tuned look across SSR + reload.
 * Pass custom `seedBg` / `seedFg` to vary the pattern between sections
 * so they don't render as the same dust.
 */
export function ParticleField({
  seedBg = 37,
  seedFg = 7,
}: {
  seedBg?: number
  seedFg?: number
} = {}) {
  return (
    <>
      <ParticleLayer
        count={900}
        seed={seedBg}
        sizeMin={0.025}
        sizeMax={0.08}
        opacityMin={0.10}
        opacityMax={0.35}
        twinkleRatio={0.04}
        className="pl-rails-particles-bg"
      />
      <ParticleLayer
        count={500}
        seed={seedFg}
        sizeMin={0.04}
        sizeMax={0.11}
        opacityMin={0.20}
        opacityMax={0.55}
        twinkleRatio={0.08}
        className="pl-rails-particles-fg"
      />
    </>
  )
}
