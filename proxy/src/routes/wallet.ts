import { Hono } from 'hono';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  ENCRYPT_PREALPHA_GRPC_URL,
  ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
  buildApproveIkaMessageWithVerifiedEncryptSessionTransaction,
  buildConfidentialTransferSessionTransaction,
  buildConfidentialUsdcTransferSessionTransaction,
  buildCreateEncryptDepositTransaction,
  buildExecuteEncryptPolicyGraphSessionTransaction,
  buildRequestPolicyValueDecryptionTransaction,
  buildSetOfficialEncryptCiphertextPolicyTransaction,
  deriveEncryptConfigPda,
  deriveEncryptCpiAuthority,
  deriveEncryptDepositPda,
  deriveEncryptEventAuthorityPda,
  getConnection,
} from '../lib/transaction-builder';
import idl from '../lib/idl.json' with { type: "json" };
import { buildPolicyTree } from '../lib/merkle-tree';
import { getWalletData } from '../lib/wallet-store';
import { PROGRAM_ID, deriveWalletPda } from '../lib/program-identity';
import { buildConfidentialNumericPolicySetup, evaluateConfidentialNumericPolicy } from '../lib/confidential-numeric-policy';
import { readBoolDecryptionRequest, readCiphertextStatus, readEncryptInfraStatus } from '../lib/encrypt-ciphertext-poller';
import {
  hasPendingOfficialEncryptPolicyOutputs,
  resolveOfficialEncryptDecisionFromAllowedOutput,
} from '../lib/official-encrypt-policy';
import { toJsonSafe } from '../lib/json-safe';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import borsh from 'borsh';

// Borsh schema for Policy struct (must match Rust contract's Policy)
// Vec<Pubkey> is serialized as: u32 count + [32-byte pubkey x count]
class PolicyBorsh {
  constructor(public allowlist: Uint8Array[], public blocklist: Uint8Array[]) {}
}

const POLICY_SCHEMA = new Map([
  [PolicyBorsh, {
    kind: 'struct',
    fields: [
      ['allowlist', [['u8', 32]]],  // Vec<Pubkey> as array of 32-byte arrays
      ['blocklist', [['u8', 32]]],
    ],
  }],
]);

function serializePolicy(policy: { allowlist: string[], blocklist: string[] }): Buffer {
  const obj = new PolicyBorsh(
    policy.allowlist.map(addr => new PublicKey(addr).toBuffer()),
    policy.blocklist.map(addr => new PublicKey(addr).toBuffer())
  );
  return Buffer.from(borsh.serialize(POLICY_SCHEMA, obj));
}

export const walletRouter = new Hono();

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SYSTEM_PROGRAM_ID = anchor.web3.SystemProgram.programId;
const JUPITER_USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const JUPITER_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const ZERO_PUBLIC_KEY_STRING = '11111111111111111111111111111111';
const USDC_DECIMALS = 6;
const SOL_DECIMALS = 9;
const MIN_NATIVE_SOL_RESERVE_LAMPORTS = 50_000_000n;
const U64_MAX = (1n << 64n) - 1n;
const SET_SOL_TRANSFER_CONFIDENTIAL_POLICY_DISCRIMINATOR = Buffer.from([159, 154, 233, 179, 11, 108, 102, 73]);
const SET_USDC_DCA_CONFIDENTIAL_POLICY_DISCRIMINATOR = Buffer.from([255, 165, 43, 36, 44, 66, 112, 57]);

walletRouter.get('/encrypt-ciphertext/:ciphertext', async (c) => {
  try {
    const ciphertext = parsePublicKey(c.req.param('ciphertext'), 'ciphertext');
    const encryptProgram = new PublicKey(c.req.query('encryptProgram') ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING);
    const status = await readCiphertextStatus(getConnection(), ciphertext);
    if (!status.exists || status.owner !== encryptProgram.toString()) {
      return c.json({
        success: false,
        error: `Ciphertext ${ciphertext.toString()} is not a valid official Encrypt ciphertext account`,
      }, 404);
    }
    return c.json({ success: true, data: status });
  } catch (error) {
    console.error('Read Encrypt ciphertext status error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to read Encrypt ciphertext status' }, 500);
  }
});

function getProgram(): anchor.Program {
  const connection = getConnection();
  const dummyWallet = {
    publicKey: anchor.web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new anchor.AnchorProvider(connection, dummyWallet as unknown as anchor.Wallet, { commitment: 'confirmed' });
  return new anchor.Program(idl as anchor.Idl, provider);
}

function deriveAta(owner: PublicKey, mint: PublicKey, tokenProgram = TOKEN_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function createAtaInstruction(payer: PublicKey, ata: PublicKey, owner: PublicKey, mint: PublicKey, tokenProgram = TOKEN_PROGRAM_ID) {
  return new anchor.web3.TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });
}

function createTransferCheckedInstruction(
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  amount: bigint,
  decimals: number,
  tokenProgram = TOKEN_PROGRAM_ID
) {
  const data = Buffer.alloc(10);
  data[0] = 12;
  data.writeBigUInt64LE(amount, 1);
  data[9] = decimals;
  return new anchor.web3.TransactionInstruction({
    programId: tokenProgram,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function parsePositiveAmount(value: unknown, decimals: number, label: string): bigint {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${label} must be a positive amount`);
  }
  const raw = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`${label} must be a positive amount`);
  const [whole, fraction = ''] = raw.split('.');
  if (fraction.length > decimals) throw new Error(`${label} supports at most ${decimals} decimals`);
  const baseUnits = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals));
  if (baseUnits <= 0n) throw new Error(`${label} must be positive`);
  if (baseUnits > U64_MAX) throw new Error(`${label} exceeds u64 transfer limit`);
  return baseUnits;
}

function readTokenAmount(data: Buffer | Uint8Array | undefined): bigint {
  if (!data || data.length < 72) return 0n;
  return Buffer.from(data).readBigUInt64LE(64);
}

function formatBaseUnits(amount: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function serializeUnsigned(ownerPubkey: PublicKey, tx: Transaction) {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = ownerPubkey;
  return tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  }).toString('base64');
}

function buildSetScopedConfidentialPolicyData(
  discriminator: Buffer,
  policySetup: ReturnType<typeof buildConfidentialNumericPolicySetup>
) {
  const data = Buffer.alloc(8 + 32 + 32 + 8 + 8 + 8 + 8);
  let offset = 0;
  discriminator.copy(data, offset);
  offset += 8;
  Buffer.from(policySetup.policyCommitment).copy(data, offset);
  offset += 32;
  Buffer.from(policySetup.encryptionWitnessHash).copy(data, offset);
  offset += 32;
  data.writeBigUInt64LE(policySetup.encryptedMaxPerRun, offset);
  offset += 8;
  data.writeBigUInt64LE(policySetup.encryptedDailyCap, offset);
  offset += 8;
  data.writeBigUInt64LE(policySetup.encryptedDailySpent, offset);
  offset += 8;
  data.writeBigInt64LE(BigInt(policySetup.spentDayIndex), offset);
  return data;
}

function parsePublicKey(value: unknown, label: string): PublicKey {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a Solana public key`);
  }
  try {
    return new PublicKey(value.trim());
  } catch {
    throw new Error(`${label} must be a valid Solana public key`);
  }
}

walletRouter.get('/status', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'wallet-router-ready',
      programId: PROGRAM_ID.toString(),
    },
  });
});

/**
 * POST /wallet/initialize
 * Creates a new proxy key, saves it encrypted, and returns an unsigned initialization transaction.
 */
walletRouter.post('/initialize', async (c) => {
  try {
    const { owner } = await c.req.json();
    if (!owner) {
      return c.json({ success: false, error: 'Owner public key is required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);

    const program = getProgram();

    // Construct initialize instruction. Polet does not generate a proxy
    // keypair server-side anymore (BYO model — proxy is stateless re: secrets).
    // `wallet.proxy_pk` stays at `Pubkey::default()` on-chain; it is not
    // enforced anywhere on-chain today. If ever needed, expose a separate
    // /wallet/set-proxy-key endpoint that accepts an owner-provided pubkey.
    const ix = await program.methods.initialize()
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction().add(ix);
    tx.recentBlockhash = blockhash;
    tx.feePayer = ownerPubkey;

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return c.json({
      success: true,
      data: {
        transaction: serialized.toString('base64'),
        wallet: walletPda.toString(),
      }
    });
  } catch (error) {
    console.error('Wallet initialization error:', error);
    return c.json({ success: false, error: 'Failed to build initialization transaction' }, 500);
  }
});

/**
 * POST /wallet/create-encrypt-deposit
 * Builds an unsigned transaction to create an Encrypt deposit PDA for the wallet owner.
 * The deposit PDA is derived from ["encrypt_deposit", owner_pubkey].
 * Required before any official Encrypt CPI can succeed.
 */
walletRouter.post('/create-encrypt-deposit', async (c) => {
  try {
    const { owner, feePayerOwner } = await c.req.json();
    if (!owner) {
      return c.json({ success: false, error: 'Owner public key is required' }, 400);
    }

    const ownerPubkey = parsePublicKey(owner, 'owner');
    const feePayerPubkey = feePayerOwner ? parsePublicKey(feePayerOwner, 'feePayerOwner') : null;
    const [depositPda] = deriveEncryptDepositPda(ownerPubkey.toString());
    const encryptProgram = new PublicKey(ENCRYPT_PREALPHA_PROGRAM_ID_STRING);
    const connection = getConnection();
    const depositInfo = await connection.getAccountInfo(depositPda);

    if (depositInfo) {
      const [configPda] = deriveEncryptConfigPda(ENCRYPT_PREALPHA_PROGRAM_ID_STRING);
      const [eventAuthority] = deriveEncryptEventAuthorityPda(ENCRYPT_PREALPHA_PROGRAM_ID_STRING);
      return c.json({
        success: true,
        data: {
          transaction: null,
          signers: [],
          deposit: depositPda.toString(),
          config: configPda.toString(),
          eventAuthority: eventAuthority.toString(),
          status: 'existing-deposit',
        },
      });
    }

    // BYO-wallet model: a separate session fee-payer is allowed, but the
    // proxy never holds the session private key. Caller must sign the
    // returned transaction with the session keypair they manage externally.
    if (feePayerPubkey && ownerPubkey.toString() !== feePayerPubkey.toString()) {
      // Nothing to do server-side — the unsigned tx built below names
      // `feePayerPubkey` as an additional required signer. Caller is
      // responsible for client-side signing with that keypair.
    }

    const infraStatus = await readEncryptInfraStatus(connection, ownerPubkey, encryptProgram);
    const nonDepositBlockers = infraStatus.blockers.filter(
      (blocker) =>
        blocker !== 'encrypt-deposit-missing'
        && blocker !== 'encrypt-event-authority-missing'
        && blocker !== 'encrypt-config-enc-mint-unconfigured'
    );
    if (nonDepositBlockers.length > 0) {
      return c.json({
        success: true,
        data: {
          transaction: null,
          signers: [],
          deposit: depositPda.toString(),
          config: infraStatus.config.address,
          eventAuthority: infraStatus.eventAuthority.address,
          status: 'encrypt-infra-blocked',
          blockers: nonDepositBlockers,
        },
      });
    }

    const result = await buildCreateEncryptDepositTransaction(
      ownerPubkey.toString(),
      ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
      feePayerPubkey && ownerPubkey.toString() !== feePayerPubkey.toString()
        ? { feePayer: feePayerPubkey.toString() }
        : {}
    );

    return c.json({
      success: true,
      data: {
        transaction: result.transaction,
        signers: result.signers,
        deposit: result.deposit,
        config: result.config,
        eventAuthority: result.eventAuthority,
        status: 'pending-deposit-creation',
      },
    });
  } catch (error) {
    console.error('Create Encrypt deposit error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build Encrypt deposit creation transaction' }, 500);
  }
});

/**
 * POST /wallet/legacy/set-policy
 * Legacy public allowlist/blocklist policy setup retained as prior foundation.
 * Current confidential setup uses POST /wallet/set-confidential-policy.
 */
walletRouter.post('/legacy/set-policy', async (c) => {
  try {
    const { owner, policy } = await c.req.json();
    if (!owner || !policy) {
      return c.json({ success: false, error: 'Owner and policy are required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);

    const program = getProgram();
    // Use Borsh serialization (matching Rust contract's Policy struct)
    const policyData = serializePolicy(policy);
    
    // Hash policy for set_policy metadata
    const policyHash = Array.from(crypto.createHash('sha256').update(policyData).digest());
    
    // Build Merkle Tree
    const tree = buildPolicyTree(policy);
    
    // Save tree locally
    const treeDir = path.join(process.cwd(), 'keys', ownerPubkey.toString());
    if (!fs.existsSync(treeDir)) {
      fs.mkdirSync(treeDir, { recursive: true });
    }
    fs.writeFileSync(path.join(treeDir, 'tree.json'), JSON.stringify({
      root: tree.root,
      leaves: tree.leaves.map(l => l.toString('hex')),
      layers: tree.layers.map(layer => layer.map(n => n.toString('hex')))
    }, null, 2));
    
    // Instruction 1: setPolicy (only policy_hash)
    const ixPolicy = await program.methods.setPolicy(policyHash)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    // Instruction 2: setPolicyData (policy data blob)
    const ixPolicyData = await program.methods.setPolicyData(Buffer.from(policyData))
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    // Instruction 3: setMerkleRoot
    const ixMerkle = await program.methods.setMerkleRoot(tree.root)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction().add(ixPolicy).add(ixPolicyData).add(ixMerkle);
    tx.recentBlockhash = blockhash;
    tx.feePayer = ownerPubkey;

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return c.json({
      success: true,
      data: {
        transaction: serialized.toString('base64'),
      }
    });
  } catch (error) {
    console.error('Set policy error:', error);
    return c.json({ success: false, error: 'Failed to build set policy transaction' }, 500);
  }
});

/**
 * POST /wallet/grant-key
 * Grants a new temporal session key to an agent.
 */
walletRouter.post('/grant-key', async (c) => {
  try {
    const { owner, sessionKey, expiresAt, dailyLimit } = await c.req.json();
    if (!owner || !sessionKey || expiresAt === undefined || dailyLimit === undefined) {
      return c.json({ success: false, error: 'Missing required parameters' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const sessionPubkey = new PublicKey(sessionKey);
    const walletPda = deriveWalletPda(ownerPubkey);

    const program = getProgram();
    
    const ix = await program.methods.grantTemporalKey(
      sessionPubkey,
      new anchor.BN(expiresAt)
    )
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction().add(ix);
    tx.recentBlockhash = blockhash;
    tx.feePayer = ownerPubkey;

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return c.json({
      success: true,
      data: {
        transaction: serialized.toString('base64'),
      }
    });
  } catch (error) {
    console.error('Grant key error:', error);
    return c.json({ success: false, error: 'Failed to build grant key transaction' }, 500);
  }
});

/**
 * POST /wallet/set-confidential-policy
 * Builds an owner-signed transaction that stores masked numeric policy values on-chain.
 */
walletRouter.post('/set-confidential-policy', async (c) => {
  try {
    const {
      owner,
      maxPerRunUsdc,
      dailyCapUsdc,
      maxPerRunBaseUnits,
      dailyCapBaseUnits,
      maskedWitnessDevFixture,
      policyScope,
    } = await c.req.json();
    if (
      !owner
      || (maxPerRunUsdc === undefined && maxPerRunBaseUnits === undefined)
      || (dailyCapUsdc === undefined && dailyCapBaseUnits === undefined)
    ) {
      return c.json({ success: false, error: 'owner and policy amounts are required' }, 400);
    }
    if (!Array.isArray(maskedWitnessDevFixture) || maskedWitnessDevFixture.length !== 32) {
      return c.json({ success: false, error: 'maskedWitnessDevFixture must contain 32 bytes' }, 400);
    }
    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);
    const policySetup = buildConfidentialNumericPolicySetup({
      maxPerRunUsdc,
      dailyCapUsdc,
      maxPerRunBaseUnits,
      dailyCapBaseUnits,
      maskedWitnessDevFixture,
    });

    const scope = policyScope === 'sol-transfer' ? 'sol-transfer' : 'usdc-dca';
    const discriminator = scope === 'sol-transfer'
      ? SET_SOL_TRANSFER_CONFIDENTIAL_POLICY_DISCRIMINATOR
      : SET_USDC_DCA_CONFIDENTIAL_POLICY_DISCRIMINATOR;
    const ix = new anchor.web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: walletPda, isSigner: false, isWritable: true },
        { pubkey: ownerPubkey, isSigner: true, isWritable: false },
      ],
      data: buildSetScopedConfidentialPolicyData(discriminator, policySetup),
    });

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        policyCommitment: policySetup.policyCommitment,
        encryptionWitnessHash: policySetup.encryptionWitnessHash,
        policyScope: scope,
      },
    });
  } catch (error) {
    console.error('Set confidential policy error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build confidential policy transaction' }, 500);
  }
});

/**
 * POST /wallet/execute-confidential-transfer
 * Builds owner/session-signed native SOL transfer from smart wallet PDA.
 * Proxy pre-checks same masked numeric policy; contract enforces again on submit.
 */
walletRouter.post('/execute-confidential-transfer', async (c) => {
  try {
    const body = await c.req.json();
    const ownerPubkey = parsePublicKey(body.owner, 'owner');
    const sessionPubkey = parsePublicKey(body.sessionKey, 'sessionKey');
    const destination = parsePublicKey(body.destination, 'destination');
    const amount = body.amountLamports === undefined
      ? parsePositiveAmount(body.amount, SOL_DECIMALS, 'SOL amount')
      : parsePositiveAmount(body.amountLamports, 0, 'SOL lamports');
    const walletPda = deriveWalletPda(ownerPubkey);
    const walletData = await getWalletData(ownerPubkey.toString());

    if (!walletData) {
      return c.json({ success: false, error: 'Wallet not found' }, 404);
    }
    if (!walletData.solTransferPolicy.enabled) {
      return c.json({ success: false, error: 'SOL transfer policy not configured' }, 400);
    }

    const witness = Array(32).fill(0);
    witness[0] = 42;
    const decision = evaluateConfidentialNumericPolicy(
      { confidentialPolicy: walletData.solTransferPolicy },
      amount,
      witness,
      undefined,
      {
      blockedReason: 'Transfer amount exceeds confidential spending cap.',
      }
    );
    if (!decision.allowed) {
      return c.json({
        success: true,
        data: {
          allowed: false,
          code: decision.code,
          reason: decision.reason,
          amountLamports: amount.toString(),
          amountUi: formatBaseUnits(amount, SOL_DECIMALS),
        },
      });
    }

    // BYO-wallet model: the proxy never holds the session private key.
    // When session != owner, caller must sign the returned transaction
    // with the session keypair they manage externally. The transaction
    // builder names `sessionPubkey` as a required signer so it can't land
    // on-chain without that signature.
    //
    // feePayer defaults to `sessionPubkey` (set inside the builder) so the
    // agent wallet funds its own gas. When session == owner (demo mode)
    // this collapses to owner paying — same effect as before.
    const connection = getConnection();
    const slot = Math.max(await connection.getSlot(), Number(walletData.lastRevokedSlot) + 1);
    const built = await buildConfidentialTransferSessionTransaction(
      {
        wallet: walletPda.toString(),
        sessionKey: sessionPubkey.toString(),
        destination: destination.toString(),
        amount,
        attestationSlot: slot,
        attestationPolicySeq: walletData.policySeq,
        maskedWitnessDevFixture: witness,
      },
      PROGRAM_ID.toString(),
      {}
    );

    return c.json({
      success: true,
      data: {
        allowed: true,
        ...built,
        wallet: walletPda.toString(),
        destination: destination.toString(),
        amountLamports: amount.toString(),
        amountUi: formatBaseUnits(amount, SOL_DECIMALS),
        policySeq: walletData.policySeq,
        attestationSlot: slot,
        boundary: 'session-signed-confidential-native-sol-transfer',
      },
    });
  } catch (error) {
    console.error('Execute confidential transfer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build confidential transfer';
    const status = message.includes('must be') || message.includes('supports at most') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});

/**
 * POST /wallet/execute-confidential-usdc-transfer
 * Builds a session-signed, FHE-gated USDC SPL transfer from PDA custody to an arbitrary
 * destination wallet. Consumes the wallet's pending allowed-output FHE ciphertext on-chain.
 */
walletRouter.post('/execute-confidential-usdc-transfer', async (c) => {
  try {
    const body = await c.req.json();
    const ownerPubkey = parsePublicKey(body.owner, 'owner');
    const sessionPubkey = parsePublicKey(body.sessionKey, 'sessionKey');
    const destinationOwner = parsePublicKey(body.destination, 'destination');
    const allowedDecryptionRequest = parsePublicKey(
      body.allowedDecryptionRequest,
      'allowedDecryptionRequest'
    );
    const amount = body.amountBaseUnits === undefined
      ? parsePositiveAmount(body.amount, USDC_DECIMALS, 'USDC amount')
      : parsePositiveAmount(body.amountBaseUnits, 0, 'USDC base units');
    const walletPda = deriveWalletPda(ownerPubkey);
    const walletData = await getWalletData(ownerPubkey.toString());
    if (!walletData) {
      return c.json({ success: false, error: 'Wallet not found' }, 404);
    }
    if (!walletData.demoCustody?.configured) {
      return c.json({ success: false, error: 'USDC custody is not registered' }, 400);
    }
    if (!walletData.usdcDcaPolicy?.enabled) {
      return c.json({ success: false, error: 'USDC DCA confidential policy not configured' }, 400);
    }
    if (!walletData.usdcDcaPolicy?.encryptCiphertexts?.configured) {
      return c.json({
        success: false,
        error: 'Full FHE USDC policy ciphertexts are not registered on-chain',
      }, 400);
    }
    if (!hasPendingOfficialEncryptPolicyOutputs(walletData)) {
      return c.json({
        success: false,
        code: 'ENCRYPT_POLICY_NOT_PENDING',
        error:
          'No pending FHE graph output for this wallet. Run executeEncryptPolicyGraph first so the allowed-output ciphertext is queued for the contract to consume.',
      }, 409);
    }

    const state = walletData.usdcDcaPolicy.encryptCiphertexts!;
    const expectedPolicySeq = Number(state.pendingPolicySeq);
    if (expectedPolicySeq !== walletData.policySeq) {
      return c.json({
        success: false,
        code: 'ENCRYPT_POLICY_STALE',
        error: 'Pending FHE state belongs to a different policy sequence; re-run the graph.',
      }, 409);
    }

    // Pre-check that the pending allowed-output ciphertext is Encrypt-verified so the contract
    // does not fail with EncryptPolicyPending. This is defence-in-depth; the contract is the
    // final authority.
    const encryptProgram = body.encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING;
    const connection = getConnection();
    const [ciphertextStatus, requestInfo, slot] = await Promise.all([
      readCiphertextStatus(connection, parsePublicKey(state.pendingAllowedOutput, 'pendingAllowedOutput')),
      readBoolDecryptionRequest(connection, allowedDecryptionRequest),
      connection.getSlot(),
    ]);
    if (!ciphertextStatus.exists || ciphertextStatus.owner !== encryptProgram) {
      return c.json({
        success: false,
        code: 'ENCRYPT_CIPHERTEXT_INVALID',
        error: `Pending allowed-output ${state.pendingAllowedOutput} is not a valid Encrypt ciphertext account`,
      }, 409);
    }
    if (ciphertextStatus.status !== 'verified') {
      return c.json({
        success: false,
        code: 'ENCRYPT_CIPHERTEXT_PENDING',
        error: 'Allowed-output ciphertext is not yet Encrypt-verified.',
      }, 409);
    }
    if (!requestInfo.exists || requestInfo.status === 'invalid' || requestInfo.ciphertext !== state.pendingAllowedOutput) {
      return c.json({
        success: false,
        code: 'ENCRYPT_REQUEST_INVALID',
        error: 'Allowed-output decryption request is invalid or does not match the pending ciphertext.',
      }, 409);
    }
    if (requestInfo.status === 'pending') {
      return c.json({
        success: false,
        code: 'ENCRYPT_REQUEST_PENDING',
        error: 'Allowed-output decryption request is still pending; retry after it resolves.',
      }, 409);
    }
    if (requestInfo.boolValue !== true) {
      return c.json({
        success: false,
        code: 'ENCRYPT_VERIFIED_BLOCKED',
        error: 'FHE policy graph evaluated this run as blocked.',
      }, 409);
    }

    const attestationSlot = Math.max(slot, Number(walletData.lastRevokedSlot) + 1);
    const usdcMint = parsePublicKey(walletData.demoCustody.usdcMint, 'demoCustody.usdcMint');
    const destinationUsdcAta = deriveAta(destinationOwner, usdcMint);

    // If the destination USDC ATA doesn't exist yet on devnet, prepend an idempotent
    // create-ATA instruction so the recipient doesn't have to pre-create it. This is a
    // no-op if the ATA already exists.
    const preInstructions: anchor.web3.TransactionInstruction[] = [];
    const destinationAtaInfo = await connection.getAccountInfo(destinationUsdcAta);
    if (!destinationAtaInfo) {
      preInstructions.push(new anchor.web3.TransactionInstruction({
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: ownerPubkey, isSigner: true, isWritable: true },
          { pubkey: destinationUsdcAta, isSigner: false, isWritable: true },
          { pubkey: destinationOwner, isSigner: false, isWritable: false },
          { pubkey: usdcMint, isSigner: false, isWritable: false },
          { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]), // 1 = CreateIdempotent
      }));
    }

    // BYO-wallet model: proxy never holds the session private key. When
    // session != owner, caller signs the returned unsigned tx with their
    // own session keypair. feePayer defaults to sessionPubkey so the
    // agent wallet funds its own gas from its pre-topped-up balance.

    const built = await buildConfidentialUsdcTransferSessionTransaction(
      {
        wallet: walletPda.toString(),
        sessionKey: sessionPubkey.toString(),
        usdcCustodyAccount: walletData.demoCustody.usdcTokenAccount,
        destinationUsdcAccount: destinationUsdcAta.toString(),
        usdcMint: usdcMint.toString(),
        tokenProgram: walletData.demoCustody.tokenProgram ?? TOKEN_PROGRAM_ID.toString(),
        allowedOutputCiphertext: state.pendingAllowedOutput,
        dailySpentOutputCiphertext: state.pendingDailySpentOutput,
        allowedDecryptionRequest: allowedDecryptionRequest.toString(),
        amount,
        attestationSlot,
        attestationPolicySeq: walletData.policySeq,
      },
      PROGRAM_ID.toString(),
      { preInstructions }
    );

    return c.json({
      success: true,
      data: {
        allowed: true,
        ...built,
        wallet: walletPda.toString(),
        destination: destinationOwner.toString(),
        destinationUsdcAccount: destinationUsdcAta.toString(),
        amountBaseUnits: amount.toString(),
        amountUi: formatBaseUnits(amount, USDC_DECIMALS),
        policySeq: walletData.policySeq,
        attestationSlot,
        boundary: 'session-signed-fhe-verified-usdc-transfer',
      },
    });
  } catch (error) {
    console.error('Execute confidential USDC transfer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build confidential USDC transfer';
    const status = message.includes('must be') || message.includes('supports at most') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});

/**
 * POST /wallet/set-official-encrypt-ciphertext-policy
 * Builds the owner/payer-signed policy registration tx for official Encrypt ciphertext accounts.
 */
walletRouter.post('/set-official-encrypt-ciphertext-policy', async (c) => {
  try {
    const {
      wallet,
      owner,
      maxPerRunCiphertext,
      dailyCapCiphertext,
      dailySpentCiphertext,
      policyCommitment,
      encrypt,
    } = await c.req.json();
    const transaction = await buildSetOfficialEncryptCiphertextPolicyTransaction({
      wallet: wallet || deriveWalletPda(parsePublicKey(owner, 'owner')).toString(),
      owner,
      maxPerRunCiphertext,
      dailyCapCiphertext,
      dailySpentCiphertext,
      policyCommitment,
      encrypt: {
        encryptProgram: encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
        config: encrypt?.config,
        deposit: encrypt?.deposit,
        networkEncryptionKey: encrypt?.networkEncryptionKey,
        eventAuthority: encrypt?.eventAuthority,
        payer: encrypt?.payer ?? owner,
      },
    });

    return c.json({
      success: true,
      data: {
        ...transaction,
        wallet: wallet || deriveWalletPda(parsePublicKey(owner, 'owner')).toString(),
        encryptProgram: encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
        grpcEndpoint: ENCRYPT_PREALPHA_GRPC_URL,
        ciphertexts: {
          maxPerRun: maxPerRunCiphertext,
          dailyCap: dailyCapCiphertext,
          dailySpent: dailySpentCiphertext,
        },
        graph: 'polet_policy_guardrail_graph',
        boundary: 'unsigned-official-encrypt-policy-registration',
      },
    });
  } catch (error) {
    console.error('Set official Encrypt ciphertext policy error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build official Encrypt policy transaction' }, 500);
  }
});

/**
 * POST /wallet/execute-encrypt-policy-graph
 * Builds the session/payer-signed tx that submits Polet's official Encrypt graph.
 */
walletRouter.post('/execute-encrypt-policy-graph', async (c) => {
  try {
    const {
      owner,
      wallet,
      sessionKey,
      sourceAmountCiphertext,
      maxPerRunCiphertext,
      dailySpentCiphertext,
      dailyCapCiphertext,
      allowedOutputCiphertext,
      dailySpentOutputCiphertext,
      attestationSlot,
      attestationPolicySeq,
      encrypt,
    } = await c.req.json();
    const encryptProgram = new PublicKey(encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING);
    const graphPayer = parsePublicKey(encrypt?.payer ?? sessionKey, 'encrypt.payer');
    const ownerPubkey = owner ? parsePublicKey(owner, 'owner') : null;
    const sessionPubkey = parsePublicKey(sessionKey, 'sessionKey');
    // BYO-wallet model: proxy never holds the session private key. When
    // session != owner, caller signs the returned tx externally.
    const connection = getConnection();
    const infraStatus = await readEncryptInfraStatus(connection, graphPayer, encryptProgram);
    if (!infraStatus.readyForGraphCpi) {
      return c.json({
        success: false,
        code: 'ENCRYPT_INFRA_BLOCKED',
        error:
          `Official Encrypt devnet infrastructure is not ready for graph execution: ${infraStatus.blockers.join(', ')}. ` +
          `Deposit ${infraStatus.deposit.address}: lamports=${infraStatus.deposit.lamports}, ENC field=${infraStatus.deposit.encBalance}, gas field=${infraStatus.deposit.gasBalance}.`,
        data: {
          status: 'encrypt-infra-blocked',
          infraStatus,
          suppressedUntilVerified: ['jupiterExecutionPayload', 'dwallet', 'messageApproval', 'destinationDigest', 'poletApprovalTransaction'],
        },
      }, 409);
    }
    const transaction = await buildExecuteEncryptPolicyGraphSessionTransaction(
      {
        wallet,
        sessionKey,
        sourceAmountCiphertext,
        maxPerRunCiphertext,
        dailySpentCiphertext,
        dailyCapCiphertext,
        allowedOutputCiphertext,
        dailySpentOutputCiphertext,
        attestationSlot,
        attestationPolicySeq,
        encrypt: {
          encryptProgram: encryptProgram.toString(),
          config: encrypt?.config,
          deposit: encrypt?.deposit,
          networkEncryptionKey: encrypt?.networkEncryptionKey,
          eventAuthority: encrypt?.eventAuthority,
          payer: encrypt?.payer ?? sessionKey,
        },
      },
      undefined,
      // BYO-wallet model: agent (session) wallet pays gas from its own
      // pre-funded balance. When session == owner (demo), collapses to
      // owner paying — same effect.
      {}
    );

    return c.json({
      success: true,
      data: {
        ...transaction,
        status: 'pending-encrypt-execution',
        encryptProgram: encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
        grpcEndpoint: ENCRYPT_PREALPHA_GRPC_URL,
        graph: 'polet_policy_guardrail_graph',
        inputCiphertexts: {
          sourceAmount: sourceAmountCiphertext,
          maxPerRun: maxPerRunCiphertext,
          dailySpent: dailySpentCiphertext,
          dailyCap: dailyCapCiphertext,
        },
        pendingOutputCiphertexts: {
          allowedOutput: allowedOutputCiphertext,
          dailySpentOutput: dailySpentOutputCiphertext,
        },
        suppressedUntilVerified: ['jupiterExecutionPayload', 'dwallet', 'messageApproval', 'destinationDigest', 'poletApprovalTransaction'],
      },
    });
  } catch (error) {
    console.error('Execute official Encrypt policy graph error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build official Encrypt graph transaction' }, 500);
  }
});

/**
 * POST /wallet/request-policy-value-decryption
 * Builds an owner/payer/request-signed tx that asks Encrypt to decrypt one configured policy ciphertext.
 */
walletRouter.post('/request-policy-value-decryption', async (c) => {
  try {
    const {
      wallet,
      owner,
      request,
      kind,
      ciphertext,
      encrypt,
    } = await c.req.json();
    const ciphertextPubkey = parsePublicKey(ciphertext, 'ciphertext');
    const encryptProgram = encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING;
    const connection = getConnection();
    const ciphertextStatus = await readCiphertextStatus(connection, ciphertextPubkey);
    if (
      !ciphertextStatus.exists
      || ciphertextStatus.owner !== encryptProgram
      || ciphertextStatus.dataLength < 100
    ) {
      throw new Error(`Policy ciphertext ${ciphertextPubkey.toString()} is not a valid official Encrypt ciphertext account`);
    }
    const [encryptCpiAuthority] = deriveEncryptCpiAuthority();
    if (ciphertextStatus.authorized === encryptCpiAuthority.toString()) {
      throw new Error(
        `Policy ciphertext ${ciphertextPubkey.toString()} is authorized to the Encrypt CPI authority ${encryptCpiAuthority.toString()}, but Encrypt decryption requests expect the caller program ${PROGRAM_ID.toString()}. Re-save the official Encrypt policy so new ciphertexts are authorized to the Polet program ID.`
      );
    }
    if (
      ciphertextStatus.authorized !== PROGRAM_ID.toString()
      && ciphertextStatus.authorized !== ZERO_PUBLIC_KEY_STRING
    ) {
      throw new Error(
        `Policy ciphertext ${ciphertextPubkey.toString()} is authorized to ${ciphertextStatus.authorized}, not current Polet program ${PROGRAM_ID.toString()}. Re-save the official Encrypt policy so new ciphertexts are authorized to the Polet program ID.`
      );
    }
    const transaction = await buildRequestPolicyValueDecryptionTransaction({
      wallet: wallet || deriveWalletPda(parsePublicKey(owner, 'owner')).toString(),
      authority: owner,
      request,
      kind,
      ciphertext: ciphertextPubkey.toString(),
      encrypt: {
        encryptProgram,
        config: encrypt?.config,
        deposit: encrypt?.deposit,
        networkEncryptionKey: encrypt?.networkEncryptionKey,
        eventAuthority: encrypt?.eventAuthority,
        payer: encrypt?.payer ?? owner,
      },
    });

    return c.json({
      success: true,
      data: {
        ...transaction,
        wallet: wallet || deriveWalletPda(parsePublicKey(owner, 'owner')).toString(),
        request,
        kind,
        ciphertext: ciphertextPubkey.toString(),
        status: 'policy-reveal-requested',
        encryptProgram,
        grpcEndpoint: ENCRYPT_PREALPHA_GRPC_URL,
        boundary: 'owner-signed-public-decryption-request',
        warning: 'Encrypt pre-alpha decryption request accounts may expose plaintext publicly after the decryptor responds.',
      },
    });
  } catch (error) {
    console.error('Request policy value decryption error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build policy reveal transaction' }, 500);
  }
});

/**
 * POST /wallet/request-pending-allowed-output-decryption
 * Builds an owner/payer/request-signed tx that asks Encrypt to decrypt the
 * current pending allowed-output bool for the wallet graph.
 */
walletRouter.post('/request-pending-allowed-output-decryption', async (c) => {
  try {
    const { owner, sessionKey, request, wallet, encrypt, authority: authorityArg } = await c.req.json();
    const ownerPubkey = parsePublicKey(owner, 'owner');
    const walletData = await getWalletData(ownerPubkey.toString());
    if (!walletData) throw new Error('Wallet not found');
    if (wallet && wallet !== walletData.walletPda) {
      throw new Error('wallet does not match owner PDA');
    }
    if (!hasPendingOfficialEncryptPolicyOutputs(walletData)) {
      throw new Error('Official Encrypt policy graph has no pending allowed-output ciphertext for this wallet');
    }

    // BYO-friendly: authority can be owner OR an active session pubkey.
    // Default picks sessionKey when supplied (BYO agent flow), falling
    // back to owner. Contract validates via `require_owner_or_active_session`.
    const sessionPubkey = sessionKey ? parsePublicKey(sessionKey, 'sessionKey') : null;
    const authority = authorityArg
      ? parsePublicKey(authorityArg, 'authority').toString()
      : (sessionPubkey?.toString() ?? ownerPubkey.toString());
    // Payer default: use session when we have one (agent pays gas).
    const payer = encrypt?.payer ?? sessionPubkey?.toString() ?? ownerPubkey.toString();

    const ciphertext = walletData.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput;
    const ciphertextPubkey = parsePublicKey(ciphertext, 'pendingAllowedOutput');
    const encryptProgram = encrypt?.encryptProgram ?? ENCRYPT_PREALPHA_PROGRAM_ID_STRING;
    const connection = getConnection();
    const ciphertextStatus = await readCiphertextStatus(connection, ciphertextPubkey);
    if (
      !ciphertextStatus.exists
      || ciphertextStatus.owner !== encryptProgram
      || ciphertextStatus.dataLength < 100
      || ciphertextStatus.fheType !== 0
    ) {
      throw new Error(`Pending allowed-output ${ciphertextPubkey.toString()} is not a valid official Encrypt bool ciphertext account`);
    }

    const transaction = await buildRequestPolicyValueDecryptionTransaction({
      wallet: walletData.walletPda,
      authority,
      request,
      kind: 'pending-allowed-output',
      ciphertext,
      encrypt: {
        encryptProgram,
        config: encrypt?.config,
        deposit: encrypt?.deposit,
        networkEncryptionKey: encrypt?.networkEncryptionKey,
        eventAuthority: encrypt?.eventAuthority,
        payer,
      },
    });

    return c.json({
      success: true,
      data: {
        ...transaction,
        wallet: walletData.walletPda,
        request,
        authority,
        payer,
        status: 'allowed-output-decryption-requested',
        graph: 'polet_policy_guardrail_graph',
        policySequence: walletData.confidentialPolicy.encryptCiphertexts!.pendingPolicySeq || walletData.policySeq,
        allowedOutputCiphertext: ciphertext,
        allowedOutputDigest: ciphertextStatus.digest,
        encryptProgram,
        grpcEndpoint: ENCRYPT_PREALPHA_GRPC_URL,
        boundary:
          authority === ownerPubkey.toString()
            ? 'owner-signed-public-decryption-request'
            : 'session-signed-public-decryption-request',
        warning:
          'Encrypt pre-alpha decryption request accounts may expose plaintext output values publicly after the decryptor responds.',
      },
    });
  } catch (error) {
    console.error('Request pending allowed-output decryption error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build allowed-output decryption transaction' }, 500);
  }
});

/**
 * POST /wallet/resolve-encrypt-policy-decision
 * Reads a bool decryption request and maps it to verified allowed/blocked.
 */
walletRouter.post('/resolve-encrypt-policy-decision', async (c) => {
  try {
    const { owner, allowedDecryptionRequest, expectedPolicySeq } = await c.req.json();
    const ownerPubkey = parsePublicKey(owner, 'owner');
    const requestPubkey = parsePublicKey(allowedDecryptionRequest, 'allowedDecryptionRequest');
    const walletData = await getWalletData(ownerPubkey.toString());
    if (!walletData) throw new Error('Wallet not found');
    if (!hasPendingOfficialEncryptPolicyOutputs(walletData)) {
      throw new Error('Official Encrypt policy graph has no pending allowed-output ciphertext for this wallet');
    }
    const state = walletData.confidentialPolicy.encryptCiphertexts!;
    if (expectedPolicySeq !== undefined && Number(expectedPolicySeq) !== state.pendingPolicySeq) {
      throw new Error('Encrypt policy execution policy sequence does not match wallet pending state');
    }

    const connection = getConnection();
    const [requestInfo, ciphertextStatus, slot] = await Promise.all([
      readBoolDecryptionRequest(connection, requestPubkey),
      readCiphertextStatus(connection, parsePublicKey(state.pendingAllowedOutput, 'pendingAllowedOutput')),
      connection.getSlot(),
    ]);
    if (!requestInfo.exists || requestInfo.status === 'invalid') {
      throw new Error('Allowed-output decryption request account is invalid or missing');
    }
    if (requestInfo.ciphertext !== state.pendingAllowedOutput) {
      throw new Error('Allowed-output decryption request does not match wallet pending graph state');
    }
    if (ciphertextStatus.digest && requestInfo.digest !== ciphertextStatus.digest) {
      throw new Error('Allowed-output decryption digest does not match current ciphertext digest');
    }
    if (requestInfo.status === 'pending') {
      return c.json({
        success: true,
        data: {
          status: 'pending-encrypt-execution',
          graph: 'polet_policy_guardrail_graph',
          policySequence: state.pendingPolicySeq || walletData.policySeq,
          sourceAmountCiphertext: state.pendingSourceAmount,
          allowedOutputCiphertext: state.pendingAllowedOutput,
          dailySpentOutputCiphertext: state.pendingDailySpentOutput,
          allowedDecryptionRequest: requestPubkey.toString(),
          suppressedUntilVerified: ['jupiterExecutionPayload', 'dwallet', 'messageApproval', 'destinationDigest', 'poletApprovalTransaction'],
        },
      });
    }

    const execution = resolveOfficialEncryptDecisionFromAllowedOutput(walletData, {
      allowedDecryptionRequest: requestPubkey.toString(),
      allowedOutputCiphertext: requestInfo.ciphertext,
      allowedOutputDigest: requestInfo.digest,
      allowed: requestInfo.boolValue === true,
      verifiedSlot: slot,
    });

    return c.json({
      success: true,
      data: {
        ...execution,
        boundary: 'public-output-decryption-result',
        warning: 'Encrypt pre-alpha decryption request accounts may expose plaintext output values publicly; this is not production privacy.',
        ...(execution.status === 'encrypt-verified-blocked' && {
          suppressedUntilVerified: ['jupiterExecutionPayload', 'dwallet', 'messageApproval', 'destinationDigest', 'poletApprovalTransaction'],
        }),
      },
    });
  } catch (error) {
    console.error('Resolve Encrypt policy decision error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to resolve Encrypt policy decision' }, 500);
  }
});

/**
 * POST /wallet/approve-ika-with-verified-encrypt
 * Builds the no-witness Ika consume tx after an allowed Encrypt output is verified.
 */
walletRouter.post('/approve-ika-with-verified-encrypt', async (c) => {
  try {
    const body = await c.req.json();
    const transaction = await buildApproveIkaMessageWithVerifiedEncryptSessionTransaction({
      wallet: body.wallet,
      sessionKey: body.sessionKey,
      allowedOutputCiphertext: body.allowedOutputCiphertext,
      dailySpentOutputCiphertext: body.dailySpentOutputCiphertext,
      allowedDecryptionRequest: body.allowedDecryptionRequest,
      coordinator: body.coordinator,
      dwallet: body.dwallet,
      messageApproval: body.messageApproval,
      cpiAuthority: body.cpiAuthority,
      callerProgram: body.callerProgram ?? PROGRAM_ID.toString(),
      ikaProgram: body.ikaProgram,
      ikaMessageHash: body.ikaMessageHash,
      orderExpiresAt: body.orderExpiresAt,
      attestationSlot: body.attestationSlot,
      attestationPolicySeq: body.attestationPolicySeq,
      userPubkey: body.userPubkey,
      signatureScheme: body.signatureScheme,
      messageApprovalBump: body.messageApprovalBump,
      sharedApprovers: body.sharedApprovers,
    });

    return c.json({
      success: true,
      data: {
        ...transaction,
        status: 'encrypt-verified-allowed',
        graph: 'polet_policy_guardrail_graph',
        allowedOutputCiphertext: body.allowedOutputCiphertext,
        dailySpentOutputCiphertext: body.dailySpentOutputCiphertext,
        allowedDecryptionRequest: body.allowedDecryptionRequest,
        boundary: 'unsigned-ika-approval-after-verified-encrypt',
        settlement: 'not-executed',
      },
    });
  } catch (error) {
    console.error('Approve Ika with verified Encrypt error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build verified Encrypt Ika transaction' }, 500);
  }
});

/**
 * POST /wallet/shared-ika-approvers
 * Builds an owner-signed transaction that registers shared Ika co-approvers on-chain.
 */
walletRouter.post('/shared-ika-approvers', async (c) => {
  try {
    const { owner, threshold, approvers } = await c.req.json();
    if (!owner || threshold === undefined || !Array.isArray(approvers)) {
      return c.json({ success: false, error: 'owner, threshold, and approvers are required' }, 400);
    }
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > approvers.length) {
      return c.json({ success: false, error: 'threshold must be a positive integer no greater than approver count' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);
    const approverPubkeys = Array.from(new Set(approvers.map((approver) => new PublicKey(approver).toString())))
      .map((approver) => new PublicKey(approver));
    if (approverPubkeys.length !== approvers.length) {
      return c.json({ success: false, error: 'approvers must be unique' }, 400);
    }

    const program = getProgram();
    const ix = await program.methods.configureSharedIkaApprovers(threshold, approverPubkeys)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        threshold,
        approvers: approverPubkeys.map((approver) => approver.toString()),
      },
    });
  } catch (error) {
    console.error('Configure shared Ika approvers error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build shared Ika approver transaction' }, 500);
  }
});

/**
 * POST /wallet/shared-ika-approvers/revoke
 * Builds an owner-signed transaction that revokes a shared Ika co-approver on-chain.
 */
walletRouter.post('/shared-ika-approvers/revoke', async (c) => {
  try {
    const { owner, approver } = await c.req.json();
    if (!owner || !approver) {
      return c.json({ success: false, error: 'owner and approver are required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);
    const approverPubkey = new PublicKey(approver);
    const program = getProgram();
    const ix = await program.methods.revokeSharedIkaApprover(approverPubkey)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        approver: approverPubkey.toString(),
      },
    });
  } catch (error) {
    console.error('Revoke shared Ika approver error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build shared Ika approver revocation transaction' }, 500);
  }
});

/**
 * POST /wallet/recovery-authority
 * Builds an owner-signed transaction that changes the recovery authority.
 */
walletRouter.post('/recovery-authority', async (c) => {
  try {
    const { owner, recoveryAuthority } = await c.req.json();
    if (!owner || !recoveryAuthority) {
      return c.json({ success: false, error: 'owner and recoveryAuthority are required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const recoveryAuthorityPubkey = new PublicKey(recoveryAuthority);
    const walletPda = deriveWalletPda(ownerPubkey);
    const program = getProgram();
    const ix = await program.methods.setRecoveryAuthority(recoveryAuthorityPubkey)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        recoveryAuthority: recoveryAuthorityPubkey.toString(),
        activity: {
          type: 'recovery-authority-updated',
          status: 'prepared',
          privacy: 'No confidential policy values are included in this recovery transaction.',
        },
      },
    });
  } catch (error) {
    console.error('Set recovery authority error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build recovery authority transaction' }, 500);
  }
});

/**
 * POST /wallet/recover-access
 * Builds a recovery-authority-signed transaction that revokes sessions,
 * rotates shared Ika co-approvers, and stages a dWallet controller migration.
 */
walletRouter.post('/recover-access', async (c) => {
  try {
    const {
      owner,
      authority,
      compromisedSessions,
      sharedIkaThreshold,
      sharedIkaApprovers,
      pendingDwalletController,
    } = await c.req.json();
    if (
      !owner
      || !authority
      || !Array.isArray(compromisedSessions)
      || sharedIkaThreshold === undefined
      || !Array.isArray(sharedIkaApprovers)
      || !pendingDwalletController
    ) {
      return c.json({
        success: false,
        error: 'owner, authority, compromisedSessions, sharedIkaThreshold, sharedIkaApprovers, and pendingDwalletController are required',
      }, 400);
    }
    if (!Number.isInteger(sharedIkaThreshold) || sharedIkaThreshold < 1 || sharedIkaThreshold > sharedIkaApprovers.length) {
      return c.json({ success: false, error: 'sharedIkaThreshold must be a positive integer no greater than approver count' }, 400);
    }

    const ownerPubkey = parsePublicKey(owner, 'owner');
    const authorityPubkey = parsePublicKey(authority, 'authority');
    const walletPda = deriveWalletPda(ownerPubkey);
    const compromisedSessionPubkeys = Array.from(new Set(compromisedSessions.map((session) => parsePublicKey(session, 'compromisedSessions entry').toString())))
      .map((session) => parsePublicKey(session, 'compromisedSessions entry'));
    const sharedIkaApproverPubkeys = Array.from(new Set(sharedIkaApprovers.map((approver) => parsePublicKey(approver, 'sharedIkaApprovers entry').toString())))
      .map((approver) => parsePublicKey(approver, 'sharedIkaApprovers entry'));
    if (compromisedSessionPubkeys.length !== compromisedSessions.length) {
      return c.json({ success: false, error: 'compromisedSessions must be unique' }, 400);
    }
    if (sharedIkaApproverPubkeys.length !== sharedIkaApprovers.length) {
      return c.json({ success: false, error: 'sharedIkaApprovers must be unique' }, 400);
    }

    const pendingDwalletControllerPubkey = parsePublicKey(pendingDwalletController, 'pendingDwalletController');
    const program = getProgram();
    const ix = await program.methods.recoverWalletAccess(
      compromisedSessionPubkeys,
      sharedIkaThreshold,
      sharedIkaApproverPubkeys,
      pendingDwalletControllerPubkey
    )
      .accounts({
        wallet: walletPda,
        authority: authorityPubkey,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(authorityPubkey, tx),
        wallet: walletPda.toString(),
        authority: authorityPubkey.toString(),
        compromisedSessions: compromisedSessionPubkeys.map((session) => session.toString()),
        sharedIkaThreshold,
        sharedIkaApprovers: sharedIkaApproverPubkeys.map((approver) => approver.toString()),
        pendingDwalletController: pendingDwalletControllerPubkey.toString(),
        activity: {
          type: 'recovery-access-rotation',
          status: 'prepared',
          states: [
            'sessions-revoked',
            'shared-ika-approvers-rotated',
            'dwallet-controller-migration-staged',
          ],
          privacy: 'Recovery output redacts confidential max-per-run, daily cap, and daily spent values.',
          boundary: 'The transaction stages dWallet controller metadata only; it does not bypass Polet policy checks or execute Ika settlement.',
        },
      },
    });
  } catch (error) {
    console.error('Recover wallet access error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build recovery transaction';
    const status = message.includes('valid Solana public key') || message.includes('must be a Solana public key') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});

/**
 * POST /wallet/revoke-session
 * Builds an owner-signed transaction that revokes one temporal session key on-chain.
 */
walletRouter.post('/revoke-session', async (c) => {
  try {
    const { owner, sessionKey } = await c.req.json();
    if (!owner || !sessionKey) {
      return c.json({ success: false, error: 'owner and sessionKey are required' }, 400);
    }

    const ownerPubkey = parsePublicKey(owner, 'owner');
    const sessionPubkey = parsePublicKey(sessionKey, 'sessionKey');
    const walletPda = deriveWalletPda(ownerPubkey);
    const program = getProgram();

    const ix = await program.methods.revokeSession(sessionPubkey)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        sessionKey: sessionPubkey.toString(),
      },
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build revoke session transaction' }, 500);
  }
});

/**
 * POST /wallet/setup-demo-custody
 * Creates PDA-owned ATAs for USDC and wrapped SOL when needed, then registers them on-chain.
 */
walletRouter.post('/setup-demo-custody', async (c) => {
  try {
    const body = await c.req.json();
    const owner = body.owner;
    if (!owner) {
      return c.json({ success: false, error: 'Owner public key is required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);
    const usdcMint = body.usdcMint ? new PublicKey(body.usdcMint) : JUPITER_USDC_MINT;
    const solMint = body.solMint ? new PublicKey(body.solMint) : JUPITER_SOL_MINT;
    const tokenProgram = body.tokenProgram ? new PublicKey(body.tokenProgram) : TOKEN_PROGRAM_ID;
    const usdcTokenAccount = body.usdcTokenAccount
      ? new PublicKey(body.usdcTokenAccount)
      : deriveAta(walletPda, usdcMint, tokenProgram);
    const solTokenAccount = body.solTokenAccount
      ? new PublicKey(body.solTokenAccount)
      : deriveAta(walletPda, solMint, tokenProgram);

    const connection = getConnection();
    const instructions: anchor.web3.TransactionInstruction[] = [];
    const [usdcAccount, solAccount] = await Promise.all([
      connection.getAccountInfo(usdcTokenAccount),
      connection.getAccountInfo(solTokenAccount),
    ]);
    if (!usdcAccount) {
      instructions.push(createAtaInstruction(ownerPubkey, usdcTokenAccount, walletPda, usdcMint, tokenProgram));
    }
    if (!solAccount) {
      instructions.push(createAtaInstruction(ownerPubkey, solTokenAccount, walletPda, solMint, tokenProgram));
    }

    const program = getProgram();
    const registerIx = await program.methods.registerDemoCustody()
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
        usdcMint,
        usdcTokenAccount,
        solMint,
        solTokenAccount,
        tokenProgram,
      })
      .instruction();
    instructions.push(registerIx);

    const tx = new Transaction().add(...instructions);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        usdcMint: usdcMint.toString(),
        usdcTokenAccount: usdcTokenAccount.toString(),
        solMint: solMint.toString(),
        solTokenAccount: solTokenAccount.toString(),
        tokenProgram: tokenProgram.toString(),
      },
    });
  } catch (error) {
    console.error('Setup demo custody error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build demo custody transaction' }, 500);
  }
});

/**
 * POST /wallet/deposit-custody
 * Builds an owner-signed deposit transfer into Polet smart-wallet custody.
 */
walletRouter.post('/deposit-custody', async (c) => {
  try {
    const body = await c.req.json();
    const ownerPubkey = parsePublicKey(body.owner, 'owner');
    const asset = body.asset;
    if (asset !== 'USDC' && asset !== 'SOL') {
      return c.json({ success: false, error: 'asset must be USDC or SOL' }, 400);
    }

    const connection = getConnection();
    const walletPda = deriveWalletPda(ownerPubkey);
    const instructions: anchor.web3.TransactionInstruction[] = [];
    const tokenProgram = body.tokenProgram ? parsePublicKey(body.tokenProgram, 'tokenProgram') : TOKEN_PROGRAM_ID;
    let source: PublicKey = ownerPubkey;
    let destination = walletPda;
    let amountBaseUnits: bigint;
    let createdCustodyAccount = false;

    if (asset === 'USDC') {
      const usdcMint = body.usdcMint ? parsePublicKey(body.usdcMint, 'usdcMint') : JUPITER_USDC_MINT;
      const sourceTokenAccount = body.sourceTokenAccount
        ? parsePublicKey(body.sourceTokenAccount, 'sourceTokenAccount')
        : deriveAta(ownerPubkey, usdcMint, tokenProgram);
      const custodyTokenAccount = body.custodyTokenAccount
        ? parsePublicKey(body.custodyTokenAccount, 'custodyTokenAccount')
        : deriveAta(walletPda, usdcMint, tokenProgram);
      amountBaseUnits = parsePositiveAmount(body.amount, USDC_DECIMALS, 'USDC amount');
      const custodyInfo = await connection.getAccountInfo(custodyTokenAccount);
      if (!custodyInfo) {
        instructions.push(createAtaInstruction(ownerPubkey, custodyTokenAccount, walletPda, usdcMint, tokenProgram));
        createdCustodyAccount = true;
      }
      instructions.push(createTransferCheckedInstruction(sourceTokenAccount, usdcMint, custodyTokenAccount, ownerPubkey, amountBaseUnits, USDC_DECIMALS, tokenProgram));
      source = sourceTokenAccount;
      destination = custodyTokenAccount;
    } else {
      amountBaseUnits = parsePositiveAmount(body.amount, SOL_DECIMALS, 'SOL amount');
      if (amountBaseUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
        return c.json({ success: false, error: 'SOL amount exceeds safe lamport transfer limit' }, 400);
      }
      instructions.push(SystemProgram.transfer({
        fromPubkey: ownerPubkey,
        toPubkey: walletPda,
        lamports: Number(amountBaseUnits),
      }));
    }

    const tx = new Transaction().add(...instructions);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        asset,
        amount: String(body.amount),
        amountBaseUnits: amountBaseUnits.toString(),
        source: source.toString(),
        destination: destination.toString(),
        createdCustodyAccount,
        custodyAddress: walletPda.toString(),
        boundary: 'owner-signed-smart-wallet-custody-deposit',
      },
    });
  } catch (error) {
    console.error('Deposit custody error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build custody deposit transaction';
    const status = message.includes('must be') || message.includes('supports at most') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});
/**
 * POST /wallet/withdraw-custody
 * Builds an owner-signed withdrawal transfer from Polet smart-wallet custody.
 */
walletRouter.post('/withdraw-custody', async (c) => {
  try {
    const body = await c.req.json();
    const ownerPubkey = parsePublicKey(body.owner, 'owner');
    const asset = body.asset;
    if (asset !== 'USDC' && asset !== 'SOL') {
      return c.json({ success: false, error: 'asset must be USDC or SOL' }, 400);
    }
    const amount = parsePositiveAmount(body.amount, asset === 'USDC' ? USDC_DECIMALS : SOL_DECIMALS, `${asset} amount`);

    const connection = getConnection();
    const walletPda = deriveWalletPda(ownerPubkey);
    const walletData = await getWalletData(ownerPubkey.toString());

    if (!walletData) {
      return c.json({ success: false, error: 'Wallet not found' }, 404);
    }
    if (!walletData.demoCustody.configured) {
      return c.json({ success: false, error: 'Custody not configured' }, 400);
    }

    const instructions: anchor.web3.TransactionInstruction[] = [];
    const tokenProgram = body.tokenProgram ? parsePublicKey(body.tokenProgram, 'tokenProgram') : TOKEN_PROGRAM_ID;
    const program = getProgram();
    let source: PublicKey;
    let destination: PublicKey;
    const usdcMint = body.usdcMint
      ? parsePublicKey(body.usdcMint, 'usdcMint')
      : new PublicKey(walletData.demoCustody.usdcMint);
    const walletUsdcAta = body.custodyTokenAccount
      ? parsePublicKey(body.custodyTokenAccount, 'custodyTokenAccount')
      : deriveAta(walletPda, usdcMint, tokenProgram);
    const ownerUsdcAta = body.destinationTokenAccount
      ? parsePublicKey(body.destinationTokenAccount, 'destinationTokenAccount')
      : deriveAta(ownerPubkey, usdcMint, tokenProgram);

    if (asset === 'USDC') {
      const ownerAtaInfo = await connection.getAccountInfo(ownerUsdcAta);
      if (!ownerAtaInfo) {
        instructions.push(createAtaInstruction(ownerPubkey, ownerUsdcAta, ownerPubkey, usdcMint, tokenProgram));
      }
      source = walletUsdcAta;
      destination = ownerUsdcAta;
    } else {
      const nativeLamports = BigInt(await connection.getBalance(walletPda));
      const available = nativeLamports - MIN_NATIVE_SOL_RESERVE_LAMPORTS;
      if (amount > available) {
        return c.json({ success: false, error: 'Insufficient SOL balance after reserve' }, 400);
      }
      source = walletPda;
      destination = ownerPubkey;
    }

    const withdrawIx = await program.methods.withdrawCustody(asset, new anchor.BN(amount.toString()))
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
        usdcTokenAccount: walletUsdcAta,
        ownerUsdcTokenAccount: ownerUsdcAta,
        usdcMint,
        tokenProgram,
      })
      .instruction();
    instructions.push(withdrawIx);

    const tx = new Transaction().add(...instructions);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        wallet: walletPda.toString(),
        asset,
        amount: String(body.amount),
        amountBaseUnits: amount.toString(),
        source: source.toString(),
        destination: destination.toString(),
        boundary: 'owner-signed-smart-wallet-custody-withdraw',
      },
    });
  } catch (error) {
    console.error('Withdraw custody error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build custody withdraw transaction';
    const status = message.includes('must be') || message.includes('supports at most') || message.includes('Insufficient') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});

/**
 * POST /wallet/fund-agent-gas
 * Builds an owner-signed SOL transfer to fund the manual external agent wallet for gas fees.
 * This is separate from smart-wallet custody deposits - agent gas SOL pays transaction fees only.
 */
walletRouter.post('/fund-agent-gas', async (c) => {
  try {
    const body = await c.req.json();
    const ownerPubkey = parsePublicKey(body.owner, 'owner');
    const agentWallet = parsePublicKey(body.agentWallet, 'agentWallet');
    const amount = parsePositiveAmount(body.amount, SOL_DECIMALS, 'SOL amount');

    // Validate amount is reasonable for gas funding (max 10 SOL to prevent misuse)
    const MAX_GAS_FUND_AMOUNT = 10n * BigInt(10 ** SOL_DECIMALS); // 10 SOL in lamports
    if (amount > MAX_GAS_FUND_AMOUNT) {
      return c.json({ success: false, error: 'Gas funding amount exceeds maximum 10 SOL' }, 400);
    }

    const walletData = await getWalletData(ownerPubkey.toString());

    if (!walletData) {
      return c.json({ success: false, error: 'Wallet not found' }, 404);
    }

    // Validate agentWallet is an authorized session key for this owner
    const currentTime = Math.floor(Date.now() / 1000);
    const isAuthorizedSession = walletData.sessions.some(
      (s) => s.key === agentWallet.toString() && s.authorized && s.expiresAt > currentTime
    );
    if (!isAuthorizedSession) {
      return c.json({ success: false, error: 'Agent wallet is not an authorized session key for this owner' }, 400);
    }

    // Build transfer from owner to agent wallet
    const instructions: anchor.web3.TransactionInstruction[] = [];
    instructions.push(SystemProgram.transfer({
      fromPubkey: ownerPubkey,
      toPubkey: agentWallet,
      lamports: Number(amount),
    }));

    const tx = new Transaction().add(...instructions);
    return c.json({
      success: true,
      data: {
        transaction: await serializeUnsigned(ownerPubkey, tx),
        source: ownerPubkey.toString(),
        destination: agentWallet.toString(),
        amountLamports: amount.toString(),
        amountUi: formatBaseUnits(amount, SOL_DECIMALS),
        boundary: 'owner-signed-agent-gas-funding',
      },
    });
  } catch (error) {
    console.error('Fund agent gas error:', error);
    const message = error instanceof Error ? error.message : 'Failed to build agent gas funding transaction';
    const status = message.includes('must be') || message.includes('exceeds') ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  }
});

/**
 * GET /wallet/:owner
 * Fetches the current on-chain state of a wallet.
 */
walletRouter.get('/:owner', async (c) => {
  try {
    const owner = c.req.param('owner');
    const walletData = await getWalletData(owner);
    
    if (!walletData) {
      return c.json({ success: false, error: 'Wallet not found' }, 404);
    }

    return c.json({
      success: true,
      data: toJsonSafe(await withCustodyBalances(walletData))
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    return c.json({ success: false, error: 'Failed to fetch wallet data' }, 500);
  }
});

async function withCustodyBalances(walletData: Awaited<ReturnType<typeof getWalletData>>) {
  if (!walletData) return walletData;
  const connection = getConnection();
  const walletPda = new PublicKey(walletData.walletPda);
  const usdcAccount = walletData.demoCustody.configured
    ? await connection.getAccountInfo(new PublicKey(walletData.demoCustody.usdcTokenAccount))
    : null;
  const nativeLamports = BigInt(await connection.getBalance(walletPda));
  const tradableLamports = nativeLamports > MIN_NATIVE_SOL_RESERVE_LAMPORTS
    ? nativeLamports - MIN_NATIVE_SOL_RESERVE_LAMPORTS
    : 0n;
  const usdcBaseUnits = readTokenAmount(usdcAccount?.data);
  return {
    ...walletData,
    custodyBalances: {
      usdcBaseUnits,
      usdcUi: formatBaseUnits(usdcBaseUnits, USDC_DECIMALS),
      nativeSolLamports: nativeLamports,
      nativeSolUi: formatBaseUnits(nativeLamports, SOL_DECIMALS),
      minNativeSolReserveLamports: MIN_NATIVE_SOL_RESERVE_LAMPORTS,
      minNativeSolReserveUi: formatBaseUnits(MIN_NATIVE_SOL_RESERVE_LAMPORTS, SOL_DECIMALS),
      tradableNativeSolLamports: tradableLamports,
      tradableNativeSolUi: formatBaseUnits(tradableLamports, SOL_DECIMALS),
      nativeCustodyAddress: walletData.walletPda,
      configured: walletData.demoCustody.configured,
      funded: usdcBaseUnits > 0n || nativeLamports > MIN_NATIVE_SOL_RESERVE_LAMPORTS,
    },
  };
}
