import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as borsh from 'borsh';
import type { Policy, WalletAccount } from '../types/intent';
import idl from './idl.json' with { type: "json" };
import { getConnection } from './transaction-builder';
import { PROGRAM_ID, deriveWalletPda } from './program-identity';

// Borsh schema for Policy (must match Rust contract)
const POLICY_SCHEMA = new Map([[Object, {
  kind: 'struct',
  fields: [
    ['allowlist', [['u8', 32]]],
    ['blocklist', [['u8', 32]]],
  ],
}]]);

function deserializePolicy(data: Uint8Array): Policy {
  try {
    const p = borsh.deserialize(POLICY_SCHEMA, Object, Buffer.from(data)) as { allowlist: Uint8Array[]; blocklist: Uint8Array[] };
    return {
      allowlist: p.allowlist.map((b: Uint8Array) => new PublicKey(b).toBase58()),
      blocklist: p.blocklist.map((b: Uint8Array) => new PublicKey(b).toBase58()),
    };
  } catch (e) {
    console.error('Failed to deserialize policy with borsh, trying JSON:', e);
    // Fallback for legacy JSON data
    try {
      return JSON.parse(Buffer.from(data).toString('utf8')) as Policy;
    } catch {
      return { allowlist: [], blocklist: [] };
    }
  }
}

export interface WalletData {
  walletPda: string;
  owner: string;
  proxyPk: string;
  policyCommitment: number[];
  merkleRoot: number[];
  policySeq: number;
  lastRevokedSlot: number;
  confidentialPolicy: {
    policyCommitment: number[];
    encryptionWitnessHash: number[];
    encryptedMaxPerRun: bigint;
    encryptedDailyCap: bigint;
    encryptedDailySpent: bigint;
    spentDayIndex: number;
    enabled: boolean;
  };
  demoCustody: {
    usdcMint: string;
    usdcTokenAccount: string;
    solMint: string;
    solTokenAccount: string;
    tokenProgram: string;
    configured: boolean;
  };
  sessions: Array<{
    key: string;
    expiresAt: number;
    grantedSlot: number;
    authorized: boolean;
  }>;
  temporalKeys: Array<{
    key: string;
    expiresAt: number;
    grantedSlot: number;
    authorized: boolean;
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
    const walletPda = deriveWalletPda(owner);

    const accountData = (await (program.account as any).wallet.fetch(walletPda)) as unknown as WalletAccount;
    const sessions = accountData.sessions.map(tk => ({
      key: tk.key.toString(),
      expiresAt: tk.expiresAt.toNumber(),
      grantedSlot: tk.grantedSlot?.toNumber() ?? 0,
      authorized: tk.authorized,
    }));

    return {
      walletPda: walletPda.toString(),
      owner: accountData.owner.toString(),
      proxyPk: accountData.proxyPk.toString(),
      policyCommitment: Array.from(accountData.policyCommitment),
      merkleRoot: Array.from(accountData.merkleRoot),
      policySeq: accountData.policySeq.toNumber(),
      lastRevokedSlot: accountData.lastRevokedSlot.toNumber(),
      confidentialPolicy: {
        policyCommitment: Array.from(accountData.confidentialPolicy.policyCommitment),
        encryptionWitnessHash: Array.from(accountData.confidentialPolicy.encryptionWitnessHash),
        encryptedMaxPerRun: accountData.confidentialPolicy.encryptedMaxPerRun.toString(),
        encryptedDailyCap: accountData.confidentialPolicy.encryptedDailyCap.toString(),
        encryptedDailySpent: accountData.confidentialPolicy.encryptedDailySpent.toString(),
        spentDayIndex: accountData.confidentialPolicy.spentDayIndex.toNumber(),
        enabled: accountData.confidentialPolicy.enabled,
      },
      demoCustody: {
        usdcMint: accountData.demoCustody.usdcMint.toString(),
        usdcTokenAccount: accountData.demoCustody.usdcTokenAccount.toString(),
        solMint: accountData.demoCustody.solMint.toString(),
        solTokenAccount: accountData.demoCustody.solTokenAccount.toString(),
        tokenProgram: accountData.demoCustody.tokenProgram.toString(),
        configured: accountData.demoCustody.configured,
      },
      sessions,
      temporalKeys: sessions,
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
  
  const _ = deserializePolicy;
  if (!wallet.confidentialPolicy.enabled) return null;

  return {
    allowlist: [],
    blocklist: [],
  };
}

/**
 * Validate that a session key is authorized for a wallet
 */
export async function isSessionAuthorized(ownerStr: string, sessionKey: string): Promise<boolean> {
  const wallet = await getWalletData(ownerStr);
  if (!wallet) return false;

  const currentTime = Math.floor(Date.now() / 1000);

  for (const tk of wallet.sessions) {
    if (tk.key === sessionKey) {
      return tk.authorized
        && tk.expiresAt > currentTime
        && tk.grantedSlot >= wallet.lastRevokedSlot;
    }
  }

  return false;
}
