import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import type { Policy } from '../types/intent.js';
import idl from './idl.json' assert { type: "json" };
import { getConnection } from './transaction-builder.js';

const PROGRAM_ID = new PublicKey("22yQkHaAEGtXyZFiyJVqpTyQzj5qPbebZMnJTWwK1Muw");

export interface WalletData {
  owner: string;
  proxyPk: string;
  merkleRoot: number[];
  policySeq: number;
  lastRevokedSlot: number;
  policyHash: number[];
  policyData: Uint8Array;
  dailySpent: number;
  lastReset: number;
  dailyLimit: number;
  temporalKeys: Array<{
    key: string;
    expiresAt: number;
    authorized: boolean;
    dailyLimit: number;
    dailySpent: number;
    lastReset: number;
  }>;
}

/**
 * Get wallet data from Solana RPC
 */
export async function getWalletData(ownerStr: string): Promise<WalletData | null> {
  if (!ownerStr) return null;
  
  try {
    const owner = new PublicKey(ownerStr);
    const connection = getConnection();
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(anchor.web3.Keypair.generate()), { commitment: 'confirmed' });
    const program = new anchor.Program(idl as any, PROGRAM_ID, provider);

    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), owner.toBuffer()],
      PROGRAM_ID
    );

    const accountData = await program.account.wallet.fetch(walletPda);
    
    return {
      owner: accountData.owner.toString(),
      proxyPk: accountData.proxyPk.toString(),
      merkleRoot: Array.from(accountData.merkleRoot as number[]),
      policySeq: (accountData.policySeq as anchor.BN).toNumber(),
      lastRevokedSlot: (accountData.lastRevokedSlot as anchor.BN).toNumber(),
      policyHash: Array.from(accountData.policyHash as number[]),
      policyData: Buffer.from(accountData.policyData as any),
      dailySpent: (accountData.dailySpent as anchor.BN).toNumber(),
      lastReset: (accountData.lastReset as anchor.BN).toNumber(),
      dailyLimit: (accountData.dailyLimit as anchor.BN).toNumber(),
      temporalKeys: (accountData.temporalKeys as any[]).map(tk => ({
        key: tk.key.toString(),
        expiresAt: (tk.expiresAt as anchor.BN).toNumber(),
        authorized: tk.authorized as boolean,
        dailyLimit: (tk.dailyLimit as anchor.BN).toNumber(),
        dailySpent: (tk.dailySpent as anchor.BN).toNumber(),
        lastReset: (tk.lastReset as anchor.BN).toNumber(),
      })),
    };
  } catch (error) {
    console.error(`Error fetching wallet data for ${ownerStr}:`, error);
    return null;
  }
}

/**
 * Get policy data for a wallet from Solana
 */
export async function getWalletPolicy(ownerStr: string): Promise<Policy | null> {
  const wallet = await getWalletData(ownerStr);
  if (!wallet) return null;
  
  if (wallet.policyData.length === 0) {
    // If no policy is set, fallback to a secure default or return null.
    return {
      allowlist: [],
      blocklist: [],
      maxAmount: 10_000_000_000,
      dailyLimit: 100_000_000_000,
    };
  }

  try {
    const jsonStr = Buffer.from(wallet.policyData).toString('utf8');
    return JSON.parse(jsonStr) as Policy;
  } catch (e) {
    console.error("Failed to parse policy data:", e);
    return null;
  }
}

/**
 * Validate that a session key is authorized for a wallet
 */
export async function isSessionAuthorized(ownerStr: string, sessionKey: string): Promise<boolean> {
  const wallet = await getWalletData(ownerStr);
  if (!wallet) return false;

  const currentTime = Math.floor(Date.now() / 1000);

  for (const tk of wallet.temporalKeys) {
    if (tk.key === sessionKey) {
      return tk.authorized && tk.expiresAt > currentTime;
    }
  }

  // If no temporal keys exist, allow for demo transition.
  if (wallet.temporalKeys.length === 0) return true;

  return false;
}