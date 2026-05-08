import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: {
      toBase58: () => 'Owner111111111111111111111111111111111111111',
    },
    sendTransaction: vi.fn(),
  }),
  useConnection: () => ({
    connection: {
      confirmTransaction: vi.fn(),
    },
  }),
}));

vi.mock('../lib/api', () => ({
  initializeWallet: async () => ({
    transaction: 'initialize-wallet-tx',
    wallet: 'WalletPda11111111111111111111111111111111111',
  }),
  getWalletData: async () => ({
    walletPda: 'WalletPda11111111111111111111111111111111111',
    temporalKeys: [
      {
        key: 'Agent111111111111111111111111111111111111111',
        expiresAt: 1_900_000_000,
        authorized: true,
        dailyLimit: 0,
        dailySpent: 0,
        lastReset: 1_800_000_000,
      },
    ],
  }),
  grantKey: async () => ({
    transaction: 'grant-key-tx',
  }),
  revokeSession: async () => ({
    transaction: 'revoke-session-tx',
    wallet: 'WalletPda11111111111111111111111111111111111',
    sessionKey: 'Agent111111111111111111111111111111111111111',
  }),
}));

vi.mock('./DemoTab', () => ({
  DemoTab: ({ agentAddresses = [] }: { agentAddresses?: string[] }) => (
    <div>
      <h2>Confidential DCA Demo</h2>
      <p>Agent count: {agentAddresses.length}</p>
    </div>
  ),
}));

import { WalletDashboard } from './WalletDashboard';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Wallet dashboard navigation', () => {
  test('defaults to DCA Demo and keeps primary navigation focused on demo surfaces', async () => {
    const view = render(<WalletDashboard />);

    await waitFor(() => expect(view.getByText('Polet Smart Wallet')).toBeTruthy());

    expect(view.getByRole('button', { name: 'DCA Demo' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Agent Access' })).toBeTruthy();
    expect(view.queryByText('Legacy Policy')).toBeNull();
    expect(view.queryByText('Overview')).toBeNull();
    expect(view.getByText('Confidential DCA Demo')).toBeTruthy();
    expect(view.getByText('Demo Pair')).toBeTruthy();
    expect(view.getByText('Agent count: 1')).toBeTruthy();
  });

  test('Agent Access remains the only secondary utility tab', async () => {
    const view = render(<WalletDashboard />);

    await waitFor(() => expect(view.getByText('Polet Smart Wallet')).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: 'Agent Access' }));

    expect(view.getByText('AI Agent Access')).toBeTruthy();
    expect(view.queryByText('Legacy Policy')).toBeNull();
  });
});
