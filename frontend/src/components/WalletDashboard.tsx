import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletButton } from './WalletButton';
import { TemporalKeyManager } from './TemporalKeyManager';
import { DemoTab } from './DemoTab';
import { Shield, Clock, Key, AlertTriangle, Send } from 'lucide-react';
import { getWalletData, initializeWallet, grantKey, registerAgent, revokeSession } from '../lib/api';
import { SimpleDemoTab } from './SimpleDemoTab';
import { useI18n } from '../lib/i18n';
import { POLET_PROGRAM_ID, shortProgramId } from '../lib/program';
import { confirmFreshTransaction, prepareFreshTransaction } from '../lib/solana-transaction';

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
  const [activeTab, setActiveTab] = useState<'demo' | 'simple' | 'temporal'>('demo');
  const { t } = useI18n();
  const [temporalKeys, setTemporalKeys] = useState<TemporalKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [revokingSessionKey, setRevokingSessionKey] = useState<string | null>(null);
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
        const sessions = data.temporalKeys ?? data.sessions ?? [];
        if (sessions.length > 0) {
          setTemporalKeys(sessions.map((tk: any) => ({
            id: tk.key.toString(),
            sessionKey: tk.key.toString(),
            expiresAt: Number(tk.expiresAt) * 1000,
            authorized: tk.authorized,
            dailyLimit: Number(tk.dailyLimit || 0),
            dailySpent: Number(tk.dailySpent || 0),
            createdAt: Number(tk.lastReset || Date.now() / 1000) * 1000,
          })));
        } else {
          setTemporalKeys([]);
        }
      }
    } catch (err) {
      console.log('Wallet not found or not initialized yet');
      setIsInitialized(false);
    }
  };


  const pubkeyStr = publicKey?.toBase58();

  const handleRevokeKey = async (sessionKey: string) => {
    if (!publicKey) return;
    setError(null);
    setStatus('Preparing revoke transaction...');
    setRevokingSessionKey(sessionKey);
    try {
      const result = await revokeSession({
        owner: publicKey.toBase58(),
        sessionKey,
      });
      setStatus('Waiting for owner signature...');
      const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
      const signature = await sendTransaction(transaction, connection);
      setStatus('Confirming revoke on-chain...');
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      console.log('Session revoked on-chain!', signature);
      await refreshData();
      setStatus('Agent access revoked on-chain.');
    } catch (err) {
      console.error('Revoke key failed:', err);
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setRevokingSessionKey(null);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleGrantKey = async (sessionKey: string, expiresAt: number, dailyLimit: number) => {
    if (!publicKey) return;
    try {
      const result = await grantKey({
        owner: publicKey.toBase58(),
        sessionKey,
        expiresAt: Math.floor(expiresAt / 1000),
        dailyLimit
      });
      const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
      const signature = await sendTransaction(transaction, connection);
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      refreshData();
    } catch (err) {
      console.error('Grant key failed:', err);
    }
  };

  const handleGenerateProxySession = async (expiresAt: number, dailyLimit: number) => {
    if (!publicKey) return;
    setError(null);
    setStatus('Generating proxy-held session key...');
    try {
      const result = await registerAgent({
        owner: publicKey.toBase58(),
        expiresAt: Math.floor(expiresAt / 1000),
        dailyLimit,
      });
      setStatus(`Authorize generated session ${result.sessionKey.slice(0, 8)}...`);
      const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
      const signature = await sendTransaction(transaction, connection);
      setStatus('Confirming generated session on-chain...');
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      console.log('Proxy session authorized on-chain!', signature);
      await refreshData();
      setStatus('Proxy session authorized. Select it in the demo dropdown.');
    } catch (err) {
      console.error('Generate proxy session failed:', err);
      setError(err instanceof Error ? err.message : 'Generate proxy session failed');
    } finally {
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (!connected || !publicKey) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-6">
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
      const result = await initializeWallet(pubkeyStr!);
      setStatus('Waiting for wallet signature...');
      const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
      const signature = await sendTransaction(transaction, connection);
      setStatus('Confirming transaction on-chain...');
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      console.log('Wallet initialized on-chain!', signature);
      setStatus('Wallet ready!');
      setIsInitialized(true);
      setPoletWalletPda(result.wallet);
      refreshData();
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
      <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-6">
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
      <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-6">
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--sea-ink-soft)]">Program:</span>
                <span className="font-mono text-sm text-[var(--sea-ink)]" title={POLET_PROGRAM_ID}>
                  {shortProgramId()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--lagoon-deep)]" />
            <span className="text-sm font-medium text-[var(--lagoon-deep)]">Active</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">Transaction Failed</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {status && !error && (
        <div className="rounded-lg border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] p-3 text-sm font-medium text-[var(--lagoon-deep)]">
          {status}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-1">
        {(['demo', 'simple', 'temporal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab
                ? 'bg-[var(--lagoon-deep)] text-white'
                : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
              }`}
          >
            {tab === 'demo' && 'Demo'}
            {tab === 'simple' && 'Simple Demo'}
            {tab === 'temporal' && 'Agent Access'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'temporal' && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <TemporalKeyManager
            keys={temporalKeys}
            onRevoke={handleRevokeKey}
            onGrant={handleGrantKey}
            onGenerateProxySession={handleGenerateProxySession}
            revokingSessionKey={revokingSessionKey}
          />
        </div>
      )}
      {activeTab === 'simple' && (
        <SimpleDemoTab
          agentAddresses={temporalKeys
            .filter((key) => key.authorized)
            .map((key) => key.sessionKey)}
        />
      )}
      {activeTab === 'demo' && (
        <>
          <DemoStatusSummary authorizedAgentCount={temporalKeys.filter((key) => key.authorized).length} />
          <DemoTab
            agentAddresses={temporalKeys
              .filter((key) => key.authorized)
              .map((key) => key.sessionKey)}
          />
        </>
      )}
    </div>
  );
}

function DemoStatusSummary({ authorizedAgentCount }: { authorizedAgentCount: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Shield className="h-5 w-5" />}
        label="Demo Pair"
        value="USDC -> SOL"
        sublabel="Jupiter strategy gateway"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Agent Access"
        value={authorizedAgentCount.toString()}
        sublabel="Authorized signer addresses"
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
    <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4">
      <div className="mb-2 flex items-center gap-2 text-[var(--sea-ink-soft)]">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mb-1 text-2xl font-bold text-[var(--sea-ink)]">{value}</p>
      <p className="text-xs text-[var(--sea-ink-soft)]">{sublabel}</p>
    </div>
  );
}
