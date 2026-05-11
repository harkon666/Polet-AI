import {
  Keypair,
  Transaction,
  VersionedTransaction,
  type BlockhashWithExpiryBlockHeight,
  type Connection,
} from '@solana/web3.js'

/**
 * SessionTxBroadcaster, deep module for agent-side execution.
 *
 * Encapsulates the "sign an unsigned smart-wallet tx with the BYO
 * session Keypair and broadcast it to devnet" lifecycle in a single
 * testable interface. Used by the Jupiter Execute and Ika lifecycle
 * paths in the /app console — both call this with the base64 tx
 * returned by the proxy's /intent/.../run endpoints.
 *
 * What it hides:
 *   - Versioned vs legacy transaction detection (Solana has both;
 *     smart-wallet txs are currently legacy, Jupiter route-plan txs
 *     are often versioned; the caller shouldn't care).
 *   - Blockhash freshness. Proxy returns a blockhash alongside the
 *     unsigned tx, but by the time the operator clicks Execute it
 *     may have expired (~60 s window). Module always fetches a fresh
 *     blockhash from the connection before signing.
 *   - Partial sign semantics. Smart-wallet txs are CPI-signed by the
 *     Polet program on-chain; the session key is the sole client-
 *     side signer. Legacy uses `partialSign`, versioned uses `sign`.
 *   - Confirmation retries on blockhash expiry. If the confirm call
 *     throws with "block height exceeded" or "has expired", the
 *     module queries the signature status directly as a fallback
 *     before failing — matches the proxy/src behavior for wallet-
 *     adapter-signed setup txs.
 *
 * The output is always a confirmed signature + the blockhash used,
 * so the caller can build a Solana Explorer link and a receipt entry
 * without additional RPC round-trips.
 *
 * This module is intentionally agnostic of:
 *   - Where the tx came from (proxy response, manual build, etc.).
 *   - What the signing authority is (sessionKeypair is a vanilla
 *     Keypair; caller decides which key to pass).
 *   - How the result is rendered (receipt-builder is a separate
 *     module that consumes the signature).
 */

export type BroadcastOptions = {
  skipPreflight?: boolean
}

export type BroadcastResult = {
  signature: string
  blockhash: string
  lastValidBlockHeight: number
}

/**
 * BroadcastError, typed error surface for broadcast failures.
 *
 * Carries the signature (if the tx was broadcast but failed during
 * confirmation) so the caller can surface a Solana Explorer link
 * even on failure paths. A null signature means the failure happened
 * before broadcast (deserialize, sign, prepare, etc.).
 */
export class BroadcastError extends Error {
  constructor(
    public readonly stage:
      | 'deserialize'
      | 'prepare-blockhash'
      | 'sign'
      | 'serialize'
      | 'send'
      | 'confirm',
    public readonly cause: unknown,
    public readonly signature: string | null,
  ) {
    const message = cause instanceof Error ? cause.message : String(cause)
    super(`[session-tx-broadcaster] ${stage}: ${message}`)
    this.name = 'BroadcastError'
  }
}

export async function broadcastSessionTx(
  connection: Connection,
  sessionKeypair: Keypair,
  txBase64: string,
  options: BroadcastOptions = {},
): Promise<BroadcastResult> {
  // 1. Deserialize — detect versioned vs legacy
  let tx: Transaction | VersionedTransaction
  let isVersioned: boolean
  const bytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0))
  try {
    tx = VersionedTransaction.deserialize(bytes)
    isVersioned = true
  } catch {
    try {
      tx = Transaction.from(bytes)
      isVersioned = false
    } catch (err) {
      throw new BroadcastError('deserialize', err, null)
    }
  }

  // 2. Fresh blockhash so expired proxy-side blockhashes don't tank
  //    confirmation.
  let latestBlockhash: BlockhashWithExpiryBlockHeight
  try {
    latestBlockhash = await connection.getLatestBlockhash('confirmed')
  } catch (err) {
    throw new BroadcastError('prepare-blockhash', err, null)
  }

  // 3. Apply fresh blockhash + sign with session keypair
  let serialized: Uint8Array
  try {
    if (isVersioned) {
      const versioned = tx as VersionedTransaction
      versioned.message.recentBlockhash = latestBlockhash.blockhash
      versioned.sign([sessionKeypair])
      serialized = versioned.serialize()
    } else {
      const legacy = tx as Transaction
      legacy.recentBlockhash = latestBlockhash.blockhash
      legacy.partialSign(sessionKeypair)
      serialized = legacy.serialize()
    }
  } catch (err) {
    throw new BroadcastError('sign', err, null)
  }

  // 4. Broadcast
  let signature: string
  try {
    signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: options.skipPreflight ?? false,
      preflightCommitment: 'confirmed',
    })
  } catch (err) {
    throw new BroadcastError('send', err, null)
  }

  // 5. Confirm with blockhash-expiry fallback
  try {
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      'confirmed',
    )
  } catch (err) {
    if (!isBlockhashExpiryError(err)) {
      throw new BroadcastError('confirm', err, signature)
    }
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    })
    const value = status?.value
    const landed =
      value &&
      !value.err &&
      (value.confirmationStatus === 'confirmed' ||
        value.confirmationStatus === 'finalized')
    if (!landed) {
      throw new BroadcastError('confirm', err, signature)
    }
  }

  return {
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }
}

function isBlockhashExpiryError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes('block height exceeded') ||
    message.includes('has expired')
  )
}
