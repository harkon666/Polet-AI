import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { PolicyConfigurator } from './PolicyConfigurator';
import { TemporalKeyManager } from './TemporalKeyManager';
import { DemoTab } from './DemoTab';
import { Shield, Clock, Key, AlertTriangle } from 'lucide-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { useEffect } from 'react';
import { getWalletData } from '../lib/api';
import type { Policy } from '../types';
import * as borsh from 'borsh';

interface TemporalKey {
  id: string;
  sessionKey: string;
  expiresAt: number;
  authorized: boolean;
  dailyLimit: number;
  dailySpent: number;
  createdAt: number;
}

export function WalletDashboard() {
  const { connected, publicKey } = useWallet();
  const [isInitialized, setIsInitialized] = useState(false);
  const [poletWalletPda, setPoletWalletPda] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'temporal' | 'demo'>('overview');
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [temporalKeys, setTemporalKeys] = useState<TemporalKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { sendTransaction } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    if (connected && publicKey) {
      refreshData();
    }
  }, [connected, publicKey]);

  const refreshData = async () => {
    if (!publicKey) return;
    try {
      const data = await getWalletData(publicKey.toBase58());
      if (data) {
        setIsInitialized(true);
        // Update poletWalletPda from API response
        if (data.walletPda) {
          setPoletWalletPda(data.walletPda);
        }
        // Map on-chain data to frontend state
        if (data.temporalKeys) {
          setTemporalKeys(data.temporalKeys.map((tk: any, i: number) => ({
            id: `key-${i}`,
            sessionKey: tk.key.toString(),
            expiresAt: Number(tk.expiresAt),
            authorized: tk.authorized,
            dailyLimit: Number(tk.dailyLimit),
            dailySpent: Number(tk.dailySpent),
            createdAt: Number(tk.lastReset) * 1000,
          })));
        }
        if (data.policyData && data.policyData.length > 0) {
          try {
            // Borsh deserialization (current format: Vec<Pubkey> for allowlist/blocklist)
            const schema = new Map([[Object, { kind: 'struct', fields: [['allowlist', [['u8', 32]]], ['blocklist', [['u8', 32]]]] }]]);
            const p = borsh.deserialize(schema, Object, Buffer.from(data.policyData)) as { allowlist: Uint8Array[]; blocklist: Uint8Array[] };
            setCurrentPolicy({
              allowlist: p.allowlist.map((b: Uint8Array) => new PublicKey(b).toBase58()),
              blocklist: p.blocklist.map((b: Uint8Array) => new PublicKey(b).toBase58()),
            });
          } catch (e) {
            // Fallback to JSON for legacy data
            try {
              const decoded = JSON.parse(new TextDecoder().decode(new Uint8Array(data.policyData)));
              setCurrentPolicy(decoded);
            } catch { }
          }
        }
      }
    } catch (err) {
      console.log('Wallet not found or not initialized yet');
      setIsInitialized(false);
    }
  };


  const pubkeyStr = publicKey?.toBase58();

  const handleApplyPolicy = async (policy: Policy) => {
    if (!publicKey) return;
    try {
      const res = await fetch('http://localhost:3001/wallet/set-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: publicKey.toBase58(),
          policy
        }),
      });
      const data = await res.json();
      if (data.success && data.data.transaction) {
        const tx = Transaction.from(Uint8Array.from(atob(data.data.transaction), c => c.charCodeAt(0)));
        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        setSuccessMsg('Policy updated successfully!');
        refreshData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else if (data.error) {
        setError(data.error);
        setTimeout(() => setError(null), 6000);
      }
    } catch (err) {
      console.error('Apply policy failed:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      if (err && typeof err === 'object' && 'logs' in err) {
        console.error('Transaction logs:', err.logs);
      }
      if (err && typeof err === 'object' && 'logs' in err && err.logs) {
        const logs = err.logs as string[];
        logs.forEach((log: string, i: number) => console.error(`Log ${i}:`, log));
      }
      setError(err instanceof Error ? err.message : 'Apply policy failed');
    }
  };

  const handleRevokeKey = (keyId: string) => {
    setTemporalKeys(prev => prev.map(k => k.id === keyId ? { ...k, authorized: false } : k));
  };

  const handleGrantKey = async (sessionKey: string, expiresAt: number, dailyLimit: number) => {
    if (!publicKey) return;
    try {
      const res = await fetch('http://localhost:3001/wallet/grant-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: publicKey.toBase58(),
          sessionKey,
          expiresAt: Math.floor(expiresAt / 1000),
          dailyLimit
        }),
      });
      const data = await res.json();
      if (data.success && data.data.transaction) {
        const tx = Transaction.from(Uint8Array.from(atob(data.data.transaction), c => c.charCodeAt(0)));
        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        refreshData();
      }
    } catch (err) {
      console.error('Grant key failed:', err);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-[rgba(79,184,178,0.14)] p-4">
            <Shield className="h-12 w-12 text-[var(--lagoon-deep)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
            No Wallet Connected
          </h2>
          <p className="mb-6 max-w-md text-sm text-[var(--sea-ink-soft)]">
            Connect your wallet to create a policy-enforced smart wallet for your AI agent.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);
    setStatus('Preparing transaction...');
    try {
      const res = await fetch('http://localhost:3001/wallet/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: pubkeyStr }),
      });
      const data = await res.json();
      if (data.success && data.data.transaction) {
        setStatus('Waiting for wallet signature...');
        const tx = Transaction.from(Uint8Array.from(atob(data.data.transaction), c => c.charCodeAt(0)));
        const signature = await sendTransaction(tx, connection);
        setStatus('Confirming transaction on-chain...');
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          ...latestBlockhash
        }, 'confirmed');
        console.log('Wallet initialized on-chain!', signature);
        setStatus('Wallet ready!');
        setIsInitialized(true);
        console.log(data)
        setPoletWalletPda(data.data.wallet);
        refreshData();
      } else {
        throw new Error(data.error || 'Failed to get transaction from proxy');
      }
    } catch (err) {
      console.error('Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setIsInitializing(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (!isInitialized) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-[rgba(79,184,178,0.14)] p-4">
            <Key className="h-12 w-12 text-[var(--lagoon-deep)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--sea-ink)]">
            Initialize Smart Wallet
          </h2>
          <p className="mb-6 max-w-md text-sm text-[var(--sea-ink-soft)]">
            Your wallet is connected, but you need to initialize the Polet Smart Wallet protocol to start using AI agents securely.
          </p>
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-6 py-3 font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isInitializing ? (status || 'Processing...') : 'Create Smart Wallet'}
          </button>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800">Transaction Failed</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {status && !error && (
            <p className="mt-4 text-sm font-medium text-[var(--lagoon-deep)] animate-pulse">
              {status}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Info Banner */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 text-xl font-semibold text-[var(--sea-ink)]">
              Polet Smart Wallet
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Owner:</span>
                <span className="font-mono text-sm text-[var(--sea-ink)]">{pubkeyStr}</span>
              </div>
              {poletWalletPda && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Smart Wallet:</span>
                  <span className="font-mono text-sm text-[var(--lagoon-deep)]">{poletWalletPda}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--lagoon-deep)]" />
            <span className="text-sm font-medium text-[var(--lagoon-deep)]">Active</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-1">
        {(['overview', 'policy', 'temporal', 'demo'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab
                ? 'bg-[var(--lagoon-deep)] text-white'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
              }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'policy' && 'Confidential Policy'}
            {tab === 'temporal' && 'Session Keys'}
            {tab === 'demo' && 'DCA Demo'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'policy' && (
        <>
          {successMsg && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <p className="text-sm font-medium text-green-800">{successMsg}</p>
            </div>
          )}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <PolicyConfigurator currentPolicy={currentPolicy} onApply={handleApplyPolicy} />
        </div>
        </>
      )}
      {activeTab === 'temporal' && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <TemporalKeyManager
            keys={temporalKeys}
            onRevoke={handleRevokeKey}
            onGrant={handleGrantKey}
          />
        </div>
      )}
      {activeTab === 'demo' && <DemoTab />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        icon={<Shield className="h-5 w-5" />}
        label="Demo Pair"
        value="USDC -> SOL"
        sublabel="Jupiter strategy gateway"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Session Keys"
        value="0"
        sublabel="Active: 0"
      />
      <StatCard
        icon={<Key className="h-5 w-5" />}
        label="Policy"
        value="Confidential"
        sublabel="Numeric limits redacted"
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Run Agent Now"
        value="5 / 25"
        sublabel="Allow and block scenarios"
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-4">
      <div className="mb-2 flex items-center gap-2 text-[var(--sea-ink-soft)]">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mb-1 text-2xl font-bold text-[var(--sea-ink)]">{value}</p>
      <p className="text-xs text-[var(--sea-ink-soft)]">{sublabel}</p>
    </div>
  );
}
