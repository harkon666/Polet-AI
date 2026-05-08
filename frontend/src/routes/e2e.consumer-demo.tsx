import { createFileRoute } from '@tanstack/react-router';
import { DemoTabContent } from '../components/DemoTab';
import type {
  ExecuteEncryptPolicyGraphInput,
  RequestPolicyValueDecryptionInput,
  RunConfidentialDcaInput,
  RunMultichainIntentInput,
} from '../lib/api';

export const Route = createFileRoute('/e2e/consumer-demo')({
  component: E2EConsumerDemoPage,
});

const owner = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';
const agent = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';
let e2ePolicyConfigured = false;

const e2eApi = {
  initializeWallet: async () => ({
    transaction: 'initialize-wallet-tx',
    wallet: 'wallet-pda',
  }),
  setConfidentialPolicy: async () => ({
    transaction: 'policy-tx',
    wallet: 'wallet-pda',
    policyCommitment: Array.from({ length: 32 }, () => 1),
    encryptionWitnessHash: Array.from({ length: 32 }, () => 2),
  }),
  setOfficialEncryptCiphertextPolicy: async (input: {
    maxPerRunCiphertext: string;
    dailyCapCiphertext: string;
    dailySpentCiphertext: string;
    encrypt: { encryptProgram?: string };
  }) => {
    e2ePolicyConfigured = true;
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
  createEncryptDeposit: async () => ({
    transaction: null,
    signers: [],
    deposit: 'EncryptDeposit111111111111111111111111111111',
    config: 'EncryptConfig1111111111111111111111111111111',
    eventAuthority: 'EncryptEventAuthority111111111111111111111',
    status: 'existing-deposit',
  }),
  executeEncryptPolicyGraph: async (input: ExecuteEncryptPolicyGraphInput) => ({
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
  }),
  requestPolicyValueDecryption: async (input: RequestPolicyValueDecryptionInput) => ({
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
  }),
  setupDemoCustody: async () => ({
    transaction: 'custody-tx',
    wallet: 'wallet-pda',
    usdcTokenAccount: 'USDC111111111111111111111111111111111111111',
    solTokenAccount: 'SOL1111111111111111111111111111111111111111',
  }),
  configureSharedIkaApprovers: async (input: { threshold: number; approvers: string[] }) => ({
    transaction: 'shared-config-tx',
    wallet: 'wallet-pda',
    threshold: input.threshold,
    approvers: input.approvers,
  }),
  revokeSharedIkaApprover: async (input: { approver: string }) => ({
    transaction: 'shared-revoke-tx',
    wallet: 'wallet-pda',
    approver: input.approver,
  }),
  setRecoveryAuthority: async (input: { recoveryAuthority: string }) => ({
    transaction: 'recovery-tx',
    wallet: 'wallet-pda',
    recoveryAuthority: input.recoveryAuthority,
    activity: { type: 'recovery', status: 'set', privacy: 'redacted' },
  }),
  recoverAccess: async () => ({
    transaction: 'recover-tx',
    wallet: 'wallet-pda',
    authority: owner,
    compromisedSessions: [],
    sharedIkaThreshold: 1,
    sharedIkaApprovers: [],
    pendingDwalletController: '',
    activity: {
      type: 'recover',
      status: 'done',
      states: ['sessions-revoked'],
      privacy: 'redacted',
      boundary: 'e2e',
    },
  }),
  requestPasskeyChallenge: async (input: { rpId: string }) => ({
    challenge: Array.from(new Uint8Array(32)),
    publicKeyCredentialRequestOptions: {
      challenge: Array.from(new Uint8Array(32)),
      rpId: input.rpId,
      allowCredentials: [],
      userVerification: 'preferred',
    },
    boundary: 'e2e',
  }),
  verifyPasskeyAssertion: async () => ({
    valid: false,
    approverPublicKey: '',
    challengeUsed: '',
    boundary: 'e2e',
  }),
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
  getWalletData: async () => e2ePolicyConfigured ? ({
    walletPda: 'wallet-pda',
    policySeq: 7,
    lastRevokedSlot: 2,
    confidentialPolicy: {
      enabled: true,
      encryptCiphertexts: {
        configured: true,
        maxPerRun: 'FreshMaxCiphertext111111111111111111111111',
        dailyCap: 'FreshCapCiphertext111111111111111111111111',
        dailySpent: 'FreshSpentCiphertext11111111111111111111',
        pending: false,
      },
    },
  }) : null,
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
  runMultichainIntent: async (input: RunMultichainIntentInput) => {
    if (input.amount === '25') {
      return {
        allowed: false,
        code: 'CONFIDENTIAL_POLICY_BLOCKED',
        reason: 'Confidential policy blocked this Ika request.',
      };
    }

    return {
      allowed: true,
      code: 'IKA_APPROVAL_TRANSACTION_PREPARED',
      ikaRequest: {
        executionRail: 'ika-bridgeless' as const,
        settlement: 'not-executed' as const,
        requestId: 'ika-test-request',
        canonicalOrderHash: 'canonical-order-hash',
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
          signers: [input.sessionKey],
        },
      },
    };
  },
};

function E2EConsumerDemoPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <DemoTabContent
        owner={owner}
        agentAddresses={[agent]}
        signAndConfirmTransaction={async () => 'sig111111'}
        api={e2eApi}
        createPolicyCiphertexts={async () => ({
          maxPerRunCiphertext: 'FreshMaxCiphertext111111111111111111111111',
          dailyCapCiphertext: 'FreshCapCiphertext111111111111111111111111',
          dailySpentCiphertext: 'FreshSpentCiphertext11111111111111111111',
          policyCommitment: Array.from({ length: 32 }, (_, index) => index),
          grpcEndpoint: 'encrypt-grpc.polet.dev:443',
        })}
        createExecutionCiphertexts={async () => ({
          sourceAmountCiphertext: 'FreshSourceCiphertext1111111111111111111111',
          allowedOutputCiphertext: 'FreshAllowedCiphertext11111111111111111111',
          dailySpentOutputCiphertext: 'FreshDailyOutputCiphertext1111111111111111',
          grpcEndpoint: 'encrypt-grpc.polet.dev:443',
        })}
      />
    </main>
  );
}
