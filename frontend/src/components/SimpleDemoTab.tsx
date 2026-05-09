import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { type Signer } from '@solana/web3.js';
import { Shield, Send, AlertTriangle, CheckCircle2, Lock, Edit3, Coins, ArrowRightLeft, UserCheck } from 'lucide-react';
import {
  executeConfidentialTransfer,
  getWalletData,
  setConfidentialPolicy,
  grantKey,
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { confirmFreshTransaction, prepareFreshTransaction } from '../lib/solana-transaction';
import { Panel } from './ui/Panel';
import { PrivatePolicyTile } from './ui/PrivatePolicyTile';

interface SimpleDemoTabProps {
  agentAddresses: string[];
}

const SIMPLE_POLICY_WITNESS = [42, ...Array(31).fill(0)];

type PolicyScope = 'sol' | 'usdc';

function solToLamports(value: string): string {
  const raw = value.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(raw)) {
    throw new Error('SOL amount must be positive with at most 9 decimals');
  }
  const [whole, fraction = ''] = raw.split('.');
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  if (lamports <= 0n) throw new Error('SOL amount must be positive');
  return lamports.toString();
}

function usdcToBaseUnits(value: string): string {
  const raw = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    throw new Error('USDC amount must be positive with at most 6 decimals');
  }
  const [whole, fraction = ''] = raw.split('.');
  const baseUnits = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (baseUnits <= 0n) throw new Error('USDC amount must be positive');
  return baseUnits.toString();
}

export function SimpleDemoTab({ agentAddresses }: SimpleDemoTabProps) {
  const { t } = useI18n();
  const { publicKey: owner, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Active scope tab
  const [activeScope, setActiveScope] = useState<PolicyScope>('sol');

  // SOL policy states
  const [editingSolPolicy, setEditingSolPolicy] = useState(false);
  const [solMaxAmount, setSolMaxAmount] = useState('0.1');
  const [solDailyLimit, setSolDailyLimit] = useState('0.5');

  // USDC DCA policy states
  const [editingUsdcPolicy, setEditingUsdcPolicy] = useState(false);
  const [usdcMaxAmount, setUsdcMaxAmount] = useState('10');
  const [usdcDailyLimit, setUsdcDailyLimit] = useState('50');

  // Transfer state
  const [destination, setDestination] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.01');
  const [selectedAgent, setSelectedAgent] = useState('');

  useEffect(() => {
    if (owner) {
      refreshData();
    }
  }, [owner]);

  useEffect(() => {
    const sessions = owner 
      ? [owner.toBase58(), ...agentAddresses.filter(a => a !== owner.toBase58())] 
      : agentAddresses;
      
    if (sessions.length > 0 && (!selectedAgent || !sessions.includes(selectedAgent))) {
      setSelectedAgent(sessions[0]);
    }
  }, [agentAddresses, owner]);

  const refreshData = async () => {
    if (!owner) return;
    try {
      const data = await getWalletData(owner.toBase58());
      setWalletData(data);
      if (data?.solTransferPolicy?.enabled) {
        setEditingSolPolicy(false);
      } else {
        setEditingSolPolicy(true);
      }
      if (data?.usdcDcaPolicy?.enabled) {
        setEditingUsdcPolicy(false);
      } else {
        setEditingUsdcPolicy(true);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const signAndConfirmTransaction = async (transaction: string, additionalSigners?: Signer[]) => {
    const { transaction: tx, latestBlockhash } = await prepareFreshTransaction(transaction, connection);
    const signature = await sendTransaction(tx, connection, { signers: additionalSigners });
    await confirmFreshTransaction(connection, signature, latestBlockhash);
    return signature;
  };

  const saveSolPolicy = async () => {
    if (!owner) return;
    setBusy('sol-policy');
    setError(null);
    try {
      const result = await setConfidentialPolicy({
        owner: owner.toBase58(),
        maxPerRunBaseUnits: solToLamports(solMaxAmount),
        dailyCapBaseUnits: solToLamports(solDailyLimit),
        maskedWitnessDevFixture: SIMPLE_POLICY_WITNESS,
        policyScope: 'sol-transfer',
      });

      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`SOL policy saved: ${signature.slice(0, 8)}...`);
      await refreshData();
      setEditingSolPolicy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set SOL policy');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const saveUsdcPolicy = async () => {
    if (!owner) return;
    setBusy('usdc-policy');
    setError(null);
    try {
      const result = await setConfidentialPolicy({
        owner: owner.toBase58(),
        maxPerRunBaseUnits: usdcToBaseUnits(usdcMaxAmount),
        dailyCapBaseUnits: usdcToBaseUnits(usdcDailyLimit),
        maskedWitnessDevFixture: SIMPLE_POLICY_WITNESS,
        policyScope: 'usdc-dca',
      });

      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`USDC DCA policy saved: ${signature.slice(0, 8)}...`);
      await refreshData();
      setEditingUsdcPolicy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set USDC DCA policy');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const isOwnerSession = owner && walletData?.sessions?.some(
    (s: any) => s.key === owner.toBase58() && s.authorized
  );

  const grantOwnerAsSession = async () => {
    if (!owner) return;
    setBusy('grant-owner');
    setError(null);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
      const result = await grantKey({
        owner: owner.toBase58(),
        sessionKey: owner.toBase58(),
        expiresAt,
        dailyLimit: 1_000_000_000, // 1 SOL
      });
      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`Owner granted as session: ${signature.slice(0, 8)}...`);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant owner as session');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const executeTransfer = async () => {
    if (!owner || !selectedAgent || !destination) return;
    setBusy('transfer');
    setError(null);
    try {
      const result = await executeConfidentialTransfer({
        owner: owner.toBase58(),
        sessionKey: selectedAgent,
        destination,
        amountLamports: solToLamports(transferAmount),
      });

      if (!result.allowed) {
        throw new Error(result.reason || t.simpleTransferBlocked);
      }

      if (result.transaction) {
        setStatus('Waiting for signature...');
        const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
        const signature = await sendTransaction(transaction, connection);
        setStatus('Confirming transfer...');
        await confirmFreshTransaction(connection, signature, latestBlockhash);
        setStatus(t.simpleTransferSuccess);
        await refreshData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  if (loading) {
    return <div className="animate-pulse py-12 text-center text-[var(--sea-ink-soft)]">Loading...</div>;
  }

  const solPolicyEnabled = walletData?.solTransferPolicy?.enabled;
  const usdcPolicyEnabled = walletData?.usdcDcaPolicy?.enabled;

  return (
    <div className="space-y-6">
      {/* Scoped Policy Panel */}
      <section>
        <Panel icon={<Shield className="h-5 w-5" />} title={t.policyTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.simpleBody}</p>

          {/* Scope Tabs */}
          <div className="mb-4 flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-1">
            <button
              onClick={() => setActiveScope('sol')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                activeScope === 'sol'
                  ? 'bg-[var(--lagoon-deep)] text-white shadow-sm'
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <Coins className="h-4 w-4" />
              SOL Transfer
              {solPolicyEnabled && <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />}
            </button>
            <button
              onClick={() => setActiveScope('usdc')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                activeScope === 'usdc'
                  ? 'bg-[var(--lagoon-deep)] text-white shadow-sm'
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              USDC DCA
              {usdcPolicyEnabled && <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />}
            </button>
          </div>

          {/* SOL Transfer Policy */}
          {activeScope === 'sol' && (
            <div className="animate-fadeIn">
              {editingSolPolicy ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleMaxAmount}</span>
                      <div className="relative">
                        <input
                          value={solMaxAmount}
                          onChange={(e) => setSolMaxAmount(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleDailyLimit}</span>
                      <div className="relative">
                        <input
                          value={solDailyLimit}
                          onChange={(e) => setSolDailyLimit(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveSolPolicy}
                      disabled={Boolean(busy)}
                      className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === 'sol-policy' ? 'Signing...' : `${t.savePolicy} (SOL)`}
                    </button>
                    {solPolicyEnabled && (
                      <button
                        onClick={() => setEditingSolPolicy(false)}
                        className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)]"
                      >
                        {t.confirmCancel}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PrivatePolicyTile
                      label={t.simpleMaxAmount}
                      unit="SOL"
                      disabled={Boolean(busy)}
                    />
                    <PrivatePolicyTile
                      label={t.simpleDailyLimit}
                      unit="SOL"
                      disabled={Boolean(busy)}
                    />
                  </div>
                  <button
                    onClick={() => setEditingSolPolicy(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" />
                    {t.editPolicy}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* USDC DCA Policy */}
          {activeScope === 'usdc' && (
            <div className="animate-fadeIn">
              {editingUsdcPolicy ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Max USDC per DCA run</span>
                      <div className="relative">
                        <input
                          value={usdcMaxAmount}
                          onChange={(e) => setUsdcMaxAmount(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">USDC</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Daily USDC DCA limit</span>
                      <div className="relative">
                        <input
                          value={usdcDailyLimit}
                          onChange={(e) => setUsdcDailyLimit(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">USDC</span>
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveUsdcPolicy}
                      disabled={Boolean(busy)}
                      className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === 'usdc-policy' ? 'Signing...' : `${t.savePolicy} (USDC)`}
                    </button>
                    {usdcPolicyEnabled && (
                      <button
                        onClick={() => setEditingUsdcPolicy(false)}
                        className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)]"
                      >
                        {t.confirmCancel}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PrivatePolicyTile
                      label="Max USDC per DCA run"
                      unit="USDC"
                      disabled={Boolean(busy)}
                    />
                    <PrivatePolicyTile
                      label="Daily USDC DCA limit"
                      unit="USDC"
                      disabled={Boolean(busy)}
                    />
                  </div>
                  <button
                    onClick={() => setEditingUsdcPolicy(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" />
                    {t.editPolicy}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scope status pills */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              solPolicyEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
            }`}>
              <Coins className="h-3 w-3" />
              SOL: {solPolicyEnabled ? 'Active' : 'Not set'}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              usdcPolicyEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
            }`}>
              <ArrowRightLeft className="h-3 w-3" />
              USDC DCA: {usdcPolicyEnabled ? 'Active' : 'Not set'}
            </span>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Panel 2: Shielded Transfer */}
        <Panel icon={<Send className="h-5 w-5" />} title={t.simpleTransferTitle}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleDestination}</span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t.simpleDestinationPlaceholder}
                className="w-full rounded-lg px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.amount} (SOL)</span>
                <input
                  type="number"
                  step="0.001"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Session</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                >
                  {(owner ? [owner.toBase58(), ...agentAddresses.filter(a => a !== owner.toBase58())] : agentAddresses).map(addr => (
                    <option key={addr} value={addr}>
                      {addr === owner?.toBase58() ? 'Owner (Me)' : `${addr.slice(0, 4)}...${addr.slice(-4)}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {/* Grant owner as session if needed */}
            {selectedAgent === owner?.toBase58() && !isOwnerSession && (
              <button
                onClick={grantOwnerAsSession}
                disabled={Boolean(busy)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {busy === 'grant-owner' ? 'Signing...' : 'Grant Owner as Session Key (required once)'}
              </button>
            )}

            <button
              onClick={executeTransfer}
              disabled={Boolean(busy) || !destination || !selectedAgent || !solPolicyEnabled || (selectedAgent === owner?.toBase58() && !isOwnerSession)}
              className="w-full rounded-lg bg-[var(--lagoon-deep)] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'transfer' 
                ? '...' 
                : !solPolicyEnabled 
                  ? 'Set SOL Policy First' 
                  : selectedAgent === owner?.toBase58() && !isOwnerSession
                    ? 'Grant Owner Session First ↑'
                    : !destination 
                      ? 'Enter Destination' 
                      : t.simpleTransferTitle}
            </button>

            {!solPolicyEnabled && (
              <p className="mt-2 text-center text-[10px] text-amber-600 font-medium animate-pulse">
                ⚠️ Please save a SOL policy above to enable transfers.
              </p>
            )}

            {(error || status) && (
              <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
                }`}>
                {error ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span>{error || status}</span>
              </div>
            )}
          </div>
        </Panel>

        {/* Panel 3: Wallet Status */}
        <Panel icon={<Lock className="h-5 w-5" />} title="Wallet Status">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">Smart Wallet PDA</p>
              <p className="break-all font-mono text-xs font-bold text-[var(--lagoon-deep)]">{walletData?.walletPda || '---'}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">Custody Balance</p>
              <p className="text-xl font-black text-[var(--sea-ink)]">
                {(Number(walletData?.custodyBalances?.nativeSolLamports || 0) / 1_000_000_000).toFixed(4)} SOL
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
