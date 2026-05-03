import { Hono } from 'hono';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../lib/transaction-builder';
import idl from '../lib/idl.json' with { type: "json" };
import { generateAndSaveKey } from '../lib/kms';
import { buildPolicyTree } from '../lib/merkle-tree';
import { getWalletData } from '../lib/wallet-store';
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

const PROGRAM_ID = new PublicKey("22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw");

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
      [Buffer.from("polet_wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

    // Generate and save proxy key
    const proxyKeypair = generateAndSaveKey(owner, 'proxy');

    const program = getProgram();
    
    // Construct initialize instruction with default 100 SOL daily limit
    const ix = await program.methods.initialize(new anchor.BN(100_000_000_000))
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
      [Buffer.from("polet_wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

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
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("polet_wallet"), ownerPubkey.toBuffer()],
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
