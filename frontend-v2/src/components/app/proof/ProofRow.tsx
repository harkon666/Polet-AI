import { explorerAccountUrl } from './proof-format'

/**
 * ProofRow, the shared key/value renderer used by both
 * `<JupiterProofPanel>` and `<IkaProofPanel>`.
 *
 * Long values are truncated to first-4 / last-4 with the full value
 * preserved as the `title` tooltip. When a `link` is provided, the
 * value becomes a clickable Solana Explorer / suiscan anchor.
 *
 * Extracted from the Phase 1 `<ReceiptLog>` so the proof panels can
 * be reused by the Policy Gate (Phase 3) and the Proof Trail
 * timeline (Phase 5) without re-deriving formatters.
 */
export function ProofRow({
  label,
  value,
  link,
  mono,
}: {
  label: string
  value: string
  link?: string
  mono?: boolean
}) {
  const display = mono
    ? value
    : value.length > 12
      ? `${value.slice(0, 4)}…${value.slice(-4)}`
      : value
  return (
    <>
      <dt className="text-ink-mute uppercase tracking-[0.18em]">{label}</dt>
      <dd className="text-ink-soft tabular-nums truncate">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-lagoon-bright transition"
            title={value}
          >
            {display} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span title={value}>{display}</span>
        )}
      </dd>
    </>
  )
}

/** Re-export for components that build their own links inline. */
export { explorerAccountUrl }
