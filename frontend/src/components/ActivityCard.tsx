import { Check, AlertTriangle, X, Landmark, Clipboard, ExternalLink } from 'lucide-react';
import { InfoPill } from './ui/InfoPill';
import type { ActivityEntry } from './activity-log';
import type { COPY } from '../lib/i18n';
import type {
  RunMultichainIntentResult,
  IkaRequestPreview,
  OfficialEncryptPolicyPreview,
} from '../lib/api';
import { short, formatTokenAmount } from './activity-log';

interface ActivityCardProps {
  entry: ActivityEntry;
  labels: (typeof COPY)['id' | 'en'];
}

export function ActivityCard({ entry, labels }: ActivityCardProps) {
  const approved = entry.status === 'approved';
  const encryptPending = entry.status === 'pending-encrypt-execution';
  const encryptAllowed = entry.status === 'encrypt-verified-allowed';
  const encryptBlocked = entry.status === 'encrypt-verified-blocked';
  const blocked = entry.status === 'blocked';
  const needsApproval = entry.status === 'needs-approval';
  const setup = entry.status === 'setup';

  const label = encryptPending
    ? labels.encryptPending
    : encryptAllowed
      ? labels.encryptAllowed
      : encryptBlocked
        ? labels.encryptBlocked
        : approved
          ? labels.approved
          : needsApproval
            ? 'Needs approval'
            : blocked
              ? labels.blocked
              : setup
                ? labels.setup
                : labels.error;

  const tone: 'green' | 'red' | 'amber' =
    approved || setup || encryptAllowed ? 'green'
    : blocked || encryptBlocked ? 'red'
    : 'amber';

  return (
    <article className={`rise-in rounded-lg border p-4 ${
      tone === 'green' ? 'border-green-500/20 bg-green-500/5'
      : tone === 'red' ? 'border-red-500/20 bg-red-500/5'
      : 'border-amber-500/20 bg-amber-500/5'
    }`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
            tone === 'green' ? 'bg-green-600' : tone === 'red' ? 'bg-red-600' : 'bg-amber-600'
          } text-white`}>
            {approved || setup || encryptAllowed ? <Check className="h-5 w-5" />
            : needsApproval || encryptPending ? <AlertTriangle className="h-5 w-5" />
            : <X className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-black text-[var(--sea-ink)]">{label}</p>
            <p className="text-xs text-[var(--sea-ink-soft)]">{new Date(entry.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
        {entry.amountUsdc && (
          <div className="text-right">
            <p className="text-sm font-black text-[var(--sea-ink)]">{entry.amountUsdc} USDC</p>
            <p className="text-xs text-[var(--sea-ink-soft)]">{entry.routePair ?? 'USDC -> SOL'}</p>
          </div>
        )}
      </div>
      <p className="text-sm leading-6 text-[var(--sea-ink)]">{entry.message}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
          <Landmark className="h-3.5 w-3.5" />
          {entry.route}
        </p>
        {entry.signature && (
          <a
            href={`https://solscan.io/tx/${entry.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Solscan
          </a>
        )}
      </div>
      {entry.jupiterPlan && <JupiterRoutePreview entry={entry} labels={labels} />}
      {entry.encryptPolicy && <EncryptPolicyStatusCard policy={entry.encryptPolicy} labels={labels} />}
      {entry.approval && <ApprovalProgressCard approval={entry.approval} labels={labels} />}
      {entry.ikaRequest && <IkaRequestPreviewCard request={entry.ikaRequest} labels={labels} sharedApprovers={entry.sharedApprovers} />}
      {entry.unsignedTransaction && <UnsignedTransactionCard entry={entry} />}
    </article>
  );
}

function UnsignedTransactionCard({ entry }: { entry: ActivityEntry }) {
  const payload = entry.unsignedTransaction;
  if (!payload) return null;

  const copyPayload = () => {
    void navigator.clipboard?.writeText(payload.transaction);
  };

  return (
    <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold uppercase text-[var(--sea-ink-soft)]">Agent transaction payload</p>
          <p className="mt-1 text-[var(--sea-ink-soft)]">
            Agent signer required: {payload.signers.map(short).join(', ') || 'session signer'}
          </p>
        </div>
        <button
          type="button"
          onClick={copyPayload}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
        >
          <Clipboard className="h-3.5 w-3.5" />
          Copy agent tx
        </button>
      </div>
      <p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] font-semibold text-amber-600">
        This is not a Solscan tx yet. Paste it into the AI agent/session signer to sign and broadcast.
      </p>
      <p className="mt-2 break-all rounded-md bg-[var(--surface)] p-2 font-mono text-[10px] leading-5 text-[var(--sea-ink-soft)]">
        {payload.transaction.slice(0, 96)}...
      </p>
    </div>
  );
}

function EncryptPolicyStatusCard({
  policy,
  labels,
}: {
  policy: OfficialEncryptPolicyPreview;
  labels: (typeof COPY)['id' | 'en'];
}) {
  const isPending = policy.status === 'pending-encrypt-execution';
  const isBlocked = policy.status === 'encrypt-verified-blocked';
  const isAllowed = policy.status === 'encrypt-verified-allowed';
  const copyRefs = () => {
    const refs = {
      sourceAmountCiphertext: policy.sourceAmountCiphertext,
      allowedOutputCiphertext: policy.allowedOutputCiphertext,
      dailySpentOutputCiphertext: policy.dailySpentOutputCiphertext,
      allowedDecryptionRequest: policy.allowedDecryptionRequest,
      status: policy.status,
      policySequence: policy.policySequence,
    };
    void navigator.clipboard?.writeText(JSON.stringify(refs, null, 2));
  };

  const inputCt = policy.inputCiphertexts;
  const outputCt = policy.pendingOutputCiphertexts;

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.encryptGraph} value={policy.graph} wide />
      <InfoPill label="Status" value={policy.status} />
      <InfoPill label={labels.encryptPolicySeq} value={policy.policySequence.toString()} />
      {'pendingSlot' in policy && policy.pendingSlot !== undefined && (
        <InfoPill label={labels.encryptPendingSlot} value={policy.pendingSlot.toString()} />
      )}
      {'verifiedSlot' in policy && policy.verifiedSlot !== undefined && (
        <InfoPill label={labels.encryptVerifiedSlot} value={policy.verifiedSlot.toString()} />
      )}
      {policy.encryptProgram && (
        <InfoPill label={labels.encryptProgram} value={short(policy.encryptProgram)} />
      )}
      {policy.grpcEndpoint && (
        <InfoPill label={labels.encryptGrpcEndpoint} value={policy.grpcEndpoint} />
      )}
      <InfoPill label={labels.encryptAllowedOutput} value={short(policy.allowedOutputCiphertext)} />
      <InfoPill label={labels.encryptDailyOutput} value={short(policy.dailySpentOutputCiphertext)} />
      {inputCt?.sourceAmount && (
        <InfoPill label={`${labels.encryptInputCiphertext} (source)`} value={short(inputCt.sourceAmount)} />
      )}
      {inputCt?.maxPerRun && (
        <InfoPill label={`${labels.encryptInputCiphertext} (max/run)`} value={short(inputCt.maxPerRun)} />
      )}
      {inputCt?.dailySpent && (
        <InfoPill label={`${labels.encryptInputCiphertext} (daily)`} value={short(inputCt.dailySpent)} />
      )}
      {inputCt?.dailyCap && (
        <InfoPill label={`${labels.encryptInputCiphertext} (cap)`} value={short(inputCt.dailyCap)} />
      )}
      {outputCt?.allowedOutput && (
        <InfoPill label={`${labels.encryptOutputCiphertext} (allowed)`} value={short(outputCt.allowedOutput)} />
      )}
      {outputCt?.dailySpentOutput && (
        <InfoPill label={`${labels.encryptOutputCiphertext} (daily)`} value={short(outputCt.dailySpentOutput)} />
      )}
      {isPending && policy.suppressedUntilVerified && policy.suppressedUntilVerified.length > 0 && (
        <div className="sm:col-span-2 mt-1">
          <p className="text-xs font-semibold text-amber-500">{labels.encryptSuppressedUntilVerified}:</p>
          <ul className="mt-1 list-none space-y-0.5">
            {policy.suppressedUntilVerified.map((item) => (
              <li key={item} className="font-mono text-[10px] text-[var(--sea-ink-soft)]">{short(item)}</li>
            ))}
          </ul>
        </div>
      )}
      {isBlocked && (
        <div className="sm:col-span-2 mt-1 rounded-md bg-red-500/5 border border-red-500/20 px-2 py-1">
          <p className="text-xs font-bold text-red-500">{labels.encryptAllArtifactsSuppressed}</p>
        </div>
      )}
      {isAllowed && (
        <div className="sm:col-span-2 mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md bg-green-500/5 border border-green-500/20 px-2 py-1">
          <p className="text-xs font-bold text-green-500">{labels.encryptApprovalPreparation}</p>
          <button
            type="button"
            onClick={copyRefs}
            className="inline-flex items-center gap-1.5 rounded-md border border-green-500/30 bg-[var(--surface)] px-2 py-1 text-[10px] font-bold uppercase text-green-600 hover:bg-green-500/10"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Copy refs
          </button>
        </div>
      )}
    </div>
  );
}

function ApprovalProgressCard({
  approval,
  labels,
}: {
  approval: NonNullable<RunMultichainIntentResult['approval']>;
  labels: (typeof COPY)['id' | 'en'];
}) {
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.sharedTitle} value={`${approval.received}/${approval.required} ${approval.status === 'ready' ? labels.sharedReady : labels.sharedNeedsApproval}`} />
      <InfoPill label={labels.missingApprovals} value={`${approval.missingApprovals} co-approval${approval.missingApprovals === 1 ? '' : 's'}`} />
      <InfoPill label="Approvers" value={`${approval.totalApprovers} registered`} />
      <InfoPill label="Challenge" value={short(approval.challenge)} />
      {approval.approvedApprovers.map((approver) => (
        <InfoPill key={approver} label={labels.countedApprovers} value={short(approver)} />
      ))}
    </div>
  );
}

function IkaRequestPreviewCard({
  request,
  labels,
  sharedApprovers,
}: {
  request: IkaRequestPreview;
  labels: (typeof COPY)['id' | 'en'];
  sharedApprovers?: string[];
}) {
  const signing = request.preAlphaSigning;
  const destinationDigest =
    request.ethereumMessageDigest?.digestHex ??
    request.suiTransactionDigest?.digestBase58 ??
    request.suiTransactionDigest?.digestHex ??
    (typeof signing?.destinationSigningDigest === 'string' ? signing.destinationSigningDigest : undefined);
  const destinationDigestLabel = request.ethereumMessageDigest
    ? `${request.ethereumMessageDigest.network ?? 'sepolia'} EIP-191`
    : request.suiTransactionDigest
      ? `${request.suiTransactionDigest.network ?? 'sui-devnet'} sign-only`
      : labels.destinationDigest;

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.ikaRouteRequested} value={labels.ikaExecutionBoundary} wide />
      <InfoPill label="Source" value={`${request.source.chain.toUpperCase()} ${request.source.asset}`} />
      <InfoPill label="Target" value={`${request.target.chain.toUpperCase()} ${request.target.asset}`} />
      <InfoPill label="Request" value={request.requestId} />
      <InfoPill label="Policy seq" value={request.policyAttestation.policySequence.toString()} />
      <InfoPill label={labels.settlement} value={request.settlement} />
      {request.canonicalOrderHash && (
        <InfoPill label={labels.canonicalOrder} value={short(request.canonicalOrderHash)} />
      )}
      <InfoPill
        label={labels.routeRiskStatus}
        value={request.routeRisk ? `${labels.routeRiskPassed}: ${request.routeRisk.priceImpactBps ?? 'n/a'} bps` : labels.routeRiskPassed}
      />
      <InfoPill label={labels.ikaTechnicalDetails} value={request.executionBoundary.note} wide />
      <InfoPill label={labels.dwallet} value={signing?.dwalletAccount ? short(signing.dwalletAccount) : 'Pre-Alpha dWallet'} />
      <InfoPill label={labels.messageApproval} value={signing?.messageApprovalPda ? short(signing.messageApprovalPda) : 'Pending account'} />
      <InfoPill label={labels.messageHash} value={request.ikaMessageHash ? short(request.ikaMessageHash) : signing?.ikaMessageHash ? short(signing.ikaMessageHash) : signing?.messageDigest ? short(signing.messageDigest) : 'Ika message hash'} />
      {signing?.cpiAuthorityPda && (
        <InfoPill label={labels.cpiAuthority} value={short(signing.cpiAuthorityPda)} />
      )}
      {destinationDigest && <InfoPill label={destinationDigestLabel} value={short(destinationDigest)} />}
      <InfoPill label={labels.signatureScheme} value={signing?.signatureScheme ?? 'Pre-Alpha'} />
      {request.poletApprovalTransaction?.signers && (
        <InfoPill label={labels.requiredSigners} value={request.poletApprovalTransaction.signers.map(short).join(', ')} wide />
      )}
      {sharedApprovers?.map((approver) => (
        <InfoPill key={approver} label={labels.countedApprovers} value={short(approver)} />
      ))}
    </div>
  );
}

function JupiterRoutePreview({ entry, labels }: { entry: ActivityEntry; labels: (typeof COPY)['id' | 'en'] }) {
  const build = entry.jupiterPlan?.build;
  const quote = entry.jupiterPlan?.quoteMetadata;
  const route = quote?.routeLabel ?? build?.routePlan?.[0]?.swapInfo?.label ?? 'Jupiter Swap V2';
  const outputSymbol = entry.jupiterPlan?.outputToken?.symbol ?? 'SOL';
  const outputDecimals = entry.jupiterPlan?.outputToken?.decimals ?? 9;
  const expectedOutput = formatTokenAmount(quote?.expectedOutput ?? build?.outAmount, outputDecimals);
  const minimumOutput = formatTokenAmount(quote?.minimumOutput ?? build?.otherAmountThreshold, outputDecimals);
  const signer = entry.transactionSigners?.[0];
  const freshness = quote?.freshness?.timestamp ? formatFreshness(quote.freshness.timestamp) : undefined;

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.jupiterRouteReady} value={labels.executionBoundary} wide />
      <InfoPill label={labels.quoteValuation} value={labels.quoteValuationBoundary} wide />
      <InfoPill label={labels.expectedOutput} value={expectedOutput ? `${expectedOutput} ${outputSymbol}` : 'Available'} />
      <InfoPill label={labels.minOutput} value={minimumOutput ? `${minimumOutput} ${outputSymbol}` : 'Auto'} />
      <InfoPill label={labels.slippage} value={quote?.slippageBps !== undefined ? `${quote.slippageBps} bps` : '100 bps'} />
      {quote?.priceImpactPct && <InfoPill label={labels.priceImpact} value={quote.priceImpactPct} />}
      {freshness && <InfoPill label={labels.quoteFreshness} value={freshness} />}
      <InfoPill label={labels.routeEngine} value={route} />
      <InfoPill label={labels.policyTxReady} value={entry.smartWalletAuthority ? short(entry.smartWalletAuthority) : 'Smart wallet'} />
      <InfoPill label={labels.signer} value={signer ? short(signer) : 'Agent address'} />
    </div>
  );
}

function formatFreshness(timestamp: string) {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (!Number.isFinite(ageSeconds)) return timestamp;
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  return `${Math.floor(ageSeconds / 60)}m ago`;
}
