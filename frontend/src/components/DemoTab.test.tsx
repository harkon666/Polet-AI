import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import { DemoTabContent } from './DemoTab';
import type { RunConfidentialDcaInput, RunMultichainIntentInput } from '../lib/api';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
});

globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

afterEach(() => {
  document.body.innerHTML = '';
});

const api = {
  setConfidentialPolicy: async () => ({
    transaction: 'policy-tx',
    wallet: 'wallet-pda',
    policyCommitment: Array.from({ length: 32 }, () => 1),
    encryptionWitnessHash: Array.from({ length: 32 }, () => 2),
  }),
  setupDemoCustody: async () => ({
    transaction: 'custody-tx',
    wallet: 'wallet-pda',
    usdcTokenAccount: 'USDC111111111111111111111111111111111111111',
    solTokenAccount: 'SOL1111111111111111111111111111111111111111',
  }),
  getWalletData: async () => null,
  runConfidentialDca: async (input: RunConfidentialDcaInput) => {
    if (input.amountUsdc === '25') {
      return {
        allowed: false,
        code: 'CONFIDENTIAL_POLICY_BLOCKED',
        reason: 'Confidential policy blocked this DCA run.',
      };
    }

    return {
      allowed: true,
      code: 'DCA_ALLOWED',
      amount: input.amountUsdc,
      amountBaseUnits: '5000000',
      executionPath: 'swap-build-fallback' as const,
      smartWalletAuthority: 'wallet-pda',
      jupiterPlan: {
        outputToken: {
          symbol: 'SOL',
          decimals: 9,
        },
        build: {
          outAmount: '59384569',
          otherAmountThreshold: '58790724',
          routePlan: [
            {
              swapInfo: {
                label: 'HumidiFi',
              },
            },
          ],
        },
      },
      transaction: {
        transaction: 'agent-tx',
        blockHash: 'blockhash',
        slot: 1,
        signers: [input.sessionKey],
      },
    };
  },
  runMultichainIntent: async (input: RunMultichainIntentInput) => ({
    allowed: true,
    code: 'IKA_BRIDGELESS_REQUEST_READY',
    ikaRequest: {
      executionRail: 'ika-bridgeless' as const,
      settlement: 'not-executed' as const,
      requestId: 'ika-test-request',
      source: {
        chain: input.sourceChain,
        asset: input.sourceAsset,
      },
      target: {
        chain: input.targetChain,
        asset: input.targetAsset,
      },
      amount: input.amount,
      sessionContext: {
        owner: input.owner,
        sessionKey: input.sessionKey,
        smartWalletAuthority: 'wallet-pda',
        policySequence: 3,
      },
      policyAttestation: {
        status: 'approved' as const,
        policySequence: 3,
        attestationHash: 'safe-attestation-hash',
      },
      executionBoundary: {
        status: 'request-prepared' as const,
        note: 'Ika settlement is not executed.',
      },
    },
  }),
};

function renderDemo() {
  return render(
    <DemoTabContent
      owner="AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2"
      agentAddresses={['BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4']}
      signAndConfirmTransaction={async () => 'sig111111'}
      api={api}
    />
  );
}

async function setupCustodyAndPolicy(view: ReturnType<typeof renderDemo>) {
  fireEvent.click(view.getByRole('button', { name: /setup custody pda/i }));
  await waitFor(() => expect(view.getByText(/custody siap/i)).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: /sign & simpan policy/i }));
  await waitFor(() => expect(view.getAllByText(/policy on-chain tersimpan/i)[0]).toBeTruthy());
}

describe('Consumer DCA demo frontend', () => {
  test('shows checklist progression and gates primary CTAs by prerequisites', async () => {
    const view = renderDemo();

    expect(view.getByText(/checklist demo/i)).toBeTruthy();
    expect(document.body.textContent).toMatch(/aksi berikutnya:\s*setup custody pda/i);
    expect(view.getByRole('button', { name: /sign & simpan policy/i }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: /try 25 usdc via proxy/i }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: /run 5 usdc via proxy/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(view.getByRole('button', { name: /setup custody pda/i }));
    await waitFor(() => expect(view.getByText(/custody siap/i)).toBeTruthy());

    expect(view.getByRole('button', { name: /sign & simpan policy/i }).hasAttribute('disabled')).toBe(false);
    expect(view.getByText(/policy rahasia tersimpan/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /sign & simpan policy/i }));
    await waitFor(() => expect(view.getAllByText(/policy on-chain tersimpan/i)[0]).toBeTruthy());

    expect(view.getByRole('button', { name: /try 25 usdc via proxy/i }).hasAttribute('disabled')).toBe(false);
    expect(view.getByRole('button', { name: /run 5 usdc via proxy/i }).hasAttribute('disabled')).toBe(true);
    expect(view.getByText(/jalankan skenario block 25 usdc/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText('DIBLOKIR')).toBeTruthy());

    expect(view.getByRole('button', { name: /run 5 usdc via proxy/i }).hasAttribute('disabled')).toBe(false);
    expect(view.getByText(/skenario 25 usdc diblokir/i)).toBeTruthy();
  });

  test('hides confidential policy values after confirmed save', async () => {
    const view = renderDemo();

    expect(view.getByDisplayValue('10')).toBeTruthy();
    expect(view.getByDisplayValue('20')).toBeTruthy();

    await setupCustodyAndPolicy(view);

    await waitFor(() => expect(view.getByText(/nilai privat disembunyikan/i)).toBeTruthy());
    expect(view.queryByDisplayValue('10')).toBeNull();
    expect(view.queryByDisplayValue('20')).toBeNull();
    expect(view.getByText(/maks per run terenkripsi/i)).toBeTruthy();
    expect(view.getByText(/batas harian terenkripsi/i)).toBeTruthy();
  });

  test('displays allowed 5 USDC and blocked 25 USDC proxy results', async () => {
    const view = renderDemo();

    expect(view.getByText(/intent multichain/i)).toBeTruthy();
    expect(view.getByText(/settlement ika belum dijalankan/i)).toBeTruthy();
    expect(view.getByText(/solana usdc/i)).toBeTruthy();
    expect(view.getByText(/solana sol/i)).toBeTruthy();
    expect(view.getByText('Jupiter')).toBeTruthy();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText('DIBLOKIR')).toBeTruthy());

    fireEvent.click(view.getByRole('button', { name: /run 5 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText('DISETUJUI')).toBeTruthy());

    expect(view.getByText('25 USDC')).toBeTruthy();
    expect(view.getByText('5 USDC')).toBeTruthy();
    expect(view.getByText(/jupiter route siap/i)).toBeTruthy();
    expect(view.getByText(/humidifi/i)).toBeTruthy();
    expect(view.getByText(/preview: route\/build jupiter/i)).toBeTruthy();
  });

  test('displays an Ika bridgeless request boundary without exposing thresholds', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /request ika bridgeless route/i }));
    await waitFor(() => expect(view.getByText(/bridgeless route requested/i)).toBeTruthy());

    expect(view.getByText('Ika bridgeless request')).toBeTruthy();
    expect(view.getAllByText(/solana usdc/i).length).toBeGreaterThan(0);
    expect(view.getByText(/sui sui/i)).toBeTruthy();
    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
  });

  test('activity log does not leak private thresholds', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));

    await waitFor(() => expect(view.getByText('DIBLOKIR')).toBeTruthy());
    const log = view.getByText(/activity log/i).closest('div');
    expect(log).toBeTruthy();
    const logText = log?.textContent ?? '';

    expect(logText).toContain('DIBLOKIR');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
    expect(logText).not.toContain('max per run 10');
    expect(logText).not.toContain('daily cap 20');
  });

  test('language toggle updates key user-facing flow copy', async () => {
    const view = renderDemo();

    fireEvent.click(view.getByRole('button', { name: /english/i }));

    expect(view.getByText(/confidential dca demo/i)).toBeTruthy();
    expect(view.getByRole('button', { name: /sign & save policy/i })).toBeTruthy();
    expect(view.getAllByText(/safe log/i).length).toBeGreaterThan(0);
    expect(view.getByText(/agent wallet public key/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /set up pda custody/i }));
    await waitFor(() => expect(view.getByText(/custody ready/i)).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & save policy/i }));
    await waitFor(() => expect(view.getAllByText(/on-chain policy saved/i)[0]).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc through proxy/i }));

    await waitFor(() => {
      const activityLog = view.getByText(/activity log/i).parentElement;
      expect(activityLog).toBeTruthy();
      expect(within(activityLog as HTMLElement).getByText('BLOCKED')).toBeTruthy();
    });
  });
});
