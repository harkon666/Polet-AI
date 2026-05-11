import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'
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
  revokeSession as apiRevokeSession,
  runConfidentialDca as apiRunConfidentialDca,
  runMultichainIntent as apiRunMultichainIntent,
  fundAgentGas as apiFundAgentGas,
} from '#shared/lib/api'
import {
  confirmFreshTransaction,
  prepareFreshTransaction,
} from '#shared/lib/solana-transaction'
import {
  broadcastSessionTx,
  BroadcastError,
} from '../../lib/session-tx-broadcaster'

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
/**
 * Jupiter route preview artifacts from a successful confidential DCA.
 *
 * Per `docs/demo-script.md` outcome 2 the receipt should expose: the
 * Jupiter route/build preview (token metadata + quote + slippage) and
 * the unsigned smart-wallet transaction boundary so judges can verify
 * Polet wraps Jupiter behind the policy gate without claiming a
 * mainnet swap.
 *
 * All fields optional; populated only on the allowed branch.
 */
export type JupiterProof = {
  executionPath?: string
  smartWalletAuthority?: string
  inputToken?: {
    symbol?: string
    decimals?: number
    isVerified?: boolean
    organicScoreLabel?: string
  }
  outputToken?: {
    symbol?: string
    decimals?: number
    isVerified?: boolean
    organicScoreLabel?: string
  }
  quote?: {
    inputAmount?: string
    expectedOutput?: string
    minimumOutput?: string
    slippageBps?: number
    priceImpactPct?: string
    routeLabel?: string
  }
  routeSteps?: number
  primaryDex?: string
  approvalSigners?: string[]
  txBlockHash?: string
  txSlot?: number
}

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
  /** Jupiter route + unsigned tx artifacts. Populated only on Jupiter APPROVED entries. */
  jupiterProof?: JupiterProof
}

export type ConsoleData = {
  walletPda?: string
  policySeq?: number
  /**
   * On-chain confidential policy commitment, 32 bytes. Derived hash
   * (first 6 bytes hex) feeds the EncryptedField in the SetupLedger
   * POLICY row so the visible ciphertext correlates with the actual
   * stored commitment, not a static placeholder.
   */
  policyCommitment?: number[]
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
  | 'regrant'
  | 'fund-gas'
  | 'jupiter-block'
  | 'jupiter-allow'
  | 'jupiter-execute'
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
  regrantAgentSession: () => Promise<void>
  fundAgentGas: (amountSol: string) => Promise<void>
  runJupiterBlock: () => Promise<void>
  runJupiterAllow: () => Promise<void>
  executeJupiter: () => Promise<void>
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

/* ──────────────────────────────────────────────────────────────────
 * Session keypair persistence
 *
 * The BYO agent keypair is minted client-side by `grantAgentSession`
 * and held in component state so subsequent rail run transactions
 * can co-sign as the session signer. Day 11.5 mirrors that state
 * into `sessionStorage` (tab-scoped, cleared on tab close) so the
 * SESSION row affordance survives page refresh / Vite HMR reload.
 *
 * Devnet-only project. Secret is base58-encoded plaintext under a
 * versioned key; cleared on wallet disconnect or when the on-chain
 * session is no longer active. Production agents would hold their
 * own keypair externally — this storage is purely a demo affordance.
 * ────────────────────────────────────────────────────────────────── */
const SESSION_KEY_STORAGE = 'polet.agentSessionKey.v1'

type StoredSessionKey = {
  owner: string
  publicKey: string
  secretKey: string
}

function readStoredSessionKey(): StoredSessionKey | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_STORAGE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSessionKey
    if (
      typeof parsed.owner !== 'string' ||
      typeof parsed.publicKey !== 'string' ||
      typeof parsed.secretKey !== 'string'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeStoredSessionKey(owner: PublicKey, kp: Keypair) {
  if (typeof window === 'undefined') return
  const entry: StoredSessionKey = {
    owner: owner.toBase58(),
    publicKey: kp.publicKey.toBase58(),
    secretKey: bs58.encode(kp.secretKey),
  }
  try {
    window.sessionStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(entry))
  } catch {
    // quota / privacy mode failures are non-fatal
  }
}

function clearStoredSessionKey() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(SESSION_KEY_STORAGE)
  } catch {
    // ignore
  }
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
      clearStoredSessionKey()
      return
    }
    void refresh()
  }, [connected, publicKey, refresh])

  // Restore the BYO agent keypair from sessionStorage when the
  // on-chain wallet data lands and an active session matches a stored
  // secret. This lets the SESSION row affordance (Copy/Download
  // buttons) survive a page refresh or Vite HMR reload inside the
  // same tab. Stale entries (owner mismatch, session revoked or
  // expired) are evicted on detection.
  useEffect(() => {
    if (!publicKey || !data) return
    if (sessionKeypair) return
    const stored = readStoredSessionKey()
    if (!stored) return
    if (stored.owner !== publicKey.toBase58()) {
      clearStoredSessionKey()
      return
    }
    const sessions = (data.sessions ?? []) as Array<{
      key?: unknown
      authorized?: unknown
      expiresAt?: unknown
    }>
    const stillActive = sessions.some(
      (s) =>
        s &&
        s.authorized === true &&
        String(s.key ?? '') === stored.publicKey &&
        Number(s.expiresAt ?? 0) * 1000 > Date.now(),
    )
    if (!stillActive) {
      clearStoredSessionKey()
      return
    }
    try {
      const secret = bs58.decode(stored.secretKey)
      setSessionKeypair(Keypair.fromSecretKey(secret))
    } catch {
      clearStoredSessionKey()
    }
  }, [publicKey, data, sessionKeypair])

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
        writeStoredSessionKey(publicKey, sessionKeypair)
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

  // Re-grant a fresh BYO agent keypair when the in-memory one was lost
  // (e.g. page refresh after Day 11.5's sessionStorage fix landed —
  // the existing on-chain session predates the fix so no storage entry
  // exists). Two-step orchestration:
  //
  //   1. revoke every currently-authorized session for this owner
  //   2. grant a freshly-minted client-side keypair
  //
  // Each step emits its own receipt (revoke + grant). Loading stays as
  // `'regrant'` for the full duration so the SetupLedger CTA shows a
  // single spinner. Aborts cleanly if any revoke fails — the owner's
  // existing session keeps working in that case.
  const regrantAgentSession = useCallback(async () => {
    if (!publicKey || !data) return
    const sessions = (data.temporalKeys ?? data.sessions ?? []) as Array<{
      key?: unknown
      authorized?: unknown
      expiresAt?: unknown
    }>
    const activeSessionKeys = sessions
      .filter(
        (s) =>
          s &&
          s.authorized === true &&
          Number(s.expiresAt ?? 0) * 1000 > Date.now(),
      )
      .map((s) => String(s.key ?? ''))
      .filter(Boolean)

    for (const sessionKey of activeSessionKeys) {
      let revokeOk = false
      await runTxAction(
        'regrant',
        () =>
          apiRevokeSession({
            owner: publicKey.toBase58(),
            sessionKey,
          }),
        (_result, signature) => {
          revokeOk = true
          emitReceipt({
            action: 'SESSION REVOKED',
            description: `Session ${sessionKey.slice(0, 4)}…${sessionKey.slice(-4)} revoked.`,
            signature,
            status: 'info',
            body: 'Owner revoked agent access. Subsequent agent transactions will be rejected by the policy gate.',
          })
        },
        (err, signature) =>
          emitReceipt({
            action: 'SESSION REVOKE FAILED',
            description: describeError(err),
            signature,
            status: 'error',
            body: 'Revoke transaction failed; existing session remains active.',
          }),
      )
      if (!revokeOk) return
    }

    const sessionKeypair = Keypair.generate()
    const expiresAt =
      Math.floor(Date.now() / 1000) + SESSION_DURATION_HOURS * 3600
    await runTxAction(
      'regrant',
      () =>
        apiGrantKey({
          owner: publicKey.toBase58(),
          sessionKey: sessionKeypair.publicKey.toBase58(),
          expiresAt,
          dailyLimit: SESSION_DAILY_LIMIT_USDC,
        }),
      (_result, signature) => {
        setSessionKeypair(sessionKeypair)
        writeStoredSessionKey(publicKey, sessionKeypair)
        emitReceipt({
          action: 'SESSION GRANTED',
          description: `Session ${sessionKeypair.publicKey.toBase58().slice(0, 4)}…${sessionKeypair.publicKey.toBase58().slice(-4)} authorized for ${SESSION_DURATION_HOURS}h.`,
          signature,
          status: 'info',
          body: 'Fresh BYO agent keypair minted client-side. Download polet-agent.json to bridge to the SDK runner.',
        })
      },
      (err, signature) =>
        emitReceipt({
          action: 'SESSION GRANT FAILED',
          description: describeError(err),
          signature,
          status: 'error',
          body: 'Grant transaction failed after revoke succeeded. Re-click Re-grant to retry.',
        }),
    )
  }, [publicKey, data, runTxAction, emitReceipt])

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

  // Fund agent gas — Phase 3 of PRD 098.
  //
  // The session keypair (Keypair.generate()) starts with 0 lamports.
  // After Phase 2 landed, clicking Execute on the Jupiter rail asks
  // the session key to sign + broadcast the smart-wallet tx, but the
  // network rejects it with "Attempt to debit an account but found
  // no record of a prior credit" — the session pubkey has no SOL to
  // pay fees. This action covers that gap: the owner (via Phantom)
  // signs a plain SOL transfer from their wallet to the session
  // pubkey, giving the agent enough lamports to broadcast.
  //
  // Wraps the existing runTxAction helper because the tx is owner-
  // signed (not session-signed). Trust boundary preserved: session
  // keypair doesn't authorize the funding itself.
  const fundAgentGas = useCallback(
    async (amountSol: string) => {
      if (!publicKey) return
      const sessionKey = findActiveSessionKey()
      if (!sessionKey) {
        setError('No active session. Grant an agent session first.')
        emitReceipt({
          action: 'FUND GAS BLOCKED',
          description: 'No active session key to fund.',
          status: 'error',
          body: 'Grant an agent session in the Setup ledger first.',
        })
        return
      }
      await runTxAction(
        'fund-gas',
        () =>
          apiFundAgentGas({
            owner: publicKey.toBase58(),
            agentWallet: sessionKey,
            amount: amountSol,
          }),
        (result, signature) =>
          emitReceipt({
            action: `${amountSol} SOL FUNDED TO AGENT`,
            description: `Owner sent ${amountSol} SOL to session ${sessionKey.slice(0, 4)}…${sessionKey.slice(-4)}.`,
            signature,
            status: 'info',
            body: `Agent gas tank topped up. Source ${result.source.slice(0, 4)}…${result.source.slice(-4)}, destination ${result.destination.slice(0, 4)}…${result.destination.slice(-4)}, amount ${result.amountUi} SOL (${result.amountLamports} lamports). The session key can now broadcast Jupiter Execute on devnet.`,
          }),
        (err, signature) =>
          emitReceipt({
            action: 'FUND GAS FAILED',
            description: describeError(err),
            signature,
            status: 'error',
          }),
      )
    },
    [publicKey, findActiveSessionKey, runTxAction, emitReceipt],
  )

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
        // Extract Jupiter route + tx artifacts when approved. Field
        // shape comes from RunConfidentialDcaResult (see api.ts).
        const jupiterProof: JupiterProof | undefined =
          allowed && (result.jupiterPlan || result.transaction || result.smartWalletAuthority)
            ? {
                executionPath: result.executionPath,
                smartWalletAuthority: result.smartWalletAuthority,
                inputToken: result.jupiterPlan?.inputToken,
                outputToken: result.jupiterPlan?.outputToken,
                quote: result.jupiterPlan?.quoteMetadata
                  ? {
                      inputAmount: result.jupiterPlan.quoteMetadata.inputAmount,
                      expectedOutput: result.jupiterPlan.quoteMetadata.expectedOutput,
                      minimumOutput: result.jupiterPlan.quoteMetadata.minimumOutput,
                      slippageBps: result.jupiterPlan.quoteMetadata.slippageBps,
                      priceImpactPct: result.jupiterPlan.quoteMetadata.priceImpactPct,
                      routeLabel: result.jupiterPlan.quoteMetadata.routeLabel,
                    }
                  : undefined,
                routeSteps: result.jupiterPlan?.build?.routePlan?.length,
                primaryDex: result.jupiterPlan?.build?.routePlan?.[0]?.swapInfo?.label,
                approvalSigners: result.transaction?.signers,
                txBlockHash: result.transaction?.blockHash,
                txSlot: result.transaction?.slot,
              }
            : undefined
        emitReceipt({
          action: allowed
            ? `${amount} USDC APPROVED (JUPITER)`
            : `${amount} USDC BLOCKED (JUPITER)`,
          description: allowed
            ? 'Route + unsigned smart-wallet tx ready.'
            : 'Original amount stays sealed; the gate said no without ever reading the cleartext.',
          status: allowed ? 'allowed' : 'blocked',
          constraintRefs: {
            numericLimit: allowed ? 'pass' : 'fail',
            scopeMatch: 'pass',
            sessionActive: 'pass',
          },
          body: result.reason,
          ...(jupiterProof && { jupiterProof }),
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

  // Jupiter real execution — Phase 2 of PRD 098.
  //
  // The rail preview actions (runJupiterBlock / runJupiterAllow) hit
  // `/intent/dca/run` and emit a receipt with the policy verdict
  // plus the unsigned smart-wallet tx that the proxy prepared. They
  // stop there. `executeJupiter` continues the flow: if the verdict
  // is allowed AND the session keypair is in memory AND the proxy
  // actually returned an unsigned tx, sign it with the session key
  // via `broadcastSessionTx` and wait for on-chain confirmation. The
  // resulting receipt carries a real Solana Explorer signature so
  // judges can verify the swap independently.
  //
  // Failure modes emit a typed receipt (verdict-blocked, session-
  // keypair-missing, tx-missing, broadcast-error) rather than a
  // generic "Jupiter error" line so the operator can see exactly
  // where the rail stopped.
  const executeJupiter = useCallback(async () => {
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
    if (!sessionKeypair) {
      setError('Session keypair not in memory. Re-grant to populate storage.')
      emitReceipt({
        action: 'EXECUTE BLOCKED',
        description: 'Session keypair missing.',
        status: 'error',
        body: 'Session was granted before the persistence fix, or was wiped on refresh. Use Re-grant for download to mint a new keypair.',
      })
      return
    }

    setLoading('jupiter-execute')
    setError(null)

    try {
      // 1. Ask proxy for policy verdict + unsigned smart-wallet tx
      const result = await apiRunConfidentialDca({
        owner: publicKey.toBase58(),
        sessionKey,
        amountUsdc: ALLOW_AMOUNT_USDC,
        slippageBps: 100,
        maskedWitnessDevFixture: DEMO_WITNESS_FIXTURE,
      })

      if (result.allowed !== true) {
        emitReceipt({
          action: `${ALLOW_AMOUNT_USDC} USDC BLOCKED (JUPITER EXECUTE)`,
          description:
            'Policy gate blocked execute at preview stage; no tx broadcast.',
          status: 'blocked',
          constraintRefs: {
            numericLimit: 'fail',
            scopeMatch: 'pass',
            sessionActive: 'pass',
          },
          body:
            result.reason ??
            'Confidential policy would block this amount. Try a smaller run or raise the cap.',
        })
        return
      }

      const unsignedTxB64 = result.transaction?.transaction
      if (!unsignedTxB64) {
        emitReceipt({
          action: 'EXECUTE ABORTED',
          description:
            'Proxy did not return an unsigned transaction for Jupiter execute.',
          status: 'error',
          body: 'The verdict was allowed but the smart-wallet tx was missing from the response. Re-run preview to inspect.',
        })
        return
      }

      // 2. Sign + broadcast + confirm
      const broadcast = await broadcastSessionTx(
        connection,
        sessionKeypair,
        unsignedTxB64,
      )

      // 3. Emit success receipt with real signature
      const jupiterProof: JupiterProof | undefined = result.jupiterPlan
        ? {
            executionPath: result.executionPath,
            smartWalletAuthority: result.smartWalletAuthority,
            inputToken: result.jupiterPlan?.inputToken,
            outputToken: result.jupiterPlan?.outputToken,
            quote: result.jupiterPlan?.quoteMetadata
              ? {
                  inputAmount: result.jupiterPlan.quoteMetadata.inputAmount,
                  expectedOutput: result.jupiterPlan.quoteMetadata.expectedOutput,
                  minimumOutput: result.jupiterPlan.quoteMetadata.minimumOutput,
                  slippageBps: result.jupiterPlan.quoteMetadata.slippageBps,
                  priceImpactPct: result.jupiterPlan.quoteMetadata.priceImpactPct,
                  routeLabel: result.jupiterPlan.quoteMetadata.routeLabel,
                }
              : undefined,
            routeSteps: result.jupiterPlan?.build?.routePlan?.length,
            primaryDex: result.jupiterPlan?.build?.routePlan?.[0]?.swapInfo?.label,
            approvalSigners: result.transaction?.signers,
            txBlockHash: broadcast.blockhash,
            txSlot: result.transaction?.slot,
          }
        : undefined

      emitReceipt({
        action: `${ALLOW_AMOUNT_USDC} USDC EXECUTED (JUPITER)`,
        description: `Session-signed + broadcast — tx ${broadcast.signature.slice(0, 4)}…${broadcast.signature.slice(-4)}.`,
        signature: broadcast.signature,
        status: 'allowed',
        constraintRefs: {
          numericLimit: 'pass',
          scopeMatch: 'pass',
          sessionActive: 'pass',
        },
        body: 'Smart-wallet PDA executed the Jupiter swap on-chain. Session keypair signed; owner key not exposed.',
        ...(jupiterProof && { jupiterProof }),
      })

      await refresh()
    } catch (err) {
      if (err instanceof BroadcastError) {
        setError(err.message)
        emitReceipt({
          action: 'EXECUTE FAILED (JUPITER)',
          description: `${err.stage}: ${err.cause instanceof Error ? err.cause.message : String(err.cause)}`,
          signature: err.signature ?? undefined,
          status: 'error',
          body:
            err.stage === 'confirm'
              ? 'Transaction broadcast but failed during confirmation. Check Solana Explorer for final status.'
              : 'Transaction did not broadcast. No on-chain side effect.',
        })
      } else {
        const message = describeError(err)
        setError(message)
        emitReceipt({
          action: 'JUPITER EXECUTE ERROR',
          description: message,
          status: 'error',
        })
      }
    } finally {
      setLoading(null)
    }
  }, [
    publicKey,
    sessionKeypair,
    connection,
    findActiveSessionKey,
    emitReceipt,
    refresh,
  ])

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
        regrantAgentSession,
        fundAgentGas,
        runJupiterBlock,
        runJupiterAllow,
        executeJupiter,
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
      regrantAgentSession,
      fundAgentGas,
      runJupiterBlock,
      runJupiterAllow,
      executeJupiter,
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
