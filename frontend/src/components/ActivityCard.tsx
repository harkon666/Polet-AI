import { Check, AlertTriangle, X, Landmark, Clipboard } from 'lucide-react';
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
          <p className="font-semibold uppercase text-[var(--sea-ink-soft)]">Unsigned transaction</p>
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
          Copy base64
        </button>
      </div>
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
      <InfoPill label={labels.encryptAllowedOutput} value={short(policy.allowedOutputCiphertext)} />
      <InfoPill label={labels.encryptDailyOutput} value={short(policy.dailySpentOutputCiphertext)} />
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
      <InfoPill
        label={labels.routeRiskStatus}
        value={request.routeRisk ? `${labels.routeRiskPassed}: ${request.routeRisk.priceImpactBps ?? 'n/a'} bps` : labels.routeRiskPassed}
      />
      <InfoPill label={labels.ikaTechnicalDetails} value={request.executionBoundary.note} wide />
      <InfoPill label={labels.dwallet} value={signing?.dwalletAccount ? short(signing.dwalletAccount) : 'Pre-Alpha dWallet'} />
      <InfoPill label={labels.messageApproval} value={signing?.messageApprovalPda ? short(signing.messageApprovalPda) : 'Pending account'} />
      <InfoPill label={labels.messageHash} value={signing?.ikaMessageHash ? short(signing.ikaMessageHash) : signing?.messageDigest ? short(signing.messageDigest) : request.canonicalOrderHash ? short(request.canonicalOrderHash) : 'Ika message hash'} />
      {destinationDigest && <InfoPill label={destinationDigestLabel} value={short(destinationDigest)} />}
      <InfoPill label={labels.signatureScheme} value={signing?.signatureScheme ?? 'Pre-Alpha'} />
      {sharedApprovers?.map((approver) => (
        <InfoPill key={approver} label={labels.countedApprovers} value={short(approver)} />
      ))}
    </div>
  );
}

function JupiterRoutePreview({ entry, labels }: { entry: ActivityEntry; labels: (typeof COPY)['id' | 'en'] }) {
  const build = entry.jupiterPlan?.build;
  const route = build?.routePlan?.[0]?.swapInfo?.label ?? 'Jupiter Swap V2';
  const outputSymbol = entry.jupiterPlan?.outputToken?.symbol ?? 'SOL';
  const outputDecimals = entry.jupiterPlan?.outputToken?.decimals ?? 9;
  const expectedOutput = formatTokenAmount(build?.outAmount, outputDecimals);
  const minimumOutput = formatTokenAmount(build?.otherAmountThreshold, outputDecimals);
  const signer = entry.transactionSigners?.[0];

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.jupiterRouteReady} value={labels.executionBoundary} wide />
      <InfoPill label={labels.expectedOutput} value={expectedOutput ? `${expectedOutput} ${outputSymbol}` : 'Available'} />
      <InfoPill label={labels.minOutput} value={minimumOutput ? `${minimumOutput} ${outputSymbol}` : 'Auto'} />
      <InfoPill label={labels.routeEngine} value={route} />
      <InfoPill label={labels.policyTxReady} value={entry.smartWalletAuthority ? short(entry.smartWalletAuthority) : 'Smart wallet'} />
      <InfoPill label={labels.signer} value={signer ? short(signer) : 'Agent address'} />
    </div>
  );
}
