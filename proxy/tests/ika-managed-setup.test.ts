import { describe, expect, test, mock } from 'bun:test';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  enableManagedIkaChain,
  resolveCurveForChain,
  type EnableChainDeps,
} from '../src/lib/ika-managed-setup';
import {
  ManagedFixtureMissingError,
  type ManagedDwalletFixtureFile,
} from '../src/lib/ika-dkg-orchestrator';
import { IkaDWalletRegistry } from '../src/lib/ika-dwallet-registry';
import { DWALLET_CURVE } from '../src/lib/ika-grpc-schema';
import type { IkaGasDepositStatus } from '../src/lib/ika-gas-deposit';

const OWNER = Keypair.generate().publicKey.toString();
const DWALLET_ACCOUNT = Keypair.generate().publicKey.toString();
const CPI_AUTHORITY = Keypair.generate().publicKey.toString();

function makeFixture(): ManagedDwalletFixtureFile {
  return {
    version: 1,
    disclosure: 'test fixture',
    dwallets: {
      curve25519: {
        curve: DWALLET_CURVE.Curve25519,
        dwalletAccount: DWALLET_ACCOUNT,
        dwalletPublicKeyHex: 'ab'.repeat(32),
        transferredAuthority: CPI_AUTHORITY,
        createdEpoch: '0',
        dwalletNetworkEncryptionPublicKeyHex: 'cd'.repeat(32),
        dwalletAttestation: {
          attestationDataHex: 'de',
          networkSignatureHex: '00'.repeat(64),
          networkPublicKeyHex: '11'.repeat(32),
          epoch: '0',
        },
        messageCentralizedSignatureHex: '22'.repeat(64),
      },
    },
  };
}

function makeInMemoryRegistry(): IkaDWalletRegistry {
  const path = `/tmp/polet-ika-reg-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  return new IkaDWalletRegistry({ filePath: path });
}

function gasStatus(passes: boolean, exists: boolean): IkaGasDepositStatus {
  return {
    exists,
    pda: 'GasPda',
    passes,
    floors: { minIkaBaseUnits: 0n, minSolLamports: 0n },
    account: exists
      ? ({
          ikaBalance: passes ? 100n : 0n,
          solBalance: passes ? 100n : 0n,
        } as IkaGasDepositStatus['account'])
      : undefined,
  };
}

describe('resolveCurveForChain', () => {
  test('defaults Sui to Curve25519 and Ethereum to Secp256k1', () => {
    expect(resolveCurveForChain('sui').key).toBe('curve25519');
    expect(resolveCurveForChain('ethereum').key).toBe('secp256k1');
  });

  test('respects curve override', () => {
    expect(resolveCurveForChain('sui', 'secp256k1').id).toBe(DWALLET_CURVE.Secp256k1);
  });
});

describe('enableManagedIkaChain', () => {
  test('maps owner to fixture dWallet and reports already-funded gas deposit', async () => {
    const deps: EnableChainDeps = {
      connection: {} as EnableChainDeps['connection'],
      registry: makeInMemoryRegistry(),
      loadFixture: async () => makeFixture(),
      readGasDepositStatus: async () => gasStatus(true, true),
      skipAuthorityVerification: true,
    };
    const result = await enableManagedIkaChain(
      { owner: OWNER, chain: 'sui' },
      deps
    );
    expect(result.status).toBe('enabled');
    expect(result.chain).toBe('sui');
    expect(result.curve).toBe('curve25519');
    expect(result.registry.dwalletAccount).toBe(DWALLET_ACCOUNT);
    expect(result.registry.transferredAuthority).toBe(CPI_AUTHORITY);
    expect(result.gasDeposit.action).toBe('already-funded');
    expect(result.authorityVerification.ok).toBe(true);
  });

  test('returns gas-deposit-required when subsidy keypair is absent', async () => {
    const deps: EnableChainDeps = {
      connection: {} as EnableChainDeps['connection'],
      registry: makeInMemoryRegistry(),
      loadFixture: async () => makeFixture(),
      readGasDepositStatus: async () => gasStatus(false, false),
      skipAuthorityVerification: true,
    };
    const result = await enableManagedIkaChain({ owner: OWNER, chain: 'sui' }, deps);
    expect(result.gasDeposit.action).toBe('gas-deposit-required');
  });

  test('funds gas deposit via subsidy keypair when configured', async () => {
    const feePayer = Keypair.generate();
    const sendMock = mock(async (_tx: Transaction, _signers: Keypair[]) => 'mock-subsidy-sig');
    let readCall = 0;
    const deps: EnableChainDeps = {
      connection: {
        getLatestBlockhash: async () => ({ blockhash: 'Blockhash111111111111111111111111', lastValidBlockHeight: 1 }),
      } as unknown as EnableChainDeps['connection'],
      registry: makeInMemoryRegistry(),
      loadFixture: async () => makeFixture(),
      readGasDepositStatus: async () => {
        readCall += 1;
        return gasStatus(readCall > 1, readCall > 1);
      },
      skipAuthorityVerification: true,
      subsidyKeypair: feePayer,
      sendTransaction: sendMock as unknown as EnableChainDeps['sendTransaction'],
    };
    const result = await enableManagedIkaChain({ owner: OWNER, chain: 'sui' }, deps);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(result.gasDeposit.action).toBe('funded-by-subsidy');
    expect(result.gasDeposit.subsidyTxSignature).toBe('mock-subsidy-sig');
  });

  test('propagates missing-fixture error', async () => {
    const deps: EnableChainDeps = {
      connection: {} as EnableChainDeps['connection'],
      registry: makeInMemoryRegistry(),
      loadFixture: async () => {
        throw new ManagedFixtureMissingError('/missing');
      },
      skipAuthorityVerification: true,
    };
    await expect(enableManagedIkaChain({ owner: OWNER, chain: 'sui' }, deps)).rejects.toThrow(
      /Ika managed demo fixture not found/
    );
  });

  test('surfaces authority mismatch as warning without aborting', async () => {
    const deps: EnableChainDeps = {
      connection: {
        getAccountInfo: async () => ({
          data: Buffer.concat([
            Buffer.alloc(2),
            new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS').toBuffer(), // different authority
            Buffer.alloc(200),
          ]),
        }),
      } as unknown as EnableChainDeps['connection'],
      registry: makeInMemoryRegistry(),
      loadFixture: async () => makeFixture(),
      readGasDepositStatus: async () => gasStatus(true, true),
    };
    const result = await enableManagedIkaChain({ owner: OWNER, chain: 'sui' }, deps);
    expect(result.authorityVerification.ok).toBe(false);
    if (!result.authorityVerification.ok) {
      expect(result.authorityVerification.expected).toBe(CPI_AUTHORITY);
      expect(result.authorityVerification.warning).toContain('drifted');
    }
  });
});
