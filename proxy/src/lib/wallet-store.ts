import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import * as borsh from 'borsh';
import type { Policy, WalletAccount } from '../types/intent';
import idl from './idl.json' with { type: "json" };
import { getConnection } from './transaction-builder';
import { PROGRAM_ID, deriveWalletPda } from './program-identity';
import type { EncryptPolicyCiphertextState } from './official-encrypt-policy';

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
  recoveryAuthority: string;
  proxyPk: string;
  policyCommitment: number[];
  merkleRoot: number[];
  policySeq: number;
  lastRevokedSlot: number;
  confidentialPolicy: WalletPolicyData;
  solTransferPolicy: WalletPolicyData;
  usdcDcaPolicy: WalletPolicyData;
  demoCustody: {
    usdcMint: string;
    usdcTokenAccount: string;
    solMint: string;
    solTokenAccount: string;
    tokenProgram: string;
    configured: boolean;
  };
  sharedIkaApprovals: {
    threshold: number;
    enabled: boolean;
    approvers: Array<{
      key: string;
      authorized: boolean;
    }>;
  };
  dwalletController: {
    currentController: string;
    pendingController: string;
    rotationSeq: number;
    lastRotatedSlot: number;
    migrationPending: boolean;
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

export interface WalletPolicyData {
    policyCommitment: number[];
    encryptionWitnessHash: number[];
    encryptedMaxPerRun: bigint;
    encryptedDailyCap: bigint;
    encryptedDailySpent: bigint;
    spentDayIndex: number;
    encryptCiphertexts?: EncryptPolicyCiphertextState;
    enabled: boolean;
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
    const walletAccountInfo = await connection.getAccountInfo(walletPda);
    if (!walletAccountInfo || !walletAccountInfo.owner.equals(PROGRAM_ID)) {
      return null;
    }

    const accountData = (await (program.account as any).wallet.fetch(walletPda)) as unknown as WalletAccount;
    const sessions = accountData.sessions.map(tk => ({
      key: tk.key.toString(),
      expiresAt: tk.expiresAt.toNumber(),
      grantedSlot: tk.grantedSlot?.toNumber() ?? 0,
      authorized: tk.authorized,
    }));

    const solTransferPolicy = normalizeConfidentialPolicy(accountData.solTransferPolicy);
    const usdcDcaPolicy = normalizeConfidentialPolicy(accountData.usdcDcaPolicy);

    return {
      walletPda: walletPda.toString(),
      owner: accountData.owner.toString(),
      recoveryAuthority: accountData.recoveryAuthority.toString(),
      proxyPk: accountData.proxyPk.toString(),
      policyCommitment: Array.from(accountData.policyCommitment),
      merkleRoot: Array.from(accountData.merkleRoot),
      policySeq: accountData.policySeq.toNumber(),
      lastRevokedSlot: accountData.lastRevokedSlot.toNumber(),
      confidentialPolicy: usdcDcaPolicy,
      solTransferPolicy,
      usdcDcaPolicy,
      demoCustody: {
        usdcMint: accountData.demoCustody.usdcMint.toString(),
        usdcTokenAccount: accountData.demoCustody.usdcTokenAccount.toString(),
        solMint: accountData.demoCustody.solMint.toString(),
        solTokenAccount: accountData.demoCustody.solTokenAccount.toString(),
        tokenProgram: accountData.demoCustody.tokenProgram.toString(),
        configured: accountData.demoCustody.configured,
      },
      sharedIkaApprovals: {
        threshold: accountData.sharedIkaApprovals?.threshold ?? 0,
        enabled: accountData.sharedIkaApprovals?.enabled ?? false,
        approvers: (accountData.sharedIkaApprovals?.approvers ?? []).map((approver) => ({
          key: approver.key.toString(),
          authorized: approver.authorized,
        })),
      },
      dwalletController: {
        currentController: accountData.dwalletController.currentController.toString(),
        pendingController: accountData.dwalletController.pendingController.toString(),
        rotationSeq: accountData.dwalletController.rotationSeq.toNumber(),
        lastRotatedSlot: accountData.dwalletController.lastRotatedSlot.toNumber(),
        migrationPending: accountData.dwalletController.migrationPending,
      },
      sessions,
      temporalKeys: sessions,
    };
  } catch (error) {
    if (isMissingAnchorAccountError(error) || isInvalidPublicKeyError(error)) {
      return null;
    }
    console.error(`Error fetching wallet data for ${ownerStr}:`, error);
    return null;
  }
}

function normalizeConfidentialPolicy(policy: WalletAccount['usdcDcaPolicy']): WalletPolicyData {
  return {
    policyCommitment: Array.from(policy.policyCommitment),
    encryptionWitnessHash: Array.from(policy.encryptionWitnessHash),
    encryptedMaxPerRun: BigInt(policy.encryptedMaxPerRun.toString()),
    encryptedDailyCap: BigInt(policy.encryptedDailyCap.toString()),
    encryptedDailySpent: BigInt(policy.encryptedDailySpent.toString()),
    spentDayIndex: policy.spentDayIndex.toNumber(),
    encryptCiphertexts: policy.encryptCiphertexts && {
      maxPerRun: policy.encryptCiphertexts.maxPerRun.toString(),
      dailyCap: policy.encryptCiphertexts.dailyCap.toString(),
      dailySpent: policy.encryptCiphertexts.dailySpent.toString(),
      lastRevealRequest: policy.encryptCiphertexts.lastRevealRequest?.toString(),
      lastRevealCiphertext: policy.encryptCiphertexts.lastRevealCiphertext?.toString(),
      lastRevealDigest: policy.encryptCiphertexts.lastRevealDigest
        ? Array.from(policy.encryptCiphertexts.lastRevealDigest)
        : undefined,
      lastRevealKind: policy.encryptCiphertexts.lastRevealKind,
      pendingAllowedOutput: policy.encryptCiphertexts.pendingAllowedOutput.toString(),
      pendingDailySpentOutput: policy.encryptCiphertexts.pendingDailySpentOutput.toString(),
      pendingSourceAmount: policy.encryptCiphertexts.pendingSourceAmount.toString(),
      pendingSlot: Number(policy.encryptCiphertexts.pendingSlot),
      pendingPolicySeq: Number(policy.encryptCiphertexts.pendingPolicySeq),
      pending: policy.encryptCiphertexts.pending,
      configured: policy.encryptCiphertexts.configured,
    },
    enabled: policy.enabled,
  };
}

function isMissingAnchorAccountError(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes('Account does not exist or has no data');
}

function isInvalidPublicKeyError(error: unknown): boolean {
  return error instanceof Error
    && error.message.includes('Invalid public key input');
}

/**
 * Get policy data for a wallet from Solana
 */
export async function getWalletPolicy(ownerStr: string): Promise<Policy | null> {
  const wallet = await getWalletData(ownerStr);
  if (!wallet) return null;
  
  const _ = deserializePolicy;
  if (!wallet.usdcDcaPolicy.enabled) return null;

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
