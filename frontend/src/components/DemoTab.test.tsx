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
  sharedConfig = null;
  sharedIkaAttempts = 0;
  multichainInputs = [];
  encryptDcaMode = null;
  encryptIkaMode = null;
});

let sharedConfig: { threshold: number; approvers: string[] } | null = null;
let sharedIkaAttempts = 0;
let multichainInputs: RunMultichainIntentInput[] = [];
let encryptDcaMode: 'pending' | 'allowed' | 'blocked' | null = null;
let encryptIkaMode: 'pending' | 'allowed' | 'blocked' | null = null;
const coApproverA = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
const coApproverB = 'CxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR5';

const encryptPolicyBase = {
  policySequence: 7,
  sourceAmountCiphertext: 'EncryptSourceCiphertext111111111111111111',
  allowedOutputCiphertext: 'EncryptAllowedOutput1111111111111111111',
  dailySpentOutputCiphertext: 'EncryptDailySpentOutput1111111111111111',
  graph: 'polet_policy_guardrail_graph' as const,
};

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
  configureSharedIkaApprovers: async (input: { threshold: number; approvers: string[] }) => {
    sharedConfig = {
      threshold: input.threshold,
      approvers: input.approvers,
    };
    return {
      transaction: 'shared-config-tx',
      wallet: 'wallet-pda',
      threshold: input.threshold,
      approvers: input.approvers,
    };
  },
  revokeSharedIkaApprover: async (input: { approver: string }) => {
    sharedConfig = sharedConfig
      ? {
          threshold: Math.min(sharedConfig.threshold, Math.max(sharedConfig.approvers.length - 1, 1)),
          approvers: sharedConfig.approvers.filter((approver) => approver !== input.approver),
        }
      : null;
    return {
      transaction: 'shared-revoke-tx',
      wallet: 'wallet-pda',
      approver: input.approver,
    };
  },
  getWalletData: async () => sharedConfig ? ({
    sharedIkaApprovals: {
      enabled: true,
      threshold: sharedConfig.threshold,
      approvers: sharedConfig.approvers.map((key) => ({ key, authorized: true })),
    },
  }) : null,
  runConfidentialDca: async (input: RunConfidentialDcaInput) => {
    if (encryptDcaMode === 'pending') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_PENDING',
        status: 'pending-encrypt-execution' as const,
        reason: 'Encrypt policy graph execution is pending verification.',
        encryptPolicy: {
          ...encryptPolicyBase,
          status: 'pending-encrypt-execution' as const,
          pendingSlot: 101,
        },
      };
    }
    if (encryptDcaMode === 'blocked') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_BLOCKED',
        status: 'encrypt-verified-blocked' as const,
        reason: 'Encrypt policy verified blocked.',
        encryptPolicy: {
          ...encryptPolicyBase,
          status: 'encrypt-verified-blocked' as const,
          verifiedSlot: 102,
        },
      };
    }
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
      ...(encryptDcaMode === 'allowed' && {
        status: 'encrypt-verified-allowed' as const,
        encryptPolicy: {
          ...encryptPolicyBase,
          status: 'encrypt-verified-allowed' as const,
          verifiedSlot: 103,
        },
      }),
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
  runMultichainIntent: async (input: RunMultichainIntentInput) => {
    multichainInputs.push(input);
    const routeAllowed =
      input.sourceChain === 'solana' &&
      input.sourceAsset === 'USDC' &&
      ((input.targetChain === 'sui' && input.targetAsset === 'SUI') ||
        (input.targetChain === 'ethereum' && input.targetAsset === 'ETH')) &&
      input.routeGuardrails?.allowedTargetChains.includes(input.targetChain) &&
      input.routeGuardrails?.allowedTargetAssets.includes(input.targetAsset) &&
      input.riskGuardrails?.mode === 'bridgeless-route-risk' &&
      input.riskGuardrails.requireVerifiedRoute === true;
    if (!routeAllowed) {
      return {
        allowed: false,
        code: 'IKA_ROUTE_NOT_ALLOWED',
        reason: 'This chain or asset route is outside the wallet allowed route policy. No Ika approval data was prepared.',
      };
    }
    if (encryptIkaMode === 'pending') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_PENDING',
        status: 'pending-encrypt-execution' as const,
        reason: 'Encrypt policy graph execution is pending verification.',
        encryptPolicy: {
          ...encryptPolicyBase,
          status: 'pending-encrypt-execution' as const,
          pendingSlot: 201,
        },
      };
    }
    if (encryptIkaMode === 'blocked') {
      return {
        allowed: false,
        code: 'ENCRYPT_POLICY_BLOCKED',
        status: 'encrypt-verified-blocked' as const,
        reason: 'Encrypt policy verified blocked.',
        encryptPolicy: {
          ...encryptPolicyBase,
          status: 'encrypt-verified-blocked' as const,
          verifiedSlot: 202,
        },
      };
    }
    if (input.amount === '25') {
      return {
        allowed: false,
        code: 'CONFIDENTIAL_POLICY_BLOCKED',
        reason: 'Confidential policy blocked this Ika request.',
      };
    }
    if (input.sharedAccess?.policy && (input.sharedAccess.approvals?.length ?? 0) < input.sharedAccess.policy.threshold && sharedIkaAttempts === 0) {
      sharedIkaAttempts += 1;
      return {
        allowed: false,
        code: 'IKA_APPROVAL_QUORUM_REQUIRED',
        status: 'needs-approval',
        reason: 'Shared access quorum is required before Polet prepares Ika approval data.',
        approval: {
          status: 'needs-approval' as const,
          required: input.sharedAccess.policy.threshold,
          received: input.sharedAccess.approvals?.length ?? 0,
          threshold: input.sharedAccess.policy.threshold,
          totalApprovers: input.sharedAccess.policy.approvers.length,
          approvedApprovers: input.sharedAccess.approvals?.map((approval) => approval.approver) ?? [],
          missingApprovals: input.sharedAccess.policy.threshold - (input.sharedAccess.approvals?.length ?? 0),
          challenge: 'polet.ika.shared-approval.v1:test-challenge',
        },
      };
    }
    sharedIkaAttempts += 1;

    return {
      allowed: true,
      code: 'IKA_APPROVAL_TRANSACTION_PREPARED',
      ikaRequest: {
        executionRail: 'ika-bridgeless' as const,
        settlement: 'not-executed' as const,
        requestId: 'ika-test-request',
        canonicalOrderHash: 'canonical-order-hash',
        ikaMessageHash: '8d'.repeat(32),
        routeRisk: input.routeRisk,
        ...(input.targetChain === 'ethereum'
          ? {
              ethereumMessageDigest: {
                digestHex: `0x${'ab'.repeat(32)}`,
                action: 'zero-wei-transfer-proof',
                chain: 'ethereum',
                network: 'sepolia',
                chainId: 11155111,
                broadcastable: false,
                productionSettlement: false,
              },
            }
          : {
              suiTransactionDigest: {
                digestHex: `0x${'cd'.repeat(32)}`,
                digestBase58: 'SuiDigest1111111111111111111111111111111111',
                action: 'zero-mist-transfer-proof',
                chain: 'sui',
                network: 'sui-devnet',
                broadcastable: false,
                productionSettlement: false,
              },
            }),
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
          status: encryptIkaMode === 'allowed' ? 'encrypt-verified-allowed' as const : 'approved' as const,
          policySequence: 3,
          attestationHash: 'safe-attestation-hash',
          ...(encryptIkaMode === 'allowed' && {
            encryptPolicy: {
              ...encryptPolicyBase,
              status: 'encrypt-verified-allowed' as const,
              verifiedSlot: 203,
            },
          }),
        },
        executionBoundary: {
          status: 'approval-transaction-prepared' as const,
          note: 'Ika Pre-Alpha approval transaction prepared; settlement is not executed.',
        },
        preAlphaSigning: {
          status: 'approval-transaction-prepared' as const,
          dwalletAccount: 'DwalleT111111111111111111111111111111111111',
          ikaMessageHash: '8d'.repeat(32),
          messageDigest: '8d'.repeat(32),
          messageApprovalPda: 'MsgApprove1111111111111111111111111111111',
          cpiAuthorityPda: 'CpiAuth1111111111111111111111111111111111',
          signatureScheme: 'ed25519-prealpha',
        },
        poletApprovalTransaction: {
          transaction: 'polet-ika-approval-tx',
          signers: [input.sessionKey, ...(input.sharedAccess?.approvals?.map((approval) => approval.approver) ?? input.sharedAccess?.policy?.approvers ?? [])],
        },
      },
    };
  },
};

function renderDemo() {
  return render(
    <DemoTabContent
      owner="AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2"
      agentAddresses={[coApproverA, coApproverB]}
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

    expect(view.getByText(/control layer rahasia untuk ai agents/i)).toBeTruthy();
    expect(view.getByText(/intent multichain/i)).toBeTruthy();
    expect(view.getByText(/settlement ika belum dijalankan/i)).toBeTruthy();
    expect(view.getAllByText(/solana usdc/i).length).toBeGreaterThan(0);
    expect(view.getAllByText(/solana sol/i).length).toBeGreaterThan(0);
    expect(view.getByText(/jupiter strategy rail/i)).toBeTruthy();
    expect(view.getByText(/sui\/sui primary destination/i)).toBeTruthy();
    expect(view.getByText(/ethereum\/eth optional allowed route/i)).toBeTruthy();
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

  test('renders official Encrypt DCA lifecycle states without executable payload leaks', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    encryptDcaMode = 'pending';
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt pending/i)).toBeTruthy());
    let logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('polet_policy_guardrail_graph');
    expect(logText).toContain('pending-encrypt-execution');
    expect(logText).not.toContain('Jupiter route siap');
    expect(logText).not.toContain('Policy-gated payload');

    encryptDcaMode = 'blocked';
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt blocked/i)).toBeTruthy());
    logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('encrypt-verified-blocked');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
    expect(logText).not.toContain('agent-tx');

    encryptDcaMode = 'allowed';
    fireEvent.click(view.getByRole('button', { name: /run 5 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt verified/i)).toBeTruthy());
    logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('encrypt-verified-allowed');
    expect(logText).toContain('Jupiter route siap');
  });

  test('displays blocked and approved Ika dWallet proof without exposing thresholds', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try 25 ika request/i }));
    await waitFor(() => expect(view.getByText(/ika request blocked/i)).toBeTruthy());
    let logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).not.toContain('dWallet');
    expect(logText).not.toContain('MessageApproval');

    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(view.getAllByText(/ika approval transaction prepared/i).length).toBeGreaterThan(0));

    expect(view.getByText(/Ika dWallet approval/i)).toBeTruthy();
    expect(view.getAllByText(/solana usdc/i).length).toBeGreaterThan(0);
    expect(view.getAllByText(/sui sui/i).length).toBeGreaterThan(0);
    expect(view.getByText(/technical proof/i)).toBeTruthy();
    expect(view.getByText(/route risk/i)).toBeTruthy();
    expect(view.getByText(/slippage and risk guardrails passed/i)).toBeTruthy();
    expect(view.getByText(/messageapproval/i)).toBeTruthy();
    expect(view.getByText(/message hash/i)).toBeTruthy();
    expect(view.getByText(/ed25519-prealpha/i)).toBeTruthy();
    logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
  });

  test('renders official Encrypt Ika lifecycle states without approval payload leaks', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    encryptIkaMode = 'pending';
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(view.getByText(/encrypt pending/i)).toBeTruthy());
    let logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('pending-encrypt-execution');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('dWallet');

    encryptIkaMode = 'blocked';
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(view.getByText(/encrypt blocked/i)).toBeTruthy());
    logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('encrypt-verified-blocked');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('dWallet');
    expect(logText).not.toContain('10 USDC');

    encryptIkaMode = 'allowed';
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(view.getAllByText(/ika approval transaction prepared/i).length).toBeGreaterThan(0));
    logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('encrypt-verified-allowed');
    expect(logText).toContain('MessageApproval');
    expect(logText).toContain('dWallet');
  });

  test('displays approved Ethereum Ika route with Sepolia EIP-191 digest', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /approve 5 ethereum\/eth ika/i }));
    await waitFor(() => expect(view.getAllByText(/ika approval transaction prepared/i).length).toBeGreaterThan(0));

    expect(view.getAllByText(/ethereum eth/i).length).toBeGreaterThan(0);
    expect(view.getByText(/sepolia eip-191/i)).toBeTruthy();
    expect(view.getByText(/0xabab/i)).toBeTruthy();
    expect(view.getByText(/messageapproval/i)).toBeTruthy();
    expect(multichainInputs.at(-1)?.targetChain).toBe('ethereum');
    expect(multichainInputs.at(-1)?.targetAsset).toBe('ETH');
    expect(multichainInputs.at(-1)?.routeGuardrails?.allowedTargetChains).toContain('ethereum');
    expect(multichainInputs.at(-1)?.routeGuardrails?.allowedTargetAssets).toContain('ETH');
    expect(multichainInputs.at(-1)?.riskGuardrails?.requireVerifiedRoute).toBe(true);
  });

  test('blocks 25 USDC-equivalent Ethereum Ika without approval or digest proof', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try 25 ethereum\/eth ika/i }));
    await waitFor(() => expect(view.getByText(/ika request blocked/i)).toBeTruthy());

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('Confidential policy blocked this Ika request.');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('sepolia');
    expect(logText).not.toContain('0xabab');
    expect(multichainInputs.at(-1)?.targetChain).toBe('ethereum');
  });

  test('shows safe unsupported Ika route explanation without approval proof', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try unsupported ika route/i }));
    await waitFor(() => expect(view.getByText(/rute ika tidak diizinkan/i)).toBeTruthy());

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('No Ika approval data was prepared');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
  });

  test('configures and revokes shared Ika co-approvers', async () => {
    const view = renderDemo();

    fireEvent.click(view.getByRole('button', { name: /sign & configure quorum/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/2\/2\s+Quorum ready/i));
    expect(view.getAllByText(coApproverA).length).toBeGreaterThan(0);
    expect(view.getAllByText(coApproverB).length).toBeGreaterThan(0);

    fireEvent.click(view.getAllByRole('button', { name: /revoke/i })[0]);
    await waitFor(() => expect(document.body.textContent).toMatch(/1\/1\s+Quorum ready/i));
  });

  test('shows missing and ready shared Ika quorum states without policy leaks', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);
    fireEvent.click(view.getByRole('button', { name: /sign & configure quorum/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/2\/2\s+Quorum ready/i));

    await waitFor(() => expect(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(view.getByText(/needs approval/i)).toBeTruthy());
    expect(view.getByText(/0\/2 butuh co-approval/i)).toBeTruthy();
    expect(view.getByText(/2 co-approvals/i)).toBeTruthy();
    expect(document.body.textContent).not.toContain('MessageApproval');

    fireEvent.change(view.getByPlaceholderText(/\[\{"approver"/i), {
      target: {
        value: JSON.stringify([
          { approver: coApproverA, signature: 'sig-a', encoding: 'base64' },
          { approver: coApproverB, signature: 'sig-b', encoding: 'base64' },
        ]),
      },
    });
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));

    await waitFor(() => expect(view.getAllByText(/co-approver counted/i).length).toBeGreaterThanOrEqual(1));
    expect(view.getAllByText(/ika approval transaction prepared/i).length).toBeGreaterThan(0);
    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('CxW8ng8');
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

    expect(view.getByText(/confidential control layer for ai agents/i)).toBeTruthy();
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
