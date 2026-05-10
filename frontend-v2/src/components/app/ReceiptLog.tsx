import { useLocale } from '#shared/hooks/use-locale'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import {
  useConsole,
  type IkaProof,
  type JupiterProof,
  type ReceiptEntry,
  type ReceiptStatus,
} from './use-console-actions'

/**
 * ReceiptLog, append-only feed of every action the operator runs.
 *
 * Reads from the console state context. Each receipt is one row:
 *
 *   HH:MM:SS   ACTION TITLE          [status badge]
 *              Description line.
 *              π_constraint refs (if applicable)
 *              ↗ Solana Explorer (if signature present)
 *
 * Constraints follow the landing's DemoWidget vocabulary:
 *   pi_numeric_limit · pi_scope_match · pi_session_active
 *
 * The receipt log NEVER displays witness bytes, private thresholds,
 * or raw policy values (US42 in `docs/prd.md`). Action titles +
 * descriptions are derived in `useConsole()` so that contract is
 * enforced upstream.
 *
 * Day 11 ships local-only state — the feed clears on page reload.
 * Day 12+ may persist to localStorage if the Receipts panel grows
 * a "session history" affordance.
 */

const STATUS_BADGE_CLASSES: Record<ReceiptStatus, string> = {
  info:    'inline-flex items-center rounded-full border border-lagoon-bright/40 bg-lagoon-bright/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright',
  allowed: 'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  blocked: 'inline-flex items-center rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-coral',
  pending: 'inline-flex items-center rounded-full border border-line bg-surface/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute',
  error:   'inline-flex items-center rounded-full border border-coral/40 bg-coral/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-coral',
}

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  info:    'INFO',
  allowed: 'ALLOWED',
  blocked: 'BLOCKED',
  pending: 'PENDING',
  error:   'ERROR',
}

const formatTime = (epochMs: number) => {
  const d = new Date(epochMs)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const explorerUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=devnet`

const explorerAccountUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=devnet`

const suiscanUrl = (digestBase58: string) =>
  `https://suiscan.xyz/devnet/tx/${digestBase58}`

export function ReceiptLog() {
  const { t } = useLocale()
  const containerRef = useScrollReveal()
  const { state } = useConsole()
  const { receipts } = state

  return (
    <section
      ref={containerRef}
      aria-label="Polet receipt log"
      className="border-b border-line bg-bg-base py-8 md:py-12"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <KickerLabel tone="accent" className="pl-reveal">
            {t('app.log.kicker')}
          </KickerLabel>
          <p
            className="pl-reveal font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
            style={{ transitionDelay: '80ms' }}
          >
            {t('app.log.tagline')}
          </p>
        </div>

        <div
          className="pl-reveal mt-6 md:mt-8 rounded-2xl border border-line bg-bg-deep overflow-hidden"
          style={{ transitionDelay: '160ms' }}
        >
          {receipts.length === 0 ? (
            <p className="px-6 py-10 text-center font-mono text-xs uppercase tracking-[0.22em] text-ink-mute">
              {t('app.log.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {receipts.map((entry, i) => (
                <ReceiptRow key={entry.id} entry={entry} index={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function ReceiptRow({ entry, index }: { entry: ReceiptEntry; index: number }) {
  const refs = entry.constraintRefs
  const refTags = refs
    ? [
        refs.numericLimit && { name: 'pi_numeric_limit', check: refs.numericLimit },
        refs.scopeMatch && { name: 'pi_scope_match', check: refs.scopeMatch },
        refs.sessionActive && { name: 'pi_session_active', check: refs.sessionActive },
      ].filter(Boolean) as Array<{ name: string; check: 'pass' | 'fail' | 'unknown' }>
    : []

  return (
    <li
      className="pl-reveal px-6 py-4 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 items-baseline"
      style={{ transitionDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* Timestamp */}
      <span className="font-mono text-xs text-ink-mute tabular-nums">
        {formatTime(entry.timestamp)}
      </span>

      {/* Action title + description */}
      <div className="min-w-0">
        <p className="font-mono text-sm uppercase tracking-[0.16em] text-ink truncate">
          {entry.action}
        </p>
        <p className="mt-1 text-sm text-ink-soft leading-relaxed">
          {entry.description}
        </p>
        {entry.body ? (
          <p className="mt-1 text-xs text-ink-mute leading-relaxed">
            {entry.body}
          </p>
        ) : null}
        {refTags.length > 0 ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-mute">
            {refTags.map((ref) => (
              <span
                key={ref.name}
                className={
                  ref.check === 'pass'
                    ? 'text-palm'
                    : ref.check === 'fail'
                      ? 'text-coral'
                      : 'text-ink-mute'
                }
              >
                {ref.name}{' '}
                <span aria-hidden="true">
                  {ref.check === 'pass' ? '✓' : ref.check === 'fail' ? '✗' : '·'}
                </span>
              </span>
            ))}
          </p>
        ) : null}
        {entry.ikaProof ? <IkaProofPanel proof={entry.ikaProof} /> : null}
        {entry.jupiterProof ? <JupiterProofPanel proof={entry.jupiterProof} /> : null}
      </div>

      {/* Status badge + explorer arrow */}
      <div className="flex flex-col items-end gap-1.5">
        <span className={STATUS_BADGE_CLASSES[entry.status]}>
          {STATUS_LABEL[entry.status]}
        </span>
        {entry.signature ? (
          <a
            href={explorerUrl(entry.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-ink-mute hover:text-lagoon-bright transition tabular-nums"
            aria-label="View transaction on Solana Explorer"
          >
            {entry.signature.slice(0, 6)}…{entry.signature.slice(-4)}{' '}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </li>
  )
}

/**
 * IkaProofPanel, expose the Ika Pre-Alpha proof artifacts produced by
 * a successful multichain run on the rail card.
 *
 * Per `docs/demo-script.md` outcome 3, the receipt should surface
 * dWallet, MessageApproval PDA, message hash, signature scheme, CPI
 * authority, destination digest, and an explicit settlement boundary.
 *
 * Solana account fields (dWallet, MessageApproval PDA, CPI authority,
 * Polet approval signers) link to Solana Explorer devnet. Sui digest
 * links to suiscan devnet. Hashes are non-linkable and rendered
 * truncated with full value as the tooltip.
 */
function IkaProofPanel({ proof }: { proof: IkaProof }) {
  return (
    <div className="mt-3 rounded-lg border border-line/60 bg-bg-deep/60 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-lagoon-bright mb-2">
        Ika pre-alpha proof
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px]">
        {proof.dwalletAccount ? (
          <ProofRow label="dwallet" value={proof.dwalletAccount} link={explorerAccountUrl(proof.dwalletAccount)} />
        ) : null}
        {proof.messageApprovalPda ? (
          <ProofRow label="message approval" value={proof.messageApprovalPda} link={explorerAccountUrl(proof.messageApprovalPda)} />
        ) : null}
        {proof.cpiAuthorityPda ? (
          <ProofRow label="cpi authority" value={proof.cpiAuthorityPda} link={explorerAccountUrl(proof.cpiAuthorityPda)} />
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

/**
 * JupiterProofPanel, expose the Jupiter route preview + unsigned
 * smart-wallet transaction artifacts on a successful DCA run.
 *
 * Per `docs/demo-script.md` outcome 2, the receipt should surface the
 * Jupiter route/build preview (token metadata + quote + slippage) and
 * the unsigned policy-gated smart-wallet transaction boundary so
 * judges can verify Polet wraps Jupiter behind the policy gate
 * without claiming a mainnet swap.
 *
 * The smart wallet PDA + approval signer pubkeys link to Solana
 * Explorer devnet. Block hash is shown truncated (non-linkable, the
 * actual on-chain transaction signature is the receipt-level
 * `signature` field which already links above).
 */
function JupiterProofPanel({ proof }: { proof: JupiterProof }) {
  const tokens =
    proof.inputToken?.symbol && proof.outputToken?.symbol
      ? `${proof.inputToken.symbol}${proof.inputToken.isVerified ? ' ✓' : ''} → ${proof.outputToken.symbol}${proof.outputToken.isVerified ? ' ✓' : ''}`
      : null

  return (
    <div className="mt-3 rounded-lg border border-line/60 bg-bg-deep/60 p-3">
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
            value={`${proof.quote.priceImpactPct}%`}
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

/**
 * Render one key/value row in the Ika proof panel. Long values
 * truncate to first-4 / last-4 with the full value preserved as the
 * `title` tooltip; if a `link` is provided, the value becomes a
 * clickable Solana Explorer / suiscan anchor.
 */
function ProofRow({
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
