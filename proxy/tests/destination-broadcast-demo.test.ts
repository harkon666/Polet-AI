import { describe, expect, test } from 'bun:test';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  buildConfidentialNumericPolicySetup,
  currentDayIndex,
} from '../src/lib/confidential-numeric-policy';
import { deriveWalletPda } from '../src/lib/confidential-dca-execution';
import { createIkaBridgelessExecutionRequest } from '../src/lib/ika-bridgeless-request';
import {
  DESTINATION_BROADCAST_DEMO_MEMO_PROGRAM_ID,
  buildDestinationMemoProofInstruction,
  createDemoProducedSignature,
  normalizeDestinationReceipt,
  runDestinationBroadcastDemo,
  type DestinationBroadcastRpc,
} from '../src/lib/destination-broadcast-demo';
import type { WalletData } from '../src/lib/wallet-store';
import type { Intent } from '../src/types/intent';

const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

describe('destination broadcast demo', () => {
  test('constructs the selected Solana devnet memo proof transaction from a produced Pre-Alpha signature', async () => {
    const fixture = await createApprovedIkaFixture();
    const producedSignature = createDemoProducedSignature(fixture.signing);

    const instruction = buildDestinationMemoProofInstruction({
      ikaRequest: fixture.ikaRequest,
      producedSignature,
    });

    expect(instruction.programId.toString()).toBe(DESTINATION_BROADCAST_DEMO_MEMO_PROGRAM_ID.toString());
    expect(instruction.keys).toHaveLength(0);
    const memo = JSON.parse(Buffer.from(instruction.data).toString('utf8'));
    expect(memo).toMatchObject({
      polet: 'ika-prealpha-destination-broadcast-demo',
      requestId: fixture.ikaRequest.requestId,
      target: { chain: 'sui', asset: 'SUI' },
      messageDigest: fixture.signing.messageDigest,
      productionSettlement: false,
    });
    expect(memo.signatureHash).not.toBe(producedSignature.signature);
  });

  test('keeps broadcast disabled unless explicit demo config is enabled', async () => {
    const fixture = await createApprovedIkaFixture();
    const producedSignature = createDemoProducedSignature(fixture.signing);
    const rpc = createMockRpc();

    const result = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature,
    }, rpc);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('broadcast-disabled');
    if (!result.ok) {
      expect(result.code).toBe('BROADCAST_DISABLED');
      expect(result.demoPath).toMatchObject({
        chain: 'solana',
        cluster: 'devnet',
        action: 'memo-proof',
        productionSettlement: false,
      });
      expect(result.transaction?.base64).toBeDefined();
    }
    expect(rpc.sentTransactions).toHaveLength(0);
  });

  test('broadcasts with mocked RPC and normalizes the submitted receipt', async () => {
    const fixture = await createApprovedIkaFixture();
    const feePayer = Keypair.generate();
    const rpc = createMockRpc();

    const result = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature: createDemoProducedSignature(fixture.signing),
      demoConfig: {
        enabled: true,
        feePayerSecretKey: JSON.stringify(Array.from(feePayer.secretKey)),
      },
    }, rpc);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe('broadcast-submitted');
      expect(result.transaction.feePayer).toBe(feePayer.publicKey.toString());
      expect(result.receipt).toMatchObject({
        chain: 'solana',
        cluster: 'devnet',
        action: 'memo-proof',
        transactionId: rpc.signature,
        slot: 123,
        confirmationStatus: 'processed',
      });
      expect(result.receipt.explorerUrl).toContain('cluster=devnet');
      expect(Transaction.from(Buffer.from(result.transaction.base64, 'base64')).signatures[0].publicKey.toString()).toBe(feePayer.publicKey.toString());
    }
    expect(rpc.sentTransactions).toHaveLength(1);
  });

  test('maps unsupported chain, missing faucet funds, invalid signature, RPC failure, and timeout states', async () => {
    const fixture = await createApprovedIkaFixture();
    const producedSignature = createDemoProducedSignature(fixture.signing);
    const feePayer = Keypair.generate();

    const unsupported = await runDestinationBroadcastDemo({
      ikaRequest: {
        ...fixture.ikaRequest,
        target: { chain: 'base' as never, asset: 'ETH' },
      },
      producedSignature,
      demoConfig: { enabled: true },
    }, createMockRpc());
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) expect(unsupported.code).toBe('UNSUPPORTED_DESTINATION_CHAIN');

    const missingFunds = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature,
      demoConfig: {
        enabled: true,
        feePayerSecretKey: JSON.stringify(Array.from(feePayer.secretKey)),
      },
    }, createMockRpc({ balance: 0 }));
    expect(missingFunds.ok).toBe(false);
    if (!missingFunds.ok) expect(missingFunds.code).toBe('MISSING_FAUCET_FUNDS');

    const invalidSignature = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature: {
        ...producedSignature,
        signature: 'not-a-signature',
      },
      demoConfig: { enabled: true },
    }, createMockRpc());
    expect(invalidSignature.ok).toBe(false);
    if (!invalidSignature.ok) expect(invalidSignature.code).toBe('INVALID_PREALPHA_SIGNATURE');

    const rpcFailure = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature,
      demoConfig: {
        enabled: true,
        feePayerSecretKey: JSON.stringify(Array.from(feePayer.secretKey)),
      },
    }, createMockRpc({ sendError: new Error('RPC node rejected transaction') }));
    expect(rpcFailure.ok).toBe(false);
    if (!rpcFailure.ok) expect(rpcFailure.code).toBe('RPC_FAILURE');

    const timeout = await runDestinationBroadcastDemo({
      ikaRequest: fixture.ikaRequest,
      producedSignature,
      demoConfig: {
        enabled: true,
        feePayerSecretKey: JSON.stringify(Array.from(feePayer.secretKey)),
      },
    }, createMockRpc({ sendError: new Error('broadcast timeout') }));
    expect(timeout.ok).toBe(false);
    if (!timeout.ok) expect(timeout.code).toBe('BROADCAST_TIMEOUT');
  });

  test('normalizes receipts without requiring a live RPC status', async () => {
    const receipt = await normalizeDestinationReceipt('demoTx111');

    expect(receipt).toEqual({
      chain: 'solana',
      cluster: 'devnet',
      action: 'memo-proof',
      transactionId: 'demoTx111',
      explorerUrl: 'https://explorer.solana.com/tx/demoTx111?cluster=devnet',
    });
  });
});

async function createApprovedIkaFixture() {
  const fixture = createFixture();
  const intent = createIkaIntent(fixture, '5');
  const result = await createIkaBridgelessExecutionRequest(intent, {
    getWalletData: async () => fixture.wallet,
  });

  expect(result.allowed).toBe(true);
  if (!result.allowed || !result.ikaRequest.preAlphaSigning) {
    throw new Error('expected approved Ika request');
  }

  return {
    ...fixture,
    ikaRequest: result.ikaRequest,
    signing: result.ikaRequest.preAlphaSigning,
  };
}

function createIkaIntent(fixture: ReturnType<typeof createFixture>, amount: string): Intent {
  return {
    id: `ika-broadcast-${amount}`,
    owner: fixture.owner,
    sessionKey: fixture.sessionKey,
    action: 'multichain-strategy',
    params: {
      sourceChain: 'solana',
      sourceAsset: 'USDC',
      targetChain: 'sui',
      targetAsset: 'SUI',
      amount,
      executionRail: 'ika',
      strategy: 'dca',
      encryptionWitness: Array.from(fixture.witness),
    },
    timestamp: 1700000000,
  };
}

function createFixture() {
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
    lastRevokedSlot: 2,
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
    sessions: [
      {
        key: sessionKey,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        grantedSlot: 2,
        authorized: true,
      },
    ],
    temporalKeys: [],
  };
  wallet.temporalKeys = wallet.sessions;

  return { owner, sessionKey, wallet, witness };
}

function createMockRpc(options: {
  balance?: number;
  sendError?: Error;
} = {}): DestinationBroadcastRpc & { sentTransactions: Uint8Array[]; signature: string } {
  const sentTransactions: Uint8Array[] = [];
  const signature = '5'.repeat(88);

  return {
    sentTransactions,
    signature,
    async getLatestBlockhash() {
      return {
        blockhash: Keypair.generate().publicKey.toString(),
        lastValidBlockHeight: 999,
      };
    },
    async getBalance() {
      return options.balance ?? 1_000_000;
    },
    async sendRawTransaction(rawTransaction: Buffer | Uint8Array) {
      if (options.sendError) throw options.sendError;
      sentTransactions.push(Uint8Array.from(rawTransaction));
      return signature;
    },
    async confirmTransaction() {
      return { value: { err: null } };
    },
    async getSignatureStatuses() {
      return {
        value: [
          {
            slot: 123,
            confirmationStatus: 'processed',
          },
        ],
      };
    },
  };
}
