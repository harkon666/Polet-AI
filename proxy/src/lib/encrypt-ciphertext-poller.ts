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
export const CIPHERTEXT_AUTHORIZED_OFFSET = 34;
export const CIPHERTEXT_FHE_TYPE_OFFSET = 98;
export const ENCRYPT_CONFIG_ACCOUNT_MIN_SIZE = 132;
export const ENCRYPT_CONFIG_ENC_MINT_OFFSET = 68;
export const ENCRYPT_CONFIG_ENC_VAULT_OFFSET = 100;

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
  authorized: string;
}

export interface DecryptionRequestInfo {
  address: string;
  exists: boolean;
  owner: string;
  dataLength: number;
  status: 'pending' | 'complete' | 'invalid';
  ciphertext: string;
  digest: string;
  requester: string;
  fheType: number;
  totalLen: number;
  bytesWritten: number;
  boolValue?: boolean;
}

export interface EncryptInfraPdas {
  config: PublicKey;
  eventAuthority: PublicKey;
  deposit: PublicKey;
}

export interface EncryptInfraStatus {
  encryptProgram: string;
  payer: string;
  config: {
    address: string;
    exists: boolean;
    owner: string;
    dataLength: number;
    ownedByEncryptProgram: boolean;
    encMint: string;
    encMintConfigured: boolean;
    encVault: string;
    encVaultConfigured: boolean;
  };
  eventAuthority: {
    address: string;
    exists: boolean;
    owner: string;
    ownedByEncryptProgram: boolean;
  };
  deposit: {
    address: string;
    exists: boolean;
    owner: string;
    ownedByEncryptProgram: boolean;
    dataLength: number;
  };
  readyForGraphCpi: boolean;
  blockers: string[];
}

const ZERO_PUBKEY = new PublicKey('11111111111111111111111111111111');

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
      authorized: '',
    };
  }
  const statusByte = info.data.length > CIPHERTEXT_STATUS_OFFSET ? info.data[CIPHERTEXT_STATUS_OFFSET] : -1;
  const fheType = info.data.length > CIPHERTEXT_FHE_TYPE_OFFSET ? info.data[CIPHERTEXT_FHE_TYPE_OFFSET] : -1;
  const digest = info.data.length >= CIPHERTEXT_DIGEST_OFFSET + 32
    ? Buffer.from(info.data.slice(CIPHERTEXT_DIGEST_OFFSET, CIPHERTEXT_DIGEST_OFFSET + 32)).toString('hex')
    : '';
  const authorized = info.data.length >= CIPHERTEXT_AUTHORIZED_OFFSET + 32
    ? new PublicKey(info.data.slice(CIPHERTEXT_AUTHORIZED_OFFSET, CIPHERTEXT_AUTHORIZED_OFFSET + 32)).toString()
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
    authorized,
  };
}

export async function readBoolDecryptionRequest(
  connection: Connection,
  requestPubkey: PublicKey
): Promise<DecryptionRequestInfo> {
  const info = await connection.getAccountInfo(requestPubkey);
  if (!info) {
    return {
      address: requestPubkey.toString(),
      exists: false,
      owner: '',
      dataLength: 0,
      status: 'invalid',
      ciphertext: '',
      digest: '',
      requester: '',
      fheType: -1,
      totalLen: 0,
      bytesWritten: 0,
    };
  }

  if (info.data.length < 108) {
    return {
      address: requestPubkey.toString(),
      exists: true,
      owner: info.owner.toString(),
      dataLength: info.data.length,
      status: 'invalid',
      ciphertext: '',
      digest: '',
      requester: '',
      fheType: -1,
      totalLen: 0,
      bytesWritten: 0,
    };
  }

  const totalLen = info.data.readUInt32LE(99);
  const bytesWritten = info.data.readUInt32LE(103);
  const fheType = info.data[98];
  const complete = totalLen > 0 && bytesWritten === totalLen;
  const validBool = fheType === 0 && totalLen === 1;

  return {
    address: requestPubkey.toString(),
    exists: true,
    owner: info.owner.toString(),
    dataLength: info.data.length,
    status: validBool ? complete ? 'complete' : 'pending' : 'invalid',
    ciphertext: new PublicKey(info.data.slice(2, 34)).toString(),
    digest: Buffer.from(info.data.slice(34, 66)).toString('hex'),
    requester: new PublicKey(info.data.slice(66, 98)).toString(),
    fheType,
    totalLen,
    bytesWritten,
    ...(validBool && complete && { boolValue: info.data[107] !== 0 }),
  };
}

export function deriveEncryptInfraPdas(
  payer: PublicKey,
  encryptProgram: PublicKey
): EncryptInfraPdas {
  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_config')],
    encryptProgram
  );
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    encryptProgram
  );
  const [deposit] = PublicKey.findProgramAddressSync(
    [Buffer.from('encrypt_deposit'), payer.toBuffer()],
    encryptProgram
  );
  return { config, eventAuthority, deposit };
}

export async function readEncryptInfraStatus(
  connection: Connection,
  payer: PublicKey,
  encryptProgram: PublicKey
): Promise<EncryptInfraStatus> {
  const pdas = deriveEncryptInfraPdas(payer, encryptProgram);
  const [configInfo, eventAuthorityInfo, depositInfo] = await Promise.all([
    connection.getAccountInfo(pdas.config),
    connection.getAccountInfo(pdas.eventAuthority),
    connection.getAccountInfo(pdas.deposit),
  ]);

  const encMint = configInfo && configInfo.data.length >= ENCRYPT_CONFIG_ENC_MINT_OFFSET + 32
    ? new PublicKey(configInfo.data.slice(ENCRYPT_CONFIG_ENC_MINT_OFFSET, ENCRYPT_CONFIG_ENC_MINT_OFFSET + 32))
    : ZERO_PUBKEY;
  const encVault = configInfo && configInfo.data.length >= ENCRYPT_CONFIG_ENC_VAULT_OFFSET + 32
    ? new PublicKey(configInfo.data.slice(ENCRYPT_CONFIG_ENC_VAULT_OFFSET, ENCRYPT_CONFIG_ENC_VAULT_OFFSET + 32))
    : ZERO_PUBKEY;

  const blockers: string[] = [];
  if (!configInfo) blockers.push('encrypt-config-missing');
  else {
    if (!configInfo.owner.equals(encryptProgram)) blockers.push('encrypt-config-owner-mismatch');
    if (configInfo.data.length < ENCRYPT_CONFIG_ACCOUNT_MIN_SIZE) blockers.push('encrypt-config-too-small');
    if (encMint.equals(ZERO_PUBKEY)) blockers.push('encrypt-config-enc-mint-unconfigured');
    if (encVault.equals(ZERO_PUBKEY)) blockers.push('encrypt-config-enc-vault-unconfigured');
  }
  if (!eventAuthorityInfo) blockers.push('encrypt-event-authority-missing');
  else if (!eventAuthorityInfo.owner.equals(encryptProgram)) blockers.push('encrypt-event-authority-owner-mismatch');
  if (!depositInfo) blockers.push('encrypt-deposit-missing');
  else if (!depositInfo.owner.equals(encryptProgram)) blockers.push('encrypt-deposit-owner-mismatch');

  return {
    encryptProgram: encryptProgram.toString(),
    payer: payer.toString(),
    config: {
      address: pdas.config.toString(),
      exists: Boolean(configInfo),
      owner: configInfo?.owner.toString() ?? '',
      dataLength: configInfo?.data.length ?? 0,
      ownedByEncryptProgram: configInfo?.owner.equals(encryptProgram) ?? false,
      encMint: encMint.toString(),
      encMintConfigured: !encMint.equals(ZERO_PUBKEY),
      encVault: encVault.toString(),
      encVaultConfigured: !encVault.equals(ZERO_PUBKEY),
    },
    eventAuthority: {
      address: pdas.eventAuthority.toString(),
      exists: Boolean(eventAuthorityInfo),
      owner: eventAuthorityInfo?.owner.toString() ?? '',
      ownedByEncryptProgram: eventAuthorityInfo?.owner.equals(encryptProgram) ?? false,
    },
    deposit: {
      address: pdas.deposit.toString(),
      exists: Boolean(depositInfo),
      owner: depositInfo?.owner.toString() ?? '',
      ownedByEncryptProgram: depositInfo?.owner.equals(encryptProgram) ?? false,
      dataLength: depositInfo?.data.length ?? 0,
    },
    readyForGraphCpi: blockers.length === 0,
    blockers,
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
