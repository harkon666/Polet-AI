/**
 * Polet logomark, inline SVG traced from `frontend/public/polet-logo.png`
 * via potrace 1.16. Single white "P" glyph (chevron + foot + dot), pure
 * geometric construction with constant stroke width.
 *
 * Renders with `currentColor` so callers control colour via Tailwind text
 * utility (e.g. `text-ink`, `text-lagoon`). Sized via `className` (typically
 * `h-7 w-auto` for header, `h-12 w-auto` for footer).
 *
 * Aspect ratio: 376.6 × 577.6 (portrait, ~0.65 ratio), authentic to the
 * source asset; do NOT pad to square in the SVG itself, let parent decide.
 */
export function Logo({
  className,
  ariaLabel = 'Polet',
}: {
  className?: string
  ariaLabel?: string
}) {
  return (
    <svg
      viewBox="0 0 376.601775 577.554422"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <g
        transform="translate(-443.180636,912.773926) scale(0.1,-0.1)"
        stroke="none"
      >
        <path
          d="M4890 9119 c-77 -11 -159 -43 -229 -90 -99 -66 -161 -148 -201 -264 -19 -57 -20 -83 -20 -1001 0 -1006 1 -1018 49 -1073 23 -25 186 -154 575 -451 l99 -75 66 0 c76 0 121 18 174 72 68 67 67 63 67 450 0 306 2 351 16 372 22 31 73 51 131 51 46 0 54 -5 278 -174 321 -244 346 -265 361 -306 30 -83 9 -191 -47 -252 -13 -14 -121 -94 -239 -177 -118 -84 -240 -170 -270 -191 -123 -88 -901 -637 -975 -688 -197 -137 -282 -291 -292 -527 -6 -141 14 -247 71 -370 59 -128 42 -113 1085 -909 170 -129 209 -152 269 -162 92 -14 195 55 245 164 22 46 22 55 22 557 0 509 0 510 23 559 35 77 85 130 195 208 56 39 159 112 229 162 70 50 276 197 458 326 182 129 375 266 428 304 133 95 325 231 395 280 75 51 205 189 252 266 92 151 116 343 70 544 -45 195 -99 259 -415 492 -74 55 -218 162 -320 237 -102 75 -419 309 -705 519 -286 211 -545 402 -575 424 -137 101 -331 244 -393 289 -38 28 -161 119 -275 203 -229 169 -297 207 -411 228 -84 15 -111 15 -191 3z"
        />
        <path
          d="M6961 4614 c-168 -45 -300 -188 -337 -366 -71 -332 233 -642 555 -567 127 29 256 133 311 251 171 367 -151 784 -529 682z"
        />
      </g>
    </svg>
  )
}
