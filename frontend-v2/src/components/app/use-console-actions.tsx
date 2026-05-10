import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  Keypair,
  LAMPORTS_PER_SOL,
  type BlockhashWithExpiryBlockHeight,
  type Connection,
  type PublicKey,
} from '@solana/web3.js'
import {
  getWalletData,
  initializeWallet as apiInitializeWallet,
  setupDemoCustody as apiSetupDemoCustody,
  setConfidentialPolicy as apiSetConfidentialPolicy,
  grantKey as apiGrantKey,
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

/**
 * Ika Pre-Alpha proof artifacts from a successful multichain run.
 *
 * Per `docs/demo-script.md` outcome 3 the receipt should expose:
 * dWallet, MessageApproval PDA, message hash, signature scheme, CPI
 * authority, destination digest, and an explicit settlement boundary.
 *
 * All fields are optional because:
 *   - Blocked runs don't produce any of these.
 *   - Sui-target runs have `destinationDigest.chain === 'sui'`,
 *     ethereum-target runs have `'ethereum'`.
 *   - Pre-Alpha mock signer only fills `messageApprovalPda` once the
 *     dWallet authority transfer + smoke run is live.
 */
export type IkaProof = {
  dwalletAccount?: string
  messageApprovalPda?: string
  cpiAuthorityPda?: string
  ikaMessageHash?: string
  destinationDigest?: {
    chain: 'sui' | 'ethereum'
    digestHex?: string
    digestBase58?: string
    hashScheme?: string
  }
  signatureScheme?: string
  settlement?: string
  policyAttestationHash?: string
  poletApprovalSigners?: string[]
  canonicalOrderHash?: string
}

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
  /** Ika pre-alpha proof artifacts. Populated only on Ika APPROVED entries. */
  ikaProof?: IkaProof
}

export type ConsoleData = {
  walletPda?: string
  policySeq?: number
  demoCustody?: {
    configured?: boolean
    usdcTokenAccount?: string
    solTokenAccount?: string
    usdcMint?: string
    solMint?: string
  }
  usdcDcaPolicy?: {
    enabled?: boolean
    encryptCiphertexts?: { configured?: boolean }
  }
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
  /**
   * Client-side BYO agent keypair, minted on the first
   * `grantAgentSession()` call and held only in this tab. Day 11.5
   * exposes it for downstream consumers (Day 12 will use it to
   * co-sign rail run transactions). Cleared on wallet disconnect.
   */
  sessionKeypair: Keypair | null
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

/**
 * Robust transaction confirmation with extended polling.
 *
 * Devnet RPC propagation is jittery: a signed transaction can land
 * on-chain but the connection node we polled for blockhash hasn't
 * caught up yet, so `confirmTransaction` rejects with
 * "block height exceeded" before the cluster has actually finalised
 * (or rejected) the signature.
 *
 * Strategy:
 *   1. Try the standard confirm path (`confirmFreshTransaction`).
 *   2. On any error, poll `getSignatureStatus(searchTransactionHistory)`
 *      every 2s for up to `pollTimeoutMs`. If the cluster reports
 *      `confirmed`/`finalized`, treat as success. If it reports an
 *      on-chain error, surface that. If the timeout passes without
 *      either, surface a clear timeout message that includes the
 *      signature so the user can verify on Solana Explorer manually.
 */
async function robustConfirm(
  connection: Connection,
  signature: string,
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  pollTimeoutMs = 60_000,
) {
  try {
    await confirmFreshTransaction(connection, signature, latestBlockhash)
    return
  } catch (err) {
    // Fall through to extended polling for the slow-propagation case.
    const start = Date.now()
    while (Date.now() - start < pollTimeoutMs) {
      try {
        const status = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        })
        const value = status.value
        if (value?.err) {
          throw new Error(
            `Transaction failed on-chain: ${JSON.stringify(value.err)}`,
          )
        }
        if (
          value?.confirmationStatus === 'confirmed' ||
          value?.confirmationStatus === 'finalized'
        ) {
          return
        }
      } catch (statusErr) {
        // Surface on-chain failures immediately, otherwise keep polling.
        if (
          statusErr instanceof Error &&
          statusErr.message.startsWith('Transaction failed on-chain')
        ) {
          throw statusErr
        }
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error(
      `Transaction ${signature.slice(0, 8)}…${signature.slice(-4)} did not confirm within ${
        pollTimeoutMs / 1000
      }s. Check Solana Explorer (devnet) for the final status.`,
    )
  }
}

/**
 * Best-effort error description for receipts.
 *
 * The wallet adapter wraps the underlying Phantom / Solana error in a
 * `WalletSignTransactionError`, exposing the real message under `.error`
 * (and sometimes `.cause`). Without unwrapping we end up rendering
 * "Unexpected error" in the receipt log, which is useless for debugging.
 *
 * Special-cased substrings ("already in use", "Account already exists",
 * etc.) get a hint that the operator should refresh the page — the most
 * common cause is a previous transaction that landed on-chain even
 * though the client surfaced a confirmation error.
 */
function describeError(err: unknown): string {
  let message = 'Unknown error'
  if (typeof err === 'string') {
    message = err
  } else if (err instanceof Error) {
    message = err.message || 'Unknown error'
    // WalletAdapter exposes the underlying provider error here.
    const inner = (err as { error?: unknown }).error
    if (inner instanceof Error && inner.message && inner.message !== err.message) {
      message = `${message} · ${inner.message}`
    } else if (typeof inner === 'string' && inner !== err.message) {
      message = `${message} · ${inner}`
    } else if (inner && typeof inner === 'object') {
      const subMsg = (inner as { message?: string }).message
      if (subMsg && subMsg !== err.message) message = `${message} · ${subMsg}`
    }
    const cause = (err as { cause?: unknown }).cause
    if (cause instanceof Error && cause.message && !message.includes(cause.message)) {
      message = `${message} · ${cause.message}`
    }
  } else if (err && typeof err === 'object') {
    try {
      message = JSON.stringify(err)
    } catch {
      message = 'Unknown error'
    }
  }

  // Common cause: previous tx landed even though client errored. Hint
  // the operator to refresh so getWalletData picks up the existing PDA.
  if (
    /already in use/i.test(message) ||
    /already exists/i.test(message) ||
    /custom program error: 0x0/i.test(message)
  ) {
    return `${message} · Hint: refresh the page; the previous transaction may have landed on-chain.`
  }

  return message
}

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
  // Client-side BYO agent keypair, minted on grantAgentSession.
  // Held only in component state so subsequent rail run transactions
  // can co-sign as the session signer. Cleared on wallet disconnect.
  const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null)

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
      setSessionKeypair(null)
      return
    }
    void refresh()
  }, [connected, publicKey, refresh])

  // Helper, run a transaction-bearing action: api call → prepare →
  // sendTransaction → robustConfirm → emit receipt → refresh. Tracks
  // the signature in scope so a failure receipt can still surface a
  // Solana Explorer link when the tx was broadcast but failed during
  // confirmation.
  const runTxAction = useCallback(
    async <T extends { transaction: string }>(
      key: ActionKey,
      apiCall: () => Promise<T>,
      onSuccess: (result: T, signature: string) => void,
      onFailure: (err: unknown, signature: string | undefined) => void,
    ) => {
      if (!publicKey) return
      setLoading(key)
      setError(null)
      let signature: string | undefined
      try {
        const result = await apiCall()
        const { transaction, latestBlockhash } = await prepareFreshTransaction(
          result.transaction,
          connection,
        )
        signature = await sendTransaction(transaction, connection)
        await robustConfirm(connection, signature, latestBlockhash)
        onSuccess(result, signature)
        await refresh()
      } catch (err) {
        // Always log the full error object so DevTools console keeps
        // the original stack + nested provider error for debugging,
        // while the receipt log gets a human-readable summary.
        // eslint-disable-next-line no-console
        console.error('[Polet console action error]', { key, signature, err })
        const message = describeError(err)
        setError(message)
        onFailure(err, signature)
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
      (err, signature) =>
        emitReceipt({
          action: 'WALLET INIT FAILED',
          description: describeError(err),
          signature,
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
      (err, signature) =>
        emitReceipt({
          action: 'CUSTODY REGISTER FAILED',
          description: describeError(err),
          signature,
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
      (err, signature) =>
        emitReceipt({
          action: 'POLICY SAVE FAILED',
          description: describeError(err),
          signature,
          status: 'error',
        }),
    )
  }, [publicKey, runTxAction, emitReceipt])

  const grantAgentSession = useCallback(async () => {
    if (!publicKey) return
    // BYO agent wallet: proxy is stateless and no longer generates
    // session keypairs. The console mints a fresh client-side keypair,
    // saves the secret in component state for later run actions to
    // co-sign with, and grants the public key on-chain via grantKey.
    // Production agents would be external SDK processes holding their
    // own keypairs — this client-side mint mirrors that contract for
    // the demo without requiring the operator to paste a pubkey.
    const sessionKeypair = Keypair.generate()
    const expiresAt =
      Math.floor(Date.now() / 1000) + SESSION_DURATION_HOURS * 3600
    await runTxAction(
      'session',
      () =>
        apiGrantKey({
          owner: publicKey.toBase58(),
          sessionKey: sessionKeypair.publicKey.toBase58(),
          expiresAt,
          dailyLimit: SESSION_DAILY_LIMIT_USDC,
        }),
      (_result, signature) => {
        setSessionKeypair(sessionKeypair)
        emitReceipt({
          action: 'SESSION GRANTED',
          description: `Session ${sessionKeypair.publicKey.toBase58().slice(0, 4)}…${sessionKeypair.publicKey.toBase58().slice(-4)} authorized for ${SESSION_DURATION_HOURS}h.`,
          signature,
          status: 'info',
          body: 'Agent received scoped temporary authority. The owner key is not exposed; the agent keypair is held only on this client tab.',
        })
      },
      (err, signature) =>
        emitReceipt({
          action: 'SESSION GRANT FAILED',
          description: describeError(err),
          signature,
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
          maskedWitnessDevFixture: DEMO_WITNESS_FIXTURE,
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
          describeError(err)
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
          maskedWitnessDevFixture: DEMO_WITNESS_FIXTURE,
        })
        const allowed = result.allowed === true
        // Extract Ika pre-alpha proof artifacts when approved. Field
        // shape comes from the proxy's IkaRequestPreview (see
        // proxy/src/lib/ika-bridgeless-request.ts and frontend api.ts
        // IkaRequestPreview interface).
        const ikaProof: IkaProof | undefined = allowed && result.ikaRequest
          ? {
              dwalletAccount: result.ikaRequest.preAlphaSigning?.dwalletAccount,
              messageApprovalPda: result.ikaRequest.preAlphaSigning?.messageApprovalPda,
              cpiAuthorityPda: result.ikaRequest.preAlphaSigning?.cpiAuthorityPda,
              ikaMessageHash:
                result.ikaRequest.ikaMessageHash ??
                result.ikaRequest.preAlphaSigning?.ikaMessageHash,
              destinationDigest: result.ikaRequest.suiTransactionDigest
                ? {
                    chain: 'sui',
                    digestBase58: result.ikaRequest.suiTransactionDigest.digestBase58,
                    digestHex: result.ikaRequest.suiTransactionDigest.digestHex,
                    hashScheme: 'blake2b-256',
                  }
                : result.ikaRequest.ethereumMessageDigest
                  ? {
                      chain: 'ethereum',
                      digestHex: result.ikaRequest.ethereumMessageDigest.digestHex,
                      hashScheme: 'eth-personal-sign',
                    }
                  : undefined,
              signatureScheme: result.ikaRequest.preAlphaSigning?.signatureScheme,
              settlement: result.ikaRequest.settlement,
              policyAttestationHash:
                result.ikaRequest.policyAttestation?.attestationHash,
              poletApprovalSigners:
                result.ikaRequest.poletApprovalTransaction?.signers,
              canonicalOrderHash: result.ikaRequest.canonicalOrderHash,
            }
          : undefined
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
          ...(ikaProof && { ikaProof }),
        })
        await refresh()
      } catch (err) {
        const message =
          describeError(err)
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
        sessionKeypair,
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
      sessionKeypair,
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
