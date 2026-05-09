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
  deriveIkaMessageHash,
  deriveIkaPreAlphaApprovalAccounts,
} from '../src/lib/ika-prealpha-signing';
import { POLET_ETHEREUM_SEPOLIA_VERIFIER_ADDRESS } from '../src/lib/ethereum-transaction-digest';
import { POLET_SUI_DEVNET_VERIFIER_ADDRESS } from '../src/lib/sui-transaction-digest';
import type { WalletData } from '../src/lib/wallet-store';
import type { Intent, MultichainStrategyParams } from '../src/types/intent';

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
      expect(result.code).toBe('IKA_APPROVAL_TRANSACTION_PREPARED');
      expect(result.status).toBe('approval-transaction-prepared');
      expect(result.ikaRequest.executionRail).toBe('ika-bridgeless');
      expect(result.ikaRequest.intentStrategy).toBe('dca');
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
      expect(result.ikaRequest.executionBoundary.status).toBe('approval-transaction-prepared');
      expect(result.ikaRequest.executionBoundary.note).toMatch(/pre-alpha/i);
      expect(result.ikaRequest.executionBoundary.note).toMatch(/Keccak-256/);
      expect(result.ikaRequest.preAlphaSigning?.status).toBe('approval-transaction-prepared');
      expect(result.ikaRequest.preAlphaSigning?.settlement).toBe('not-executed');
      expect(result.ikaRequest.ikaMessageHash).toBe(result.ikaRequest.preAlphaSigning?.ikaMessageHash);
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHash).toBe(
        deriveIkaMessageHash(result.ikaRequest.preAlphaSigning!.ikaMessageHashPreimage)
      );
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHash).not.toBe(result.ikaRequest.suiTransactionDigest?.digestHex);
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHash).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHashSource).toBe('polet-ika-approval-preimage-keccak256');
      expect(result.ikaRequest.preAlphaSigning?.messageDigest).toBe(result.ikaRequest.preAlphaSigning?.ikaMessageHash);
      expect(result.ikaRequest.preAlphaSigning?.messageDigestSource).toBe('ika-message-hash');
      expect(result.ikaRequest.preAlphaSigning?.destinationSigningDigest).toEqual({
        digestHex: result.ikaRequest.suiTransactionDigest!.digestHex,
        source: 'sui-devnet-transaction-digest' as const,
        hashScheme: 'sui-blake2b-256' as const,
        signPayload: 'destination-chain-sign-only-artifact' as const,
      });
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

  test('keeps safe slippage and route-risk metadata in the canonical bridgeless order', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    const params = intent.params as MultichainStrategyParams;
    params.slippageBps = 125;
    params.routeRisk = {
      priceImpactBps: 120,
      liquidityScore: 'high',
      verifiedRoute: true,
      provider: 'polet-demo-precheck',
    };
    params.riskGuardrails = {
      mode: 'bridgeless-route-risk',
      maxSlippageBps: 150,
      maxPriceImpactBps: 300,
      minLiquidityScore: 'medium',
      requireVerifiedRoute: true,
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.ikaRequest.routeIntent).toMatchObject({
        slippageBps: 125,
        riskStatus: 'passed',
      });
      expect(result.ikaRequest.routeRisk).toEqual({
        priceImpactBps: 120,
        liquidityScore: 'high',
        verifiedRoute: true,
        provider: 'polet-demo-precheck',
      });
      expect(result.ikaRequest.canonicalOrder.routeRisk).toEqual(result.ikaRequest.routeRisk);
      expect(result.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
    }
  });

  test('blocks unsafe bridgeless slippage before Ika approval construction', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as MultichainStrategyParams).slippageBps = 500;
    (intent.params as MultichainStrategyParams).riskGuardrails = {
      mode: 'bridgeless-route-risk',
      maxSlippageBps: 150,
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('approval builder should not run for unsafe slippage');
      },
    });

    expect(result).toEqual({
      allowed: false,
      code: 'IKA_RISK_GUARDRAIL_BLOCKED',
      reason: 'Requested bridgeless slippage is outside the wallet route-risk policy. No Ika approval data was prepared.',
    });
  });

  test('blocks low liquidity route-risk metadata before transaction construction', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as MultichainStrategyParams).routeRisk = {
      liquidityScore: 'low',
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result).toEqual({
      allowed: false,
      code: 'IKA_RISK_GUARDRAIL_BLOCKED',
      reason: expect.stringMatching(/liquidity/i),
    });
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
    if (!result.allowed && result.code === 'IKA_ROUTE_NOT_ALLOWED') {
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
    if (!result.allowed && result.code === 'IKA_ROUTE_NOT_ALLOWED') {
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
        ikaMessageHash: deriveIkaMessageDigest(result.ikaRequest),
        signatureScheme: signing!.signatureScheme,
      });

      expect(signing!.ikaMessageHash).toBe(deriveIkaMessageDigest(result.ikaRequest));
      expect(signing!.messageApprovalPda).toBe(expected.messageApprovalPda);
      expect(signing!.messageApprovalBump).toBe(expected.messageApprovalBump);
      expect(signing!.messageApprovalDerivation).toBe('local-compatibility-fallback');
      expect(signing!.coordinatorPda).toBe(expected.coordinatorPda);
      expect(signing!.cpiAuthorityPda).toBe(expected.cpiAuthorityPda);
      expect(signing!.cpiAuthorityBump).toBe(expected.cpiAuthorityBump);
      expect(signing!.approveMessage).toMatchObject({
        instruction: 'approve_message',
        authority: expected.cpiAuthorityPda,
        callerProgram: 'H2z7UMkXh6MirSNaB55pb2gLYvY9Zgz5PLQnQUqnYt6a',
        accounts: {
          coordinator: expected.coordinatorPda,
          messageApproval: expected.messageApprovalPda,
          cpiAuthority: expected.cpiAuthorityPda,
          userPublicKey: fixture.owner,
        },
      });
    }
  });

  test('supports official Ika MessageApproval derivation from dWallet curve and public key', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '5');
    (intent.params as MultichainStrategyParams).ikaPreAlpha = {
      dwalletAccount: Keypair.generate().publicKey.toString(),
      dwalletCurve: 2,
      dwalletPublicKey: Array.from(Buffer.alloc(32, 0x42)),
      signatureScheme: 'ed25519-prealpha',
    };

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      const signing = result.ikaRequest.preAlphaSigning!;
      const messageDigest = Buffer.from(signing.ikaMessageHash, 'hex');
      const payload = Buffer.alloc(34);
      payload.writeUInt16LE(2, 0);
      Buffer.alloc(32, 0x42).copy(payload, 2);
      const scheme = Buffer.alloc(2);
      scheme.writeUInt16LE(5, 0);
      const [expectedMessageApproval] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('dwallet'),
          payload.subarray(0, 32),
          payload.subarray(32, 34),
          Buffer.from('message_approval'),
          scheme,
          messageDigest,
        ],
        new PublicKey(signing.approveMessage.programId)
      );

      expect(signing.messageApprovalPda).toBe(expectedMessageApproval.toString());
      expect(signing.messageApprovalDerivation).toBe('official-dwallet-public-key');
    }
  });

  test('suppresses the Ika request when daily cap blocks after route risk passes', async () => {
    const fixture = createFixture();
    const intent = createIkaIntent(fixture, '25');
    (intent.params as MultichainStrategyParams).routeRisk = {
      priceImpactBps: 100,
      liquidityScore: 'high',
      verifiedRoute: true,
    };

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

  test('suppresses Ika approval data while official Encrypt graph execution is pending', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('pending Encrypt requests must not build Ika approval transactions');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed && result.code === 'ENCRYPT_POLICY_PENDING') {
      expect(result.status).toBe('pending-encrypt-execution');
      expect(result.encryptPolicy?.graph).toBe('polet_policy_guardrail_graph');
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
      expect(JSON.stringify(result)).not.toContain(Array.from(fixture.witness).join(','));
    }
  });

  test('official Encrypt Ika path accepts no witness and returns pending lifecycle', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');
    delete (intent.params as { maskedWitnessDevFixture?: number[] }).maskedWitnessDevFixture;

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('pending Encrypt requests must not build Ika approval transactions');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed && result.code === 'ENCRYPT_POLICY_PENDING') {
      expect(result.status).toBe('pending-encrypt-execution');
      expect(JSON.stringify(result)).not.toContain('maskedWitnessDevFixture');
      expect(JSON.stringify(result)).not.toContain(Array.from(fixture.witness).join(','));
      expect('ikaRequest' in result).toBe(false);
    }
  });

  test('official Encrypt Ika path does not synthesize pending ciphertext ids before graph execution', async () => {
    const fixture = createFixture({ officialEncrypt: 'configured' });
    const intent = createIkaIntent(fixture, '5');
    delete (intent.params as { maskedWitnessDevFixture?: number[] }).maskedWitnessDevFixture;

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      buildApprovalTransaction: async () => {
        throw new Error('unexecuted Encrypt graph must not build Ika approval transactions');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe('ENCRYPT_POLICY_GRAPH_NOT_EXECUTED');
      expect(result.encryptPolicy).toBeUndefined();
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('encrypt-pending:');
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
      expect(JSON.stringify(result)).not.toContain('maskedWitnessDevFixture');
    }
  });

  test('rejects verified Encrypt results that do not match wallet pending output ciphertexts', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');
    delete (intent.params as { maskedWitnessDevFixture?: number[] }).maskedWitnessDevFixture;

    await expect(createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      resolveEncryptPolicyExecution: async () => ({
        status: 'encrypt-verified-allowed',
        policySequence: fixture.wallet.policySeq,
        sourceAmountCiphertext: Keypair.generate().publicKey.toString(),
        allowedOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
        dailySpentOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput,
        verifiedSlot: 1001,
        allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
        graph: 'polet_policy_guardrail_graph',
      }),
      buildApprovalTransaction: async () => {
        throw new Error('mismatched Encrypt outputs must not build Ika approval transactions');
      },
    })).rejects.toThrow('Encrypt policy execution ciphertexts do not match wallet pending state');
  });

  test('suppresses Ika approval data when official Encrypt verification blocks the graph output', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      resolveEncryptPolicyExecution: async () => ({
        status: 'encrypt-verified-blocked',
        policySequence: fixture.wallet.policySeq,
        sourceAmountCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingSourceAmount,
        allowedOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
        dailySpentOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput,
        verifiedSlot: 1002,
        graph: 'polet_policy_guardrail_graph',
      }),
      buildApprovalTransaction: async () => {
        throw new Error('verified-blocked Encrypt requests must not build Ika approval transactions');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed && result.code === 'ENCRYPT_POLICY_VERIFIED_BLOCKED') {
      expect(result.status).toBe('encrypt-verified-blocked');
      expect(result.encryptPolicy?.status).toBe('encrypt-verified-blocked');
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('dwalletAccount');
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
      expect(JSON.stringify(result)).not.toContain('poletApprovalTransaction');
      expect(JSON.stringify(result)).not.toContain('suiTransactionDigest');
      expect(JSON.stringify(result)).not.toContain(Array.from(fixture.witness).join(','));
    }
  });

  test('prepares Ika approval only after official Encrypt verification allows the graph output', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      resolveEncryptPolicyExecution: async () => ({
        status: 'encrypt-verified-allowed',
        policySequence: fixture.wallet.policySeq,
        sourceAmountCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingSourceAmount,
        allowedOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
        dailySpentOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput,
        allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
        verifiedSlot: 1001,
        graph: 'polet_policy_guardrail_graph',
      }),
      buildApprovalTransaction: async () => {
        throw new Error('Official Encrypt verified Ika must not build legacy masked-witness approval transactions');
      },
      buildVerifiedEncryptApprovalTransaction: async (request) => {
        expect(request.allowedOutputCiphertext).toBe(fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput);
        expect(request.dailySpentOutputCiphertext).toBe(fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput);
        expect(request.allowedDecryptionRequest).toBeTruthy();
        return fixture.approvalTransaction;
      },
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.ikaRequest.policyAttestation.status).toBe('encrypt-verified-allowed');
      expect(result.ikaRequest.policyAttestation.encryptPolicy?.status).toBe('encrypt-verified-allowed');
      expect(result.ikaRequest.poletApprovalTransaction).toEqual(fixture.approvalTransaction);
    }
  });

  test('official Encrypt verified-allowed Ika request does not require witness in API input', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
    const intent = createIkaIntent(fixture, '5');
    delete (intent.params as { maskedWitnessDevFixture?: number[] }).maskedWitnessDevFixture;

    const result = await createIkaBridgelessExecutionRequest(intent, {
      getWalletData: async () => fixture.wallet,
      resolveEncryptPolicyExecution: async () => ({
        status: 'encrypt-verified-allowed',
        policySequence: fixture.wallet.policySeq,
        sourceAmountCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingSourceAmount,
        allowedOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
        dailySpentOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput,
        allowedDecryptionRequest: Keypair.generate().publicKey.toString(),
        verifiedSlot: 1001,
        graph: 'polet_policy_guardrail_graph',
      }),
      buildApprovalTransaction: async () => {
        throw new Error('Official Encrypt verified Ika must not build legacy masked-witness approval transactions');
      },
      buildVerifiedEncryptApprovalTransaction: async () => fixture.approvalTransaction,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.ikaRequest.policyAttestation.status).toBe('encrypt-verified-allowed');
      expect(JSON.stringify(result)).not.toContain('maskedWitnessDevFixture');
    }
  });

  test('requires shared quorum after official Encrypt verification allows the graph output', async () => {
    const fixture = createFixture({ officialEncrypt: 'pending' });
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
      resolveEncryptPolicyExecution: async () => ({
        status: 'encrypt-verified-allowed',
        policySequence: fixture.wallet.policySeq,
        sourceAmountCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingSourceAmount,
        allowedOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingAllowedOutput,
        dailySpentOutputCiphertext: fixture.wallet.confidentialPolicy.encryptCiphertexts!.pendingDailySpentOutput,
        verifiedSlot: 1003,
        graph: 'polet_policy_guardrail_graph',
      }),
      buildApprovalTransaction: async () => {
        throw new Error('quorum-required Encrypt requests must not build Ika approval transactions');
      },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed && result.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
      expect(result.status).toBe('needs-approval');
      expect(result.approval.required).toBe(2);
      expect(result.approval.received).toBe(0);
      expect('ikaRequest' in result).toBe(false);
      expect(JSON.stringify(result)).not.toContain('dwalletAccount');
      expect(JSON.stringify(result)).not.toContain('messageApprovalPda');
      expect(JSON.stringify(result)).not.toContain('poletApprovalTransaction');
      expect(JSON.stringify(result)).not.toContain(Array.from(fixture.witness).join(','));
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
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHash).not.toBe(result.ikaRequest.ethereumMessageDigest?.digestHex);
      expect(result.ikaRequest.preAlphaSigning?.ikaMessageHash).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect(result.ikaRequest.preAlphaSigning?.destinationSigningDigest).toEqual({
        digestHex: result.ikaRequest.ethereumMessageDigest!.digestHex,
        source: 'ethereum-sepolia-message-digest' as const,
        hashScheme: 'ethereum-eip191-keccak256' as const,
        signPayload: 'destination-chain-sign-only-artifact' as const,
      });
      expect(result.ikaRequest.preAlphaSigning?.signatureScheme).toBe('ecdsa-secp256k1-sha256');
      expect(transactionRequests[0]).toMatchObject({
        ikaMessageHash: result.ikaRequest.preAlphaSigning?.ikaMessageHash,
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
    if (!result.allowed && result.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
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
      expect(approved.ikaRequest.preAlphaSigning?.status).toBe('approval-transaction-prepared');
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
    if (!result.allowed && result.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
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
    if (!stillMissing.allowed && stillMissing.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
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
    if (!result.allowed && result.code === 'IKA_APPROVAL_QUORUM_REQUIRED') {
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

  test('passes official Ika accounts and Keccak message hash into the Polet transaction builder', async () => {
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
        coordinator: result.ikaRequest.preAlphaSigning?.coordinatorPda,
        callerProgram: 'H2z7UMkXh6MirSNaB55pb2gLYvY9Zgz5PLQnQUqnYt6a',
        ikaMessageHash: result.ikaRequest.preAlphaSigning?.ikaMessageHash,
        sourceAmount: 5_000_000n,
        orderExpiresAt: result.ikaRequest.canonicalOrder.expiresAtUnix,
        attestationSlot: BigInt(fixture.wallet.lastRevokedSlot) + 1n,
        attestationPolicySeq: fixture.wallet.policySeq,
        maskedWitnessDevFixture: Array.from(fixture.witness),
        userPubkey: fixture.owner,
        signatureScheme: 5,
      });
      expect((transactionRequests[0] as { ikaMessageHash: string }).ikaMessageHash).not.toBe(result.ikaRequest.canonicalOrderHash);
      expect((transactionRequests[0] as { ikaMessageHash: string }).ikaMessageHash).not.toBe(result.ikaRequest.suiTransactionDigest?.digestHex);
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
      maskedWitnessDevFixture: Array.from(fixture.witness),
    },
    timestamp: 1700000000,
  };
}

function createFixture(options: {
  sessionAuthorized?: boolean;
  sessionGrantedSlot?: number;
  lastRevokedSlot?: number;
  officialEncrypt?: 'pending' | 'configured';
} = {}) {
  const owner = Keypair.generate().publicKey.toString();
  const sessionKey = Keypair.generate().publicKey.toString();
  const walletPda = deriveWalletPda(owner);
  const witness = Uint8Array.from(Array.from({ length: 32 }, (_, index) => index + 1));
  const policySetup = buildConfidentialNumericPolicySetup({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
    maskedWitnessDevFixture: witness,
  });
  const wallet: WalletData = {
    walletPda,
    owner,
    proxyPk: PublicKey.default.toString(),
    policyCommitment: Array.from({ length: 32 }, () => 7),
    merkleRoot: Array.from({ length: 32 }, () => 0),
    policySeq: 7,
    lastRevokedSlot: options.lastRevokedSlot ?? 2,
    recoveryAuthority: owner,
    sharedIkaApprovals: {
      enabled: false,
      threshold: 0,
      approvers: [],
    },
    dwalletController: {
      currentController: owner,
      pendingController: PublicKey.default.toString(),
      rotationSeq: 0,
      lastRotatedSlot: 0,
      migrationPending: false,
    },
    confidentialPolicy: {
      policyCommitment: policySetup.policyCommitment,
      encryptionWitnessHash: policySetup.encryptionWitnessHash,
      encryptedMaxPerRun: policySetup.encryptedMaxPerRun,
      encryptedDailyCap: policySetup.encryptedDailyCap,
      encryptedDailySpent: policySetup.encryptedDailySpent,
      spentDayIndex: currentDayIndex(),
      ...((options.officialEncrypt === 'pending' || options.officialEncrypt === 'configured') && {
        encryptCiphertexts: {
          maxPerRun: Keypair.generate().publicKey.toString(),
          dailyCap: Keypair.generate().publicKey.toString(),
          dailySpent: Keypair.generate().publicKey.toString(),
          pendingAllowedOutput: options.officialEncrypt === 'pending' ? Keypair.generate().publicKey.toString() : PublicKey.default.toString(),
          pendingDailySpentOutput: options.officialEncrypt === 'pending' ? Keypair.generate().publicKey.toString() : PublicKey.default.toString(),
          pendingSourceAmount: options.officialEncrypt === 'pending' ? Keypair.generate().publicKey.toString() : PublicKey.default.toString(),
          pendingSlot: options.officialEncrypt === 'pending' ? 98 : 0,
          pendingPolicySeq: options.officialEncrypt === 'pending' ? 7 : 0,
          pending: options.officialEncrypt === 'pending',
          configured: true,
        },
      }),
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
