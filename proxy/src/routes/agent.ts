import { Hono } from 'hono';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../lib/transaction-builder';
import idl from '../lib/idl.json' with { type: "json" };
import { generateAndSaveKey } from '../lib/kms';

export const agentRouter = new Hono();

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
 * POST /agent/register
 * Generates a new session keypair for the agent via KMS, and returns the 
 * unsigned GrantTemporalKey transaction for the wallet owner to sign.
 */
agentRouter.post('/register', async (c) => {
  try {
    const { owner, expiresAt, dailyLimit } = await c.req.json();
    if (!owner || expiresAt === undefined || dailyLimit === undefined) {
      return c.json({ success: false, error: 'owner, expiresAt, and dailyLimit are required' }, 400);
    }

    const ownerPubkey = new PublicKey(owner);
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), ownerPubkey.toBuffer()],
      PROGRAM_ID
    );

    // Generate and save session key
    const sessionKeypair = generateAndSaveKey(owner, 'session');

    const program = getProgram();
    
    // Construct grant_temporal_key instruction
    const ix = await program.methods.grantTemporalKey(
      sessionKeypair.publicKey,
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
        sessionKey: sessionKeypair.publicKey.toString(),
      }
    });
  } catch (error) {
    console.error('Agent register error:', error);
    return c.json({ success: false, error: 'Failed to build agent registration transaction' }, 500);
  }
});
