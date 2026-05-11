import { useMemo, useState } from 'react';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Bot, Copy, Download, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { Panel } from './ui/Panel';
import { InfoTile } from './ui/InfoTile';
import { grantKey } from '../lib/api';

export interface AgentOnboardingPanelProps {
  owner?: string;
  proxyUrl?: string;
  rpcUrl?: string;
  onSessionGranted?: (sessionPublicKey: string) => void;
}

type Stage =
  | { phase: 'idle' }
  | { phase: 'generated'; keypair: BrowserAgentKeypair }
  | { phase: 'granting'; keypair: BrowserAgentKeypair }
  | { phase: 'ready'; keypair: BrowserAgentKeypair; expiresAt: number }
  | { phase: 'error'; keypair?: BrowserAgentKeypair; reason: string };

interface BrowserAgentKeypair {
  publicKey: string;
  secretKeyBase58: string;
}

const DEFAULT_PROXY = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
const DEFAULT_RPC = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const DEFAULT_EXPIRES_HOURS = 24;
const DEFAULT_LEGACY_LAMPORTS = 50_000_000; // 0.05 SOL — confidential policy is the real gate

export function AgentOnboardingPanel({
  owner,
  proxyUrl = DEFAULT_PROXY,
  rpcUrl = DEFAULT_RPC,
  onSessionGranted,
}: AgentOnboardingPanelProps) {
  const [stage, setStage] = useState<Stage>({ phase: 'idle' });
  const [copied, setCopied] = useState<string | null>(null);
  const [hoursToExpiry, setHoursToExpiry] = useState(DEFAULT_EXPIRES_HOURS);

  const agentConfigJson = useMemo(() => {
    if (stage.phase !== 'ready' && stage.phase !== 'granting' && stage.phase !== 'generated') return '';
    const kp = stage.keypair ?? null;
    if (!owner || !kp) return '';
    return JSON.stringify(
      {
        POLET_OWNER: owner,
        POLET_SESSION_KEY: kp.publicKey,
        POLET_AGENT_KEYPAIR: kp.secretKeyBase58,
        POLET_PROXY_URL: proxyUrl,
        POLET_RPC_URL: rpcUrl,
      },
      null,
      2
    );
  }, [stage, owner, proxyUrl, rpcUrl]);

  const hermesSnippet = useMemo(() => {
    if (!owner || stage.phase === 'idle' || stage.phase === 'error') return '';
    const kp = stage.keypair;
    if (!kp) return '';
    return JSON.stringify(
      {
        mcpServers: {
          polet: {
            command: 'node',
            args: ['/absolute/path/to/Polet-AI/sdk/dist/mcp-server/cli.js'],
            env: {
              POLET_OWNER: owner,
              POLET_SESSION_KEY: kp.publicKey,
              POLET_AGENT_KEYPAIR: kp.secretKeyBase58,
              POLET_PROXY_URL: proxyUrl,
              POLET_RPC_URL: rpcUrl,
            },
          },
        },
      },
      null,
      2
    );
  }, [stage, owner, proxyUrl, rpcUrl]);

  const handleGenerate = () => {
    const kp = Keypair.generate();
    setStage({
      phase: 'generated',
      keypair: {
        publicKey: kp.publicKey.toBase58(),
        secretKeyBase58: bs58.encode(kp.secretKey),
      },
    });
  };

  const handleGrant = async () => {
    if (stage.phase !== 'generated' || !owner) return;
    setStage({ phase: 'granting', keypair: stage.keypair });
    try {
      const expiresAt = Date.now() + hoursToExpiry * 60 * 60 * 1000;
      await grantKey({
        owner,
        sessionKey: stage.keypair.publicKey,
        expiresAt,
        dailyLimit: DEFAULT_LEGACY_LAMPORTS,
      });
      setStage({ phase: 'ready', keypair: stage.keypair, expiresAt });
      onSessionGranted?.(stage.keypair.publicKey);
    } catch (error) {
      setStage({
        phase: 'error',
        keypair: stage.keypair,
        reason: error instanceof Error ? error.message : 'Failed to grant session',
      });
    }
  };

  const handleCopy = async (text: string, slot: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(slot);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleDownload = () => {
    if (!agentConfigJson) return;
    const blob = new Blob([agentConfigJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'polet-agent.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const keypair = stage.phase === 'idle' ? null : stage.keypair ?? null;

  return (
    <Panel icon={<Bot className="h-5 w-5" />} title="Agent credentials (for Hermes / Claude / Cursor / SendAI)" testId="agent-onboarding-panel">
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs leading-5 text-[var(--sea-ink-soft)]">
        <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--lagoon)]" />
        <div>
          <p className="font-semibold uppercase tracking-wide text-[var(--sea-ink)]">One-click agent onboarding</p>
          <p className="mt-1">
            Generate a fresh Ed25519 keypair for your AI agent in the browser, grant it as a Polet session, and download the
            config file Hermes / Claude Desktop / Cursor / SendAI need. The agent secret never leaves your browser until you
            download it.
          </p>
        </div>
      </div>

      {!owner && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
          Connect an owner wallet and initialize the Polet smart wallet before generating agent credentials.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!owner}
          data-testid="agent-generate-keypair"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {keypair ? 'Regenerate agent keypair' : 'Generate agent keypair'}
        </button>
        <button
          type="button"
          onClick={handleGrant}
          disabled={stage.phase !== 'generated'}
          data-testid="agent-grant-session"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stage.phase === 'granting' ? 'Granting…' : 'Grant as Polet session'}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--sea-ink-soft)]">
        <label className="font-semibold uppercase tracking-wide text-[var(--sea-ink)]">Session TTL</label>
        <select
          value={hoursToExpiry}
          onChange={(e) => setHoursToExpiry(Number(e.target.value))}
          className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1"
        >
          <option value={1}>1 hour</option>
          <option value={6}>6 hours</option>
          <option value={24}>24 hours</option>
          <option value={72}>3 days</option>
          <option value={168}>7 days</option>
        </select>
      </div>

      {keypair && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Agent public key (session)" value={truncate(keypair.publicKey)} small tone="green" />
            <InfoTile
              label="Session status"
              value={
                stage.phase === 'ready'
                  ? 'Granted'
                  : stage.phase === 'granting'
                    ? 'Submitting…'
                    : stage.phase === 'error'
                      ? 'Error'
                      : 'Pending grant'
              }
              small
              tone={stage.phase === 'ready' ? 'green' : 'amber'}
            />
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
            <p className="flex items-center gap-2 font-semibold uppercase tracking-wide">
              <ShieldAlert className="h-4 w-4" />
              Agent secret — copy this now
            </p>
            <p className="mt-1 leading-5">
              The agent runtime needs this secret to sign Polet approval transactions. Copy it somewhere safe; this page
              does not store it. If the agent is compromised, use the revoke button in Agent Access to kill the session.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-red-500/10 px-2 py-1 font-mono text-[11px]">
                {keypair.secretKeyBase58}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(keypair.secretKeyBase58, 'secret')}
                className="rounded bg-red-500/20 p-1 text-red-600 hover:bg-red-500/30"
                aria-label="Copy agent secret"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied === 'secret' && <span className="text-[11px]">Copied ✓</span>}
            </div>
          </div>

          {stage.phase === 'error' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
              Grant failed: {stage.reason}
            </div>
          )}

          {stage.phase === 'ready' && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  data-testid="agent-download-config"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-3 py-2 text-[11px] font-extrabold uppercase tracking-tight text-white hover:opacity-90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download polet-agent.json
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(agentConfigJson, 'env')}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === 'env' ? 'Env copied ✓' : 'Copy as env vars'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(hermesSnippet, 'hermes')}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === 'hermes' ? 'mcp.json copied ✓' : 'Copy MCP client snippet'}
                </button>
              </div>

              <details className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs">
                <summary className="cursor-pointer font-semibold uppercase tracking-wide text-[var(--sea-ink)]">
                  Preview polet-agent.json
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--sea-ink-soft)]">
{agentConfigJson}
                </pre>
              </details>

              <details className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs">
                <summary className="cursor-pointer font-semibold uppercase tracking-wide text-[var(--sea-ink)]">
                  Preview MCP client snippet (Claude Desktop / Cursor / Hermes)
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-[var(--sea-ink-soft)]">
{hermesSnippet}
                </pre>
                <p className="mt-2 leading-5 text-[var(--sea-ink-soft)]">
                  Replace <code>/absolute/path/to/Polet-AI/sdk/dist/mcp-server/cli.js</code> with your checkout path. Run
                  <code className="ml-1">cd sdk && bun run build</code> first so <code>dist/</code> exists.
                </p>
              </details>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function truncate(value: string): string {
  if (!value || value.length < 16) return value || '—';
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}
