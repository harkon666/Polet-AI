import { useState } from 'react';
import { Key, Clock, Trash2, Copy, Check, Code, ChevronDown, ChevronUp } from 'lucide-react';

interface TemporalKey {
  id: string;
  sessionKey: string;
  expiresAt: number;
  authorized: boolean;
  dailyLimit: number;
  dailySpent: number;
  createdAt: number;
}

interface TemporalKeyManagerProps {
  owner?: string;
  keys: TemporalKey[];
  onRevoke: (sessionKey: string) => void;
  onGrant: (sessionKey: string, expiresAt: number, dailyLimit: number) => void;
  revokingSessionKey?: string | null;
}

export function TemporalKeyManager({
  owner,
  keys,
  onRevoke,
  onGrant,
  revokingSessionKey,
}: TemporalKeyManagerProps) {
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [newAgentAddress, setNewAgentAddress] = useState('');
  const [expiresIn, setExpiresIn] = useState(24); // hours
  const [dailyLimit, setDailyLimit] = useState(0.05); // SOL
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedConfigKey, setExpandedConfigKey] = useState<string | null>(null);

  const proxyUrl = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  const handleGrant = () => {
    if (!newAgentAddress.trim()) return;
    const expiresAt = Date.now() + expiresIn * 60 * 60 * 1000;
    onGrant(newAgentAddress.trim(), expiresAt, dailyLimit * 1_000_000_000);
    setShowGrantForm(false);
    setNewAgentAddress('');
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildPoletAgentJson = (sessionKey: string): string =>
    JSON.stringify(
      {
        POLET_OWNER: owner ?? '<owner wallet pubkey>',
        POLET_SESSION_KEY: sessionKey,
        POLET_AGENT_KEYPAIR: '<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>',
        POLET_PROXY_URL: proxyUrl,
        POLET_RPC_URL: rpcUrl,
      },
      null,
      2,
    );

  const buildMcpConfigJson = (sessionKey: string): string =>
    JSON.stringify(
      {
        mcpServers: {
          polet: {
            command: 'bunx',
            args: ['@polet-ai/sdk', 'polet-mcp'],
            env: {
              POLET_OWNER: owner ?? '<owner wallet pubkey>',
              POLET_SESSION_KEY: sessionKey,
              POLET_AGENT_KEYPAIR: '<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>',
              POLET_PROXY_URL: proxyUrl,
              POLET_RPC_URL: rpcUrl,
            },
          },
        },
      },
      null,
      2,
    );

  const buildHermesCommands = (sessionKey: string): string =>
    [
      'hermes config set mcp.servers.polet.command bunx',
      `hermes config set mcp.servers.polet.args '["@polet-ai/sdk", "polet-mcp"]'`,
      `hermes config set mcp.servers.polet.env.POLET_OWNER "${owner ?? '<owner wallet pubkey>'}"`,
      `hermes config set mcp.servers.polet.env.POLET_SESSION_KEY "${sessionKey}"`,
      `hermes config set mcp.servers.polet.env.POLET_AGENT_KEYPAIR "<PASTE YOUR AGENT WALLET PRIVATE KEY HERE>"`,
      `hermes config set mcp.servers.polet.env.POLET_PROXY_URL "${proxyUrl}"`,
      `hermes config set mcp.servers.polet.env.POLET_RPC_URL "${rpcUrl}"`,
    ].join('\n');

  const formatExpiry = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTimeRemaining = (timestamp: number) => {
    const remaining = timestamp - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h remaining`;
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--sea-ink)]">AI Agent Access</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">
            Authorize the AI agent wallet address that may sign Polet smart-wallet actions until expiry. This is a public signer address, not a private session secret.
          </p>
        </div>
        <button
          onClick={() => setShowGrantForm(!showGrantForm)}
          className="rounded-full bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          {showGrantForm ? 'Cancel' : 'Authorize Agent'}
        </button>
      </div>

      {/* Grant Form */}
      {showGrantForm && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4">
          <h4 className="mb-4 font-medium text-[var(--sea-ink)]">Authorize AI Agent Wallet</h4>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              AI Agent Wallet Address
            </label>
            <input
              type="text"
              placeholder="Enter the AI agent wallet public key"
              value={newAgentAddress}
              onChange={(e) => setNewAgentAddress(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-mono focus:border-[var(--lagoon-deep)] focus:outline-none"
            />
            <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">
              The contract names this value a session key, but functionally it is the agent wallet address authorized to use the smart wallet within policy limits.
            </p>
          </div>

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Expires In (hours)
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(parseInt(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (1 day)</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={168}>168 hours (1 week)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
                Legacy Daily Limit (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseFloat(e.target.value))}
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm focus:border-[var(--lagoon-deep)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGrant}
              disabled={!newAgentAddress.trim()}
              className="flex-1 rounded-full bg-[var(--lagoon-deep)] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              Authorize Agent
            </button>
            <button
              onClick={() => setShowGrantForm(false)}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5"
            >
              Cancel
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--sea-ink-soft)]">
            Don't have an agent wallet yet? Generate one externally — for example, create a new account in Phantom/Backpack, derive a Ledger path, or run{' '}
            <code className="rounded bg-[var(--link-bg-hover)] px-1 font-mono">solana-keygen new</code>. Paste that wallet's public key above; the private key stays on your device and is later exported into{' '}
            <code className="rounded bg-[var(--link-bg-hover)] px-1 font-mono">polet-agent.json</code> for the Hermes/Claude/Cursor MCP config.
          </p>
        </div>
      )}

      {/* Keys List */}
      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--island-bg)] py-12 text-center">
          <Key className="mb-3 h-10 w-10 text-[var(--sea-ink-soft)]" />
          <p className="mb-1 text-sm font-medium text-[var(--sea-ink)]">No Authorized Agent</p>
          <p className="text-xs text-[var(--sea-ink-soft)]">
            Authorize an AI agent wallet address with expiry before running the DCA demo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-[var(--sea-ink)]">
                      {key.sessionKey.length > 20
                        ? `${key.sessionKey.slice(0, 8)}...${key.sessionKey.slice(-8)}`
                        : key.sessionKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(key.sessionKey, key.id)}
                      className="rounded p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
                    >
                      {copiedId === key.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      key.authorized
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {key.authorized ? 'Active' : 'Revoked'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(234,179,8,0.1)] px-2 py-0.5 text-xs font-medium text-yellow-600">
                      <Clock className="h-3 w-3" />
                      {getTimeRemaining(key.expiresAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRevoke(key.sessionKey)}
                  disabled={!key.authorized || revokingSessionKey === key.sessionKey}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Revoke agent access"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-[var(--sea-ink-soft)]">Legacy Limit: </span>
                  <span className="font-medium text-[var(--sea-ink)]">
                    {(key.dailyLimit / 1_000_000_000).toFixed(3)} SOL
                  </span>
                </div>
                <div>
                  <span className="text-[var(--sea-ink-soft)]">Spent Today: </span>
                  <span className="font-medium text-[var(--sea-ink)]">
                    {(key.dailySpent / 1_000_000_000).toFixed(3)} SOL
                  </span>
                </div>
                <div>
                  <span className="text-[var(--sea-ink-soft)]">Expires: </span>
                  <span className="font-medium text-[var(--sea-ink)]">
                    {formatExpiry(key.expiresAt)}
                  </span>
                </div>
              </div>

              {key.authorized && (
                <div className="mt-4 border-t border-[var(--line)] pt-3">
                  <button
                    onClick={() =>
                      setExpandedConfigKey(expandedConfigKey === key.id ? null : key.id)
                    }
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-[var(--lagoon-deep)] transition hover:bg-[var(--link-bg-hover)]"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Show Hermes / Claude / Cursor config
                    </span>
                    {expandedConfigKey === key.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedConfigKey === key.id && (
                    <div className="mt-3 space-y-4 rounded-md bg-[var(--foam)] p-3">
                      <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-xs leading-5 text-yellow-900">
                        <strong>Private key not generated server-side.</strong> Paste the
                        agent wallet private key yourself (export from Phantom: Settings →
                        Security → Export Private Key; or Backpack similar; or from your
                        <code className="mx-1 rounded bg-yellow-100 px-1 font-mono">
                          solana-keygen
                        </code>
                        file). Replace
                        <code className="mx-1 rounded bg-yellow-100 px-1 font-mono">
                          &lt;PASTE ...&gt;
                        </code>
                        below with the base58 secret key.
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <h5 className="text-xs font-semibold uppercase text-[var(--sea-ink)]">
                            polet-agent.json
                          </h5>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                buildPoletAgentJson(key.sessionKey),
                                `${key.id}-json`,
                              )
                            }
                            className="rounded px-2 py-0.5 text-xs font-medium text-[var(--lagoon-deep)] transition hover:bg-[var(--link-bg-hover)]"
                          >
                            {copiedId === `${key.id}-json` ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                        <pre className="overflow-x-auto rounded bg-white p-3 text-xs font-mono text-[var(--sea-ink)]">
                          {buildPoletAgentJson(key.sessionKey)}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <h5 className="text-xs font-semibold uppercase text-[var(--sea-ink)]">
                            Claude Desktop / Cursor / Zed MCP config
                          </h5>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                buildMcpConfigJson(key.sessionKey),
                                `${key.id}-mcp`,
                              )
                            }
                            className="rounded px-2 py-0.5 text-xs font-medium text-[var(--lagoon-deep)] transition hover:bg-[var(--link-bg-hover)]"
                          >
                            {copiedId === `${key.id}-mcp` ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                        <pre className="overflow-x-auto rounded bg-white p-3 text-xs font-mono text-[var(--sea-ink)]">
                          {buildMcpConfigJson(key.sessionKey)}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <h5 className="text-xs font-semibold uppercase text-[var(--sea-ink)]">
                            Hermes Agent (CLI commands)
                          </h5>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                buildHermesCommands(key.sessionKey),
                                `${key.id}-hermes`,
                              )
                            }
                            className="rounded px-2 py-0.5 text-xs font-medium text-[var(--lagoon-deep)] transition hover:bg-[var(--link-bg-hover)]"
                          >
                            {copiedId === `${key.id}-hermes` ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                        <pre className="overflow-x-auto rounded bg-white p-3 text-xs font-mono text-[var(--sea-ink)]">
                          {buildHermesCommands(key.sessionKey)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
