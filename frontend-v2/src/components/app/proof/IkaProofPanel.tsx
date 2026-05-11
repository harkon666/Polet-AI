import type { IkaProof } from '../use-console-actions'
import { ProofRow } from './ProofRow'
import { explorerAccountUrl, suiscanUrl } from './proof-format'

/**
 * IkaProofPanel surfaces the Ika Pre-Alpha proof artifacts produced
 * by a successful multichain run on the rail card.
 *
 * Per `docs/demo-script.md` outcome 3, the receipt should surface
 * dWallet, MessageApproval PDA, message hash, signature scheme, CPI
 * authority, destination digest, and an explicit settlement boundary.
 *
 * Solana account fields (dWallet, MessageApproval PDA, CPI authority,
 * Polet approval signers) link to Solana Explorer devnet. Sui digest
 * links to suiscan devnet. Hashes are non-linkable and rendered
 * truncated with the full value as the tooltip.
 *
 * Extracted from `<ReceiptLog>` in Phase 5 so it can be reused by:
 *   - The Proof Trail timeline (`<ProofTimeline>`)
 *   - The Policy Gate page's rail-output node (Phase 3, optional)
 *   - Future SDK runners that want to mirror the proof grid layout.
 */
export function IkaProofPanel({ proof }: { proof: IkaProof }) {
  return (
    <div
      data-testid="ika-proof-panel"
      className="mt-3 rounded-lg border border-line/60 bg-bg-deep/60 p-3"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-lagoon-bright mb-2">
        Ika pre-alpha proof
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
        {proof.dwalletAccount ? (
          <ProofRow
            label="dwallet"
            value={proof.dwalletAccount}
            link={explorerAccountUrl(proof.dwalletAccount)}
          />
        ) : null}
        {proof.messageApprovalPda ? (
          <ProofRow
            label="message approval"
            value={proof.messageApprovalPda}
            link={explorerAccountUrl(proof.messageApprovalPda)}
          />
        ) : null}
        {proof.cpiAuthorityPda ? (
          <ProofRow
            label="cpi authority"
            value={proof.cpiAuthorityPda}
            link={explorerAccountUrl(proof.cpiAuthorityPda)}
          />
        ) : null}
        {proof.ikaMessageHash ? (
          <ProofRow label="ika message hash" value={proof.ikaMessageHash} />
        ) : null}
        {proof.destinationDigest ? (
          <ProofRow
            label={`dest digest (${proof.destinationDigest.chain})`}
            value={
              proof.destinationDigest.digestBase58 ??
              proof.destinationDigest.digestHex ??
              '—'
            }
            link={
              proof.destinationDigest.chain === 'sui' &&
              proof.destinationDigest.digestBase58
                ? suiscanUrl(proof.destinationDigest.digestBase58)
                : undefined
            }
          />
        ) : null}
        {proof.signatureScheme ? (
          <ProofRow label="sig scheme" value={proof.signatureScheme} mono />
        ) : null}
        {proof.canonicalOrderHash ? (
          <ProofRow label="canonical order" value={proof.canonicalOrderHash} />
        ) : null}
        {proof.policyAttestationHash ? (
          <ProofRow label="attestation" value={proof.policyAttestationHash} />
        ) : null}
        {proof.poletApprovalSigners?.length ? (
          <ProofRow
            label="approval signers"
            value={proof.poletApprovalSigners[0] ?? ''}
            link={
              proof.poletApprovalSigners[0]
                ? explorerAccountUrl(proof.poletApprovalSigners[0])
                : undefined
            }
          />
        ) : null}
        {proof.settlement ? (
          <ProofRow label="settlement" value={proof.settlement} mono />
        ) : null}
      </dl>
    </div>
  )
}
