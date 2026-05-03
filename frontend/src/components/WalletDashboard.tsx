import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { PolicyConfigurator } from './PolicyConfigurator';
import { TemporalKeyManager } from './TemporalKeyManager';
import { DemoTab } from './DemoTab';
import { Shield, Clock, Key, AlertTriangle } from 'lucide-react';
import type { Policy } from '../types';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'temporal' | 'demo'>('overview');
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [temporalKeys, setTemporalKeys] = useState<TemporalKey[]>([]);

  const pubkeyStr = publicKey?.toBase58();

  const handleApplyPolicy = (policy: Policy) => {
    setCurrentPolicy(policy);
    console.log('Policy applied:', policy);
  };

  const handleRevokeKey = (keyId: string) => {
    setTemporalKeys(prev => prev.map(k => k.id === keyId ? { ...k, authorized: false } : k));
  };

  const handleGrantKey = (sessionKey: string, expiresAt: number, dailyLimit: number) => {
    const newKey: TemporalKey = {
      id: `key-${Date.now()}`,
      sessionKey,
      expiresAt,
      authorized: true,
      dailyLimit,
      dailySpent: 0,
      createdAt: Date.now(),
    };
    setTemporalKeys(prev => [...prev, newKey]);
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
    try {
      const res = await fetch('http://localhost:3001/wallet/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: pubkeyStr }),
      });
      const data = await res.json();
      if (data.success && data.data.transaction) {
        // In a real app we would sign and send the transaction to Solana
        // const txBytes = Buffer.from(data.data.transaction, 'base64');
        // const tx = VersionedTransaction.deserialize(txBytes);
        // if (signTransaction) await signTransaction(tx);
        console.log('Wallet initialized via proxy!', data);
        setIsInitialized(true);
      }
    } catch (err) {
      console.error('Initialization failed:', err);
    } finally {
      setIsInitializing(false);
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
            {isInitializing ? 'Initializing...' : 'Create Smart Wallet'}
          </button>
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
            <p className="font-mono text-sm text-[var(--sea-ink-soft)]">
              {pubkeyStr}
            </p>
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
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-[var(--lagoon-deep)] text-white'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'policy' && 'Policy'}
            {tab === 'temporal' && 'Session Keys'}
            {tab === 'demo' && 'Demo'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'policy' && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <PolicyConfigurator currentPolicy={currentPolicy} onApply={handleApplyPolicy} />
        </div>
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
        label="Daily Spent"
        value="0.00 SOL"
        sublabel="0.05 SOL limit"
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
        value="Not Set"
        sublabel="Configure to protect"
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Last Blocked"
        value="None"
        sublabel="All transactions allowed"
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
