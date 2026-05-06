import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import {
  buildConfidentialNumericPolicySetup,
  currentDayIndex,
} from '../src/lib/confidential-numeric-policy';
import { deriveWalletPda } from '../src/lib/confidential-dca-execution';
import { createIkaBridgelessExecutionRequest } from '../src/lib/ika-bridgeless-request';
import { hashCanonicalBridgelessOrder } from '../src/lib/bridgeless-order';
import {
  IKA_PREALPHA_CLUSTER,
  deriveIkaMessageDigest,
  deriveIkaPreAlphaApprovalAccounts,
} from '../src/lib/ika-prealpha-signing';
import { POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS } from '../src/lib/ethereum-transaction-digest';
import { POLET_SUI_DEVNET_VERIFIER_ADDRESS } from '../src/lib/sui-transaction-digest';
import type { WalletData } from '../src/lib/wallet-store';
import type { Intent } from '../src/types/intent';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('Ika bridgeless execution request', () => {
  test('creates an ika-bridgeless request only after confidential guardrail approval', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.code).toBe('IKA_PREALPHA_MESSAGE_APPROVED');
      expect(result.status).toBe('message-approved');
      expect(result.ikaRequest.executionRail).toBe('ika-bridgeless');
      expect(result.ikaRequest.settlement).toBe('not-executed');
      expect(result.ikaRequest.source).toEqual({ chain: 'solana', asset: 'USDC' });
      expect(result.ikaRequest.target).toEqual({ chain: 'sui', asset: 'SUI' });
      expect(result.ikaRequest.amount).toBe('5');
      expect(result.ikaRequest.amountBaseUnits).toBe('5000000');
      expect(result.ikaRequest.sessionContext.owner).toBe(fixture.owner);
      expect(result.ikaRequest.sessionContext.sessionKey).toBe(fixture.sessionKey);
      expect(result.ikaRequest.sessionContext.smartWalletAuthority).toBe(fixture.wallet.walletPda);
      expect(result.ikaRequest.sessionContext.policySequence).toBe(7);
      expect(result.ikaRequest.policyAttestation.status).toBe('approved');
      expect(result.ikaRequest.policyAttestation.policySequence).toBe(7);
      expect(result.ikaRequest.canonicalOrder.schema).toBe('polet.bridgeless.order.v1');
      expect(result.ikaRequest.canonicalOrder.intentId).toBe(intent.id);
      expect(result.ikaRequest.canonicalOrder.source).toEqual({ chain: 'solana', asset: 'USDC' });
      expect(result.ikaRequest.canonicalOrder.target).toEqual({ chain: 'sui', asset: 'SUI' });
      expect(result.ikaRequest.canonicalOrder.amount.policyBaseUnits).toBe('5000000');
      expect(result.ikaRequest.canonicalOrder.nonce).toBe(intent.id);
      expect(result.ikaRequest.canonicalOrderHash).toBe(
        await hashCanonicalBridgelessOrder(result.ikaRequest.canonicalOrder)
      );
      expect(result.ikaRequest.suiTransactionDigest).toMatchObject({
        schema: 'polet.sui.devnet.transaction-digest.v1',
        chain: 'sui',
        network: 'devnet',
        action: 'zero-mist-transfer-proof',
        transactionKind: 'programmable-transaction-block',
        broadcastable: false,
        productionSettlement: false,
        transaction: {
          recipient: POLET_SUI_DEVNET_VERIFIER_ADDRESS,
          amountMist: '0',
          canonicalOrderHash: result.ikaRequest.canonicalOrderHash,
        },
      });
      expect(result.ikaRequest.suiTransactionDigest?.digestHex).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof result.ikaRequest.suiTransactionDigest?.digestBase58).toBe('string');
      expect(result.ikaRequest.suiTransactionDigest?.digestBase58.length).toBeGreaterThan(0);
      expect(result.ikaRequest.executionBoundary.status).toBe('message-approved');
      expect(result.ikaRequest.executionBoundary.note).toMatch(/pre-alpha/i);
      expect(result.ikaRequest.preAlphaSigning?.status).toBe('message-approved');
      expect(result.ikaRequest.preAlphaSigning?.settlement).toBe('not-executed');
      expect(result.ikaRequest.preAlphaSigning?.messageDigest).toBe(result.ikaRequest.suiTransactionDigest?.digestHex);
      expect(result.ikaRequest.preAlphaSigning?.messageDigest).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect(result.ikaRequest.preAlphaSigning?.messageDigestSource).toBe('sui-devnet-transaction-digest');
      expect(result.ikaRequest.preAlphaSigning?.signatureScheme).toBe('ed25519-prealpha');
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.cluster).toBe(IKA_PREALPHA_CLUSTER);
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.mockSigner).toBe(true);
      expect(result.ikaRequest.preAlphaSigning?.preAlphaEnvironment.productionMpc).toBe(false);
      expect(result.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
      expect(result.ikaRequest.poletApprovalTransaction?.signers).toEqual([fixture.sessionKey]);
    }
  });

  test('allows the primary Sui route with an explicit chain and asset allowlist', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as { routeGuardrails?: unknown }).routeGuardrails = {
      mode: 'chain-asset-allowlist',
      allowedSourceChains: ['solana'],
      allowedTargetChains: ['sui'],
      allowedSourceAssets: ['USDC'],
      allowedTargetAssets: ['SUI'],
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.ikaRequest.target).toEqual({ chain: 'sui', asset: 'SUI' });
      expect(result.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
    }
  });

  test('blocks unsupported target chains before Ika approval data is prepared', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5', 'base', 'ETH');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('approval builder should not run for blocked route');
      },
    });

    expect(result).toEqual({
      allowed: false,
      code: 'IKA_ROUTE_NOT_ALLOWED',
      reason: 'This chain or asset route is outside the wallet allowed route policy. No Ika approval data was prepared.',
    });
  });

  test('blocks unsupported target assets without leaking witness or private limits', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5', 'sui', 'BTC');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('approval builder should not run for blocked asset');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('IKA_ROUTE_NOT_ALLOWED');
      expect(result.reason).not.toMatch(/10|20|max|daily|witness/i);
    }
    expect(JSON.stringify(result)).not.toContain(Array.from(fixture.witness).join(','));
    expect('ikaRequest' in result).toBe(false);
  });

  test('route allowlist blocks unsupported route before numeric limit evaluation', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '25', 'base', 'ETH');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('approval builder should not run for route block');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('IKA_ROUTE_NOT_ALLOWED');
      expect(result.reason).not.toMatch(/threshold|max|daily|cap|witness/i);
    }
  });

  test('derives deterministic Ika Pre-Alpha approval accounts after policy approval', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      const signing = result.ikaRequest.preAlphaSigning;
      expect(signing).toBeDefined();
      const expected = deriveIkaPreAlphaApprovalAccounts({
        dwalletAccount: signing!.dwalletAccount,
        smartWalletAuthority: fixture.wallet.walletPda,
        messageDigest: deriveIkaMessageDigest(result.ikaRequest),
      });

      expect(signing!.messageDigest).toBe(deriveIkaMessageDigest(result.ikaRequest));
      expect(signing!.messageApprovalPda).toBe(expected.messageApprovalPda);
      expect(signing!.messageApprovalBump).toBe(expected.messageApprovalBump);
      expect(signing!.cpiAuthorityPda).toBe(expected.cpiAuthorityPda);
      expect(signing!.cpiAuthorityBump).toBe(expected.cpiAuthorityBump);
      expect(signing!.approveMessage).toMatchObject({
        instruction: 'approve_message',
        authority: expected.cpiAuthorityPda,
        accounts: {
          messageApproval: expected.messageApprovalPda,
          cpiAuthority: expected.cpiAuthorityPda,
          userPublicKey: fixture.owner,
        },
      });
    }
  });

  test('suppresses the Ika request when confidential policy blocks the amount', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '25');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('CONFIDENTIAL_POLICY_BLOCKED');
      expect('ikaRequest' in result).toBe(false);
      expect('preAlphaSigning' in result).toBe(false);
      expect(result.reason).not.toContain('10');
      expect(result.reason).not.toContain('20');
      expect(JSON.stringify(result)).not.toContain('10000000');
      expect(JSON.stringify(result)).not.toContain('20000000');
      expect(JSON.stringify(result)).not.toContain('suiTransactionDigest');
      expect(JSON.stringify(result)).not.toContain('ethereumMessageDigest');
      expect(JSON.stringify(result)).not.toContain('polet.sui.devnet.transaction-digest.v1');
      expect(JSON.stringify(result)).not.toContain('polet.ethereum.sepolia.message-digest.v1');
    }
  });

  test('creates an optional Ethereum Ika request with a Sepolia EIP-191 digest after policy approval', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5', 'ethereum', 'ETH');
    const transactionRequests: unknown[] = [];

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async (request) => {
        transactionRequests.push(request);
        return fixture.approvalTransaction;
      },
    });

    expect(result.allowed).toBe(true);
    expect(transactionRequests).toHaveLength(1);
    if (result.allowed) {
      expect(result.ikaRequest.target).toEqual({ chain: 'ethereum', asset: 'ETH' });
      expect(result.ikaRequest.canonicalOrder.target).toEqual({ chain: 'ethereum', asset: 'ETH' });
      expect(result.ikaRequest.ethereumMessageDigest).toMatchObject({
        schema: 'polet.ethereum.sepolia.message-digest.v1',
        chain: 'ethereum',
        network: 'sepolia',
        chainId: 11_155_111,
        action: 'zero-wei-transfer-proof',
        broadcastable: false,
        productionSettlement: false,
        message: {
          recipient: POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS,
          amountWei: '0',
          canonicalOrderHash: result.ikaRequest.canonicalOrderHash,
        },
      });
      expect(result.ikaRequest.ethereumMessageDigest?.digestHex).toMatch(/^[0-9a-f]{64}$/);
      expect(result.ikaRequest.suiTransactionDigest).toBeUndefined();
      expect(result.ikaRequest.preAlphaSigning?.messageDigest).toBe(result.ikaRequest.ethereumMessageDigest?.digestHex);
      expect(result.ikaRequest.preAlphaSigning?.messageDigest).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect(result.ikaRequest.preAlphaSigning?.messageDigestSource).toBe('ethereum-sepolia-message-digest');
      expect(result.ikaRequest.preAlphaSigning?.signatureScheme).toBe('ecdsa-secp256k1-sha256');
      expect(transactionRequests[0]).toMatchObject({
        canonicalOrderHash: result.ikaRequest.ethereumMessageDigest?.digestHex,
        signatureScheme: 0,
      });
    }
  });

  test('rejects invalid Ethereum destination data before Ika approval construction', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5', 'ethereum', 'ETH');
    (intent.params as { nativeDestinationAccount?: string }).nativeDestinationAccount = '0xnot-an-evm-address';

    try {
      await createIkaBridgelessExecutionRequest(intent, {
        getWalletData: async () => fixture.wallet,
        buildApprovalTransaction: async () => fixture.approvalTransaction,
      });
      throw new Error('expected invalid Ethereum destination to be rejected');
    } catch (error) {
      expect(error).toHaveProperty('code', 'INVALID_ETHEREUM_DESTINATION');
      expect(error).toHaveProperty('status', 400);
      expect(error instanceof Error ? error.message : '').toMatch(/Ethereum address/);
    }
  });

  test('returns needs-approval without Ika signing data when shared quorum is missing', async () => {
    const fixture = createFixture();
    const approverA = Keypair.generate();
    const approverB = Keypair.generate();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as { sharedAccess?: unknown }).sharedAccess = {
      policy: {
        mode: 'ika-approval-quorum',
        threshold: 2,
        approvers: [approverA.publicKey.toString(), approverB.publicKey.toString()],
      },
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('IKA_APPROVAL_QUORUM_REQUIRED');
      expect(result.status).toBe('needs-approval');
      expect(result.approval).toMatchObject({
        status: 'needs-approval',
        required: 2,
        received: 0,
        threshold: 2,
        totalApprovers: 2,
        missingApprovals: 2,
      });
      expect(result.approval.challenge).toContain('polet.ika.shared-approval.v1');
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('preAlphaSigning');
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
      expect(JSON.stringify(result)).not.toContain('10000000');
      expect(JSON.stringify(result)).not.toContain('20000000');
    }
  });

  test('prepares Ika approval only after shared quorum reaches 2 of 2', async () => {
    const fixture = createFixture();
    const approverA = Keypair.generate();
    const approverB = Keypair.generate();
    const intent = createIkaIntent(fixture, '5');
    const policy = {
      mode: 'ika-approval-quorum' as const,
      threshold: 2,
      approvers: [approverA.publicKey.toString(), approverB.publicKey.toString()],
    };
    (intent.params as { sharedAccess?: unknown }).sharedAccess = { policy };
    const first = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    expect(first.allowed).toBe(false);
    if (first.allowed || first.code !== 'IKA_APPROVAL_QUORUM_REQUIRED') {
      throw new Error('expected shared quorum challenge');
    }

    (intent.params as { sharedAccess?: unknown }).sharedAccess = {
      policy,
      approvals: [
        signSharedApproval(approverA, first.approval.challenge),
        signSharedApproval(approverB, first.approval.challenge),
      ],
    };
    const transactionRequests: unknown[] = [];
    const approved = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async (request) => {
        transactionRequests.push(request);
        return fixture.approvalTransaction;
      },
    });

    expect(approved.allowed).toBe(true);
    expect(transactionRequests).toHaveLength(1);
    expect(transactionRequests[0]).toMatchObject({
      sharedApprovers: [approverA.publicKey.toString(), approverB.publicKey.toString()],
    });
    if (approved.allowed) {
      expect(approved.ikaRequest.preAlphaSigning?.status).toBe('message-approved');
      expect(approved.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
    }
  });

  test('uses configured wallet shared quorum when intent omits shared policy', async () => {
    const fixture = createFixture();
    const approverA = Keypair.generate();
    const approverB = Keypair.generate();
    fixture.wallet.sharedIkaApprovals = {
      enabled: true,
      threshold: 2,
      approvers: [
        { key: approverA.publicKey.toString(), authorized: true },
        { key: approverB.publicKey.toString(), authorized: true },
      ],
    };
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('IKA_APPROVAL_QUORUM_REQUIRED');
      expect(result.status).toBe('needs-approval');
      expect(result.approval).toMatchObject({
        status: 'needs-approval',
        required: 2,
        received: 0,
        threshold: 2,
        totalApprovers: 2,
        missingApprovals: 2,
      });
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('preAlphaSigning');
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
    }
  });

  test('does not let intent policy lower the configured wallet quorum', async () => {
    const fixture = createFixture();
    const approverA = Keypair.generate();
    const approverB = Keypair.generate();
    fixture.wallet.sharedIkaApprovals = {
      enabled: true,
      threshold: 2,
      approvers: [
        { key: approverA.publicKey.toString(), authorized: true },
        { key: approverB.publicKey.toString(), authorized: true },
      ],
    };
    const intent = createIkaIntent(fixture, '5');
    (intent.params as { sharedAccess?: unknown }).sharedAccess = {
      policy: {
        mode: 'ika-approval-quorum',
        threshold: 1,
        approvers: [approverA.publicKey.toString()],
      },
    };

    const first = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    expect(first.allowed).toBe(false);
    if (first.allowed || first.code !== 'IKA_APPROVAL_QUORUM_REQUIRED') {
      throw new Error('expected configured wallet quorum challenge');
    }
    expect(first.approval.required).toBe(2);

    (intent.params as { sharedAccess?: unknown }).sharedAccess = {
      approvals: [signSharedApproval(approverA, first.approval.challenge)],
    };
    const stillMissing = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    expect(stillMissing.allowed).toBe(false);
    if (!stillMissing.allowed) {
      expect(stillMissing.code).toBe('IKA_APPROVAL_QUORUM_REQUIRED');
      expect(stillMissing.approval.received).toBe(1);
      expect(stillMissing.approval.missingApprovals).toBe(1);
    }
  });

  test('does not count revoked or duplicate shared approver signatures', async () => {
    const fixture = createFixture();
    const revokedApprover = Keypair.generate();
    const activeApprover = Keypair.generate();
    const intent = createIkaIntent(fixture, '5');
    const policy = {
      mode: 'ika-approval-quorum' as const,
      threshold: 2,
      approvers: [activeApprover.publicKey.toString(), Keypair.generate().publicKey.toString()],
    };
    (intent.params as { sharedAccess?: unknown }).sharedAccess = { policy };
    const first = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    expect(first.allowed).toBe(false);
    if (first.allowed || first.code !== 'IKA_APPROVAL_QUORUM_REQUIRED') {
      throw new Error('expected shared quorum challenge');
    }

    (intent.params as { sharedAccess?: unknown }).sharedAccess = {
      policy,
      approvals: [
        signSharedApproval(activeApprover, first.approval.challenge),
        signSharedApproval(activeApprover, first.approval.challenge),
        signSharedApproval(revokedApprover, first.approval.challenge),
      ],
    };
    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('IKA_APPROVAL_QUORUM_REQUIRED');
      expect(result.approval.received).toBe(1);
      expect(result.approval.missingApprovals).toBe(1);
      expect(result.approval.approvedApprovers).toEqual([activeApprover.publicKey.toString()]);
    }
  });

  test('rejects invalid Sui destination data before Ika approval construction', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as { nativeDestinationAccount?: string }).nativeDestinationAccount = '0xnot-a-sui-address';

    try {
      await createIkaBridgelessExecutionRequest(intent, {
        getWalletData: async () => fixture.wallet,
        buildApprovalTransaction: async () => fixture.approvalTransaction,
      });
      throw new Error('expected invalid Sui destination to be rejected');
    } catch (error) {
      expect(error).toHaveProperty('code', 'INVALID_SUI_DESTINATION');
      expect(error).toHaveProperty('status', 400);
      expect(error instanceof Error ? error.message : '').toMatch(/Sui address/);
    }
  });

  test('rejects stale sessions before preparing a bridgeless request', async () => {
    const fixture = createFixture({
      sessionGrantedSlot: 4,
      lastRevokedSlot: 5,
    });
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('SESSION_STALE');
      expect('ikaRequest' in result).toBe(false);
    }
  });

  test('keeps witness and private thresholds out of the allowed response', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });
    const serialized = JSON.stringify(result);

    expect(result.allowed).toBe(true);
    expect(serialized).not.toContain(fixture.witness.join(','));
    expect(serialized).not.toContain('10000000');
    expect(serialized).not.toContain('20000000');
    expect(serialized).not.toContain('maxPerRun');
    expect(serialized).not.toContain('dailyCap');
    expect(serialized).not.toContain(fixture.witness.join(','));
  });

  test('passes official Ika accounts and canonical order hash into the Polet transaction builder', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    const transactionRequests: unknown[] = [];

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async (request) => {
        transactionRequests.push(request);
        return fixture.approvalTransaction;
      },
    });

    expect(result.allowed).toBe(true);
    expect(transactionRequests).toHaveLength(1);
    if (result.allowed) {
      expect(transactionRequests[0]).toMatchObject({
        wallet: fixture.wallet.walletPda,
        sessionKey: fixture.sessionKey,
        canonicalOrderHash: result.ikaRequest.suiTransactionDigest?.digestHex,
        sourceAmount: 5_000_000n,
        orderExpiresAt: result.ikaRequest.canonicalOrder.expiresAtUnix,
        attestationSlot: BigInt(fixture.wallet.lastRevokedSlot) + 1n,
        attestationPolicySeq: fixture.wallet.policySeq,
        encryptionWitness: Array.from(fixture.witness),
        userPubkey: fixture.owner,
        signatureScheme: 5,
      });
      expect((transactionRequests[0] as { canonicalOrderHash: string }).canonicalOrderHash).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect((transactionRequests[0] as { ikaProgram: string }).ikaProgram).toBe('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
    }
  });
});

function createIkaIntent(
  fixture: ReturnType<typeof createFixture>,
  amount: string,
  targetChain: 'sui' | 'ethereum' | 'base' = 'sui',
  targetAsset = 'SUI'
): Intent {
  return {
    id: `ika-${amount}`,
    owner: fixture.owner,
    sessionKey: fixture.sessionKey,
    action: 'multichain-strategy',
    params: {
      sourceChain: 'solana',
      sourceAsset: 'USDC',
      targetChain,
      targetAsset,
      amount,
      executionRail: 'ika',
      strategy: 'dca',
      slippageBps: 100,
      encryptionWitness: Array.from(fixture.witness),
    },
    timestamp: 1700000000,
  };
}

function createFixture(options: {
  sessionAuthorized?: boolean;
  sessionGrantedSlot?: number;
  lastRevokedSlot?: number;
} = {}) {
  const owner = Keypair.generate().publicKey.toString();
  const sessionKey = Keypair.generate().publicKey.toString();
  const walletPda = deriveWalletPda(owner);
  const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
  const policySetup = buildConfidentialNumericPolicySetup({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
    encryptionWitness: witness,
  });
  const wallet: WalletData = {
    walletPda,
    owner,
    proxyPk: PublicKey.default.toString(),
    policyCommitment: Array.from({ length: 32 }, () => 7),
    merkleRoot: Array.from({ length: 32 }, () => 0),
    policySeq: 7,
    lastRevokedSlot: options.lastRevokedSlot ?? 2,
    confidentialPolicy: {
      policyCommitment: policySetup.policyCommitment,
      encryptionWitnessHash: policySetup.encryptionWitnessHash,
      encryptedMaxPerRun: policySetup.encryptedMaxPerRun,
      encryptedDailyCap: policySetup.encryptedDailyCap,
      encryptedDailySpent: policySetup.encryptedDailySpent,
      spentDayIndex: currentDayIndex(),
      enabled: true,
    },
    demoCustody: {
      usdcMint: PublicKey.default.toString(),
      usdcTokenAccount: Keypair.generate().publicKey.toString(),
      solMint: PublicKey.default.toString(),
      solTokenAccount: Keypair.generate().publicKey.toString(),
      tokenProgram: TOKEN_PROGRAM,
      configured: true,
    },
    sharedIkaApprovals: {
      threshold: 0,
      enabled: false,
      approvers: [],
    },
    sessions: [
      {
        key: sessionKey,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        grantedSlot: options.sessionGrantedSlot ?? 2,
        authorized: options.sessionAuthorized ?? true,
      },
    ],
    temporalKeys: [],
  };
  wallet.temporalKeys = wallet.sessions;

  const approvalTransaction = {
    transaction: 'base64-polet-ika-approval',
    blockHash: 'mock-blockhash',
    slot: 456,
    signers: [sessionKey],
  };

  return { owner, sessionKey, wallet, witness, approvalTransaction };
}

function signSharedApproval(approver: Keypair, challenge: string) {
  return {
    approver: approver.publicKey.toString(),
    signature: Buffer.from(nacl.sign.detached(
      new TextEncoder().encode(challenge),
      approver.secretKey
    )).toString('base64'),
    encoding: 'base64' as const,
  };
}
