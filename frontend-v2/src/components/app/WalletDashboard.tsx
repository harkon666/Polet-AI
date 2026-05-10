import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Shield, Clock, Key, AlertTriangle } from 'lucide-react'
import {
  getWalletData,
  initializeWallet,
  grantKey,
  registerAgent,
  revokeSession,
} from '#shared/lib/api'
import { POLET_PROGRAM_ID, shortProgramId } from '#shared/lib/program'
import {
  confirmFreshTransaction,
  prepareFreshTransaction,
} from '#shared/lib/solana-transaction'
import { DemoTab } from '#shared/components/DemoTab'
import { SimpleDemoTab } from '#shared/components/SimpleDemoTab'
import { TemporalKeyManager } from '#shared/components/TemporalKeyManager'
import { WalletButton } from './WalletButton'

export type TemporalKey = {
  id: string
  sessionKey: string
  expiresAt: number
  authorized: boolean
  dailyLimit: number
  dailySpent: number
  createdAt: number
}

type Tab = 'demo' | 'simple' | 'temporal'

/**
 * v2 WalletDashboard, the main /app dashboard surface.
 *
 * Three render states:
 *   1. Not connected   → Shield prompt + WalletButton
 *   2. Connected, not initialized → Key prompt + "Create smart wallet" CTA
 *   3. Connected + initialized → wallet info banner + 3 tabs
 *
 * Three tabs once initialized:
 *   - demo     → DemoTab (full DCA + multichain + Encrypt + recovery)
 *   - simple   → SimpleDemoTab (3-button demo, no controls)
 *   - temporal → TemporalKeyManager (session keys / Agent Access)
 *
 * Layer 3 of the v2 port (Day 8). The shell + state machine + on-chain
 * write handlers are live; inner tab bodies are placeholders until
 * Layers 4-6 land their respective components.
 */
export function WalletDashboard() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [isInitialized, setIsInitialized] = useState(false)
  const [poletWalletPda, setPoletWalletPda] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('demo')
  const [temporalKeys, setTemporalKeys] = useState<TemporalKey[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [revokingSessionKey, setRevokingSessionKey] = useState<string | null>(null)

  const refreshData = async () => {
    if (!publicKey) return
    try {
      const data = await getWalletData(publicKey.toBase58())
      if (!data) {
        setIsInitialized(false)
        return
      }
      setIsInitialized(true)
      if (data.walletPda) setPoletWalletPda(data.walletPda)
      const sessions = data.temporalKeys ?? data.sessions ?? []
      if (sessions.length > 0) {
        setTemporalKeys(
          sessions.map((tk: any) => ({
            id: tk.key.toString(),
            sessionKey: tk.key.toString(),
            expiresAt: Number(tk.expiresAt) * 1000,
            authorized: tk.authorized,
            dailyLimit: Number(tk.dailyLimit || 0),
            dailySpent: Number(tk.dailySpent || 0),
            createdAt: Number(tk.lastReset || Date.now() / 1000) * 1000,
          })),
        )
      } else {
        setTemporalKeys([])
      }
    } catch {
      setIsInitialized(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      void refreshData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey])

  const handleInitialize = async () => {
    if (!publicKey) return
    setIsInitializing(true)
    setError(null)
    setStatus('Preparing transaction…')
    try {
      const result = await initializeWallet(publicKey.toBase58())
      setStatus('Waiting for wallet signature…')
      const { transaction, latestBlockhash } = await prepareFreshTransaction(
        result.transaction,
        connection,
      )
      const signature = await sendTransaction(transaction, connection)
      setStatus('Confirming transaction on-chain…')
      await confirmFreshTransaction(connection, signature, latestBlockhash)
      setStatus('Wallet ready.')
      setIsInitialized(true)
      setPoletWalletPda(result.wallet)
      await refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed')
    } finally {
      setIsInitializing(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  const handleRevokeKey = async (sessionKey: string) => {
    if (!publicKey) return
    setError(null)
    setStatus('Preparing revoke transaction…')
    setRevokingSessionKey(sessionKey)
    try {
      const result = await revokeSession({
        owner: publicKey.toBase58(),
        sessionKey,
      })
      setStatus('Waiting for owner signature…')
      const { transaction, latestBlockhash } = await prepareFreshTransaction(
        result.transaction,
        connection,
      )
      const signature = await sendTransaction(transaction, connection)
      setStatus('Confirming revoke on-chain…')
      await confirmFreshTransaction(connection, signature, latestBlockhash)
      await refreshData()
      setStatus('Agent access revoked on-chain.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    } finally {
      setRevokingSessionKey(null)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  const handleGrantKey = async (
    sessionKey: string,
    expiresAt: number,
    dailyLimit: number,
  ) => {
    if (!publicKey) return
    try {
      const result = await grantKey({
        owner: publicKey.toBase58(),
        sessionKey,
        expiresAt: Math.floor(expiresAt / 1000),
        dailyLimit,
      })
      const { transaction, latestBlockhash } = await prepareFreshTransaction(
        result.transaction,
        connection,
      )
      const signature = await sendTransaction(transaction, connection)
      await confirmFreshTransaction(connection, signature, latestBlockhash)
      void refreshData()
    } catch (err) {
      console.error('Grant key failed:', err)
    }
  }

  const handleGenerateProxySession = async (expiresAt: number, dailyLimit: number) => {
    if (!publicKey) return
    setError(null)
    setStatus('Generating proxy-held session key…')
    try {
      const result = await registerAgent({
        owner: publicKey.toBase58(),
        expiresAt: Math.floor(expiresAt / 1000),
        dailyLimit,
      })
      setStatus(`Authorize generated session ${result.sessionKey.slice(0, 8)}…`)
      const { transaction, latestBlockhash } = await prepareFreshTransaction(
        result.transaction,
        connection,
      )
      const signature = await sendTransaction(transaction, connection)
      setStatus('Confirming generated session on-chain…')
      await confirmFreshTransaction(connection, signature, latestBlockhash)
      await refreshData()
      setStatus('Proxy session authorized. Select it in the demo dropdown.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate proxy session failed')
    } finally {
      setTimeout(() => setStatus(null), 3000)
    }
  }

  // 1. Not connected
  if (!connected || !publicKey) {
    return (
      <div className="rounded-2xl border border-line bg-bg-deep px-6 py-12 md:py-16 text-center">
        <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-lagoon-bright/12 text-lagoon-bright">
          <Shield className="size-7" />
        </div>
        <h2 className="mt-5 font-sans text-xl md:text-2xl font-semibold text-ink">
          Connect a devnet wallet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm md:text-base text-ink-soft leading-relaxed">
          Connect a Solana wallet to create a Polet smart-wallet PDA and
          start running guarded AI-agent strategies.
        </p>
        <div className="mt-6 inline-flex justify-center">
          <WalletButton />
        </div>
      </div>
    )
  }

  const pubkeyStr = publicKey.toBase58()

  // 2. Connected but not initialized
  if (!isInitialized) {
    return (
      <div className="rounded-2xl border border-line bg-bg-deep px-6 py-12 md:py-16 text-center">
        <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-lagoon-bright/12 text-lagoon-bright">
          <Key className="size-7" />
        </div>
        <h2 className="mt-5 font-sans text-xl md:text-2xl font-semibold text-ink">
          Initialize your smart wallet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm md:text-base text-ink-soft leading-relaxed">
          Wallet connected. Initialize the Polet smart-wallet PDA so the
          contract can hold custody and enforce policy on your agent
          actions.
        </p>
        <button
          type="button"
          onClick={handleInitialize}
          disabled={isInitializing}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-5 py-2.5 text-sm font-medium text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-50 disabled:hover:bg-lagoon-bright/10"
        >
          {isInitializing ? status ?? 'Processing…' : 'Create smart wallet'}
          {!isInitializing && <span aria-hidden="true">→</span>}
        </button>

        {error && <ErrorBanner message={error} className="mt-6 mx-auto max-w-md" />}
        {status && !error && <StatusBanner message={status} className="mt-4" />}
      </div>
    )
  }

  // 3. Connected + initialized → full dashboard
  return (
    <div className="space-y-6">
      {/* Wallet info banner */}
      <div className="rounded-2xl border border-line bg-bg-deep px-5 md:px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-sans text-lg md:text-xl font-semibold text-ink">
              Polet smart wallet
            </h2>
            <dl className="mt-3 space-y-1.5 font-mono text-xs">
              <InfoRow label="Owner" value={pubkeyStr} />
              {poletWalletPda && (
                <InfoRow
                  label="Smart wallet"
                  value={poletWalletPda}
                  valueClass="text-lagoon-bright"
                />
              )}
              <InfoRow label="Program" value={shortProgramId()} title={POLET_PROGRAM_ID} />
            </dl>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright/30 bg-lagoon-bright/10 px-3 py-1 text-xs font-medium text-lagoon-bright">
            <span className="size-1.5 rounded-full bg-lagoon-bright" aria-hidden="true" />
            Active
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {status && !error && <StatusBanner message={status} />}

      {/* Tab navigation */}
      <div className="inline-flex rounded-lg border border-line bg-bg-deep p-1 gap-1">
        {(['demo', 'simple', 'temporal'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-lagoon-bright/15 text-lagoon-bright'
                : 'text-ink-soft hover:text-ink hover:bg-surface/50'
            }`}
          >
            {tab === 'demo' && 'Demo'}
            {tab === 'simple' && 'Simple demo'}
            {tab === 'temporal' && 'Agent access'}
          </button>
        ))}
      </div>

      {/* Tab content, real v1 components cross-imported via #shared.
          The pl-app-shell wrapper around this dashboard redefines v1
          token names (`--sea-ink`, `--island-bg`, `--lagoon-deep`, …)
          to v2 equivalents so they render in the dark canonical theme. */}
      {activeTab === 'demo' && (
        <>
          <DemoStatusSummary
            authorizedAgentCount={temporalKeys.filter((k) => k.authorized).length}
          />
          <DemoTab
            agentAddresses={temporalKeys
              .filter((k) => k.authorized)
              .map((k) => k.sessionKey)}
          />
        </>
      )}
      {activeTab === 'simple' && (
        <SimpleDemoTab
          agentAddresses={temporalKeys
            .filter((k) => k.authorized)
            .map((k) => k.sessionKey)}
        />
      )}
      {activeTab === 'temporal' && (
        <div className="rounded-2xl border border-line bg-bg-deep p-5 md:p-6">
          <TemporalKeyManager
            keys={temporalKeys}
            onRevoke={handleRevokeKey}
            onGrant={handleGrantKey}
            onGenerateProxySession={handleGenerateProxySession}
            revokingSessionKey={revokingSessionKey}
          />
        </div>
      )}
    </div>
  )
}

/* ============================================
   Internal helpers
   ============================================ */

function InfoRow({
  label,
  value,
  valueClass = 'text-ink',
  title,
}: {
  label: string
  value: string
  valueClass?: string
  title?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="text-ink-mute uppercase tracking-wider w-28 shrink-0">{label}</dt>
      <dd className={`break-all ${valueClass}`} title={title}>
        {value}
      </dd>
    </div>
  )
}

function ErrorBanner({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-coral/30 bg-coral/10 px-4 py-3 ${className}`}
    >
      <AlertTriangle className="size-4 shrink-0 text-coral mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-coral">Transaction failed</p>
        <p className="text-xs text-coral/80">{message}</p>
      </div>
    </div>
  )
}

function StatusBanner({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-lagoon-bright/30 bg-lagoon-bright/10 px-4 py-2.5 text-sm font-medium text-lagoon-bright ${className}`}
    >
      {message}
    </div>
  )
}

function DemoStatusSummary({ authorizedAgentCount }: { authorizedAgentCount: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Shield className="size-4" />}
        label="Demo pair"
        value="USDC → SOL"
        sublabel="Jupiter strategy gateway"
      />
      <StatCard
        icon={<Clock className="size-4" />}
        label="Agent access"
        value={authorizedAgentCount.toString()}
        sublabel="Authorized signer addresses"
      />
      <StatCard
        icon={<Key className="size-4" />}
        label="Policy"
        value="Confidential"
        sublabel="Numeric limits redacted"
      />
      <StatCard
        icon={<AlertTriangle className="size-4" />}
        label="Run agent now"
        value="5 / 25"
        sublabel="Allow and block scenarios"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel: string
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-deep p-4">
      <div className="flex items-center gap-2 text-ink-mute font-mono text-[10px] uppercase tracking-[0.18em]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 font-sans text-xl md:text-2xl font-bold text-ink leading-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{sublabel}</p>
    </div>
  )
}
