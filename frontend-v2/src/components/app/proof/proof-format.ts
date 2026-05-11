/**
 * Pure formatters + URL builders shared by Phase 5 proof components.
 *
 * Extracted from the Phase 1 `<ReceiptLog>` so the proof panels can
 * be reused by the Policy Gate page (Phase 3) and the Proof Trail
 * timeline (Phase 5) without coupling either to the receipt feed.
 */

/**
 * Formats `epochMs` as `HH:MM:SS` in the operator's local timezone.
 * Used by the proof trail timestamp column.
 */
export function formatProofClock(epochMs: number): string {
  const d = new Date(epochMs)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Trim Jupiter's `priceImpactPct` decimal string to a readable
 * 4-significant-digit form. Raw values can come back as 28+ char
 * floating-point text (`"0.0000434610542935942496"`), which would
 * overflow the proof grid; this normalises without losing precision
 * for the sub-percent range Jupiter usually returns.
 */
export function formatPriceImpactPct(raw: string): string {
  const n = Number(raw)
  if (!Number.isFinite(n)) return raw
  if (n === 0) return '0'
  if (Math.abs(n) < 0.0001) return n.toExponential(2)
  return n.toFixed(4).replace(/\.?0+$/, '')
}

/** Solana Explorer URL for a transaction signature on devnet. */
export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

/** Solana Explorer URL for an account address on devnet. */
export function explorerAccountUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`
}

/** Suiscan URL for a transaction digest (base58) on devnet. */
export function suiscanUrl(digestBase58: string): string {
  return `https://suiscan.xyz/devnet/tx/${digestBase58}`
}
