import { useState, useCallback } from 'react';
import type {
  SharedIkaApproverConfigInput,
  SharedIkaApproverConfigResult,
  RevokeSharedIkaApproverInput,
  WalletTransactionResult,
} from '../lib/api';

interface SharedIkaApprovalConfig {
  threshold: number;
  approvers: string[];
}

interface UseIkaApprovalManagerOptions {
  owner: string | null;
  signAndConfirmTransaction: (tx: string) => Promise<string>;
  configureSharedIkaApprovers: (input: SharedIkaApproverConfigInput) => Promise<SharedIkaApproverConfigResult>;
  revokeSharedIkaApprover: (input: RevokeSharedIkaApproverInput) => Promise<WalletTransactionResult & { approver: string }>;
  getWalletData: (owner: string) => Promise<any>;
  onActivity?: (entry: { status: string; message: string; route: string }) => void;
  t: {
    sharedReady: string;
    revokeShared: string;
    invalidSharedApprover: string;
  };
}

export function useIkaApprovalManager({
  owner,
  signAndConfirmTransaction,
  configureSharedIkaApprovers,
  revokeSharedIkaApprover,
  getWalletData,
  onActivity,
  t,
}: UseIkaApprovalManagerOptions) {
  const [sharedIkaApproval, setSharedIkaApproval] = useState<SharedIkaApprovalConfig | null>(null);
  const [sharedDraft, setSharedDraft] = useState({ threshold: '1', approvers: '' });
  const [sharedApprovalProofs, setSharedApprovalProofs] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeApproverLines = (value: string) =>
    Array.from(new Set(value.split(/\s+/).map((line) => line.trim()).filter(Boolean)));

  const refreshSharedIkaApproval = useCallback(async () => {
    if (!owner) return;
    const data = await getWalletData(owner);
    if (!data) return;
    const configuredShared = normalizeSharedIkaApproval(data?.sharedIkaApprovals);
    setSharedIkaApproval(configuredShared);
    if (configuredShared) {
      setSharedDraft({
        threshold: configuredShared.threshold.toString(),
        approvers: configuredShared.approvers.join('\n'),
      });
    }
  }, [owner, getWalletData]);

  const configureSharedApproval = useCallback(async () => {
    if (!owner) {
      setError('Owner not available');
      return;
    }
    const approvers = normalizeApproverLines(sharedDraft.approvers);
    const threshold = Number.parseInt(sharedDraft.threshold, 10);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > approvers.length) {
      setError(t.invalidSharedApprover);
      return;
    }

    setBusy('shared-config');
    setError(null);
    try {
      const result = await configureSharedIkaApprovers({ owner, threshold, approvers });
      await signAndConfirmTransaction(result.transaction);
      const nextConfig = { threshold: result.threshold, approvers: result.approvers };
      setSharedIkaApproval(nextConfig);
      setSharedDraft({
        threshold: result.threshold.toString(),
        approvers: result.approvers.join('\n'),
      });
      await refreshSharedIkaApproval();
      onActivity?.({
        status: 'setup',
        message: `${t.sharedReady}: ${result.transaction.slice(0, 8)}...`,
        route: 'Contract configure_shared_ika_approvers',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure shared Ika approval');
    } finally {
      setBusy(null);
    }
  }, [owner, sharedDraft, signAndConfirmTransaction, configureSharedIkaApprovers, refreshSharedIkaApproval, onActivity, t]);

  const revokeSharedApproval = useCallback(async (approver: string) => {
    if (!owner) {
      setError('Owner not available');
      return;
    }

    setBusy(`shared-revoke-${approver}`);
    setError(null);
    try {
      const result = await revokeSharedIkaApprover({ owner, approver });
      await signAndConfirmTransaction(result.transaction);
      setSharedIkaApproval((prev) => {
        if (!prev) return null;
        const newApprovers = prev.approvers.filter((item) => item !== approver);
        return newApprovers.length > 0
          ? { threshold: Math.min(prev.threshold, newApprovers.length), approvers: newApprovers }
          : null;
      });
      await refreshSharedIkaApproval();
      onActivity?.({
        status: 'setup',
        message: `${t.revokeShared}: ${result.approver.slice(0, 8)}...`,
        route: 'Contract revoke_shared_ika_approver',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke shared Ika approver');
    } finally {
      setBusy(null);
    }
  }, [owner, revokeSharedIkaApprover, signAndConfirmTransaction, refreshSharedIkaApproval, onActivity, t]);

  const initSharedApproval = useCallback((data: any) => {
    const configured = normalizeSharedIkaApproval(data?.sharedIkaApprovals);
    if (configured) {
      setSharedIkaApproval(configured);
      setSharedDraft({
        threshold: configured.threshold.toString(),
        approvers: configured.approvers.join('\n'),
      });
    }
  }, []);

  const buildSharedAccess = useCallback((proofsText: string, invalidMessage: string) => {
    if (!sharedIkaApproval) return undefined;
    const trimmedProofs = proofsText.trim();
    if (!trimmedProofs) {
      return {
        policy: {
          mode: 'ika-approval-quorum' as const,
          threshold: sharedIkaApproval.threshold,
          approvers: sharedIkaApproval.approvers,
          requireFor: 'all-ika' as const,
        },
      };
    }

    const parsed = JSON.parse(trimmedProofs);
    if (!Array.isArray(parsed)) {
      throw new Error(invalidMessage);
    }

    return {
      policy: {
        mode: 'ika-approval-quorum' as const,
        threshold: sharedIkaApproval.threshold,
        approvers: sharedIkaApproval.approvers,
        requireFor: 'all-ika' as const,
      },
      approvals: parsed.map((proof: any) => ({
        approver: String(proof.approver),
        signature: String(proof.signature),
        encoding: proof.encoding === 'base64' ? 'base64' as const : undefined,
      })),
    };
  }, [sharedIkaApproval]);

  return {
    sharedIkaApproval,
    sharedDraft,
    setSharedDraft,
    sharedApprovalProofs,
    setSharedApprovalProofs,
    busy,
    error,
    configureSharedApproval,
    revokeSharedApproval,
    initSharedApproval,
    refreshSharedIkaApproval,
    buildSharedAccess,
    canConfigure: Boolean(owner) && !busy,
  };
}

function normalizeSharedIkaApproval(value: any): SharedIkaApprovalConfig | null {
  if (!value?.enabled || !Number.isInteger(value.threshold)) return null;
  const approvers = (value.approvers ?? [])
    .filter((approver: any) => approver?.authorized !== false)
    .map((approver: any) => typeof approver === 'string' ? approver : approver.key)
    .filter((approver: unknown): approver is string => typeof approver === 'string' && approver.length > 0);
  return approvers.length > 0 ? { threshold: value.threshold, approvers } : null;
}