import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Ciphertext account on-chain layout (100 bytes total):
 *   [0]       discriminator (1 byte)
 *   [1]       version (1 byte)
 *   [2..34]   ciphertext_digest (32 bytes)
 *   [34..66]  authorized (32 bytes)
 *   [66..98]  network_encryption_public_key (32 bytes)
 *   [98]      fhe_type (1 byte)
 *   [99]      status (1 byte) — 0=Pending, 1=Verified
 */
export const CIPHERTEXT_ACCOUNT_SIZE = 100;
export const CIPHERTEXT_STATUS_OFFSET = 99;
export const CIPHERTEXT_DIGEST_OFFSET = 2;
export const CIPHERTEXT_FHE_TYPE_OFFSET = 98;

export const CiphertextStatus = {
  Pending: 0,
  Verified: 1,
} as const;

export interface CiphertextAccountInfo {
  address: string;
  exists: boolean;
  owner: string;
  dataLength: number;
  status: 'pending' | 'verified' | 'unknown';
  statusByte: number;
  fheType: number;
  digest: string;
}

/**
 * Read the status of an Encrypt ciphertext account on-chain.
 */
export async function readCiphertextStatus(
  connection: Connection,
  ciphertextPubkey: PublicKey
): Promise<CiphertextAccountInfo> {
  const info = await connection.getAccountInfo(ciphertextPubkey);
  if (!info) {
    return {
      address: ciphertextPubkey.toString(),
      exists: false,
      owner: '',
      dataLength: 0,
      status: 'unknown',
      statusByte: -1,
      fheType: -1,
      digest: '',
    };
  }
  const statusByte = info.data.length > CIPHERTEXT_STATUS_OFFSET ? info.data[CIPHERTEXT_STATUS_OFFSET] : -1;
  const fheType = info.data.length > CIPHERTEXT_FHE_TYPE_OFFSET ? info.data[CIPHERTEXT_FHE_TYPE_OFFSET] : -1;
  const digest = info.data.length >= CIPHERTEXT_DIGEST_OFFSET + 32
    ? Buffer.from(info.data.slice(CIPHERTEXT_DIGEST_OFFSET, CIPHERTEXT_DIGEST_OFFSET + 32)).toString('hex')
    : '';
  return {
    address: ciphertextPubkey.toString(),
    exists: true,
    owner: info.owner.toString(),
    dataLength: info.data.length,
    status: statusByte === CiphertextStatus.Verified ? 'verified' : statusByte === CiphertextStatus.Pending ? 'pending' : 'unknown',
    statusByte,
    fheType,
    digest,
  };
}

/**
 * Poll a ciphertext account until it becomes VERIFIED or timeout.
 * @param intervalMs polling interval (default 3s)
 * @param timeoutMs max wait (default 120s)
 */
export async function pollCiphertextVerified(
  connection: Connection,
  ciphertextPubkey: PublicKey,
  intervalMs = 3_000,
  timeoutMs = 120_000
): Promise<CiphertextAccountInfo & { timedOut: boolean; pollDurationMs: number }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await readCiphertextStatus(connection, ciphertextPubkey);
    if (status.status === 'verified') {
      return { ...status, timedOut: false, pollDurationMs: Date.now() - start };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  const finalStatus = await readCiphertextStatus(connection, ciphertextPubkey);
  return { ...finalStatus, timedOut: true, pollDurationMs: Date.now() - start };
}
