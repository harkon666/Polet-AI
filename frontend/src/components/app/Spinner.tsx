/**
 * Spinner, a tiny inline loading indicator for action buttons.
 *
 * Renders a stroked SVG circle with one quadrant brighter than the
 * rest, rotated continuously via Tailwind's `animate-spin`. Inherits
 * `currentColor`, so callers control the colour via the parent's
 * `text-*` utility (typically `text-lagoon-bright` for primary
 * action buttons or `text-coral` for the destructive variant).
 *
 * Sizing is in pixels via `size`; defaults to 12 to match the
 * 11px-tall mono uppercase labels next to it on the rail buttons
 * and ledger CTAs.
 */
export function Spinner({ size = 12 }: { size?: number } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="loading"
      className="animate-spin shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M12 2 a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
