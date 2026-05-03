import { describe, expect, test, beforeEach, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { generateAndSaveKey, loadKey, encryptPrivateKey, decryptPrivateKey } from '../src/lib/kms.js';
import { Keypair } from '@solana/web3.js';

describe('Key Management System (KMS)', () => {
  const TEST_WALLET = 'TestOwner1234567890123456789012345678901234';
  const KEYS_DIR = path.join(process.cwd(), 'keys');
  const WALLET_DIR = path.join(KEYS_DIR, TEST_WALLET);

  beforeEach(() => {
    // Set a known master key for testing
    process.env.PROXY_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    
    // Clean up test dir if exists
    if (fs.existsSync(WALLET_DIR)) {
      fs.rmSync(WALLET_DIR, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(WALLET_DIR)) {
      fs.rmSync(WALLET_DIR, { recursive: true, force: true });
    }
  });

  test('encrypt and decrypt a private key successfully', () => {
    const keypair = Keypair.generate();
    
    const encrypted = encryptPrivateKey(keypair.secretKey);
    expect(encrypted.publicKey).toBe(keypair.publicKey.toString());
    expect(encrypted.iv.length).toBe(24); // 12 bytes = 24 hex chars
    expect(encrypted.authTag.length).toBe(32); // 16 bytes = 32 hex chars
    expect(encrypted.encryptedPrivateKey.length).toBeGreaterThan(0);
    
    const decrypted = decryptPrivateKey(encrypted);
    expect(Buffer.from(decrypted).equals(Buffer.from(keypair.secretKey))).toBe(true);
  });

  test('generateAndSaveKey creates file and returns valid keypair', () => {
    const keypair = generateAndSaveKey(TEST_WALLET, 'proxy');
    
    expect(keypair).toBeDefined();
    
    const filePath = path.join(WALLET_DIR, 'proxy.json');
    expect(fs.existsSync(filePath)).toBe(true);
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.publicKey).toBe(keypair.publicKey.toString());
  });

  test('loadKey retrieves and decrypts saved key', () => {
    const originalKeypair = generateAndSaveKey(TEST_WALLET, 'session');
    const loadedKeypair = loadKey(TEST_WALLET, 'session');
    
    expect(loadedKeypair).toBeDefined();
    expect(loadedKeypair?.publicKey.toString()).toBe(originalKeypair.publicKey.toString());
    expect(Buffer.from(loadedKeypair!.secretKey).equals(Buffer.from(originalKeypair.secretKey))).toBe(true);
  });

  test('loadKey returns null for non-existent key', () => {
    const loadedKeypair = loadKey('NonExistentWallet', 'proxy');
    expect(loadedKeypair).toBeNull();
  });
});
