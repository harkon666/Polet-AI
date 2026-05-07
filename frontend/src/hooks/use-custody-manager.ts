import { useState, useCallback } from 'react';
import type { SetupDemoCustodyInput, WalletTransactionResult } from '../lib/api';

interface CustodyState {
  usdcTokenAccount: string | null;
  solTokenAccount: string | null;
}

interface UseCustodyManagerOptions {
  owner: string | null;
  signAndConfirmTransaction: (tx: string) => Promise<string>;
  setupDemoCustody: (input: SetupDemoCustodyInput) => Promise<WalletTransactionResult>;
  onCustodyReady?: (custody: CustodyState) => void;
  onActivity?: (entry: { status: string; message: string; route: string }) => void;
  t: {
    custodyReady: string;
    setupCustody: string;
  };
}

export function useCustodyManager({
  owner,
  signAndConfirmTransaction,
  setupDemoCustody,
  onCustodyReady,
  onActivity,
  t,
}: UseCustodyManagerOptions) {
  const [custody, setCustody] = useState<CustodyState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupCustodyAccounts = useCallback(async () => {
    if (!owner) {
      setError('Owner not available');
      return;
    }
    setBusy('custody');
    setError(null);
    try {
      const result = await setupDemoCustody({
        owner,
        usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      });
      const signature = await signAndConfirmTransaction(result.transaction);
      const newCustody = {
        usdcTokenAccount: result.usdcTokenAccount ?? 'registered',
        solTokenAccount: result.solTokenAccount ?? 'registered',
      };
      setCustody(newCustody);
      onCustodyReady?.(newCustody);
      onActivity?.({
        status: 'setup',
        message: `${t.custodyReady}: ${signature.slice(0, 8)}...`,
        route: 'Contract register_demo_custody',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up demo custody');
    } finally {
      setBusy(null);
    }
  }, [owner, signAndConfirmTransaction, setupDemoCustody, onCustodyReady, onActivity, t]);

  const initCustody = useCallback((data: { demoCustody?: { configured: boolean; usdcTokenAccount: string; solTokenAccount: string } } | null) => {
    if (data?.demoCustody?.configured) {
      setCustody({
        usdcTokenAccount: data.demoCustody.usdcTokenAccount,
        solTokenAccount: data.demoCustody.solTokenAccount,
      });
    }
  }, []);

  return {
    custody,
    busy,
    error,
    setupCustodyAccounts,
    initCustody,
    canSetup: Boolean(owner) && !busy,
  };
}