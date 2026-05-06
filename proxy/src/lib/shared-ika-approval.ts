import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import type { CanonicalBridgelessOrder } from './bridgeless-order';
import type { WalletData } from './wallet-store';
import type { MultichainStrategyParams } from '../types/intent';

export const SHARED_IKA_APPROVAL_CHALLENGE_SCHEMA = 'polet.ika.shared-approval.v1';

export interface SharedIkaApprovalPolicy {
  mode: 'ika-approval-quorum';
  threshold: number;
  approvers: string[];
  requireFor?: 'all-ika' | 'ethereum-only';
}

export interface SharedIkaApprovalProof {
  approver: string;
  signature: string;
  encoding?: 'base64';
}

export interface SharedIkaApprovalInput {
  owner: string;
  sessionKey: string;
  requestId: string;
  canonicalOrder: CanonicalBridgelessOrder;
  canonicalOrderHash: string;
  destinationDigest: string;
  params: MultichainStrategyParams;
  walletSharedIkaApprovals?: WalletData['sharedIkaApprovals'];
}

export interface SharedIkaApprovalProgress {
  status: 'not-required' | 'needs-approval' | 'ready';
  required: number;
  received: number;
  threshold: number;
  totalApprovers: number;
  approvedApprovers: string[];
  missingApprovals: number;
  challenge: string;
}

export interface SharedIkaApprovalDecision {
  ready: boolean;
  progress: SharedIkaApprovalProgress;
}

export function evaluateSharedIkaApproval(input: SharedIkaApprovalInput): SharedIkaApprovalDecision {
  const policy = normalizeWalletPolicy(input.walletSharedIkaApprovals)
    ?? normalizePolicy(input.params.sharedAccess?.policy, input.params.targetChain);
  const challenge = buildSharedIkaApprovalChallenge(input);
  if (!policy) {
    return {
      ready: true,
      progress: {
        status: 'not-required',
        required: 0,
        received: 0,
        threshold: 0,
        totalApprovers: 0,
        approvedApprovers: [],
        missingApprovals: 0,
        challenge,
      },
    };
  }

  const approverSet = new Set(policy.approvers);
  const approvedApprovers: string[] = [];
  const seen = new Set<string>();

  for (const proof of input.params.sharedAccess?.approvals ?? []) {
    const approver = normalizePublicKey(proof.approver, 'sharedAccess.approver');
    if (!approverSet.has(approver) || seen.has(approver)) continue;
    if (verifyApprovalSignature(approver, proof.signature, challenge)) {
      approvedApprovers.push(approver);
      seen.add(approver);
    }
  }

  const ready = approvedApprovers.length >= policy.threshold;
  return {
    ready,
    progress: {
      status: ready ? 'ready' : 'needs-approval',
      required: policy.threshold,
      received: approvedApprovers.length,
      threshold: policy.threshold,
      totalApprovers: policy.approvers.length,
      approvedApprovers,
      missingApprovals: Math.max(policy.threshold - approvedApprovers.length, 0),
      challenge,
    },
  };
}

export function buildSharedIkaApprovalChallenge(input: SharedIkaApprovalInput): string {
  return stableStringify({
    schema: SHARED_IKA_APPROVAL_CHALLENGE_SCHEMA,
    requestId: input.requestId,
    owner: input.owner,
    sessionKey: input.sessionKey,
    source: input.canonicalOrder.source,
    target: input.canonicalOrder.target,
    amountBaseUnits: input.canonicalOrder.amount.baseUnits,
    policyBaseUnits: input.canonicalOrder.amount.policyBaseUnits,
    policySequence: input.canonicalOrder.policySequence,
    canonicalOrderHash: input.canonicalOrderHash,
    destinationDigest: input.destinationDigest,
    nonce: input.canonicalOrder.nonce,
    expiresAtUnix: input.canonicalOrder.expiresAtUnix,
  });
}

function normalizePolicy(value: MultichainStrategyParams['sharedAccess']['policy'] | undefined, targetChain: string): SharedIkaApprovalPolicy | undefined {
  if (!value) return undefined;
  if (value.mode !== 'ika-approval-quorum') {
    throw new Error('sharedAccess.policy.mode must be ika-approval-quorum');
  }
  if (value.requireFor === 'ethereum-only' && targetChain !== 'ethereum') return undefined;
  if (!Number.isInteger(value.threshold) || value.threshold < 1) {
    throw new Error('sharedAccess.policy.threshold must be a positive integer');
  }
  const approvers = value.approvers.map((approver) => normalizePublicKey(approver, 'sharedAccess.policy.approver'));
  const uniqueApprovers = Array.from(new Set(approvers));
  if (uniqueApprovers.length === 0) {
    throw new Error('sharedAccess.policy.approvers must not be empty');
  }
  if (value.threshold > uniqueApprovers.length) {
    throw new Error('sharedAccess.policy.threshold cannot exceed approver count');
  }

  return {
    mode: 'ika-approval-quorum',
    threshold: value.threshold,
    approvers: uniqueApprovers,
    ...(value.requireFor && { requireFor: value.requireFor }),
  };
}

function normalizeWalletPolicy(value: WalletData['sharedIkaApprovals'] | undefined): SharedIkaApprovalPolicy | undefined {
  if (!value?.enabled || value.threshold < 1) return undefined;

  const approvers = value.approvers
    .filter((approver) => approver.authorized)
    .map((approver) => normalizePublicKey(approver.key, 'wallet.sharedIkaApprovals.approver'));

  return {
    mode: 'ika-approval-quorum',
    threshold: value.threshold,
    approvers: Array.from(new Set(approvers)),
  };
}

function verifyApprovalSignature(approver: string, signatureBase64: string, challenge: string): boolean {
  try {
    const publicKey = new PublicKey(approver).toBytes();
    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length !== 64) return false;
    return nacl.sign.detached.verify(
      new TextEncoder().encode(challenge),
      Uint8Array.from(signature),
      publicKey
    );
  } catch {
    return false;
  }
}

function normalizePublicKey(value: string, label: string): string {
  try {
    return new PublicKey(value).toString();
  } catch {
    throw new Error(`${label} must be a valid Solana public key`);
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}
