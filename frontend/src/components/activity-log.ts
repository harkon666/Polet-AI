import type { COPY } from '../lib/i18n';
import type {
  RunMultichainIntentResult,
  IkaRequestPreview,
  JupiterPlanPreview,
  OfficialEncryptPolicyPreview,
} from '../lib/api';

export type ActivityStatus =
  | 'setup' | 'approved' | 'blocked' | 'needs-approval' | 'error'
  | 'pending-encrypt-execution' | 'encrypt-verified-allowed' | 'encrypt-verified-blocked';

export interface ActivityEntry {
  id: string;
  timestamp: number;
  status: ActivityStatus;
  message: string;
  route?: string;
  amountUsdc?: string;
  routePair?: string;
  encryptPolicy?: OfficialEncryptPolicyPreview;
  jupiterPlan?: JupiterPlanPreview;
  ikaRequest?: IkaRequestPreview;
  approval?: RunMultichainIntentResult['approval'];
  sharedApprovers?: string[];
  transactionSigners?: string[];
  smartWalletAuthority?: string;
}

export function isBlockedStatus(status: ActivityStatus): boolean {
  return status === 'blocked' || status === 'encrypt-verified-blocked';
}

export function isAllowedStatus(status: ActivityStatus): boolean {
  return status === 'approved' || status === 'encrypt-verified-allowed';
}

type EncryptLifecycleStatus = 'pending-encrypt-execution' | 'encrypt-verified-allowed' | 'encrypt-verified-blocked';

export function getEncryptStatus(
  status: unknown,
  policy: { status?: string } | undefined
): EncryptLifecycleStatus | undefined {
  const value = typeof policy?.status === 'string' ? policy.status : status;
  return value === 'pending-encrypt-execution' || value === 'encrypt-verified-allowed' || value === 'encrypt-verified-blocked'
    ? value
    : undefined;
}

export function encryptMessage(status: EncryptLifecycleStatus, labels: (typeof COPY)['id' | 'en'], fallback?: string) {
  if (status === 'pending-encrypt-execution') return fallback ?? labels.encryptPendingMessage;
  if (status === 'encrypt-verified-allowed') return labels.encryptAllowedMessage;
  return fallback ?? labels.encryptBlockedMessage;
}

export function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

export function formatTokenAmount(raw: string | undefined, decimals: number) {
  if (!raw) return null;
  const value = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction.slice(0, 6)}` : whole.toString();
}
