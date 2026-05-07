import { describe, expect, test, vi } from 'vitest';

const transactionFrom = vi.hoisted(() => vi.fn(() => ({ recentBlockhash: 'stale-blockhash' })));

vi.mock('@solana/web3.js', () => ({
  Transaction: {
    from: transactionFrom,
  },
}));

import { confirmFreshTransaction, prepareFreshTransaction } from './solana-transaction';

describe('solana transaction helpers', () => {
  test('refreshes unsigned proxy transactions with a current blockhash before signing', async () => {
    const connection = {
      getLatestBlockhash: vi.fn(async () => ({
        blockhash: 'fresh-blockhash',
        lastValidBlockHeight: 123,
      })),
    };

    const { transaction, latestBlockhash } = await prepareFreshTransaction('AQID', connection as never);

    expect(transactionFrom).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(connection.getLatestBlockhash).toHaveBeenCalledWith('confirmed');
    expect(transaction.recentBlockhash).toBe('fresh-blockhash');
    expect(latestBlockhash).toEqual({ blockhash: 'fresh-blockhash', lastValidBlockHeight: 123 });
  });

  test('confirms with the same blockhash window used for signing', async () => {
    const latestBlockhash = {
      blockhash: 'fresh-blockhash',
      lastValidBlockHeight: 456,
    };
    const connection = {
      confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
    };

    await confirmFreshTransaction(connection as never, 'signature-1', latestBlockhash);

    expect(connection.confirmTransaction).toHaveBeenCalledWith({
      signature: 'signature-1',
      ...latestBlockhash,
    }, 'confirmed');
  });

  test('treats blockhash expiry as success when the signature is already finalized', async () => {
    const latestBlockhash = {
      blockhash: 'fresh-blockhash',
      lastValidBlockHeight: 456,
    };
    const connection = {
      confirmTransaction: vi.fn(async () => {
        throw new Error('Signature signature-1 has expired: block height exceeded.');
      }),
      getSignatureStatus: vi.fn(async () => ({
        value: {
          err: null,
          confirmationStatus: 'finalized',
        },
      })),
    };

    await confirmFreshTransaction(connection as never, 'signature-1', latestBlockhash);

    expect(connection.getSignatureStatus).toHaveBeenCalledWith('signature-1', {
      searchTransactionHistory: true,
    });
  });

  test('keeps surfacing blockhash expiry when the signature is not confirmed', async () => {
    const latestBlockhash = {
      blockhash: 'fresh-blockhash',
      lastValidBlockHeight: 456,
    };
    const error = new Error('Signature signature-1 has expired: block height exceeded.');
    const connection = {
      confirmTransaction: vi.fn(async () => {
        throw error;
      }),
      getSignatureStatus: vi.fn(async () => ({ value: null })),
    };

    await expect(confirmFreshTransaction(connection as never, 'signature-1', latestBlockhash)).rejects.toThrow(error);
  });
});
