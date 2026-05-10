import type { ReactNode } from 'react'

/**
 * Uppercase mono micro-label, used as section kicker above headlines
 * and meta strips. Matches Linear's marketing kicker treatment.
 *
 * Tone is set via `tone`:
 *   - `default`: muted ink, neutral kicker
 *   - `accent`:  lagoon teal, emphasis kicker
 *   - `warning`: sunset amber, pre-alpha / disclaimer kicker
 */
export function KickerLabel({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'warning'
  className?: string
}) {
  const TONE_CLASSES: Record<typeof tone, string> = {
    default: 'text-ink-mute',
    accent: 'text-lagoon',
    warning: 'text-sunset',
  }

  return (
    <p
      className={`font-mono text-xs uppercase tracking-[0.18em] ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </p>
  )
}
