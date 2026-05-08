import { afterEach, describe, expect, test } from 'bun:test';
import { PublicKey } from '@solana/web3.js';
import { walletRouter } from '../src/routes/wallet';
import {
  ENCRYPT_PREALPHA_PROGRAM_ID_STRING,
  deriveEncryptConfigPda,
  deriveEncryptDepositPda,
  deriveEncryptEventAuthorityPda,
  setConnection,
} from '../src/lib/transaction-builder';
import {
  ENCRYPT_CONFIG_ENC_MINT_OFFSET,
  ENCRYPT_CONFIG_ENC_VAULT_OFFSET,
} from '../src/lib/encrypt-ciphertext-poller';

const owner = PublicKey.unique().toString();
const encryptProgram = new PublicKey(ENCRYPT_PREALPHA_PROGRAM_ID_STRING);

describe('wallet routes', () => {
  afterEach(() => {
    setConnection(null as never);
  });

  test('does not return an unsigned deposit transaction when Encrypt infra is blocked', async () => {
    const [config] = deriveEncryptConfigPda();
    const configData = Buffer.alloc(132);
    let latestBlockhashCalls = 0;

    setConnection({
      getAccountInfo: async (pubkey: PublicKey) => {
        if (pubkey.equals(config)) {
          return accountInfo({ owner: encryptProgram, data: configData });
        }
        return null;
      },
      getLatestBlockhash: async () => {
        latestBlockhashCalls += 1;
        return { blockhash: PublicKey.unique().toString(), lastValidBlockHeight: 99 };
      },
      getSlot: async () => 1,
    } as never);

    const response = await walletRouter.request('/create-encrypt-deposit', {
      method: 'POST',
      body: JSON.stringify({ owner }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transaction).toBeNull();
    expect(body.data.status).toBe('encrypt-infra-blocked');
    expect(body.data.blockers).not.toContain('encrypt-config-enc-mint-unconfigured');
    expect(body.data.blockers).toContain('encrypt-config-enc-vault-unconfigured');
    expect(body.data.blockers).not.toContain('encrypt-event-authority-missing');
    expect(body.data.blockers).not.toContain('encrypt-deposit-missing');
    expect(latestBlockhashCalls).toBe(0);
  });

  test('builds a deposit transaction when only the event authority PDA has no account data', async () => {
    const [config] = deriveEncryptConfigPda();
    const [deposit] = deriveEncryptDepositPda(owner);
    const [eventAuthority] = deriveEncryptEventAuthorityPda();
    const configData = Buffer.alloc(132);
    PublicKey.unique().toBuffer().copy(configData, ENCRYPT_CONFIG_ENC_MINT_OFFSET);
    PublicKey.unique().toBuffer().copy(configData, ENCRYPT_CONFIG_ENC_VAULT_OFFSET);

    setConnection({
      getAccountInfo: async (pubkey: PublicKey) => {
        if (pubkey.equals(config)) {
          return accountInfo({ owner: encryptProgram, data: configData });
        }
        return null;
      },
      getLatestBlockhash: async () => ({ blockhash: PublicKey.unique().toString(), lastValidBlockHeight: 99 }),
      getSlot: async () => 2,
    } as never);

    const response = await walletRouter.request('/create-encrypt-deposit', {
      method: 'POST',
      body: JSON.stringify({ owner }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending-deposit-creation');
    expect(body.data.transaction).toEqual(expect.any(String));
    expect(body.data.deposit).toBe(deposit.toString());
    expect(body.data.config).toBe(config.toString());
    expect(body.data.eventAuthority).toBe(eventAuthority.toString());
  });

  test('returns existing deposit metadata without rebuilding a transaction', async () => {
    const [deposit] = deriveEncryptDepositPda(owner);
    const [config] = deriveEncryptConfigPda();

    setConnection({
      getAccountInfo: async (pubkey: PublicKey) => {
        if (pubkey.equals(deposit)) {
          return accountInfo({ owner: encryptProgram, data: Buffer.alloc(83) });
        }
        return null;
      },
      getLatestBlockhash: async () => ({ blockhash: PublicKey.unique().toString(), lastValidBlockHeight: 99 }),
      getSlot: async () => 1,
    } as never);

    const response = await walletRouter.request('/create-encrypt-deposit', {
      method: 'POST',
      body: JSON.stringify({ owner }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transaction).toBeNull();
    expect(body.data.status).toBe('existing-deposit');
    expect(body.data.deposit).toBe(deposit.toString());
    expect(body.data.config).toBe(config.toString());
  });
});

function accountInfo({ owner, data }: { owner: PublicKey; data: Buffer }) {
  return {
    executable: false,
    lamports: 1,
    owner,
    rentEpoch: 0,
    data,
  };
}
