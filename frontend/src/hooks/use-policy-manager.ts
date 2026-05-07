import { useState, useCallback } from 'react';
import type { SetConfidentialPolicyInput, WalletTransactionResult } from '../lib/api';

interface PolicyDraft {
  maxPerRunUsdc: string;
  dailyCapUsdc: string;
}

interface UsePolicyManagerOptions {
  owner: string | null;
  signAndConfirmTransaction: (tx: string) => Promise<string>;
  setConfidentialPolicy: (input: SetConfidentialPolicyInput) => Promise<WalletTransactionResult>;
  witness: number[];
  onPolicySaved?: () => void;
  onActivity?: (entry: { status: string; message: string; route: string }) => void;
  t: {
    policySaved: string;
    custodyRequired: string;
  };
}

export function usePolicyManager({
  owner,
  signAndConfirmTransaction,
  setConfidentialPolicy,
  witness,
  onPolicySaved,
  onActivity,
  t,
}: UsePolicyManagerOptions) {
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
  });
  const [policySaved, setPolicySaved] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savePolicy = useCallback(async (custodyReady: boolean, hasAgent: boolean) => {
    if (!owner) {
      setError('Owner not available');
      return;
    }
    if (!custodyReady || !hasAgent) {
      setError(t.custodyRequired);
      return;
    }
    setBusy('policy');
    setError(null);
    try {
      const result = await setConfidentialPolicy({
        owner,
        maxPerRunUsdc: policyDraft.maxPerRunUsdc,
        dailyCapUsdc: policyDraft.dailyCapUsdc,
        encryptionWitness: witness,
      });
      await signAndConfirmTransaction(result.transaction);
      setPolicySaved(true);
      setEditingPolicy(false);
      onPolicySaved?.();
      onActivity?.({
        status: 'setup',
        message: `${t.policySaved}: ${result.transaction.slice(0, 8)}...`,
        route: 'Contract set_confidential_numeric_policy',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save confidential policy');
    } finally {
      setBusy(null);
    }
  }, [owner, policyDraft, witness, signAndConfirmTransaction, setConfidentialPolicy, onPolicySaved, onActivity, t]);

  const initPolicy = useCallback((data: { confidentialPolicy?: { enabled: boolean } } | null) => {
    if (data?.confidentialPolicy?.enabled) {
      setPolicySaved(true);
      setEditingPolicy(false);
    }
  }, []);

  const editPolicy = useCallback(() => {
    setEditingPolicy(true);
  }, []);

  return {
    policyDraft,
    setPolicyDraft,
    policySaved,
    editingPolicy,
    busy,
    error,
    savePolicy,
    initPolicy,
    editPolicy,
    canSave: (custodyReady: boolean, hasAgent: boolean) => Boolean(owner && custodyReady && hasAgent && !busy),
  };
}