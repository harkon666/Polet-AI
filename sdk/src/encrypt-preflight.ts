/**
 * Node-side Encrypt policy preflight for Polet agent runtimes.
 *
 * When a Polet trade hits a wallet whose confidential policy is backed by
 * Official Encrypt (pre-alpha), the proxy refuses to prepare strategy
 * payloads until the agent runs the Encrypt policy graph to produce
 * verified `allowedOutput` + `dailySpentOutput` ciphertexts. This module
 * orchestrates that preflight entirely from the agent side so the
 * top-level `kit.execute()` call can transparently replay the trade.
 *
 * Lifecycle:
 *   1. Read wallet state → resolve existing policy ciphertexts + PDA.
 *   2. Ensure a per-session Encrypt deposit exists (create if not).
 *   3. Encrypt gRPC `createInput` for { sourceAmount, allowedOutput, dailySpentOutput }.
 *   4. POST /wallet/execute-encrypt-policy-graph → sign + send with agent signer.
 *   5. Poll ciphertext status until Encrypt network marks `allowedOutput = verified`.
 *   6. POST /wallet/request-pending-allowed-output-decryption → sign + send.
 *   7. POST /wallet/resolve-encrypt-policy-decision (poll) until non-pending.
 *   8. Return verified `OfficialEncryptExecutionRefs` the intent layer needs.
 *
 * Agents that want more control can call these individually; most callers
 * just use the top-level `runEncryptPolicyPreflight` helper.
 *
 * Pre-alpha disclaimer: Encrypt devnet gRPC occasionally emits pending
 * verifier states; the poll loops include generous timeouts. Nothing here
 * is production privacy; plaintext may appear in Encrypt decryption
 * request accounts.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Signer,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  Chain,
  createEncryptClient,
  DEVNET_PRE_ALPHA_GRPC_URL,
} from '@encrypt.xyz/pre-alpha-solana-client/grpc';
import { encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';
import type { OfficialEncryptExecutionRefs } from './index.js';

const ENCRYPT_PREALPHA_PROGRAM_ID = '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8';
/**
 * The Polet program id MUST match the deployed devnet Polet program. This
 * value is compiled into the Encrypt ciphertext "authorized" field when we
 * call `createInput`; a mismatch causes on-chain error 0xc
 * (UNAUTHORIZED_CIPHERTEXT_ACCESS) when the graph tries to consume the
 * ciphertext. Override with POLET_PROGRAM_ID env when using a different
 * deployment.
 */
const POLET_PROGRAM_ID = process.env.POLET_PROGRAM_ID ?? '9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc';
const NETWORK_ENCRYPTION_PUBLIC_KEY = '2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur';
const ENCRYPT_PREALPHA_CONFIG = 'EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3';
const ENCRYPT_PREALPHA_EVENT_AUTHORITY = '6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ';
const FHE_UINT64 = 4;
const FHE_BOOL = 0;
const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS;

function deriveEncryptDepositPda(payerPubkey: string): string {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_deposit'), new PublicKey(payerPubkey).toBuffer()],
    new PublicKey(ENCRYPT_PREALPHA_PROGRAM_ID)
  );
  return pda.toString();
}

export interface EncryptPreflightOptions {
  /** Polet proxy base URL (trailing slash optional). */
  baseUrl: string;
  /** Owner public key (base58). */
  owner: string;
  /** Session public key authorized on-chain. */
  sessionKey: string;
  /** Session signer that holds the secret matching `sessionKey`. */
  agentSigner: Signer;
  /** Amount of USDC (human-readable; e.g. "5" or "5.25") the trade will consume. */
  amountUsdc: string;
  /** Optional override for the Encrypt gRPC endpoint. */
  grpcEndpoint?: string;
  /** Solana connection / RPC URL (one of them must be provided). */
  connection?: Connection;
  rpcUrl?: string;
  /** Skip the create-deposit step when the operator has pre-provisioned one. */
  skipDepositCreate?: boolean;
  /** Fetch override (tests / custom auth). */
  fetch?: typeof fetch;
  /** Verbose logger. Defaults to silent. */
  log?: (message: string) => void;
  /** Poll tuning. */
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface EncryptPreflightResult {
  refs: OfficialEncryptExecutionRefs;
  decision: {
    status: 'encrypt-verified-allowed' | 'encrypt-verified-blocked';
    policySequence?: number;
    allowedOutputCiphertext: string;
    dailySpentOutputCiphertext: string;
    allowedDecryptionRequest?: string;
  };
  diagnostics: {
    graphSignature: string;
    decryptionSignature: string;
    depositSignature?: string;
    attempts: number;
  };
}

export class EncryptPreflightError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'EncryptPreflightError';
  }
}

// ---------- Top-level orchestrator ----------

export async function runEncryptPolicyPreflight(
  options: EncryptPreflightOptions
): Promise<EncryptPreflightResult> {
  assertRequired(options);
  const log = options.log ?? (() => undefined);
  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const connection = options.connection
    ?? new Connection(options.rpcUrl ?? 'https://api.devnet.solana.com', 'confirmed');
  const grpcEndpoint = options.grpcEndpoint ?? DEVNET_PRE_ALPHA_GRPC_URL;

  log(`[encrypt-preflight] reading wallet state for ${options.owner}`);
  const wallet = await fetchWalletState(baseUrl, options.owner, fetchImpl);
  const policyRefs = requirePolicyRefs(wallet);

  log('[encrypt-preflight] ensuring per-session Encrypt deposit exists');
  const depositResult = options.skipDepositCreate
    ? { context: {} as EncryptDepositContext }
    : await ensureEncryptDeposit(baseUrl, options, connection, fetchImpl, log);
  const depositSignature = depositResult.signature;
  const depositContext = depositResult.context;

  log('[encrypt-preflight] creating execution ciphertexts via Encrypt gRPC');
  const executionCiphertexts = await createEncryptExecutionCiphertexts({
    amountUsdc: options.amountUsdc,
    grpcEndpoint,
  });

  log(`[encrypt-preflight] waiting for execution ciphertexts to land on-chain (source, allowed, dailySpent)`);
  for (const [label, ct] of [
    ['source', executionCiphertexts.sourceAmountCiphertext],
    ['allowedOutput', executionCiphertexts.allowedOutputCiphertext],
    ['dailySpentOutput', executionCiphertexts.dailySpentOutputCiphertext],
  ] as const) {
    await pollCiphertextVerified({
      baseUrl,
      ciphertext: ct,
      fetchImpl,
      pollIntervalMs: options.pollIntervalMs ?? 3_000,
      pollTimeoutMs: options.pollTimeoutMs ?? 120_000,
    });
    log(`[encrypt-preflight]   ${label} verified: ${ct}`);
  }

  log('[encrypt-preflight] executing Polet policy graph on-chain');
  const graphSignature = await executePolicyGraph({
    baseUrl,
    options,
    connection,
    fetchImpl,
    policyRefs,
    executionCiphertexts,
    depositContext,
  });

  log('[encrypt-preflight] polling allowed-output ciphertext verification');
  await pollCiphertextVerified({
    baseUrl,
    ciphertext: executionCiphertexts.allowedOutputCiphertext,
    fetchImpl,
    pollIntervalMs: options.pollIntervalMs ?? 3_000,
    pollTimeoutMs: options.pollTimeoutMs ?? 180_000,
  });

  log('[encrypt-preflight] requesting allowed-output decryption');
  const { decryptionSignature, requestPubkey } = await requestAllowedOutputDecryption({
    baseUrl,
    options,
    connection,
    fetchImpl,
    wallet,
    policyRefs,
    depositContext,
  });

  log('[encrypt-preflight] polling Polet resolve-encrypt-policy-decision');
  const { decision, attempts } = await pollEncryptDecision({
    baseUrl,
    owner: options.owner,
    allowedDecryptionRequest: requestPubkey.toString(),
    expectedPolicySeq: policyRefs.policySeq,
    fetchImpl,
    pollIntervalMs: options.pollIntervalMs ?? 3_000,
    pollTimeoutMs: options.pollTimeoutMs ?? 120_000,
  });

  if (decision.status !== 'encrypt-verified-allowed') {
    return {
      refs: {
        sourceAmountCiphertext: executionCiphertexts.sourceAmountCiphertext,
        allowedOutputCiphertext: executionCiphertexts.allowedOutputCiphertext,
        dailySpentOutputCiphertext: executionCiphertexts.dailySpentOutputCiphertext,
        ...(decision.allowedDecryptionRequest && { allowedDecryptionRequest: decision.allowedDecryptionRequest }),
      },
      decision: decision as EncryptPreflightResult['decision'],
      diagnostics: {
        graphSignature,
        decryptionSignature,
        depositSignature,
        attempts,
      },
    };
  }

  return {
    refs: {
      sourceAmountCiphertext: decision.sourceAmountCiphertext ?? executionCiphertexts.sourceAmountCiphertext,
      allowedOutputCiphertext: decision.allowedOutputCiphertext,
      dailySpentOutputCiphertext: decision.dailySpentOutputCiphertext,
      ...(decision.allowedDecryptionRequest && { allowedDecryptionRequest: decision.allowedDecryptionRequest }),
    },
    decision: decision as EncryptPreflightResult['decision'],
    diagnostics: {
      graphSignature,
      decryptionSignature,
      depositSignature,
      attempts,
    },
  };
}

// ---------- Sub-steps ----------

interface ExecutionCiphertextsResult {
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  grpcEndpoint: string;
}

export async function createEncryptExecutionCiphertexts(input: {
  amountUsdc: string;
  grpcEndpoint?: string;
}): Promise<ExecutionCiphertextsResult> {
  const sourceAmount = parseUsdcBaseUnits(input.amountUsdc, 'amountUsdc');
  if (sourceAmount <= 0n) throw new EncryptPreflightError('INVALID_AMOUNT', 'Amount must be greater than zero.');
  const grpcEndpoint = input.grpcEndpoint ?? DEVNET_PRE_ALPHA_GRPC_URL;
  const client = createEncryptClient(grpcEndpoint);
  const result = await client.createInput({
    chain: Chain.Solana,
    inputs: [
      { ciphertextBytes: encryptValue(sourceAmount, FHE_UINT64), fheType: FHE_UINT64 },
      { ciphertextBytes: encryptValue(0n, FHE_BOOL), fheType: FHE_BOOL },
      { ciphertextBytes: encryptValue(0n, FHE_UINT64), fheType: FHE_UINT64 },
    ],
    authorized: Buffer.from(bs58.decode(POLET_PROGRAM_ID)),
    networkEncryptionPublicKey: Buffer.from(bs58.decode(NETWORK_ENCRYPTION_PUBLIC_KEY)),
  });
  const ciphertextIds = result.ciphertextIdentifiers ?? [];
  if (ciphertextIds.length !== 3) {
    throw new EncryptPreflightError(
      'ENCRYPT_CREATE_INPUT_MISMATCH',
      `Encrypt createInput returned ${ciphertextIds.length} ciphertext ids (expected 3)`
    );
  }
  const [sourceAmountCiphertext, allowedOutputCiphertext, dailySpentOutputCiphertext] = ciphertextIds.map((id: Uint8Array) => bs58.encode(id));
  return {
    sourceAmountCiphertext,
    allowedOutputCiphertext,
    dailySpentOutputCiphertext,
    grpcEndpoint,
  };
}

async function ensureEncryptDeposit(
  baseUrl: string,
  options: EncryptPreflightOptions,
  connection: Connection,
  fetchImpl: typeof fetch,
  log: (m: string) => void
): Promise<{ signature?: string; context: EncryptDepositContext }> {
  const context: EncryptDepositContext = {};
  try {
    const envelope = await postJson<{
      success?: boolean;
      data?: {
        transaction?: string | null;
        status?: string;
        deposit?: string;
        config?: string;
        eventAuthority?: string;
        blockers?: string[];
      };
      error?: unknown;
      code?: string;
    }>(
      '/wallet/create-encrypt-deposit',
      {
        owner: options.sessionKey,
        feePayerOwner: options.owner,
      },
      baseUrl,
      fetchImpl
    );
    if (envelope?.data?.deposit) context.deposit = envelope.data.deposit;
    if (envelope?.data?.config) context.config = envelope.data.config;
    if (envelope?.data?.eventAuthority) context.eventAuthority = envelope.data.eventAuthority;

    const status = envelope?.data?.status;
    if (!envelope?.success) {
      log(`[encrypt-preflight] create-deposit returned error: ${JSON.stringify(envelope?.error ?? envelope?.code ?? 'unknown')}`);
      return { context };
    }
    if (status === 'existing-deposit') {
      log(`[encrypt-preflight] deposit already exists: ${context.deposit}`);
      return { context };
    }
    if (status === 'encrypt-infra-blocked') {
      log(`[encrypt-preflight] encrypt infra blocked: ${envelope.data?.blockers?.join(', ')}`);
      return { context };
    }
    if (!envelope.data?.transaction) {
      log(`[encrypt-preflight] no deposit transaction returned (status=${status})`);
      return { context };
    }
    const tx = Transaction.from(Buffer.from(envelope.data.transaction, 'base64'));
    tx.feePayer = new PublicKey(options.owner);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.partialSign(options.agentSigner);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
    log(`[encrypt-preflight] deposit created: ${sig}`);
    return { context, signature: sig };
  } catch (error) {
    log(`[encrypt-preflight] deposit error: ${(error as Error).message}`);
    return { context };
  }
}

async function executePolicyGraph(input: {
  baseUrl: string;
  options: EncryptPreflightOptions;
  connection: Connection;
  fetchImpl: typeof fetch;
  policyRefs: PolicyRefs;
  executionCiphertexts: ExecutionCiphertextsResult;
  depositContext?: EncryptDepositContext;
}): Promise<string> {
  const { baseUrl, options, connection, fetchImpl, policyRefs, executionCiphertexts, depositContext } = input;
  const envelope = await postJson<{ success?: boolean; data?: { transaction?: string }; error?: unknown }>(
    '/wallet/execute-encrypt-policy-graph',
    {
      owner: options.owner,
      wallet: policyRefs.wallet,
      sessionKey: options.sessionKey,
      sourceAmountCiphertext: executionCiphertexts.sourceAmountCiphertext,
      maxPerRunCiphertext: policyRefs.maxPerRun,
      dailySpentCiphertext: policyRefs.dailySpent,
      dailyCapCiphertext: policyRefs.dailyCap,
      allowedOutputCiphertext: executionCiphertexts.allowedOutputCiphertext,
      dailySpentOutputCiphertext: executionCiphertexts.dailySpentOutputCiphertext,
      attestationSlot: policyRefs.lastRevokedSlot + 1,
      attestationPolicySeq: policyRefs.policySeq,
      encrypt: {
        encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
        config: depositContext?.config ?? policyRefs.config ?? ENCRYPT_PREALPHA_CONFIG,
        deposit: depositContext?.deposit ?? policyRefs.deposit ?? deriveEncryptDepositPda(options.sessionKey),
        networkEncryptionKey: policyRefs.networkEncryptionKey ?? NETWORK_ENCRYPTION_PUBLIC_KEY,
        eventAuthority: depositContext?.eventAuthority ?? policyRefs.eventAuthority ?? ENCRYPT_PREALPHA_EVENT_AUTHORITY,
        payer: options.sessionKey,
      },
    },
    baseUrl,
    fetchImpl
  );
  if (!envelope?.success || !envelope.data?.transaction) {
    throw new EncryptPreflightError('GRAPH_BUILD_FAILED', `execute-encrypt-policy-graph returned ${JSON.stringify(envelope?.error ?? envelope)}`);
  }
  const tx = parsePoletTransaction(envelope.data.transaction);
  return signAndSend(tx, [options.agentSigner], connection);
}

async function pollCiphertextVerified(input: {
  baseUrl: string;
  ciphertext: string;
  fetchImpl: typeof fetch;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}): Promise<void> {
  const deadline = Date.now() + input.pollTimeoutMs;
  let lastStatus = 'unknown';
  while (Date.now() < deadline) {
    const res = await input.fetchImpl(new URL(`/wallet/encrypt-ciphertext/${input.ciphertext}`, input.baseUrl));
    if (res.ok) {
      const envelope = (await res.json()) as { success?: boolean; data?: { status?: string } };
      lastStatus = envelope?.data?.status ?? lastStatus;
      if (envelope?.success && lastStatus === 'verified') return;
    }
    await sleep(input.pollIntervalMs);
  }
  throw new EncryptPreflightError(
    'CIPHERTEXT_NOT_VERIFIED',
    `Encrypt graph output ciphertext is still pending after ${Math.round(input.pollTimeoutMs / 1000)}s (last status ${lastStatus}). The Encrypt executor is in a pending verifier state; retry later.`
  );
}

async function requestAllowedOutputDecryption(input: {
  baseUrl: string;
  options: EncryptPreflightOptions;
  connection: Connection;
  fetchImpl: typeof fetch;
  wallet: WalletEnvelope;
  policyRefs: PolicyRefs;
  depositContext: EncryptDepositContext;
}): Promise<{ decryptionSignature: string; requestPubkey: PublicKey }> {
  const requestKeypair = Keypair.generate();
  const envelope = await postJson<{ success?: boolean; data?: { transaction?: string; request?: string; policySequence?: number }; error?: unknown }>(
    '/wallet/request-pending-allowed-output-decryption',
    {
      owner: input.options.owner,
      sessionKey: input.options.sessionKey,
      wallet: input.policyRefs.wallet,
      request: requestKeypair.publicKey.toBase58(),
      encrypt: {
        encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
        config: input.depositContext.config ?? input.policyRefs.config ?? ENCRYPT_PREALPHA_CONFIG,
        deposit: input.depositContext.deposit ?? input.policyRefs.deposit ?? deriveEncryptDepositPda(input.options.owner),
        networkEncryptionKey: input.policyRefs.networkEncryptionKey ?? NETWORK_ENCRYPTION_PUBLIC_KEY,
        eventAuthority: input.depositContext.eventAuthority ?? input.policyRefs.eventAuthority ?? ENCRYPT_PREALPHA_EVENT_AUTHORITY,
        payer: input.options.sessionKey,
      },
    },
    input.baseUrl,
    input.fetchImpl
  );
  if (!envelope?.success || !envelope.data?.transaction) {
    throw new EncryptPreflightError(
      'DECRYPTION_REQUEST_FAILED',
      `request-pending-allowed-output-decryption returned ${JSON.stringify(envelope?.error ?? envelope)}`
    );
  }
  const tx = parsePoletTransaction(envelope.data.transaction);
  // BYO-friendly: contract now accepts session as authority
  // (require_owner_or_active_session). Agent signs + pays for everything.
  const sig = await signAndSend(tx, [input.options.agentSigner, requestKeypair], input.connection);
  return { decryptionSignature: sig, requestPubkey: requestKeypair.publicKey };
}

interface DecisionEnvelope {
  status: 'pending-encrypt-execution' | 'encrypt-verified-allowed' | 'encrypt-verified-blocked';
  policySequence?: number;
  sourceAmountCiphertext?: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  allowedDecryptionRequest?: string;
}

async function pollEncryptDecision(input: {
  baseUrl: string;
  owner: string;
  allowedDecryptionRequest: string;
  expectedPolicySeq: number;
  fetchImpl: typeof fetch;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}): Promise<{ decision: DecisionEnvelope; attempts: number }> {
  const deadline = Date.now() + input.pollTimeoutMs;
  let attempts = 0;
  let lastEnvelope: DecisionEnvelope | null = null;
  while (Date.now() < deadline) {
    attempts += 1;
    const envelope = await postJson<{ success?: boolean; data?: DecisionEnvelope; error?: unknown }>(
      '/wallet/resolve-encrypt-policy-decision',
      {
        owner: input.owner,
        allowedDecryptionRequest: input.allowedDecryptionRequest,
        expectedPolicySeq: input.expectedPolicySeq,
      },
      input.baseUrl,
      input.fetchImpl
    );
    if (envelope?.success && envelope.data) {
      lastEnvelope = envelope.data;
      if (envelope.data.status !== 'pending-encrypt-execution') {
        return { decision: envelope.data, attempts };
      }
    }
    await sleep(input.pollIntervalMs);
  }
  throw new EncryptPreflightError(
    'DECISION_PENDING_TIMEOUT',
    `Encrypt policy decision stayed pending after ${Math.round(input.pollTimeoutMs / 1000)}s (${attempts} polls). Last status: ${lastEnvelope?.status ?? 'unknown'}.`
  );
}

// ---------- Types ----------

interface WalletEnvelope {
  walletPda?: string;
  policySeq?: number;
  lastRevokedSlot?: number;
  confidentialPolicy?: {
    encryptCiphertexts?: {
      maxPerRun?: string;
      dailyCap?: string;
      dailySpent?: string;
      policyCommitment?: unknown;
      config?: string;
      deposit?: string;
      networkEncryptionKey?: string;
      eventAuthority?: string;
    };
  };
  encryptDeposit?: EncryptDepositContext;
}

interface EncryptDepositContext {
  config?: string;
  deposit?: string;
  eventAuthority?: string;
}

interface PolicyRefs {
  wallet: string;
  maxPerRun: string;
  dailyCap: string;
  dailySpent: string;
  config?: string;
  deposit?: string;
  networkEncryptionKey?: string;
  eventAuthority?: string;
  policySeq: number;
  lastRevokedSlot: number;
}

// ---------- Helpers ----------

async function fetchWalletState(baseUrl: string, owner: string, fetchImpl: typeof fetch): Promise<WalletEnvelope> {
  const res = await fetchImpl(new URL(`/wallet/${owner}`, baseUrl));
  const envelope = (await res.json().catch(() => ({}))) as { success?: boolean; data?: WalletEnvelope };
  if (!envelope?.success || !envelope.data) {
    throw new EncryptPreflightError('WALLET_LOOKUP_FAILED', `Proxy did not return wallet data for ${owner}`);
  }
  return envelope.data;
}

function requirePolicyRefs(wallet: WalletEnvelope): PolicyRefs {
  const ciphertexts = wallet.confidentialPolicy?.encryptCiphertexts;
  if (!ciphertexts?.maxPerRun || !ciphertexts.dailyCap || !ciphertexts.dailySpent) {
    throw new EncryptPreflightError(
      'POLICY_NOT_ENCRYPT',
      'Wallet confidential policy is not backed by Official Encrypt; Encrypt preflight cannot run.'
    );
  }
  if (!wallet.walletPda) throw new EncryptPreflightError('WALLET_PDA_MISSING', 'wallet.walletPda missing from proxy response');
  return {
    wallet: wallet.walletPda,
    maxPerRun: ciphertexts.maxPerRun,
    dailyCap: ciphertexts.dailyCap,
    dailySpent: ciphertexts.dailySpent,
    config: ciphertexts.config,
    deposit: ciphertexts.deposit,
    networkEncryptionKey: ciphertexts.networkEncryptionKey,
    eventAuthority: ciphertexts.eventAuthority,
    policySeq: wallet.policySeq ?? 0,
    lastRevokedSlot: wallet.lastRevokedSlot ?? 0,
  };
}

async function postJson<T>(path: string, body: unknown, baseUrl: string, fetchImpl: typeof fetch): Promise<T> {
  const res = await fetchImpl(new URL(path, baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

function parsePoletTransaction(base64: string): Transaction | VersionedTransaction {
  const buffer = Buffer.from(base64, 'base64');
  try {
    return VersionedTransaction.deserialize(buffer);
  } catch {
    return Transaction.from(buffer);
  }
}

async function signAndSend(
  tx: Transaction | VersionedTransaction,
  signers: Signer[],
  connection: Connection
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  if (tx instanceof VersionedTransaction) {
    tx.sign(signers);
  } else {
    tx.recentBlockhash = blockhash;
    tx.feePayer = tx.feePayer ?? signers[0]!.publicKey;
    tx.partialSign(...signers);
  }
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

function parseUsdcBaseUnits(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new EncryptPreflightError('INVALID_AMOUNT', `${label} must be a USDC amount with up to 6 decimals.`);
  }
  const [whole, fraction = ''] = trimmed.split('.');
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(Number(USDC_DECIMALS), '0'));
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function assertRequired(options: EncryptPreflightOptions): void {
  for (const field of ['baseUrl', 'owner', 'sessionKey', 'agentSigner', 'amountUsdc'] as const) {
    if (options[field] === undefined || options[field] === null) {
      throw new EncryptPreflightError('INVALID_OPTIONS', `${field} is required`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
