import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Master key should be set in environment variable PROXY_MASTER_KEY
// Fallback is just for development/demo purposes
const getMasterKey = (): Buffer => {
  const masterKeyHex = process.env.PROXY_MASTER_KEY;
  if (masterKeyHex) {
    const buf = Buffer.from(masterKeyHex, 'hex');
    if (buf.length !== 32) {
      throw new Error('PROXY_MASTER_KEY must be exactly 32 bytes (64 hex characters)');
    }
    return buf;
  }
  
  // Fallback for demo - NEVER use this in production
  console.warn('⚠️ PROXY_MASTER_KEY not set! Using insecure fallback key.');
  return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
};

const KEYS_DIR = path.join(process.cwd(), 'keys');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

interface EncryptedKeyData {
  publicKey: string;
  iv: string;
  authTag: string;
  encryptedPrivateKey: string;
}

/**
 * Encrypts a private key using AES-256-GCM
 */
export function encryptPrivateKey(privateKeyBytes: Uint8Array): EncryptedKeyData {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  
  let encrypted = cipher.update(Buffer.from(privateKeyBytes));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  
  return {
    publicKey: keypair.publicKey.toString(),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedPrivateKey: encrypted.toString('hex'),
  };
}

/**
 * Decrypts a private key using AES-256-GCM
 */
export function decryptPrivateKey(encryptedData: EncryptedKeyData): Uint8Array {
  const masterKey = getMasterKey();
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  const encryptedText = Buffer.from(encryptedData.encryptedPrivateKey, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return new Uint8Array(decrypted);
}

/**
 * Generates a new keypair and saves it encrypted for the given wallet and key type
 * @param walletOwner The public key of the wallet owner
 * @param keyType E.g. 'proxy', 'session'
 * @returns The generated Keypair
 */
export function generateAndSaveKey(walletOwner: string, keyType: 'proxy' | 'session'): Keypair {
  const keypair = Keypair.generate();
  const encryptedData = encryptPrivateKey(keypair.secretKey);
  
  const walletDir = path.join(KEYS_DIR, walletOwner);
  if (!fs.existsSync(walletDir)) {
    fs.mkdirSync(walletDir, { recursive: true });
  }
  
  const filePath = path.join(walletDir, `${keyType}.json`);
  fs.writeFileSync(filePath, JSON.stringify(encryptedData, null, 2));
  
  return keypair;
}

/**
 * Loads and decrypts a keypair for the given wallet and key type
 * @param walletOwner The public key of the wallet owner
 * @param keyType E.g. 'proxy', 'session'
 * @returns The decrypted Keypair, or null if not found
 */
export function loadKey(walletOwner: string, keyType: 'proxy' | 'session'): Keypair | null {
  const filePath = path.join(KEYS_DIR, walletOwner, `${keyType}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const encryptedData = JSON.parse(fileContent) as EncryptedKeyData;
    const secretKey = decryptPrivateKey(encryptedData);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error(`Failed to load or decrypt key ${keyType} for wallet ${walletOwner}:`, error);
    return null;
  }
}
