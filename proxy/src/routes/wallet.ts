import { Hono } from 'hono';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../lib/transaction-builder';
import idl from '../lib/idl.json' with { type: "json" };
import { generateAndSaveKey } from '../lib/kms';
import { buildPolicyTree } from '../lib/merkle-tree';
import { getWalletData } from '../lib/wallet-store';
import { PROGRAM_ID, deriveWalletPda } from '../lib/program-identity';
import { buildConfidentialNumericPolicySetup } from '../lib/confidential-numeric-policy';
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

    // Generate and save proxy key
    const proxyKeypair = generateAndSaveKey(owner, 'proxy');

    const program = getProgram();
    
    // Construct initialize instruction
    const ix = await program.methods.initialize()
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Construct set_proxy_key instruction
    const ixProxy = await program.methods.setProxyKey(proxyKeypair.publicKey)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction().add(ix).add(ixProxy);
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
        proxyKey: proxyKeypair.publicKey.toString(),
      }
    });
  } catch (error) {
    console.error('Wallet initialization error:', error);
    return c.json({ success: false, error: 'Failed to build initialization transaction' }, 500);
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
    const { owner, maxPerRunUsdc, dailyCapUsdc, encryptionWitness } = await c.req.json();
    if (!owner || maxPerRunUsdc === undefined || dailyCapUsdc === undefined) {
      return c.json({ success: false, error: 'owner, maxPerRunUsdc, and dailyCapUsdc are required' }, 400);
    }
    if (!Array.isArray(encryptionWitness) || encryptionWitness.length !== 32) {
      return c.json({ success: false, error: 'encryptionWitness must contain 32 bytes' }, 400);
    }
    const ownerPubkey = new PublicKey(owner);
    const walletPda = deriveWalletPda(ownerPubkey);
    const policySetup = buildConfidentialNumericPolicySetup({
      maxPerRunUsdc,
      dailyCapUsdc,
      encryptionWitness,
    });

    const program = getProgram();
    const ix = await program.methods.setConfidentialNumericPolicy(
      policySetup.policyCommitment,
      policySetup.encryptionWitnessHash,
      new anchor.BN(policySetup.encryptedMaxPerRun.toString()),
      new anchor.BN(policySetup.encryptedDailyCap.toString()),
      new anchor.BN(policySetup.encryptedDailySpent.toString()),
      new anchor.BN(policySetup.spentDayIndex.toString())
    )
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
        policyCommitment: policySetup.policyCommitment,
        encryptionWitnessHash: policySetup.encryptionWitnessHash,
      },
    });
  } catch (error) {
    console.error('Set confidential policy error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build confidential policy transaction' }, 500);
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

    const ownerPubkey = new PublicKey(owner);
    const authorityPubkey = new PublicKey(authority);
    const walletPda = deriveWalletPda(ownerPubkey);
    const compromisedSessionPubkeys = Array.from(new Set(compromisedSessions.map((session) => new PublicKey(session).toString())))
      .map((session) => new PublicKey(session));
    const sharedIkaApproverPubkeys = Array.from(new Set(sharedIkaApprovers.map((approver) => new PublicKey(approver).toString())))
      .map((approver) => new PublicKey(approver));
    if (compromisedSessionPubkeys.length !== compromisedSessions.length) {
      return c.json({ success: false, error: 'compromisedSessions must be unique' }, 400);
    }
    if (sharedIkaApproverPubkeys.length !== sharedIkaApprovers.length) {
      return c.json({ success: false, error: 'sharedIkaApprovers must be unique' }, 400);
    }

    const pendingDwalletControllerPubkey = new PublicKey(pendingDwalletController);
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
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build recovery transaction' }, 500);
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
      data: walletData
    });
  } catch (error) {
    console.error('Fetch wallet error:', error);
    return c.json({ success: false, error: 'Failed to fetch wallet data' }, 500);
  }
});
