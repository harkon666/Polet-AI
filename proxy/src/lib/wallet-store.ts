import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import type { Policy, WalletAccount } from '../types/intent';
import idl from './idl.json' with { type: "json" };
import { getConnection } from './transaction-builder';

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
    const dummyWallet = {
      publicKey: anchor.web3.Keypair.generate().publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new anchor.AnchorProvider(connection, dummyWallet as unknown as anchor.Wallet, { commitment: 'confirmed' });
    const program = new anchor.Program(idl as anchor.Idl, provider);
    const [walletPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), owner.toBuffer()],
      PROGRAM_ID
    );

    const accountData = (await (program.account as any).wallet.fetch(walletPda)) as unknown as WalletAccount;
    
    return {
      owner: accountData.owner.toString(),
      proxyPk: accountData.proxyPk.toString(),
      merkleRoot: Array.from(accountData.merkleRoot),
      policySeq: accountData.policySeq.toNumber(),
      lastRevokedSlot: accountData.lastRevokedSlot.toNumber(),
      policyHash: Array.from(accountData.policyHash),
      policyData: Buffer.from(accountData.policyData),
      dailySpent: accountData.dailySpent.toNumber(),
      lastReset: accountData.lastReset.toNumber(),
      dailyLimit: accountData.dailyLimit.toNumber(),
      temporalKeys: accountData.temporalKeys.map(tk => ({
        key: tk.key.toString(),
        expiresAt: tk.expiresAt.toNumber(),
        authorized: tk.authorized,
        dailyLimit: tk.dailyLimit.toNumber(),
        dailySpent: tk.dailySpent.toNumber(),
        lastReset: tk.lastReset.toNumber(),
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