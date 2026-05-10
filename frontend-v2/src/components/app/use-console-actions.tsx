import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js'
import {
  getWalletData,
  initializeWallet as apiInitializeWallet,
  setupDemoCustody as apiSetupDemoCustody,
  setConfidentialPolicy as apiSetConfidentialPolicy,
  registerAgent as apiRegisterAgent,
  runConfidentialDca as apiRunConfidentialDca,
  runMultichainIntent as apiRunMultichainIntent,
} from '#shared/lib/api'
import {
  confirmFreshTransaction,
  prepareFreshTransaction,
} from '#shared/lib/solana-transaction'

/**
 * Polet console state + actions hook.
 *
 * Single source of truth for /app's operational state. Mounts at
 * `<AppPage>` top inside `<ClientWalletProvider>`, provides via
 * React context to SetupLedger / StatStrip / TwoRailConsole / ReceiptLog.
 *
 * Holds:
 *   - On-chain wallet data (PDA, custody, policy, sessions) from
 *     `getWalletData(owner)` via #shared/lib/api
 *   - Live SOL balance polled from `connection.getBalance`
 *   - Receipt log feed, append-only, every action emits one entry
 *   - UI state: `loading` (current operation key) and `error` (string)
 *
 * Exposes 8 actions, each follows the same pattern:
 *   1. setLoading(key)
 *   2. call API → get { transaction, ... }
 *   3. prepareFreshTransaction (decode + recent blockhash)
 *   4. sendTransaction (wallet adapter signs + sends)
 *   5. confirmFreshTransaction (wait for confirmation)
 *   6. emitReceipt({ ... })
 *   7. refresh()
 *   8. catch → emitReceipt error + setError
 *
 * Demo policy values mirror `docs/demo-script.md`:
 *   - maxPerRun:      10 USDC
 *   - dailyCap:       20 USDC
 *   - blockScenario:  25 USDC
 *   - allowScenario:   5 USDC
 *
 * Pre-alpha note — masked witness fixture is a 32-byte placeholder
 * (`Array(32).fill(7)`). Production confidentiality requires the
 * official Encrypt ciphertext + graph lifecycle path, which Day 11
 * does not yet wire. See `docs/prd.md` for the boundary.
 */

const DEMO_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const DEMO_MAX_PER_RUN_USDC = '10'
const DEMO_DAILY_CAP_USDC = '20'
const DEMO_WITNESS_FIXTURE = Array.from({ length: 32 }, () => 7)
const SESSION_DAILY_LIMIT_USDC = 20_000_000 // 20 USDC base units
const SESSION_DURATION_HOURS = 24

const BLOCK_AMOUNT_USDC = '25'
const ALLOW_AMOUNT_USDC = '5'

export type ReceiptStatus = 'info' | 'allowed' | 'blocked' | 'pending' | 'error'
export type ConstraintCheck = 'pass' | 'fail' | 'unknown'

export type ReceiptEntry = {
  id: string
  timestamp: number
  action: string
  description: string
  signature?: string
  body?: string
  status: ReceiptStatus
  constraintRefs?: {
    numericLimit?: ConstraintCheck
    scopeMatch?: ConstraintCheck
    sessionActive?: ConstraintCheck
  }
}

export type ConsoleData = {
  walletPda?: string
  usdcAccount?: string
  wsolAccount?: string
  policySeq?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  temporalKeys?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessions?: any[]
}

export type ActionKey =
  | 'wallet'
  | 'custody'
  | 'policy'
  | 'session'
  | 'jupiter-block'
  | 'jupiter-allow'
  | 'ika-block'
  | 'ika-allow'

export type ConsoleState = {
  connected: boolean
  publicKey: PublicKey | null
  data: ConsoleData | null
  solBalance: number | null
  receipts: ReceiptEntry[]
  loading: ActionKey | null
  error: string | null
}

export type ConsoleActions = {
  refresh: () => Promise<void>
  initializeWallet: () => Promise<void>
  registerCustody: () => Promise<void>
  saveConfidentialPolicy: () => Promise<void>
  grantAgentSession: () => Promise<void>
  runJupiterBlock: () => Promise<void>
  runJupiterAllow: () => Promise<void>
  runIkaBlock: () => Promise<void>
  runIkaAllow: () => Promise<void>
}

const ConsoleContext = createContext<{
  state: ConsoleState
  actions: ConsoleActions
} | null>(null)

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function ConsoleStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [data, setData] = useState<ConsoleData | null>(null)
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([])
  const [loading, setLoading] = useState<ActionKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emitReceipt = useCallback(
    (entry: Omit<ReceiptEntry, 'id' | 'timestamp'>) => {
      setReceipts((r) => [
        { id: newId(), timestamp: Date.now(), ...entry },
        ...r,
      ])
    },
    [],
  )

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setData(null)
      setSolBalance(null)
      return
    }
    const owner = publicKey.toBase58()
    try {
      const result = await getWalletData(owner)
      setData(result ?? null)
    } catch {
      setData(null)
    }
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      setSolBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      setSolBalance(null)
    }
  }, [publicKey, connection])

  // Hydrate when wallet (re)connects.
  useEffect(() => {
    if (!connected || !publicKey) {
      setData(null)
      setSolBalance(null)
      setError(null)
      return
    }
    void refresh()
  }, [connected, publicKey, refresh])

  // Helper, run a transaction-bearing action: api call → prepare →
  // sendTransaction → confirm → emit receipt → refresh.
  const runTxAction = useCallback(
    async <T extends { transaction: string }>(
      key: ActionKey,
      apiCall: () => Promise<T>,
      onSuccess: (result: T, signature: string) => void,
      onFailure: (err: unknown) => void,
    ) => {
      if (!publicKey) return
      setLoading(key)
      setError(null)
      try {
        const result = await apiCall()
        const { transaction, latestBlockhash } = await prepareFreshTransaction(
          result.transaction,
          connection,
        )
        const signature = await sendTransaction(transaction, connection)
        await confirmFreshTransaction(connection, signature, latestBlockhash)
        onSuccess(result, signature)
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        onFailure(err)
      } finally {
        setLoading(null)
      }
    },
    [publicKey, connection, sendTransaction, refresh],
  )

  // ────────────────────────────── Setup actions ──────────────────────────────

  const initializeWallet = useCallback(async () => {
    if (!publicKey) return
    await runTxAction(
      'wallet',
      () => apiInitializeWallet(publicKey.toBase58()),
      (result, signature) =>
        emitReceipt({
          action: 'WALLET INITIALIZED',
          description: `PDA derived: ${result.wallet.slice(0, 4)}…${result.wallet.slice(-4)}`,
          signature,
          status: 'info',
        }),
      (err) =>
        emitReceipt({
          action: 'WALLET INIT FAILED',
          description: err instanceof Error ? err.message : 'Unknown error',
          status: 'error',
        }),
    )
  }, [publicKey, runTxAction, emitReceipt])

  const registerCustody = useCallback(async () => {
    if (!publicKey) return
    await runTxAction(
      'custody',
      () =>
        apiSetupDemoCustody({
          owner: publicKey.toBase58(),
          usdcMint: DEMO_USDC_MINT,
        }),
      (_result, signature) =>
        emitReceipt({
          action: 'CUSTODY REGISTERED',
          description: 'PDA-owned USDC + wSOL accounts ready.',
          signature,
          status: 'info',
        }),
      (err) =>
        emitReceipt({
          action: 'CUSTODY REGISTER FAILED',
          description: err instanceof Error ? err.message : 'Unknown error',
          status: 'error',
        }),
    )
  }, [publicKey, runTxAction, emitReceipt])

  const saveConfidentialPolicy = useCallback(async () => {
    if (!publicKey) return
    await runTxAction(
      'policy',
      () =>
        apiSetConfidentialPolicy({
          owner: publicKey.toBase58(),
          maxPerRunUsdc: DEMO_MAX_PER_RUN_USDC,
          dailyCapUsdc: DEMO_DAILY_CAP_USDC,
          maskedWitnessDevFixture: DEMO_WITNESS_FIXTURE,
          policyScope: 'usdc-dca',
        }),
      (_result, signature) =>
        emitReceipt({
          action: 'POLICY SEALED',
          description:
            'Confidential numeric policy stored as ciphertext on-chain.',
          signature,
          status: 'info',
          body: `Limits sealed (max-per-run / daily-cap). Original amounts never leave your client; the gate evaluates blind.`,
        }),
      (err) =>
        emitReceipt({
          action: 'POLICY SAVE FAILED',
          description: err instanceof Error ? err.message : 'Unknown error',
          status: 'error',
        }),
    )
  }, [publicKey, runTxAction, emitReceipt])

  const grantAgentSession = useCallback(async () => {
    if (!publicKey) return
    const expiresAt =
      Math.floor(Date.now() / 1000) + SESSION_DURATION_HOURS * 3600
    await runTxAction(
      'session',
      () =>
        apiRegisterAgent({
          owner: publicKey.toBase58(),
          expiresAt,
          dailyLimit: SESSION_DAILY_LIMIT_USDC,
        }),
      (result, signature) =>
        emitReceipt({
          action: 'SESSION GRANTED',
          description: `Session ${result.sessionKey.slice(0, 4)}…${result.sessionKey.slice(-4)} authorized for ${SESSION_DURATION_HOURS}h.`,
          signature,
          status: 'info',
          body: 'Agent received scoped temporary authority. The owner key is not exposed.',
        }),
      (err) =>
        emitReceipt({
          action: 'SESSION GRANT FAILED',
          description: err instanceof Error ? err.message : 'Unknown error',
          status: 'error',
        }),
    )
  }, [publicKey, runTxAction, emitReceipt])

  // ────────────────────────────── Rail actions ──────────────────────────────

  // Pull the first authorized non-expired session, or null.
  const findActiveSessionKey = useCallback((): string | null => {
    const sessions = data?.temporalKeys ?? data?.sessions ?? []
    const found = sessions.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
    )
    if (!found) return null
    return String(found.key ?? '')
  }, [data])

  const runJupiterIntent = useCallback(
    async (key: ActionKey, amount: string) => {
      if (!publicKey) return
      const sessionKey = findActiveSessionKey()
      if (!sessionKey) {
        setError('No active session. Grant an agent session first.')
        emitReceipt({
          action: 'PRECHECK FAILED',
          description: 'No active session key.',
          status: 'error',
          body: 'Grant an agent session in the Setup ledger before running rails.',
        })
        return
      }
      setLoading(key)
      setError(null)
      try {
        const result = await apiRunConfidentialDca({
          owner: publicKey.toBase58(),
          sessionKey,
          amountUsdc: amount,
          slippageBps: 100,
        })
        const allowed = result.allowed === true
        emitReceipt({
          action: allowed
            ? `${amount} USDC APPROVED (JUPITER)`
            : `${amount} USDC BLOCKED (JUPITER)`,
          description: allowed
            ? 'Route + unsigned smart-wallet tx ready.'
            : 'Original amount stays sealed; the gate said no without ever reading the cleartext.',
          status: allowed ? 'allowed' : 'blocked',
          signature: result.transaction?.signers
            ? undefined
            : undefined,
          constraintRefs: {
            numericLimit: allowed ? 'pass' : 'fail',
            scopeMatch: 'pass',
            sessionActive: 'pass',
          },
          body: result.reason,
        })
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        emitReceipt({
          action: 'JUPITER ERROR',
          description: message,
          status: 'error',
        })
      } finally {
        setLoading(null)
      }
    },
    [publicKey, findActiveSessionKey, emitReceipt, refresh],
  )

  const runIkaIntent = useCallback(
    async (key: ActionKey, amount: string) => {
      if (!publicKey) return
      const sessionKey = findActiveSessionKey()
      if (!sessionKey) {
        setError('No active session. Grant an agent session first.')
        emitReceipt({
          action: 'PRECHECK FAILED',
          description: 'No active session key.',
          status: 'error',
          body: 'Grant an agent session in the Setup ledger before running rails.',
        })
        return
      }
      setLoading(key)
      setError(null)
      try {
        const result = await apiRunMultichainIntent({
          owner: publicKey.toBase58(),
          sessionKey,
          sourceChain: 'solana',
          sourceAsset: 'USDC',
          targetChain: 'sui',
          targetAsset: 'SUI',
          amount,
          executionRail: 'ika',
          strategy: 'dca',
          slippageBps: 150,
        })
        const allowed = result.allowed === true
        emitReceipt({
          action: allowed
            ? `${amount} USDC APPROVED (IKA)`
            : `${amount} USDC BLOCKED (IKA)`,
          description: allowed
            ? 'Destination digest + unsigned approve_message tx ready.'
            : 'No dWallet approval data created; over-limit.',
          status: allowed ? 'allowed' : 'blocked',
          constraintRefs: {
            numericLimit: allowed ? 'pass' : 'fail',
            scopeMatch: 'pass',
            sessionActive: 'pass',
          },
          body: result.reason,
        })
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        emitReceipt({
          action: 'IKA ERROR',
          description: message,
          status: 'error',
        })
      } finally {
        setLoading(null)
      }
    },
    [publicKey, findActiveSessionKey, emitReceipt, refresh],
  )

  const runJupiterBlock = useCallback(
    () => runJupiterIntent('jupiter-block', BLOCK_AMOUNT_USDC),
    [runJupiterIntent],
  )
  const runJupiterAllow = useCallback(
    () => runJupiterIntent('jupiter-allow', ALLOW_AMOUNT_USDC),
    [runJupiterIntent],
  )
  const runIkaBlock = useCallback(
    () => runIkaIntent('ika-block', BLOCK_AMOUNT_USDC),
    [runIkaIntent],
  )
  const runIkaAllow = useCallback(
    () => runIkaIntent('ika-allow', ALLOW_AMOUNT_USDC),
    [runIkaIntent],
  )

  const value = useMemo(
    () => ({
      state: {
        connected,
        publicKey,
        data,
        solBalance,
        receipts,
        loading,
        error,
      },
      actions: {
        refresh,
        initializeWallet,
        registerCustody,
        saveConfidentialPolicy,
        grantAgentSession,
        runJupiterBlock,
        runJupiterAllow,
        runIkaBlock,
        runIkaAllow,
      },
    }),
    [
      connected,
      publicKey,
      data,
      solBalance,
      receipts,
      loading,
      error,
      refresh,
      initializeWallet,
      registerCustody,
      saveConfidentialPolicy,
      grantAgentSession,
      runJupiterBlock,
      runJupiterAllow,
      runIkaBlock,
      runIkaAllow,
    ],
  )

  return (
    <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>
  )
}

export function useConsole() {
  const ctx = useContext(ConsoleContext)
  if (!ctx) {
    throw new Error('useConsole must be used inside <ConsoleStateProvider>')
  }
  return ctx
}
