import type { JupiterProof } from '../use-console-actions'
import { ProofRow } from './ProofRow'
import {
  explorerAccountUrl,
  formatPriceImpactPct,
} from './proof-format'

/**
 * JupiterProofPanel surfaces Jupiter route preview + unsigned
 * smart-wallet transaction artifacts on a successful DCA run.
 *
 * Per `docs/demo-script.md` outcome 2, the receipt should expose the
 * Jupiter route/build preview (token metadata + quote + slippage) and
 * the unsigned policy-gated smart-wallet transaction boundary so
 * judges can verify Polet wraps Jupiter behind the policy gate
 * without claiming a mainnet swap.
 *
 * Account fields (smart wallet PDA, approval signers) link to Solana
 * Explorer devnet. Block hash is shown truncated; the on-chain tx
 * signature lives at the receipt level (one level up).
 *
 * Extracted from `<ReceiptLog>` in Phase 5 so it can be reused by:
 *   - The Proof Trail timeline (`<ProofTimeline>`)
 *   - The Policy Gate page's rail-output node (Phase 3, optional)
 *   - Future SDK runners that want to mirror the proof grid layout.
 */
export function JupiterProofPanel({ proof }: { proof: JupiterProof }) {
  const tokens =
    proof.inputToken?.symbol && proof.outputToken?.symbol
      ? `${proof.inputToken.symbol}${proof.inputToken.isVerified ? ' ✓' : ''} → ${proof.outputToken.symbol}${proof.outputToken.isVerified ? ' ✓' : ''}`
      : null

  return (
    <div
      data-testid="jupiter-proof-panel"
      className="mt-3 rounded-lg border border-line/60 bg-bg-deep/60 p-3"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-lagoon-bright mb-2">
        Jupiter route proof
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
        {tokens ? <ProofRow label="tokens" value={tokens} mono /> : null}
        {proof.executionPath ? (
          <ProofRow label="execution" value={proof.executionPath} mono />
        ) : null}
        {proof.quote?.slippageBps !== undefined ? (
          <ProofRow
            label="slippage"
            value={`${proof.quote.slippageBps} bps`}
            mono
          />
        ) : null}
        {proof.quote?.priceImpactPct ? (
          <ProofRow
            label="price impact"
            value={`${formatPriceImpactPct(proof.quote.priceImpactPct)}%`}
            mono
          />
        ) : null}
        {proof.quote?.inputAmount ? (
          <ProofRow label="input" value={proof.quote.inputAmount} mono />
        ) : null}
        {proof.quote?.expectedOutput ? (
          <ProofRow
            label="expected out"
            value={proof.quote.expectedOutput}
            mono
          />
        ) : null}
        {proof.quote?.minimumOutput ? (
          <ProofRow
            label="min output"
            value={proof.quote.minimumOutput}
            mono
          />
        ) : null}
        {proof.quote?.routeLabel ? (
          <ProofRow label="route" value={proof.quote.routeLabel} mono />
        ) : null}
        {proof.routeSteps !== undefined ? (
          <ProofRow label="route steps" value={String(proof.routeSteps)} mono />
        ) : null}
        {proof.primaryDex ? (
          <ProofRow label="primary dex" value={proof.primaryDex} mono />
        ) : null}
        {proof.smartWalletAuthority ? (
          <ProofRow
            label="smart wallet"
            value={proof.smartWalletAuthority}
            link={explorerAccountUrl(proof.smartWalletAuthority)}
          />
        ) : null}
        {proof.approvalSigners?.length ? (
          <ProofRow
            label="approval signer"
            value={proof.approvalSigners[0] ?? ''}
            link={
              proof.approvalSigners[0]
                ? explorerAccountUrl(proof.approvalSigners[0])
                : undefined
            }
          />
        ) : null}
        {proof.txBlockHash ? (
          <ProofRow label="block hash" value={proof.txBlockHash} />
        ) : null}
        {proof.txSlot !== undefined ? (
          <ProofRow label="slot" value={String(proof.txSlot)} mono />
        ) : null}
      </dl>
    </div>
  )
}
