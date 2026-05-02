import { useState } from 'react';
import { useWallet } from '../hooks/use-wallet';
import { WalletButton } from './WalletButton';
import { Shield, Clock, Key, AlertTriangle } from 'lucide-react';

export function WalletDashboard() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'policy' | 'temporal'>('overview');

  if (!connected) {
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
              {publicKey}
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
        {(['overview', 'policy', 'temporal'] as const).map((tab) => (
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
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'policy' && <PolicyTab />}
      {activeTab === 'temporal' && <TemporalKeyTab />}
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

function PolicyTab() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">Policy Configuration</h3>
        <button className="rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5">
          Choose Template
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Shield className="mb-3 h-10 w-10 text-[var(--sea-ink-soft)]" />
        <p className="text-sm text-[var(--sea-ink-soft)]">
          No policy set. Choose a template to protect your wallet.
        </p>
      </div>
    </div>
  );
}

function TemporalKeyTab() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">Temporal Session Keys</h3>
        <button className="rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5">
          Grant New Key
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Key className="mb-3 h-10 w-10 text-[var(--sea-ink-soft)]" />
        <p className="mb-1 text-sm font-medium text-[var(--sea-ink)]">No Session Keys</p>
        <p className="text-xs text-[var(--sea-ink-soft)]">
          Grant temporary keys to AI agents with expiry and spending limits.
        </p>
      </div>
    </div>
  );
}
