import { describe, expect, test, mock } from 'bun:test';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  progressIkaLifecycle,
  type IkaLifecycleDeps,
  type IkaLifecycleProgressionInput,
} from '../src/lib/ika-lifecycle-progression';
import {
  MESSAGE_APPROVAL_LAYOUT,
  MESSAGE_APPROVAL_STATUS,
  DWALLET_CURVE,
  DWALLET_SIGNATURE_SCHEME,
  BcsWriter,
} from '../src/lib/ika-grpc-schema';
import type { IkaBridgelessExecutionRequest } from '../src/lib/ika-bridgeless-request';
import type { IkaGasDepositStatus } from '../src/lib/ika-gas-deposit';
import type { IkaDWalletRegistryEntry } from '../src/lib/ika-dwallet-registry';
import {
  runDestinationBroadcast,
  type DestinationBroadcastExecutionInput,
} from '../src/lib/destination-broadcast';

const OWNER = Keypair.generate().publicKey.toString();
const SESSION_KEY = Keypair.generate().publicKey.toString();
const MESSAGE_APPROVAL_PDA = Keypair.generate().publicKey.toString();
const DWALLET_ACCOUNT = Keypair.generate().publicKey.toString();
const TRANSFERRED_AUTHORITY = Keypair.generate().publicKey.toString();
const COORDINATOR_PDA = Keypair.generate().publicKey.toString();
const CPI_AUTHORITY_PDA = Keypair.generate().publicKey.toString();

function fakeIkaRequest(overrides: Partial<IkaBridgelessExecutionRequest> = {}): IkaBridgelessExecutionRequest {
  const baseDigest = 'a'.repeat(64);
  return {
    executionRail: 'ika-bridgeless',
    intentStrategy: 'dca',
    settlement: 'not-executed',
    requestId: 'ika-test-request',
    source: { chain: 'solana', asset: 'USDC' },
    target: { chain: 'sui', asset: 'SUI' },
    amount: '5',
    amountBaseUnits: '5000000',
    routeIntent: { strategy: 'dca', bridgeMode: 'bridgeless', riskStatus: 'passed' },
    sessionContext: {
      owner: OWNER,
      sessionKey: SESSION_KEY,
      smartWalletAuthority: OWNER,
      policySequence: 1,
    },
    policyAttestation: {
      status: 'approved',
      policySequence: 1,
      policyCommitment: Array(32).fill(0),
      attestationHash: 'deadbeef',
    },
    canonicalOrder: {} as unknown as IkaBridgelessExecutionRequest['canonicalOrder'],
    canonicalOrderHash: baseDigest,
    ikaMessageHash: baseDigest,
    executionBoundary: { status: 'approval-transaction-prepared', note: 'test' },
    preAlphaSigning: {
      status: 'approval-transaction-prepared',
      settlement: 'not-executed',
      dwalletAccount: DWALLET_ACCOUNT,
      ikaMessageHash: baseDigest,
      ikaMessageHashPreimage: {
        schema: 'polet.ika.message-approval.v1',
        canonicalOrderHash: baseDigest,
        requestId: 'ika-test-request',
        dwalletAccount: DWALLET_ACCOUNT,
        destinationChain: 'sui',
        destinationAsset: 'SUI',
        signatureScheme: 'ed25519-prealpha',
        userPublicKey: OWNER,
        policySequence: 1,
        expiresAtUnix: 0,
      },
      ikaMessageHashSource: 'polet-ika-approval-preimage-keccak256',
      messageDigest: baseDigest,
      messageDigestSource: 'ika-message-hash',
      userPublicKey: OWNER,
      signatureScheme: 'ed25519-prealpha',
      cpiAuthorityPda: CPI_AUTHORITY_PDA,
      cpiAuthorityBump: 1,
      coordinatorPda: COORDINATOR_PDA,
      messageApprovalPda: MESSAGE_APPROVAL_PDA,
      messageApprovalBump: 1,
      messageApprovalDerivation: 'official-dwallet-public-key',
      approveMessage: {
        programId: '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY',
        instruction: 'approve_message',
        authority: CPI_AUTHORITY_PDA,
        callerProgram: '9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc',
        accounts: {
          coordinator: COORDINATOR_PDA,
          dwalletAccount: DWALLET_ACCOUNT,
          messageApproval: MESSAGE_APPROVAL_PDA,
          cpiAuthority: CPI_AUTHORITY_PDA,
          userPublicKey: OWNER,
        },
      },
      preAlphaEnvironment: {
        provider: 'ika',
        cluster: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        mockSigner: true,
        productionMpc: false,
        note: 'test',
      },
    },
    ...overrides,
  } as IkaBridgelessExecutionRequest;
}

function fakeRegistryEntry(): IkaDWalletRegistryEntry {
  return {
    owner: OWNER,
    dwalletPublicKeyHex: 'ab'.repeat(32),
    dwalletAccount: DWALLET_ACCOUNT,
    curve: DWALLET_CURVE.Curve25519,
    createdEpoch: '0',
    transferredAuthority: TRANSFERRED_AUTHORITY,
  };
}

function baseInput(overrides: Partial<IkaLifecycleProgressionInput> = {}): IkaLifecycleProgressionInput {
  return {
    ikaRequest: fakeIkaRequest(),
    approvalTransactionSignature: 'aa'.repeat(32),
    approvalTransactionSlot: 123n,
    dwalletAttestation: {
      attestationData: Uint8Array.from([1, 2, 3]),
      networkSignature: new Uint8Array(64),
      networkPublicKey: new Uint8Array(32),
      epoch: 1n,
    },
    dwalletRegistryEntry: fakeRegistryEntry(),
    messageCentralizedSignature: new Uint8Array(64),
    dwalletNetworkEncryptionPublicKey: new Uint8Array(32),
    sessionContext: {
      owner: OWNER,
      sessionKey: SESSION_KEY,
      grantedSlot: 100,
      lastRevokedSlot: 0,
    },
    readLatestRevokedSlot: async () => 0,
    polling: { timeoutMs: 200, intervalMs: 20 },
    ...overrides,
  };
}

function fakeMessageApprovalData(status: number, signature: Uint8Array): Buffer {
  const buf = Buffer.alloc(MESSAGE_APPROVAL_LAYOUT.totalSize);
  buf.writeUInt8(MESSAGE_APPROVAL_LAYOUT.discriminatorValue, MESSAGE_APPROVAL_LAYOUT.discriminator);
  buf.writeUInt8(1, MESSAGE_APPROVAL_LAYOUT.version);
  // message digest at offset 34: 0x01 repeat
  buf.fill(0x01, MESSAGE_APPROVAL_LAYOUT.messageDigest, MESSAGE_APPROVAL_LAYOUT.messageDigest + 32);
  buf.writeUInt16LE(DWALLET_SIGNATURE_SCHEME.EddsaSha512, MESSAGE_APPROVAL_LAYOUT.signatureScheme);
  buf.writeBigUInt64LE(5n, MESSAGE_APPROVAL_LAYOUT.epoch);
  buf.writeUInt8(status, MESSAGE_APPROVAL_LAYOUT.status);
  buf.writeUInt16LE(signature.length, MESSAGE_APPROVAL_LAYOUT.signatureLen);
  Buffer.from(signature).copy(buf, MESSAGE_APPROVAL_LAYOUT.signature);
  return buf;
}

function gasDepositPassingStatus(): IkaGasDepositStatus {
  return {
    exists: true,
    pda: 'GasDeposit',
    passes: true,
    floors: { minIkaBaseUnits: 0n, minSolLamports: 0n },
    account: undefined,
  };
}

function buildFakePresignAttestationData(presignId: Uint8Array = Uint8Array.from([0xde, 0xad, 0xbe, 0xef])): Uint8Array {
  // VersionedPresignDataAttestation.V1 minimal BCS encoding — only the first
  // three fields (variant, session_identifier, epoch) are skipped by the
  // decoder, so beyond the presign_session_identifier we don't need to
  // produce valid bytes.
  const writer = new BcsWriter();
  writer.u8(0); // V1 variant
  writer.bytes(new Uint8Array(32)); // session_identifier
  writer.u64Le(0n); // epoch
  writer.byteSeq(presignId); // presign_session_identifier
  return writer.toUint8Array();
}

function makeDeps(options: {
  accountData: Buffer | null;
  grpcResponses?: Array<{ kind: 'attestation' | 'signature' | 'error'; payload?: unknown; message?: string; presignId?: Uint8Array }>;
}): IkaLifecycleDeps {
  const responses = options.grpcResponses ?? [
    { kind: 'attestation' },
    { kind: 'signature', payload: new Uint8Array(64) },
  ];
  let grpcCallIndex = 0;
  return {
    connection: {
      getAccountInfo: async () => options.accountData ? { data: options.accountData } : null,
    } as unknown as IkaLifecycleDeps['connection'],
    grpcClient: {
      submitDWalletRequest: async () => {
        const r = responses[grpcCallIndex++];
        if (!r) throw new Error('Unexpected extra gRPC call in test');
        if (r.kind === 'attestation') {
          return {
            response: {
              kind: 'attestation',
              attestation: {
                attestationData: buildFakePresignAttestationData(r.presignId),
                networkSignature: new Uint8Array(64),
                networkPublicKey: new Uint8Array(32),
                epoch: 1n,
              },
            },
            signedRequestData: { sessionIdentifierPreimage: new Uint8Array(32), epoch: 0n, chainId: 0, intendedChainSender: new Uint8Array(), request: { kind: 'presign' } } as never,
          };
        }
        if (r.kind === 'signature') {
          return {
            response: { kind: 'signature', signature: r.payload as Uint8Array },
            signedRequestData: { sessionIdentifierPreimage: new Uint8Array(32), epoch: 0n, chainId: 0, intendedChainSender: new Uint8Array(), request: { kind: 'sign' } } as never,
          };
        }
        // The orchestrator now raises `IkaGrpcRequestError` for error responses
        // coming from `submitDWalletRequest`, so simulate that behaviour.
        throw Object.assign(new Error(r.message ?? 'test error'), { name: 'IkaGrpcRequestError' });
      },
    } as unknown as IkaLifecycleDeps['grpcClient'],
    registry: {} as unknown as IkaLifecycleDeps['registry'],
    readGasDepositStatus: async () => gasDepositPassingStatus(),
  };
}

describe('progressIkaLifecycle', () => {
  test('happy path returns signature-committed + produced signature', async () => {
    const signature = Uint8Array.from(Array.from({ length: 64 }, (_, i) => (i + 1) & 0xff));
    const deps = makeDeps({
      accountData: fakeMessageApprovalData(MESSAGE_APPROVAL_STATUS.Signed, signature),
      grpcResponses: [
        { kind: 'attestation' },
        { kind: 'signature', payload: signature },
      ],
    });
    const result = await progressIkaLifecycle(baseInput(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lifecycleStatus).toBe('signature-committed');
      expect(result.produced.signature.length).toBe(64);
      expect(result.attemptedSteps).toContain('signature-committed');
    }
  });

  test('revoke mid-flight before Sign returns session-revoked-midflight', async () => {
    const deps = makeDeps({ accountData: null, grpcResponses: [{ kind: 'attestation' }] });
    let reads = 0;
    const input = baseInput({
      readLatestRevokedSlot: async () => {
        reads += 1;
        return reads > 1 ? 999 : 0; // revoke happens after Presign, before Sign
      },
    });
    const result = await progressIkaLifecycle(input, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe('session-revoked-midflight');
      expect(result.revokePhase).toBe('pre-sign');
      expect(result.attemptedSteps).toContain('session-revoked-midflight');
    }
  });

  test('gas floor blocks lifecycle before Presign', async () => {
    const deps: IkaLifecycleDeps = {
      ...makeDeps({ accountData: null }),
      readGasDepositStatus: async () => ({
        exists: true,
        pda: 'GasDeposit',
        passes: false,
        reason: 'IKA balance too low',
        floors: { minIkaBaseUnits: 100n, minSolLamports: 100n },
      }),
    };
    const result = await progressIkaLifecycle(baseInput(), deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe('gas-floor-blocked');
      expect(result.code).toBe('GAS_FLOOR_UNDERFUNDED');
      expect(result.reason).toContain('IKA balance too low');
    }
  });

  test('grpc error from Sign surfaces as SIGN_REQUEST_FAILED', async () => {
    const deps = makeDeps({
      accountData: null,
      grpcResponses: [
        { kind: 'attestation' },
        { kind: 'error', message: 'invalid presign' },
      ],
    });
    const result = await progressIkaLifecycle(baseInput(), deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SIGN_REQUEST_FAILED');
    }
  });
});

describe('runDestinationBroadcast', () => {
  const producedSignature = {
    status: 'signature-produced-prealpha' as const,
    signature: 'ab'.repeat(64),
    publicKey: Keypair.generate().publicKey.toString(),
    messageDigest: 'a'.repeat(64),
    signatureScheme: 'ed25519-prealpha' as const,
  };

  const dwalletPublicKey = new Uint8Array(32).fill(0xab);

  test('disabled mode returns broadcast-disabled without contacting RPC', async () => {
    const input: DestinationBroadcastExecutionInput = {
      ikaRequest: fakeIkaRequest(),
      producedSignature,
      dwalletPublicKey,
      config: { mode: 'disabled' },
    };
    const result = await runDestinationBroadcast(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('LIVE_BROADCAST_DISABLED');
  });

  test('Sui devnet broadcast uses injected fetch and returns explorer URL', async () => {
    const fakeFetch = mock(async (_url: string, _init: RequestInit | undefined) => ({
      ok: true,
      json: async () => ({ result: { digest: 'sui-tx-hash-abc' } }),
    })) as unknown as typeof fetch;
    const ikaRequest = fakeIkaRequest({
      suiTransactionDigest: {
        digestHex: 'de'.repeat(32),
        unsignedTxBytesBase64: 'c3VpLXR4',
      } as unknown as IkaBridgelessExecutionRequest['suiTransactionDigest'],
    });
    const result = await runDestinationBroadcast({
      ikaRequest,
      producedSignature: { ...producedSignature, signature: Buffer.from(new Uint8Array(64)).toString('hex') },
      dwalletPublicKey,
      config: {
        mode: 'live',
        rpcFetch: fakeFetch,
        sui: { rpcUrl: 'https://fullnode.devnet.sui.io:443' },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chain).toBe('sui');
      expect(result.receipt?.transactionHash).toBe('sui-tx-hash-abc');
      expect(result.receipt?.explorerUrl).toContain('sui-tx-hash-abc');
    }
  });

  test('demo-memo mode falls back to Solana memo proof disabled path when demo env not set', async () => {
    const ikaRequest = fakeIkaRequest();
    const prevFlag = process.env.POLET_DESTINATION_BROADCAST_DEMO;
    delete process.env.POLET_DESTINATION_BROADCAST_DEMO;
    try {
      const result = await runDestinationBroadcast({
        ikaRequest,
        producedSignature,
        dwalletPublicKey,
        config: { mode: 'demo-memo' },
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.status === 'broadcast-disabled' || result.status === 'broadcast-submitted').toBe(true);
    } finally {
      if (prevFlag !== undefined) process.env.POLET_DESTINATION_BROADCAST_DEMO = prevFlag;
    }
  });
});
