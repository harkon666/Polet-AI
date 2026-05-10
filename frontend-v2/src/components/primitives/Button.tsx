import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'subtle'
type ButtonSize = 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'pl-glow-button bg-lagoon text-bg-base hover:bg-lagoon-bright font-medium',
  ghost:
    'border border-line-strong text-ink hover:bg-surface-raised hover:border-lagoon font-medium',
  subtle:
    'text-ink-soft hover:text-ink hover:bg-surface font-medium',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
}

/**
 * Polet v2 Button primitive.
 *
 * - `primary`: lagoon CTA with glow halo on hover. Use for landing's main CTA.
 * - `ghost`:   bordered, transparent fill. Use for secondary CTA (e.g. "Read docs").
 * - `subtle`:  no border, hover-only background. Use inside dense UI.
 *
 * Sizes: `md` (default, header / inline), `lg` (hero CTA, final-CTA panel).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 transition select-none disabled:opacity-50 disabled:pointer-events-none'

  return (
    <button
      className={`${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
