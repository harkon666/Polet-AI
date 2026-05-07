import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  ENCRYPT_CONFIG_ENC_MINT_OFFSET,
  ENCRYPT_CONFIG_ENC_VAULT_OFFSET,
  deriveEncryptInfraPdas,
  readEncryptInfraStatus,
} from '../src/lib/encrypt-ciphertext-poller';
import { deriveEncryptDepositPda } from '../src/lib/transaction-builder';

const ENCRYPT_PROGRAM = new PublicKey('4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8');

describe('Encrypt ciphertext and infrastructure utilities', () => {
  test('derives the same encrypt_deposit PDA used by transaction builders', () => {
    const payer = Keypair.generate().publicKey;
    const infraPdas = deriveEncryptInfraPdas(payer, ENCRYPT_PROGRAM);
    const [builderDeposit] = deriveEncryptDepositPda(payer.toString(), ENCRYPT_PROGRAM.toString());

    expect(infraPdas.deposit.toString()).toBe(builderDeposit.toString());
  });

  test('reports Encrypt devnet infrastructure blockers without deserializing untrusted data', async () => {
    const payer = Keypair.generate().publicKey;
    const pdas = deriveEncryptInfraPdas(payer, ENCRYPT_PROGRAM);
    const configData = Buffer.alloc(132);
    const encVault = Keypair.generate().publicKey;
    encVault.toBuffer().copy(configData, ENCRYPT_CONFIG_ENC_VAULT_OFFSET);

    const status = await readEncryptInfraStatus({
      getAccountInfo: async (pubkey: PublicKey) => {
        if (pubkey.equals(pdas.config)) {
          return {
            data: configData,
            owner: ENCRYPT_PROGRAM,
            lamports: 1,
            executable: false,
          } as never;
        }
        return null;
      },
    } as never, payer, ENCRYPT_PROGRAM);

    expect(status.config.exists).toBe(true);
    expect(status.config.encMintConfigured).toBe(false);
    expect(status.config.encVault).toBe(encVault.toString());
    expect(status.eventAuthority.exists).toBe(false);
    expect(status.deposit.exists).toBe(false);
    expect(status.readyForGraphCpi).toBe(false);
    expect(status.blockers).toContain('encrypt-config-enc-mint-unconfigured');
    expect(status.blockers).toContain('encrypt-event-authority-missing');
    expect(status.blockers).toContain('encrypt-deposit-missing');
  });

  test('marks infra ready when config, event authority, and deposit accounts are present', async () => {
    const payer = Keypair.generate().publicKey;
    const pdas = deriveEncryptInfraPdas(payer, ENCRYPT_PROGRAM);
    const configData = Buffer.alloc(132);
    Keypair.generate().publicKey.toBuffer().copy(configData, ENCRYPT_CONFIG_ENC_MINT_OFFSET);
    Keypair.generate().publicKey.toBuffer().copy(configData, ENCRYPT_CONFIG_ENC_VAULT_OFFSET);

    const status = await readEncryptInfraStatus({
      getAccountInfo: async (pubkey: PublicKey) => {
        if (pubkey.equals(pdas.config)) {
          return { data: configData, owner: ENCRYPT_PROGRAM, lamports: 1, executable: false } as never;
        }
        if (pubkey.equals(pdas.eventAuthority)) {
          return { data: Buffer.alloc(8), owner: ENCRYPT_PROGRAM, lamports: 1, executable: false } as never;
        }
        if (pubkey.equals(pdas.deposit)) {
          return { data: Buffer.alloc(83), owner: ENCRYPT_PROGRAM, lamports: 1, executable: false } as never;
        }
        return null;
      },
    } as never, payer, ENCRYPT_PROGRAM);

    expect(status.readyForGraphCpi).toBe(true);
    expect(status.blockers).toEqual([]);
  });
});
