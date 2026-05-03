import { useState } from 'react';
import { Bot, Send, Shield, X, Check, AlertTriangle, Zap, Plus, Trash2 } from 'lucide-react';
import { evaluateIntent } from '../lib/api';
import type { Intent, IntentEvaluationResult } from '../types';

interface Policy {
  allowlist: string[];
  blocklist: string[];
  maxAmount?: number;
  dailyLimit?: number;
}

interface DemoPolicy {
  maxAmount: string;
  dailyLimit: string;
  blocklist: string[];
}

type IntentResult = {
  intent: Intent;
  result: IntentEvaluationResult;
  timestamp: number;
};

export function DemoTab() {
  const [demoPolicy, setDemoPolicy] = useState<DemoPolicy>({
    maxAmount: '0.05',
    dailyLimit: '0.05',
    blocklist: ['MaliciousTradingBot', 'GamblingSiteXYZ', 'DrainScamWallet'],
  });
  const [newBlockItem, setNewBlockItem] = useState('');
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<IntentResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addToBlocklist = () => {
    if (!newBlockItem.trim()) return;
    if (!demoPolicy.blocklist.includes(newBlockItem.trim())) {
      setDemoPolicy((prev) => ({
        ...prev,
        blocklist: [...prev.blocklist, newBlockItem.trim()],
      }));
    }
    setNewBlockItem('');
  };

  const removeFromBlocklist = (item: string) => {
    setDemoPolicy((prev) => ({
      ...prev,
      blocklist: prev.blocklist.filter((b) => b !== item),
    }));
  };

  const toLamports = (sol: string) => Math.round(parseFloat(sol || '0') * 1_000_000_000);

  const buildPolicy = (): Policy => ({
    allowlist: [],
    blocklist: demoPolicy.blocklist,
    maxAmount: toLamports(demoPolicy.maxAmount) || undefined,
    dailyLimit: toLamports(demoPolicy.dailyLimit) || undefined,
  });

  const handleSendIntent = async () => {
    if (!destination.trim() || !amount || !selectedSessionKey) return;
    setLoading(true);
    setError(null);

    const intent: Intent = {
      id: `demo-${Date.now()}`,
      owner: 'DemoOwner',
      sessionKey: selectedSessionKey,
      action: 'transfer',
      params: {
        destination: destination.trim(),
        amount: toLamports(amount),
      },
      timestamp: Date.now(),
    };

    try {
      const result = await evaluateIntent(intent, buildPolicy());
      setHistory((prev) => [{ intent, result, timestamp: Date.now() }, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate intent');
    } finally {
      setLoading(false);
    }
  };

  const runQuickDemo = (dest: string, solAmount: string, label: string) => {
    setDestination(dest);
    setAmount(solAmount);
    setSelectedSessionKey(selectedSessionKey || 'DemoSessionKey123');
    setHistory((prev) => [
      {
        intent: {
          id: `quick-${Date.now()}`,
          owner: 'DemoOwner',
          sessionKey: 'DemoSessionKey123',
          action: 'transfer',
          params: { destination: dest, amount: toLamports(solAmount) },
          timestamp: Date.now(),
        },
        result: (() => {
          const lamports = toLamports(solAmount);
          const policy = buildPolicy();
          if (policy.blocklist.includes(dest)) {
            return { allowed: false as const, reason: `Destination ${dest.slice(0, 8)}... is on the blocklist`, code: 'POLICY_BLOCKED' };
          }
          if (policy.maxAmount && lamports > policy.maxAmount) {
            return { allowed: false as const, reason: `Amount ${solAmount} SOL exceeds maximum allowed ${demoPolicy.maxAmount} SOL`, code: 'POLICY_BLOCKED' };
          }
          return { allowed: true as const, attestation: { owner: 'DemoOwner', sessionKey: 'DemoSessionKey123', policyHash: 'demo', intentHash: '0000', blockHash: '0000', slot: 0, timestamp: Date.now() } };
        })(),
        timestamp: Date.now(),
      },
      ...prev.slice(0, 9),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.05)] p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-[var(--lagoon-deep)] p-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="mb-1 text-xl font-semibold text-[var(--sea-ink)]">
              AI Agent Intent Simulator
            </h2>
            <p className="text-sm text-[var(--sea-ink-soft)]">
              Configure your policy rules and simulate AI agent intents to test enforcement in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Config + Quick Demos side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Policy Configuration */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--sea-ink)]">
            <Shield className="h-5 w-5 text-[var(--lagoon-deep)]" />
            Demo Policy Rules
          </h3>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Max per Transaction (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={demoPolicy.maxAmount}
                onChange={(e) => setDemoPolicy((p) => ({ ...p, maxAmount: e.target.value }))}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Daily Limit (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={demoPolicy.dailyLimit}
                onChange={(e) => setDemoPolicy((p) => ({ ...p, dailyLimit: e.target.value }))}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              Blocklist
            </label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                placeholder="Address or label to block"
                value={newBlockItem}
                onChange={(e) => setNewBlockItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToBlocklist()}
                className="flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-mono focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
              <button
                onClick={addToBlocklist}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {demoPolicy.blocklist.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {demoPolicy.blocklist.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                  >
                    {item}
                    <button
                      onClick={() => removeFromBlocklist(item)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-red-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--sea-ink-soft)]">No blocklist items — all destinations allowed</p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-3">
            <p className="mb-1 text-xs font-medium text-[var(--sea-ink-soft)]">Current limits</p>
            <div className="flex gap-4 text-xs text-[var(--sea-ink)]">
              <span>Max tx: <strong>{demoPolicy.maxAmount || '∞'} SOL</strong></span>
              <span>Daily: <strong>{demoPolicy.dailyLimit || '∞'} SOL</strong></span>
              <span>Blocklist: <strong>{demoPolicy.blocklist.length} items</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Demos */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--sea-ink)]">
            <Bot className="h-5 w-5 text-[var(--lagoon-deep)]" />
            Quick Scenarios
          </h3>
          <div className="space-y-3">
            <QuickDemoCard
              title="Drain Attack Blocked"
              description="AI tries to send 5 SOL — exceeds 0.05 SOL limit"
              badgeText="BLOCKED"
              badgeType="blocked"
              onRun={() => runQuickDemo('DrainAttackerWallet', '5', 'drain')}
            />
            <QuickDemoCard
              title="Blocklist Hit"
              description="AI tries to send to known malicious address"
              badgeText="BLOCKED"
              badgeType="blocked"
              onRun={() => runQuickDemo('MaliciousTradingBot', '0.01', 'blocklist')}
            />
            <QuickDemoCard
              title="Allowed Transfer"
              description="AI sends 0.01 SOL to legitimate DeFi protocol"
              badgeText="APPROVED"
              badgeType="allowed"
              onRun={() => runQuickDemo('JupiterAggregator', '0.01', 'allowed')}
            />
            <QuickDemoCard
              title="Spending Limit Hit"
              description="AI tries 0.06 SOL — max is 0.05 SOL"
              badgeText="BLOCKED"
              badgeType="blocked"
              onRun={() => runQuickDemo('RandomAddress', '0.06', 'overlimit')}
            />
          </div>
        </div>
      </div>

      {/* Intent Form */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--sea-ink)]">
          <Send className="h-5 w-5" />
          Custom Intent
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              Session Key
            </label>
            <input
              type="text"
              placeholder="AI agent session key"
              value={selectedSessionKey}
              onChange={(e) => setSelectedSessionKey(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-mono focus:border-[var(--lagoon-deep)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              Destination
            </label>
            <input
              type="text"
              placeholder="Solana address or label"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-mono focus:border-[var(--lagoon-deep)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              Amount (SOL)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSendIntent}
          disabled={!selectedSessionKey || !destination || !amount || loading}
          className="mt-4 w-full rounded-full bg-[var(--lagoon-deep)] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? 'Evaluating...' : 'Send Intent'}
        </button>
      </div>

      {/* Result History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--sea-ink)]">Intent History</h3>
          {history.map((entry, i) => (
            <IntentResultCard key={entry.intent.id} entry={entry} isLatest={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickDemoCard({
  title,
  description,
  badgeText,
  badgeType,
  onRun,
}: {
  title: string;
  description: string;
  badgeText: string;
  badgeType: 'blocked' | 'allowed';
  onRun: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-white p-3">
      <div className="flex items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
            badgeType === 'blocked'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {badgeText}
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--sea-ink)]">{title}</p>
          <p className="text-xs text-[var(--sea-ink-soft)]">{description}</p>
        </div>
      </div>
      <button
        onClick={onRun}
        className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-gray-50"
      >
        Run
      </button>
    </div>
  );
}

function IntentResultCard({
  entry,
  isLatest,
}: {
  entry: IntentResult;
  isLatest: boolean;
}) {
  const { intent, result } = entry;
  const amountLamports =
    typeof intent.params === 'object' && 'amount' in intent.params
      ? (intent.params as { amount: number }).amount
      : 0;
  const dest =
    typeof intent.params === 'object' && 'destination' in intent.params
      ? (intent.params as { destination: string }).destination
      : 'unknown';

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        result.allowed
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50'
      } ${isLatest ? 'ring-2 ring-offset-2' : ''} ${
        result.allowed ? 'ring-green-400' : 'ring-red-400'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {result.allowed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Check className="h-6 w-6 text-white" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
              <X className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-[var(--sea-ink)]">
              {result.allowed ? 'APPROVED' : 'BLOCKED'}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {new Date(entry.timestamp).toLocaleTimeString()}
              {isLatest && ' · just now'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-[var(--sea-ink)]">
            {(amountLamports / 1_000_000_000).toFixed(3)} SOL
          </p>
          <p className="font-mono text-xs text-[var(--sea-ink-soft)]">
            to {dest.slice(0, 8)}...
          </p>
        </div>
      </div>

      {result.reason && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            result.allowed
              ? 'border-green-200 bg-white text-green-700'
              : 'border-red-200 bg-white text-red-700'
          }`}
        >
          <span className="font-medium">Reason: </span>
          {result.reason}
        </div>
      )}
    </div>
  );
}