import { Hono } from 'hono';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../lib/transaction-builder.js';
import idl from '../lib/idl.json' assert { type: "json" };
import { generateAndSaveKey } from '../lib/kms.js';
import { buildPolicyTree } from '../lib/merkle-tree.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const walletRouter = new Hono();

const PROGRAM_ID = new PublicKey("22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw");

function getProgram() {
  const connection = getConnection();
  const dummyWallet = {
    publicKey: anchor.web3.Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new anchor.AnchorProvider(connection, dummyWallet as any, { commitment: 'confirmed' });
  return new anchor.Program(idl as any, PROGRAM_ID, provider);
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
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

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
 * POST /wallet/set-policy
 * Updates the policy data for a wallet. Returns an unsigned transaction.
 */
walletRouter.post('/set-policy', async (c) => {
  try {
    const { owner, policy } = await c.req.json();
    if (!owner || !policy) {
      return c.json({ success: false, error: 'Owner and policy are required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

    const program = getProgram();
    const policyData = Buffer.from(JSON.stringify(policy));
    
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
    
    // Instruction 1: setPolicy
    const ixPolicy = await program.methods.setPolicy(policyHash, Buffer.from(policyData))
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    // Instruction 2: setMerkleRoot
    const ixMerkle = await program.methods.setMerkleRoot(tree.root)
      .accounts({
        wallet: walletPda,
        owner: ownerPubkey,
      })
      .instruction();

    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();

    const tx = new Transaction().add(ixPolicy).add(ixMerkle);
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
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

    const program = getProgram();
    
    const ix = await program.methods.grantTemporalKey(
      sessionPubkey,
      new anchor.BN(expiresAt),
      new anchor.BN(dailyLimit)
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
