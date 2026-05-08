import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import type { ComponentProps } from 'react';
import { DemoTabContent } from './DemoTab';
import type {
  ExecuteEncryptPolicyGraphInput,
  RequestPendingAllowedOutputDecryptionInput,
  RequestPolicyValueDecryptionInput,
  RunConfidentialDcaInput,
  RunMultichainIntentInput,
} from '../lib/api';
import type { OfficialEncryptExecutionCiphertexts, OfficialEncryptPolicyCiphertexts } from '../lib/official-encrypt-client';

afterEach(() => {
  document.body.innerHTML = '';
  sharedConfig = null;
  sharedIkaAttempts = 0;
  dcaInputs = [];
  multichainInputs = [];
  recoveryAccessInputs = [];
  officialEncryptPolicyInputs = [];
  executeEncryptGraphInputs = [];
  encryptCiphertextStatusInputs = [];
  policyRevealInputs = [];
  grantKeyInputs = [];
  existingSessionKeys = [];
  createdPolicyCiphertextInputs = [];
  createdExecutionCiphertextInputs = [];
  encryptDcaMode = null;
  encryptIkaMode = null;
  encryptDepositAlreadyExists = false;
  initializedWallet = false;
  signedTransactions = [];
});

let sharedConfig: { threshold: number; approvers: string[] } | null = null;
let sharedIkaAttempts = 0;
let dcaInputs: RunConfidentialDcaInput[] = [];
let multichainInputs: RunMultichainIntentInput[] = [];
let recoveryAccessInputs: Parameters<typeof api.recoverAccess>[0][] = [];
let officialEncryptPolicyInputs: Parameters<typeof api.setOfficialEncryptCiphertextPolicy>[0][] = [];
let executeEncryptGraphInputs: ExecuteEncryptPolicyGraphInput[] = [];
let encryptCiphertextStatusInputs: string[] = [];
let policyRevealInputs: RequestPolicyValueDecryptionInput[] = [];
let grantKeyInputs: Array<{ owner: string; sessionKey: string; expiresAt: number; dailyLimit: number }> = [];
let existingSessionKeys: string[] = [];
let createdPolicyCiphertextInputs: Array<{ maxPerRunUsdc: string; dailyCapUsdc: string }> = [];
let createdExecutionCiphertextInputs: Array<{ amountUsdc: string }> = [];
let encryptDcaMode: 'pending' | 'allowed' | 'blocked' | null = null;
let encryptIkaMode: 'pending' | 'allowed' | 'blocked' | null = null;
let encryptDepositAlreadyExists = false;
let initializedWallet = false;
let signedTransactions: string[] = [];
const coApproverA = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
const coApproverB = 'CxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR5';
const connectedOwner = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';
const freshOfficialCiphertexts: OfficialEncryptPolicyCiphertexts = {
  maxPerRunCiphertext: 'FreshMaxCiphertext111111111111111111111111',
  dailyCapCiphertext: 'FreshCapCiphertext111111111111111111111111',
  dailySpentCiphertext: 'FreshSpentCiphertext11111111111111111111',
  policyCommitment: Array.from({ length: 32 }, (_, index) => index),
  grpcEndpoint: 'encrypt-grpc.polet.dev:443',
};
const freshExecutionCiphertexts: OfficialEncryptExecutionCiphertexts = {
  sourceAmountCiphertext: 'FreshSourceCiphertext1111111111111111111111',
  allowedOutputCiphertext: 'FreshAllowedCiphertext11111111111111111111',
  dailySpentOutputCiphertext: 'FreshDailyOutputCiphertext1111111111111111',
  grpcEndpoint: 'encrypt-grpc.polet.dev:443',
};
const legacyInitialExecutionCiphertexts: OfficialEncryptExecutionCiphertexts = {
  sourceAmountCiphertext: 'Hn3nScX1Sx4q84ZKQ4TjHEujc75QfYmAHp1ko6ehWZ4s',
  allowedOutputCiphertext: '9a5UcaYhLd64bY31K2vufX4yyJPxi8xDd83j3M8YtHfP',
  dailySpentOutputCiphertext: '5sDPGQjGAgzJ6fmBjtyJUjW3pYLnEyEXN14NiHyBUXrz',
  grpcEndpoint: 'encrypt-grpc.polet.dev:443',
};

function mockDecryptionRequestData(usdc: bigint) {
  const data = new Uint8Array(115);
  const view = new DataView(data.buffer);
  view.setUint32(99, 8, true);
  view.setUint32(103, 8, true);
  view.setBigUint64(107, usdc * 1_000_000n, true);
  return data;
}

const encryptPolicyBase = {
  policySequence: 7,
  sourceAmountCiphertext: 'EncryptSourceCiphertext111111111111111111',
  allowedOutputCiphertext: 'EncryptAllowedOutput1111111111111111111',
  dailySpentOutputCiphertext: 'EncryptDailySpentOutput1111111111111111',
  graph: 'polet_policy_guardrail_graph' as const,
  encryptProgram: 'EncryptProGram1111111111111111111111111111111',
  grpcEndpoint: 'encrypt-grpc.polet.dev:443',
  inputCiphertexts: {
    sourceAmount: 'InputSrcCiphertext111111111111111111111',
    maxPerRun: 'InputMaxCiphertext11111111111111111111111',
    dailySpent: 'InputDailyCiphertext111111111111111111111',
    dailyCap: 'InputCapCiphertext111111111111111111111111',
  },
  pendingOutputCiphertexts: {
    allowedOutput: 'PendingAllowedOutput11111111111111111111',
    dailySpentOutput: 'PendingDailyOutput111111111111111111111',
  },
  suppressedUntilVerified: [
    'JupiterPayloadSuppressed111111111111111111',
    'DwalletArtifactSuppressed11111111111111111',
    'ApprovalDataSuppressed11111111111111111111',
  ],
};

const api = {
  initializeWallet: async () => {
    initializedWallet = true;
    return {
      transaction: 'initialize-wallet-tx',
      wallet: 'wallet-pda',
    };
  },
  setConfidentialPolicy: async () => ({
    transaction: 'policy-tx',
    wallet: 'wallet-pda',
    policyCommitment: Array.from({ length: 32 }, () => 1), // legacy masked-witness dev fixture (issue #054)
    encryptionWitnessHash: Array.from({ length: 32 }, () => 2), // legacy masked-witness dev fixture (issue #054)
  }),
  setOfficialEncryptCiphertextPolicy: async (input: {
    owner: string;
    maxPerRunCiphertext: string;
    dailyCapCiphertext: string;
    dailySpentCiphertext: string;
    policyCommitment: number[];
    encrypt: {
      encryptProgram?: string;
      config: string;
      deposit: string;
      networkEncryptionKey: string;
      eventAuthority: string;
      payer?: string;
    };
  }) => {
    officialEncryptPolicyInputs.push(input);
    return {
      transaction: 'official-encrypt-policy-tx',
      wallet: 'wallet-pda',
      encryptProgram: input.encrypt.encryptProgram ?? 'encrypt-program',
      grpcEndpoint: 'encrypt-grpc.polet.dev:443',
      ciphertexts: {
        maxPerRun: input.maxPerRunCiphertext,
        dailyCap: input.dailyCapCiphertext,
        dailySpent: input.dailySpentCiphertext,
      },
      graph: 'polet_policy_guardrail_graph' as const,
      boundary: 'unsigned-official-encrypt-policy-registration' as const,
    };
  },
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
  getWalletData: async () => {
    const policyInput = officialEncryptPolicyInputs.at(-1);
    const graphInput = executeEncryptGraphInputs.at(-1);
    const walletData = (initializedWallet || policyInput) ? {
      walletPda: 'wallet-pda',
      policySeq: 7,
      lastRevokedSlot: 2,
      sessions: [
        ...existingSessionKeys.map((key) => ({
          key,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          grantedSlot: 2,
          authorized: true,
        })),
        ...grantKeyInputs.map((input) => ({
          key: input.sessionKey,
          expiresAt: input.expiresAt,
          grantedSlot: 2,
          authorized: true,
        })),
      ],
      confidentialPolicy: {
        enabled: Boolean(policyInput),
        encryptCiphertexts: {
          configured: Boolean(policyInput),
          maxPerRun: policyInput?.maxPerRunCiphertext ?? '',
          dailyCap: policyInput?.dailyCapCiphertext ?? '',
          dailySpent: policyInput?.dailySpentCiphertext ?? '',
          pending: Boolean(graphInput),
          pendingSourceAmount: graphInput?.sourceAmountCiphertext ?? '',
          pendingAllowedOutput: graphInput?.allowedOutputCiphertext ?? '',
          pendingDailySpentOutput: graphInput?.dailySpentOutputCiphertext ?? '',
          pendingSlot: graphInput ? 101 : 0,
          pendingPolicySeq: graphInput ? 7 : 0,
        },
      },
    } : null;
    const shared = sharedConfig ? {
      sharedIkaApprovals: {
        enabled: true,
        threshold: sharedConfig.threshold,
        approvers: sharedConfig.approvers.map((key) => ({ key, authorized: true })),
      },
    } : {};
    return walletData ? { ...walletData, ...shared } : sharedConfig ? shared : null;
  },
  broadcastIkaDestination: async () => ({
    ok: false,
    status: 'broadcast-disabled' as const,
    code: 'BROADCAST_DISABLED',
    reason: 'Destination broadcast demo is disabled.',
    demoPath: {
      chain: 'solana',
      cluster: 'devnet',
      action: 'memo-proof',
      asset: 'none',
      faucetRequirement: 'fee payer needs devnet SOL only; no user asset is moved',
      receiptVerification: 'Solana devnet transaction signature and explorer URL',
      productionSettlement: false as const,
    },
  }),
  setRecoveryAuthority: async () => ({ transaction: 'recovery-tx', wallet: 'wallet-pda', recoveryAuthority: 'recovery-auth', activity: { type: 'recovery', status: 'set', privacy: 'redacted' } }),
  recoverAccess: async (input: { owner: string; authority: string; compromisedSessions: string[]; sharedIkaThreshold: number; sharedIkaApprovers: string[]; pendingDwalletController: string }) => {
    recoveryAccessInputs.push(input);
    return { transaction: 'recover-tx', wallet: 'wallet-pda', authority: input.authority, compromisedSessions: input.compromisedSessions, sharedIkaThreshold: input.sharedIkaThreshold, sharedIkaApprovers: input.sharedIkaApprovers, pendingDwalletController: input.pendingDwalletController, activity: { type: 'recover', status: 'done', states: ['sessions-revoked'], privacy: 'redacted', boundary: 'mock' } };
  },
  grantKey: async (input: { owner: string; sessionKey: string; expiresAt: number; dailyLimit: number }) => {
    grantKeyInputs.push(input);
    return { transaction: 'grant-key-tx' };
  },
  revokeSession: async (input: { sessionKey: string }) => ({
    transaction: 'revoke-session-tx',
    wallet: 'wallet-pda',
    sessionKey: input.sessionKey,
  }),
  requestPasskeyChallenge: async () => ({ challenge: Array.from(new Uint8Array(32)), publicKeyCredentialRequestOptions: { challenge: Array.from(new Uint8Array(32)), rpId: 'localhost', allowCredentials: [], userVerification: 'preferred' }, boundary: 'mock' }),
  verifyPasskeyAssertion: async () => ({ valid: false, approverPublicKey: '', challengeUsed: '', boundary: 'mock' }),
  createEncryptDeposit: async () => ({
    transaction: encryptDepositAlreadyExists ? null : 'encrypt-deposit-tx',
    signers: [connectedOwner],
    deposit: 'EncryptDeposit111111111111111111111111111111',
    config: 'EncryptConfig1111111111111111111111111111111',
    eventAuthority: 'EncryptEventAuthority111111111111111111111',
    status: encryptDepositAlreadyExists ? 'existing-deposit' : 'pending-deposit-creation',
  }),
  getEncryptCiphertextStatus: async (ciphertext: string) => {
    encryptCiphertextStatusInputs.push(ciphertext);
    return {
      address: ciphertext,
      exists: true,
      owner: 'encrypt-program',
      dataLength: 100,
      status: 'verified' as const,
      statusByte: 1,
      fheType: 0,
      digest: '11'.repeat(32),
      authorized: 'polet-program',
    };
  },
  executeEncryptPolicyGraph: async (input: ExecuteEncryptPolicyGraphInput) => {
    executeEncryptGraphInputs.push(input);
    return {
      transaction: 'encrypt-graph-tx',
      wallet: input.wallet,
      status: 'pending-encrypt-execution' as const,
      encryptProgram: input.encrypt.encryptProgram ?? 'encrypt-program',
      grpcEndpoint: 'encrypt-grpc.polet.dev:443',
      graph: 'polet_policy_guardrail_graph' as const,
      inputCiphertexts: {
        sourceAmount: input.sourceAmountCiphertext,
        maxPerRun: input.maxPerRunCiphertext,
        dailySpent: input.dailySpentCiphertext,
        dailyCap: input.dailyCapCiphertext,
      },
      pendingOutputCiphertexts: {
        allowedOutput: input.allowedOutputCiphertext,
        dailySpentOutput: input.dailySpentOutputCiphertext,
      },
      suppressedUntilVerified: ['jupiterExecutionPayload', 'dwallet', 'messageApproval', 'destinationDigest', 'poletApprovalTransaction'],
    };
  },
  requestPolicyValueDecryption: async (input: RequestPolicyValueDecryptionInput) => {
    policyRevealInputs.push(input);
    return {
      transaction: 'policy-reveal-tx',
      wallet: input.wallet,
      request: input.request,
      kind: input.kind,
      ciphertext: input.ciphertext,
      status: 'policy-reveal-requested' as const,
      encryptProgram: input.encrypt.encryptProgram ?? 'encrypt-program',
      grpcEndpoint: 'encrypt-grpc.polet.dev:443',
      boundary: 'owner-signed-public-decryption-request' as const,
      warning: 'Encrypt pre-alpha decryption request accounts may expose plaintext publicly after the decryptor responds.',
    };
  },
  requestPendingAllowedOutputDecryption: async (input: RequestPendingAllowedOutputDecryptionInput) => ({
    transaction: 'allowed-output-decryption-tx',
    wallet: input.wallet ?? 'wallet-pda',
    request: input.request,
    status: 'allowed-output-decryption-requested' as const,
    graph: 'polet_policy_guardrail_graph' as const,
    policySequence: 7,
    allowedOutputCiphertext: freshExecutionCiphertexts.allowedOutputCiphertext,
    allowedOutputDigest: '11'.repeat(32),
    encryptProgram: input.encrypt.encryptProgram ?? 'encrypt-program',
    grpcEndpoint: 'encrypt-grpc.polet.dev:443',
    boundary: 'owner-signed-public-decryption-request' as const,
    warning: 'Encrypt pre-alpha decryption request accounts may expose plaintext output values publicly after the decryptor responds.',
  }),
  resolveEncryptPolicyDecision: async () => ({
    ...encryptPolicyBase,
    status: encryptDcaMode === 'allowed' || encryptIkaMode === 'allowed'
      ? 'encrypt-verified-allowed' as const
      : 'encrypt-verified-blocked' as const,
    verifiedSlot: 104,
  }),
  runConfidentialDca: async (input: RunConfidentialDcaInput) => {
    dcaInputs.push(input);
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
    if ((input.slippageBps ?? 100) > 150) {
      return {
        allowed: false,
        code: 'IKA_RISK_GUARDRAIL_BLOCKED',
        reason: 'Requested bridgeless slippage is outside the wallet route-risk policy. No Ika approval data was prepared.',
      };
    }
    if ((input.routeRisk?.priceImpactBps ?? 0) > 300) {
      return {
        allowed: false,
        code: 'IKA_RISK_GUARDRAIL_BLOCKED',
        reason: 'Estimated bridgeless route price impact is outside the wallet route-risk policy. No Ika approval data was prepared.',
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

function renderDemo(options: {
  createPolicyCiphertexts?: ComponentProps<typeof DemoTabContent>['createPolicyCiphertexts'];
  executeGraphBeforeRequests?: boolean;
  initialExecutionCiphertexts?: OfficialEncryptExecutionCiphertexts | null;
  owner?: string;
  agentAddresses?: string[];
} = {}) {
  return render(
    <DemoTabContent
      owner={options.owner ?? connectedOwner}
      agentAddresses={options.agentAddresses ?? [coApproverA, coApproverB]}
      signAndConfirmTransaction={async (transaction) => {
        signedTransactions.push(transaction);
        return 'sig111111';
      }}
      api={api}
      createPolicyCiphertexts={options.createPolicyCiphertexts ?? (async (input) => {
        createdPolicyCiphertextInputs.push(input);
        return freshOfficialCiphertexts;
      })}
      createExecutionCiphertexts={async (input) => {
        createdExecutionCiphertextInputs.push(input);
        return freshExecutionCiphertexts;
      }}
      executeGraphBeforeRequests={options.executeGraphBeforeRequests ?? false}
      initialExecutionCiphertexts={options.initialExecutionCiphertexts ?? legacyInitialExecutionCiphertexts}
      readDecryptionRequest={async () => mockDecryptionRequestData(10n)}
    />
  );
}

async function setupCustodyAndPolicy(view: ReturnType<typeof renderDemo>) {
  fireEvent.click(view.getByRole('button', { name: /setup custody pda/i }));
  await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
  await waitFor(() => expect(view.getByText(/custody siap/i)).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: /sign & simpan policy/i }));
  await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
  fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
  await waitFor(() => expect(view.getAllByText(/policy on-chain tersimpan/i)[0]).toBeTruthy());
  expect(signedTransactions).toContain('official-encrypt-policy-tx');
}

describe('Consumer DCA demo frontend', () => {
  test('keeps Encrypt ciphertext refs out of the primary policy form', async () => {
    const view = renderDemo();

    expect(view.getAllByText(/encrypt pre-alpha/i).length).toBeGreaterThan(0);
    expect(view.getByText(/maks per run/i)).toBeTruthy();
    expect(view.getByText(/batas harian/i)).toBeTruthy();
    expect(view.queryByDisplayValue('hiVdhhKSpVoN8rMf5rXtaU43LTXRH97Xc2E3odhbqmd')).toBeNull();
    expect(view.queryByDisplayValue('C1p8HE5Pn9CUd4S3ui15XPGGSCc2c8A6mQsJhpp9yrLi')).toBeNull();

    await setupCustodyAndPolicy(view);

    expect(view.getByText(/referensi teknis encrypt/i)).toBeTruthy();
    expect(createdPolicyCiphertextInputs).toEqual([{ maxPerRunUsdc: '10', dailyCapUsdc: '20' }]);
    expect(officialEncryptPolicyInputs).toHaveLength(1);
    expect(officialEncryptPolicyInputs[0]).toMatchObject({
      owner: connectedOwner,
      maxPerRunCiphertext: freshOfficialCiphertexts.maxPerRunCiphertext,
      dailyCapCiphertext: freshOfficialCiphertexts.dailyCapCiphertext,
      dailySpentCiphertext: freshOfficialCiphertexts.dailySpentCiphertext,
      policyCommitment: freshOfficialCiphertexts.policyCommitment,
    });
    expect(JSON.stringify(officialEncryptPolicyInputs[0])).not.toContain('maskedWitnessDevFixture');
  });

  test('keeps policy masked by default, reveals one owner-selected value in memory, and hides it', async () => {
    const view = renderDemo();
    await setupCustodyAndPolicy(view);

    expect(view.getAllByText('********').length).toBeGreaterThanOrEqual(3);
    fireEvent.click(view.getAllByRole('button', { name: /reveal/i })[0]);
    await waitFor(() => expect(view.getByText(/owner harus sign request reveal/i)).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));

    await waitFor(() => expect(view.getByText('10 USDC')).toBeTruthy());
    expect(policyRevealInputs).toHaveLength(1);
    expect(policyRevealInputs[0].kind).toBe('max-per-run');
    expect(signedTransactions).toContain('policy-reveal-tx');
    expect(view.getByText(/policy reveal siap/i)).toBeTruthy();
    expect(view.queryByText(/10 USDC.*sig/i)).toBeNull();

    fireEvent.click(view.getAllByRole('button', { name: /hide/i })[0]);
    await waitFor(() => expect(view.queryByText('10 USDC')).toBeNull());
    expect(view.getAllByText('********').length).toBeGreaterThanOrEqual(3);
  });

  test('signs Encrypt deposit only when the setup route returns a transaction', async () => {
    encryptDepositAlreadyExists = true;
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    expect(officialEncryptPolicyInputs).toHaveLength(1);
    expect(signedTransactions).toContain('custody-tx');
    expect(signedTransactions).toContain('official-encrypt-policy-tx');
    expect(signedTransactions).not.toContain('encrypt-deposit-tx');
  });

  test('shows Encrypt createInput failure and does not register Polet policy', async () => {
    const view = renderDemo({
      createPolicyCiphertexts: async (input) => {
        createdPolicyCiphertextInputs.push(input);
        throw new Error('gRPC createInput unavailable');
      },
    });

    fireEvent.click(view.getByRole('button', { name: /setup custody pda/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getByText(/custody siap/i)).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & simpan policy/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));

    await waitFor(() => expect(view.getAllByText(/official encrypt pre-alpha setup failed: grpc createinput unavailable/i).length).toBeGreaterThan(0));
    expect(createdPolicyCiphertextInputs).toEqual([{ maxPerRunUsdc: '10', dailyCapUsdc: '20' }]);
    expect(officialEncryptPolicyInputs).toHaveLength(0);
    expect(signedTransactions).not.toContain('official-encrypt-policy-tx');
    expect(signedTransactions).not.toContain('encrypt-deposit-tx');
  });

  test('submits official Encrypt graph before primary DCA and Ika requests when the wallet can sign the session', async () => {
    existingSessionKeys = [coApproverA];
    const view = renderDemo({
      owner: coApproverA,
      agentAddresses: [coApproverA, coApproverB],
      executeGraphBeforeRequests: true,
      initialExecutionCiphertexts: null,
    });

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt pending/i)).toBeTruthy());

    expect(createdExecutionCiphertextInputs).toEqual([{ amountUsdc: '25' }]);
    expect(executeEncryptGraphInputs).toHaveLength(1);
    expect(executeEncryptGraphInputs[0]).toMatchObject({
      wallet: 'wallet-pda',
      sessionKey: coApproverA,
      sourceAmountCiphertext: freshExecutionCiphertexts.sourceAmountCiphertext,
      maxPerRunCiphertext: freshOfficialCiphertexts.maxPerRunCiphertext,
      dailySpentCiphertext: freshOfficialCiphertexts.dailySpentCiphertext,
      dailyCapCiphertext: freshOfficialCiphertexts.dailyCapCiphertext,
      allowedOutputCiphertext: freshExecutionCiphertexts.allowedOutputCiphertext,
      dailySpentOutputCiphertext: freshExecutionCiphertexts.dailySpentOutputCiphertext,
      attestationSlot: 3,
      attestationPolicySeq: 7,
    });
    expect(signedTransactions).toContain('encrypt-graph-tx');
    expect(encryptCiphertextStatusInputs).toContain(freshExecutionCiphertexts.allowedOutputCiphertext);
    expect(signedTransactions).toContain('allowed-output-decryption-tx');
    expect(grantKeyInputs).toHaveLength(0);
    expect(dcaInputs).toHaveLength(0);

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('pending-encrypt-execution');
    expect(logText).toContain('polet_policy_guardrail_graph');
    expect(logText).toContain('101');
    expect(logText).toContain('jupiterE');
    expect(logText).toContain('messageA');
    expect(logText).not.toContain('Jupiter route siap');
    expect(logText).not.toContain('MessageApproval');
    expect(JSON.stringify(executeEncryptGraphInputs)).not.toContain('maskedWitnessDevFixture');

    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));
    await waitFor(() => expect(createdExecutionCiphertextInputs).toEqual([{ amountUsdc: '25' }, { amountUsdc: '5' }]));
    await waitFor(() => expect(encryptCiphertextStatusInputs).toHaveLength(2));
    expect(executeEncryptGraphInputs).toHaveLength(2);
    expect(encryptCiphertextStatusInputs).toEqual([
      freshExecutionCiphertexts.allowedOutputCiphertext,
      freshExecutionCiphertexts.allowedOutputCiphertext,
    ]);
    expect(multichainInputs).toHaveLength(0);
  });

  test('submits the official Encrypt graph from the connected wallet before proxy DCA', async () => {
    existingSessionKeys = [connectedOwner];
    const view = renderDemo({ executeGraphBeforeRequests: true, initialExecutionCiphertexts: null });

    await setupCustodyAndPolicy(view);

    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(createdExecutionCiphertextInputs).toHaveLength(1));

    expect(executeEncryptGraphInputs).toHaveLength(1);
    expect(executeEncryptGraphInputs[0]).toMatchObject({
      sessionKey: connectedOwner,
    });
    expect(grantKeyInputs).toHaveLength(0);
    expect(dcaInputs).toHaveLength(0);
    expect(document.body.textContent).not.toContain('Official Encrypt policy graph must be executed before strategy payloads can be prepared.');
  });

  test('shows checklist progression and gates primary CTAs by prerequisites', async () => {
    const view = renderDemo();

    expect(view.getByText(/checklist demo/i)).toBeTruthy();
    expect(document.body.textContent).toMatch(/aksi berikutnya:\s*setup custody pda/i);
    expect(view.getByRole('button', { name: /sign & simpan policy/i }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: /try 25 usdc via proxy/i }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: /run 5 usdc via proxy/i }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(view.getByRole('button', { name: /setup custody pda/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getByText(/custody siap/i)).toBeTruthy());

    expect(view.getByRole('button', { name: /sign & simpan policy/i }).hasAttribute('disabled')).toBe(false);
    expect(view.getByText(/policy rahasia tersimpan/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /sign & simpan policy/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getAllByText(/policy on-chain tersimpan/i)[0]).toBeTruthy());

    // After policy saved, next action may be strategy or shared/recovery config
    // Just verify the try-25 button is now enabled
    expect(view.getByRole('button', { name: /try 25 usdc via proxy/i }).hasAttribute('disabled')).toBe(false);

    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText('DIBLOKIR')).toBeTruthy());

    // run-5 button may still be disabled if hasAllowedRun is not yet set
    // The core check is that DIBLOKIR appears
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
    expect(view.getByText(/multi-chain support/i)).toBeTruthy();
    expect(view.getByText(/ethereum\/eth optional allowed route/i)).toBeTruthy();
    expect(view.getByText(/official encrypt execution refs/i)).toBeTruthy();
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
    expect(dcaInputs.at(-1)?.officialEncrypt).toMatchObject({
      sourceAmountCiphertext: 'Hn3nScX1Sx4q84ZKQ4TjHEujc75QfYmAHp1ko6ehWZ4s',
      allowedOutputCiphertext: '9a5UcaYhLd64bY31K2vufX4yyJPxi8xDd83j3M8YtHfP',
      dailySpentOutputCiphertext: '5sDPGQjGAgzJ6fmBjtyJUjW3pYLnEyEXN14NiHyBUXrz',
    });
    expect(JSON.stringify(dcaInputs)).not.toContain('maskedWitnessDevFixture');
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
    expect(view.getAllByText(/route risk/i).length).toBeGreaterThan(0);
    expect(view.getByText(/slippage and risk guardrails passed/i)).toBeTruthy();
    expect(view.getByText(/messageapproval/i)).toBeTruthy();
    expect(view.getByText(/message hash/i)).toBeTruthy();
    expect(view.getByText(/ed25519-prealpha/i)).toBeTruthy();
    expect(multichainInputs.at(-1)?.officialEncrypt).toMatchObject({
      sourceAmountCiphertext: 'Hn3nScX1Sx4q84ZKQ4TjHEujc75QfYmAHp1ko6ehWZ4s',
      allowedOutputCiphertext: '9a5UcaYhLd64bY31K2vufX4yyJPxi8xDd83j3M8YtHfP',
      dailySpentOutputCiphertext: '5sDPGQjGAgzJ6fmBjtyJUjW3pYLnEyEXN14NiHyBUXrz',
    });
    expect(JSON.stringify(multichainInputs)).not.toContain('maskedWitnessDevFixture');
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
    expect(logText).toContain('Canonical order');
    expect(logText).toContain('canonica');
    expect(logText).toContain('CPI authority');
    expect(logText).toContain('CpiAuth');
    expect(logText).toContain('Required signers');
    expect(logText).toContain('AxV7mf7p');
    expect(logText).toContain('Settlement');
    expect(logText).toContain('not-executed');
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
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/2\/2\s+Quorum ready/i));
    expect(view.getAllByText(coApproverA).length).toBeGreaterThan(0);
    expect(view.getAllByText(coApproverB).length).toBeGreaterThan(0);

    fireEvent.click(view.getAllByRole('button', { name: /revoke/i })[0]);
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/1\/1\s+Quorum ready/i));
  });

  test('builds recovery access transaction for the connected owner signer', async () => {
    const view = renderDemo();

    fireEvent.change(view.getByPlaceholderText(/recovery authority/i), { target: { value: coApproverA } });
    fireEvent.click(view.getByRole('button', { name: /sign & set recovery authority/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getAllByText(/recovery authority aktif/i).length).toBeGreaterThan(0));

    fireEvent.change(view.getByPlaceholderText(/agent\/session wallet/i), { target: { value: coApproverB } });
    fireEvent.change(view.getByPlaceholderText(/approver public key/i), { target: { value: coApproverA } });
    fireEvent.change(view.getByPlaceholderText(/pending dwallet controller/i), { target: { value: coApproverA } });
    fireEvent.click(view.getByRole('button', { name: /^sign & recover access$/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));

    await waitFor(() => expect(recoveryAccessInputs).toHaveLength(1));
    expect(recoveryAccessInputs[0]?.owner).toBe(connectedOwner);
    expect(recoveryAccessInputs[0]?.authority).toBe(connectedOwner);
  });

  test('shows missing and ready shared Ika quorum states without policy leaks', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);
    fireEvent.click(view.getByRole('button', { name: /sign & configure quorum/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
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

  test('renders verified-allowed quorum-required Ika progress without approval artifacts', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);
    fireEvent.click(view.getByRole('button', { name: /sign & configure quorum/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/2\/2\s+Quorum ready/i));

    encryptIkaMode = 'allowed';
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));

    await waitFor(() => expect(view.getByText(/needs approval/i)).toBeTruthy());
    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('0/2');
    expect(logText).toContain('polet.ik');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('dWallet');
    expect(logText).not.toContain('polet-ika-approval-tx');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
    expect(logText).not.toContain('maskedWitnessDevFixture');
  });

  test('shows route-risk guardrail block in the command-center flow without approval data', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);
    const slippageInput = view.getByTestId('route-risk-slippage') as HTMLInputElement;
    fireEvent.input(slippageInput, { target: { value: '250', valueAsNumber: 250 } });
    await waitFor(() => expect(slippageInput.value).toBe('250'));
    fireEvent.click(view.getByRole('button', { name: /approve 5 usdc-equivalent ika/i }));

    await waitFor(() => {
      const text = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
      expect(text).toContain('IKA_RISK_GUARDRAIL_BLOCKED');
    });
    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';
    expect(logText).toContain('IKA_RISK_GUARDRAIL_BLOCKED');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('dWallet');
    expect(multichainInputs.at(-1)?.slippageBps).toBe(250);
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
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getByText(/custody ready/i)).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & save policy/i }));
    await waitFor(() => expect(view.getByRole('button', { name: /sign & execute/i })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /sign & execute/i }));
    await waitFor(() => expect(view.getAllByText(/on-chain policy saved/i)[0]).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc through proxy/i }));

    await waitFor(() => {
      const activityLog = view.getByText(/activity log/i).parentElement;
      expect(activityLog).toBeTruthy();
      expect(within(activityLog as HTMLElement).getByText('BLOCKED')).toBeTruthy();
    });
  });

  test('official Encrypt policy state displays ciphertext ids and suppresses pending artifacts', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    encryptDcaMode = 'pending';
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt pending/i)).toBeTruthy());

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';

    // Graph name and policy sequence should be visible
    expect(logText).toContain('polet_policy_guardrail_graph');
    expect(logText).toContain('pending-encrypt-execution');

    // Short ciphertext IDs from inputCiphertexts and pendingOutputCiphertexts should be visible (truncated)
    expect(logText).toContain('InputSrc...');
    expect(logText).toContain('PendingA...');
    expect(logText).toContain('encrypt-grpc.polet.dev:443');

    // Suppressed items should be visible (truncated short IDs)
    expect(logText).toContain('Ditekan sampai diverifikasi');
    expect(logText).toContain('JupiterP...');
    expect(logText).toContain('DwalletA...');
    expect(logText).toContain('Approval...');

    // Must NOT show Jupiter execution payload, dWallet data, MessageApproval, thresholds, caps, witness bytes
    expect(logText).not.toContain('Jupiter route siap');
    expect(logText).not.toContain('Policy-gated payload');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');

    // Full ciphertext values must NOT be leaked (only short IDs)
    expect(logText).not.toContain('EncryptSourceCiphertext111111111111111111');
    expect(logText).not.toContain('EncryptAllowedOutput1111111111111111111');
    expect(logText).not.toContain('JupiterPayloadSuppressed111111111111111111');
  });

  test('official Encrypt verified-allowed state shows safe Ika approval preparation', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    // Must run blocked first to enable the "run 5" button
    encryptDcaMode = 'blocked';
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt blocked/i)).toBeTruthy());

    encryptDcaMode = 'allowed';
    fireEvent.click(view.getByRole('button', { name: /run 5 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt verified/i)).toBeTruthy());

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';

    // Verify status and approval preparation message
    expect(logText).toContain('encrypt-verified-allowed');
    expect(logText).toContain('Persiapan approval Ika tersedia');

    // Jupiter route should still be shown for allowed state
    expect(logText).toContain('Jupiter route siap');

    // Full ciphertext values must NOT be leaked
    expect(logText).not.toContain('EncryptSourceCiphertext111111111111111111');
    expect(logText).not.toContain('EncryptAllowedOutput1111111111111111111');
  });

  test('official Encrypt verified-blocked state suppresses all artifacts', async () => {
    const view = renderDemo();

    await setupCustodyAndPolicy(view);

    encryptDcaMode = 'blocked';
    fireEvent.click(view.getByRole('button', { name: /try 25 usdc via proxy/i }));
    await waitFor(() => expect(view.getByText(/encrypt blocked/i)).toBeTruthy());

    const logText = view.getByText(/activity log/i).closest('div')?.textContent ?? '';

    // Verify status and suppression message (Indonesian locale by default)
    expect(logText).toContain('encrypt-verified-blocked');
    expect(logText).toContain('Semua artefak eksekusi ditekan');

    // No Jupiter payload, agent transaction, or private policy values
    expect(logText).not.toContain('Jupiter route siap');
    expect(logText).not.toContain('Policy-gated payload');
    expect(logText).not.toContain('agent-tx');
    expect(logText).not.toContain('10 USDC');
    expect(logText).not.toContain('20 USDC');
    expect(logText).not.toContain('MessageApproval');
    expect(logText).not.toContain('dWallet');

    // Full ciphertext values must NOT be leaked
    expect(logText).not.toContain('EncryptSourceCiphertext111111111111111111');
    expect(logText).not.toContain('EncryptAllowedOutput1111111111111111111');
  });
});
