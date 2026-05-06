import { createFileRoute } from '@tanstack/react-router';
import { DemoTabContent } from '../components/DemoTab';
import type { RunConfidentialDcaInput, RunMultichainIntentInput } from '../lib/api';

export const Route = createFileRoute('/e2e/consumer-demo')({
  component: E2EConsumerDemoPage,
});

const owner = 'AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2';
const agent = 'BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4';

const e2eApi = {
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
      code: 'IKA_PREALPHA_MESSAGE_APPROVED',
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
          status: 'message-approved' as const,
          note: 'Ika Pre-Alpha approval transaction prepared; settlement is not executed.',
        },
        preAlphaSigning: {
          status: 'message-approved' as const,
          dwalletAccount: 'DwalleT111111111111111111111111111111111111',
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
      />
    </main>
  );
}
