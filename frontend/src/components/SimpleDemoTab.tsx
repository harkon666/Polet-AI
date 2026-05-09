import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Shield, Send, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { getWalletData, setConfidentialPolicy, buildTransaction, getEncryptCiphertextStatus } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { confirmFreshTransaction, prepareFreshTransaction } from '../lib/solana-transaction';
import { PublicKey } from '@solana/web3.js';

interface SimpleDemoTabProps {
  agentAddresses: string[];
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

  // Policy state
  const [maxAmount, setMaxAmount] = useState('0.1');
  const [dailyLimit, setDailyLimit] = useState('0.5');
  const [showValues, setShowValues] = useState(false);

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
    if (agentAddresses.length > 0 && !selectedAgent) {
      setSelectedAgent(agentAddresses[0]);
    }
  }, [agentAddresses]);

  const refreshData = async () => {
    if (!owner) return;
    try {
      const data = await getWalletData(owner.toBase58());
      setWalletData(data);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!owner) return;
    setBusy('policy');
    setError(null);
    try {
      // Mock witness for simple demo (32 bytes)
      const witness = Array(32).fill(0);
      witness[0] = 42; // arbitrary

      await setConfidentialPolicy({
        owner: owner.toBase58(),
        maxPerRunUsdc: (parseFloat(maxAmount) * 1000).toString(), 
        dailyCapUsdc: (parseFloat(dailyLimit) * 1000).toString(),
        maskedWitnessDevFixture: witness,
      });

      setStatus('Policy commitment updated on-chain.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set policy');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const executeTransfer = async () => {
    if (!owner || !selectedAgent || !destination) return;
    setBusy('transfer');
    setError(null);
    try {
      const result = await buildTransaction({
        owner: owner.toBase58(),
        sessionKey: selectedAgent,
        instruction: 0, // Transfer SOL
        destination,
        amount: parseFloat(transferAmount) * 1_000_000_000, // lamports
        attestation: 'simple-transfer-demo',
      });

      if (!result.allowed) {
        throw new Error(t.simpleTransferBlocked);
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
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (loading) {
    return <div className="animate-pulse py-12 text-center text-[var(--sea-ink-soft)]">Loading wallet state...</div>;
  }

  const policyEnabled = walletData?.confidentialPolicy?.enabled;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[var(--lagoon-deep)]">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">{t.simpleTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{t.simpleBody}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section 1: Confidential Guardrails */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                <Lock className="h-4 w-4" />
                Confidential Guardrails
              </h3>
              <button 
                onClick={() => setShowValues(!showValues)}
                className="text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)]"
              >
                {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">{t.simpleMaxAmount}</label>
                  <div className="relative">
                    <input
                      type={showValues ? "text" : "password"}
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">{t.simpleDailyLimit}</label>
                  <div className="relative">
                    <input
                      type={showValues ? "text" : "password"}
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                  </div>
                </div>
                <button
                  onClick={savePolicy}
                  disabled={Boolean(busy)}
                  className="w-full rounded-lg bg-[var(--sea-ink)] py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy === 'policy' ? 'Updating...' : 'Save Private Policy'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-[rgba(79,184,178,0.1)] p-3">
              {policyEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <span className="text-xs font-medium text-[var(--sea-ink)]">
                {policyEnabled ? t.simplePolicyReady : t.simplePolicyNotReady}
              </span>
            </div>
          </div>

          {/* Section 2: Shielded Transfer */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
              <Send className="h-4 w-4" />
              {t.simpleTransferTitle}
            </h3>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">{t.simpleDestination}</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t.simpleDestinationPlaceholder}
                    className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-mono focus:border-[var(--lagoon-deep)] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">{t.amount} (SOL)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">Session</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
                    >
                      {agentAddresses.map(addr => (
                        <option key={addr} value={addr}>
                          {addr.slice(0, 4)}...{addr.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={executeTransfer}
                  disabled={Boolean(busy) || !destination || !selectedAgent || !policyEnabled}
                  className="w-full rounded-lg bg-[var(--lagoon-deep)] py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy === 'transfer' ? 'Executing...' : 'Run Shielded Transfer'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            {status && !error && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Wallet Info Section */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">Smart Wallet PDA</p>
            <p className="font-mono text-xs text-[var(--lagoon-deep)]">{walletData?.walletPda || 'Not Initialized'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">SOL Balance</p>
            <p className="text-sm font-bold text-[var(--sea-ink)]">
              {(Number(walletData?.custodyBalances?.nativeSolLamports || 0) / 1_000_000_000).toFixed(4)} SOL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
