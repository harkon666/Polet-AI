#!/usr/bin/env bun
/**
 * Ika Pre-Alpha managed demo-mode setup script.
 *
 * One-time operator step: run DKG against the Ika pre-alpha gRPC service,
 * capture the resulting dWallet attestation, submit `TransferDWallet` so
 * Polet's CPI authority PDA owns the dWallet, then persist the fixture
 * JSON that `enableManagedIkaChain` reads at request time.
 *
 * Usage:
 *   POLET_LIVE_OWNER_SECRET=<base58_secret> \
 *   POLET_PROGRAM_ID=<polet_program_id> \
 *     bun run scripts/ika-setup-managed-fixture.ts [--curve curve25519|secp256k1] \
 *       [--fixture-path .polet/ika-managed-fixture.json] [--keep-owner-authority]
 *
 * Env overrides:
 *   IKA_GRPC_URL                 defaults to pre-alpha-dev-1.ika.ika-network.net:443
 *   POLET_SOLANA_RPC_URL         defaults to https://api.devnet.solana.com
 *
 * Pre-alpha disclaimer: this drives the Ika pre-alpha mock signer. The
 * dWallet it produces is NOT production key material; do not use for
 * real assets.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createIkaClient } from '@ika.xyz/pre-alpha-solana-client/grpc';

const IKA_DWALLET_PROGRAM_ID = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
const DEFAULT_FIXTURE_REL_PATH = path.join('proxy', 'polet-data', 'ika-managed-fixture.json');
const DEFAULT_GRPC_URL = 'pre-alpha-dev-1.ika.ika-network.net:443';
const CPI_AUTHORITY_SEED = Buffer.from('__ika_cpi_authority');
const DWALLET_SEED = Buffer.from('dwallet');
const IX_TRANSFER_DWALLET = 24;

type CurveKey = 'curve25519' | 'secp256k1';
const CURVE_ID: Record<CurveKey, number> = { secp256k1: 0, curve25519: 2 };

interface Args {
  curve: CurveKey;
  fixturePath: string;
  keepOwnerAuthority: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { curve: 'curve25519', fixturePath: DEFAULT_FIXTURE_REL_PATH, keepOwnerAuthority: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--curve') {
      const v = argv[++i];
      if (v !== 'curve25519' && v !== 'secp256k1') throw new Error(`--curve must be curve25519 or secp256k1 (got ${v})`);
      args.curve = v;
    } else if (a === '--fixture-path') {
      args.fixturePath = argv[++i]!;
    } else if (a === '--keep-owner-authority') {
      args.keepOwnerAuthority = true;
    }
  }
  return args;
}

function loadOwner(): Keypair {
  const secret = process.env.POLET_LIVE_OWNER_SECRET;
  if (!secret) throw new Error('POLET_LIVE_OWNER_SECRET (base58) env is required');
  return Keypair.fromSecretKey(bs58.decode(secret.trim()));
}

function requireProgramId(): PublicKey {
  const id = process.env.POLET_PROGRAM_ID;
  if (!id) throw new Error('POLET_PROGRAM_ID env is required');
  return new PublicKey(id);
}

function deriveCpiAuthority(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([CPI_AUTHORITY_SEED], programId)[0];
}

/** Chunk `curve_u16_le || public_key` into up to two 32-byte slices for PDA seeds. */
function deriveDwalletPda(curveId: number, publicKey: Uint8Array): PublicKey {
  const payload = Buffer.alloc(2 + publicKey.length);
  payload.writeUInt16LE(curveId, 0);
  Buffer.from(publicKey).copy(payload, 2);
  const seeds: Buffer[] = [DWALLET_SEED];
  for (let offset = 0; offset < payload.length; offset += 32) {
    seeds.push(payload.subarray(offset, Math.min(offset + 32, payload.length)));
  }
  return PublicKey.findProgramAddressSync(seeds, IKA_DWALLET_PROGRAM_ID)[0];
}

function buildTransferDwalletInstruction(currentAuthority: PublicKey, dwalletPda: PublicKey, newAuthority: PublicKey): TransactionInstruction {
  const data = Buffer.alloc(33);
  data.writeUInt8(IX_TRANSFER_DWALLET, 0);
  newAuthority.toBuffer().copy(data, 1);
  return new TransactionInstruction({
    programId: IKA_DWALLET_PROGRAM_ID,
    keys: [
      { pubkey: currentAuthority, isSigner: true, isWritable: false },
      { pubkey: dwalletPda, isSigner: false, isWritable: true },
    ],
    data,
  });
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

async function pollDwalletActive(connection: Connection, pda: PublicKey, timeoutMs = 60_000): Promise<Buffer> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const info = await connection.getAccountInfo(pda, 'confirmed');
    if (info) return info.data;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`dWallet PDA ${pda.toBase58()} not found after ${timeoutMs}ms; DKG CommitDWallet never landed`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const owner = loadOwner();
  const poletProgramId = requireProgramId();
  const cpiAuthorityPda = deriveCpiAuthority(poletProgramId);
  const rpcUrl = process.env.POLET_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const grpcUrl = process.env.IKA_GRPC_URL ?? DEFAULT_GRPC_URL;
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log(`owner:              ${owner.publicKey.toBase58()}`);
  console.log(`balance:            ${((await connection.getBalance(owner.publicKey)) / 1e9).toFixed(4)} SOL`);
  console.log(`polet program id:   ${poletProgramId.toBase58()}`);
  console.log(`polet CPI authority: ${cpiAuthorityPda.toBase58()}`);
  console.log(`curve:              ${args.curve} (id=${CURVE_ID[args.curve]})`);
  console.log(`grpc:               ${grpcUrl}`);
  console.log(`fixture path:       ${args.fixturePath}`);

  const ika = createIkaClient(grpcUrl);
  try {
    console.log('\n1. Submitting DKG request to Ika pre-alpha...');
    const dkg = await ika.requestDKG(owner.publicKey.toBytes());
    console.log(`   dWallet public key: ${toHex(dkg.publicKey).slice(0, 32)}… (${dkg.publicKey.length} bytes)`);
    console.log(`   attestation bytes:  ${dkg.attestationData.length} bytes`);
    console.log(`   network signature:  ${dkg.networkSignature.length} bytes`);
    console.log(`   network pubkey:     ${toHex(dkg.networkPubkey).slice(0, 32)}…`);

    const dwalletPda = deriveDwalletPda(CURVE_ID[args.curve], dkg.publicKey);
    console.log(`   dWallet PDA:        ${dwalletPda.toBase58()}`);

    console.log('\n2. Waiting for CommitDWallet to land on-chain...');
    const dwalletData = await pollDwalletActive(connection, dwalletPda);
    const initialAuthority = new PublicKey(dwalletData.subarray(2, 34));
    console.log(`   dWallet active, initial authority: ${initialAuthority.toBase58()}`);
    if (!initialAuthority.equals(owner.publicKey)) {
      console.log(`   ⚠ expected initial authority == owner but got ${initialAuthority.toBase58()}; continuing`);
    }

    let transferredAuthority = initialAuthority;
    if (!args.keepOwnerAuthority) {
      console.log('\n3. TransferDWallet → Polet CPI authority...');
      const ix = buildTransferDwalletInstruction(owner.publicKey, dwalletPda, cpiAuthorityPda);
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(connection, tx, [owner], { commitment: 'confirmed' });
      console.log(`   transfer tx: ${sig}`);

      // verify
      const info = await connection.getAccountInfo(dwalletPda, 'confirmed');
      if (!info) throw new Error('dWallet account disappeared after transfer');
      const onchainAuthority = new PublicKey(info.data.subarray(2, 34));
      if (!onchainAuthority.equals(cpiAuthorityPda)) {
        throw new Error(`TransferDWallet verification failed: authority=${onchainAuthority.toBase58()} expected=${cpiAuthorityPda.toBase58()}`);
      }
      transferredAuthority = cpiAuthorityPda;
      console.log(`   ✓ authority now = ${transferredAuthority.toBase58()}`);
    } else {
      console.log('\n3. --keep-owner-authority set, skipping TransferDWallet');
    }

    const fixtureEntry = {
      curve: CURVE_ID[args.curve],
      dwalletAccount: dwalletPda.toBase58(),
      dwalletPublicKeyHex: toHex(dkg.publicKey),
      transferredAuthority: transferredAuthority.toBase58(),
      createdEpoch: '1',
      dwalletNetworkEncryptionPublicKeyHex: toHex(dkg.networkPubkey),
      dwalletAttestation: {
        attestationDataHex: toHex(dkg.attestationData),
        networkSignatureHex: toHex(dkg.networkSignature),
        networkPublicKeyHex: toHex(dkg.networkPubkey),
        epoch: '1',
      },
      // Pre-alpha mock signer accepts zero-filled centralized signature.
      messageCentralizedSignatureHex: toHex(new Uint8Array(64)),
    };

    const existingFixture = await readExistingFixture(args.fixturePath);
    const fixture = {
      version: 1 as const,
      disclosure:
        existingFixture?.disclosure
        ?? 'Polet demo managed dWallet — pre-alpha mock signer only; not a production MPC key.',
      dwallets: {
        ...(existingFixture?.dwallets ?? {}),
        [args.curve]: fixtureEntry,
      },
    };

    await fs.mkdir(path.dirname(args.fixturePath), { recursive: true });
    await fs.writeFile(args.fixturePath, JSON.stringify(fixture, null, 2), 'utf-8');
    console.log(`\n4. Fixture written to ${args.fixturePath}`);
    console.log('\nNext steps:');
    console.log('  • Point the proxy at this fixture:');
    console.log(`      export POLET_IKA_MANAGED_FIXTURE_PATH=${path.resolve(args.fixturePath)}`);
    console.log('  • (Re)start the proxy, then call POST /ika/enable-chain { owner, chain: "sui" }');
    console.log('    to register the mapping + fund GasDeposit for this owner.');
  } finally {
    ika.close();
  }
}

async function readExistingFixture(filePath: string): Promise<{ disclosure: string; dwallets: Record<string, unknown> } | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

main().catch((err) => {
  console.error('\n✗ ika-setup-managed-fixture failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
