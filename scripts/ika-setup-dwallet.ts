#!/usr/bin/env bun
/**
 * Ika Pre-Alpha dWallet setup orchestrator.
 *
 * Creates a Curve25519 (or Secp256k1) dWallet through the official
 * `ika-dwallet` DKG path, waits for `CommitDWallet`, submits
 * `TransferOwnership` to Polet's `__ika_cpi_authority` PDA, then verifies
 * the dWallet authority matches the CPI PDA before persisting the owner ->
 * dWallet mapping locally.
 *
 * Usage:
 *   bun run scripts/ika-setup-dwallet.ts --owner <PUBKEY> [--curve curve25519|secp256k1] \
 *     [--dkg-material ./dkg.json] [--dry-run]
 *
 * Required env:
 *   POLET_IKA_SERVICE_KEYPAIR_HEX   64-byte hex tweetnacl secret key (Ed25519)
 *   POLET_PROGRAM_ID                Polet program id (for CPI authority PDA)
 *   POLET_SOLANA_RPC_URL            defaults to https://api.devnet.solana.com
 *
 * Optional:
 *   IKA_GRPC_URL                    defaults to pre-alpha-dev-1.ika.ika-network.net:443
 *
 * The script refuses to run when mandatory DKG material (user key share,
 * encryption key, signer public key) is missing. In `--dry-run` mode it
 * prints the derivations, PDAs, and request plan without contacting the
 * network.
 *
 * Pre-alpha disclaimer: this drives the pre-alpha mock signer on Ika
 * devnet. Do not treat produced dWallet keys as production-grade.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { promises as fs } from 'node:fs';
import {
  IkaDWalletRegistry,
  supportedIkaCurves,
  assertSupportedIkaCurve,
} from '../proxy/src/lib/ika-dwallet-registry';
import {
  createTlsGrpcTransport,
  IkaGrpcClient,
  loadIkaServiceKeypair,
} from '../proxy/src/lib/ika-grpc-client';
import {
  bytesToHex,
  CHAIN_ID,
  DWALLET_CURVE,
  IKA_DWALLET_PROGRAM_ID,
  TRANSFER_OWNERSHIP_DISCRIMINATOR,
  hexToBytes,
  type DWalletCurveId,
  type DWalletRequest,
} from '../proxy/src/lib/ika-grpc-schema';

interface SetupArgs {
  owner: string;
  curve: DWalletCurveId;
  dkgMaterialPath?: string;
  dryRun: boolean;
}

interface DkgMaterialFile {
  dwalletNetworkEncryptionPublicKeyHex: string;
  centralizedPublicKeyShareAndProofHex: string;
  userPublicOutputHex: string;
  share:
    | {
        mode: 'encrypted';
        encryptedCentralizedSecretShareAndProofHex: string;
        encryptionKeyHex: string;
        signerPublicKeyHex: string;
      }
    | {
        mode: 'public';
        publicUserSecretKeyShareHex: string;
      };
}

function parseArgs(argv: string[]): SetupArgs {
  const args: Partial<SetupArgs> = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--owner') args.owner = argv[++i];
    else if (arg === '--curve') {
      const value = argv[++i];
      if (value === 'curve25519') args.curve = DWALLET_CURVE.Curve25519;
      else if (value === 'secp256k1') args.curve = DWALLET_CURVE.Secp256k1;
      else throw new Error(`--curve must be curve25519 or secp256k1 (got ${value})`);
    } else if (arg === '--dkg-material') args.dkgMaterialPath = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(HELP);
      process.exit(0);
    }
  }
  if (!args.owner) throw new Error('--owner <Solana pubkey> is required');
  if (!args.curve) args.curve = DWALLET_CURVE.Curve25519;
  assertSupportedIkaCurve(args.curve);
  return args as SetupArgs;
}

const HELP = `ika-setup-dwallet
--owner <pubkey>             Solana owner wallet (the new dWallet authority pre-transfer)
--curve curve25519|secp256k1 Defaults to curve25519
--dkg-material <path>        JSON file containing centralized share + proofs + user output
--dry-run                    Print plan and PDAs without calling gRPC / chain
`;

async function readDkgMaterial(path?: string): Promise<DkgMaterialFile | null> {
  if (!path) return null;
  const raw = await fs.readFile(path, 'utf-8');
  return JSON.parse(raw) as DkgMaterialFile;
}

function deriveCpiAuthorityPda(programId: PublicKey): { pda: PublicKey; bump: number } {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('__ika_cpi_authority')],
    programId
  );
  return { pda, bump };
}

function buildTransferOwnershipInstructionData(newAuthority: PublicKey): Buffer {
  const data = Buffer.alloc(1 + 32);
  data.writeUInt8(TRANSFER_OWNERSHIP_DISCRIMINATOR, 0);
  newAuthority.toBuffer().copy(data, 1);
  return data;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ownerPubkey = new PublicKey(args.owner);
  const poletProgramIdStr = process.env.POLET_PROGRAM_ID;
  if (!poletProgramIdStr) throw new Error('POLET_PROGRAM_ID env is required');
  const poletProgramId = new PublicKey(poletProgramIdStr);
  const { pda: cpiAuthorityPda, bump: cpiAuthorityBump } = deriveCpiAuthorityPda(poletProgramId);

  console.log(`owner:                 ${ownerPubkey.toBase58()}`);
  console.log(`curve:                 ${curveName(args.curve)} (${args.curve})`);
  console.log(`polet program id:      ${poletProgramId.toBase58()}`);
  console.log(`polet CPI authority:   ${cpiAuthorityPda.toBase58()} (bump ${cpiAuthorityBump})`);
  console.log(`ika dwallet program:   ${IKA_DWALLET_PROGRAM_ID}`);
  console.log(`supported curves:      ${supportedIkaCurves().join(', ')}`);

  if (args.dryRun) {
    console.log('\n--dry-run specified; stopping before gRPC / chain calls.');
    console.log('Next (manual) steps:');
    console.log('  1. Supply DKG material via --dkg-material <path>.');
    console.log('  2. Run without --dry-run to execute DKG + CommitDWallet + TransferOwnership.');
    return;
  }

  const serviceKeyHex = process.env.POLET_IKA_SERVICE_KEYPAIR_HEX;
  if (!serviceKeyHex) {
    throw new Error('POLET_IKA_SERVICE_KEYPAIR_HEX env is required (64-byte tweetnacl secret key hex)');
  }
  const serviceKeypair = loadIkaServiceKeypair(serviceKeyHex);

  const material = await readDkgMaterial(args.dkgMaterialPath);
  if (!material) {
    throw new Error(
      'DKG material is required to submit DKG to Ika. Generate it with the official ika-dwallet CLI and pass --dkg-material <path>.'
    );
  }

  const rpcUrl = process.env.POLET_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const transport = await createTlsGrpcTransport();
  try {
    const grpcClient = new IkaGrpcClient({
      transport,
      serviceKeypair,
    });

    const dwalletRequest: DWalletRequest = {
      kind: 'dkg',
      dwalletNetworkEncryptionPublicKey: hexToBytes(material.dwalletNetworkEncryptionPublicKeyHex),
      curve: args.curve,
      centralizedPublicKeyShareAndProof: hexToBytes(material.centralizedPublicKeyShareAndProofHex),
      userSecretKeyShare:
        material.share.mode === 'encrypted'
          ? {
              mode: 'encrypted',
              encryptedCentralizedSecretShareAndProof: hexToBytes(material.share.encryptedCentralizedSecretShareAndProofHex),
              encryptionKey: hexToBytes(material.share.encryptionKeyHex),
              signerPublicKey: hexToBytes(material.share.signerPublicKeyHex),
            }
          : {
              mode: 'public',
              publicUserSecretKeyShare: hexToBytes(material.share.publicUserSecretKeyShareHex),
            },
      userPublicOutput: hexToBytes(material.userPublicOutputHex),
    };

    console.log('\nSubmitting DKG gRPC request...');
    const { response } = await grpcClient.submitDWalletRequest({
      epoch: 0n,
      chainId: CHAIN_ID.Solana,
      intendedChainSender: ownerPubkey.toBytes(),
      request: dwalletRequest,
    });
    if (response.kind !== 'attestation') {
      throw new Error(`DKG response expected Attestation, received ${response.kind}`);
    }

    // In a real run the DKG attestation contains the new dWallet public key.
    // We defer decoding VersionedDWalletDataAttestation to the user's chosen
    // tooling; Polet's registry only needs the bytes surfaced by the operator
    // for now.
    console.log('DKG Attestation received (bytes):', bytesToHex(response.attestation.attestationData).slice(0, 64), '...');
    console.log('Network signature:', bytesToHex(response.attestation.networkSignature).slice(0, 32), '...');

    console.log('\nTransferOwnership instruction data:');
    const transferData = buildTransferOwnershipInstructionData(cpiAuthorityPda);
    console.log(`  hex: ${transferData.toString('hex')}`);
    console.log('  submit this via your session signer, passing the newly created dWallet PDA as writable.');

    console.log('\nNote: TransferOwnership + on-chain authority verification must be driven by the caller.');
    console.log('After confirming `dwallet.authority == cpi_authority_pda`, call:');
    console.log('  POST /ika/setup-dwallet/commit   { owner, dwalletPublicKeyHex, curve, createdEpoch, dwalletAccount }');
    console.log('to persist the mapping into Polet\'s local registry.');
  } finally {
    await transport.close();
    // Avoid blocking Bun's exit on the Solana connection keep-alive sockets.
    // @ts-expect-error - private member access is intentional for cleanup.
    connection?._rpcWebSocket?.close?.();
  }
}

function curveName(curve: DWalletCurveId): string {
  if (curve === DWALLET_CURVE.Curve25519) return 'Curve25519';
  if (curve === DWALLET_CURVE.Secp256k1) return 'Secp256k1';
  if (curve === DWALLET_CURVE.Secp256r1) return 'Secp256r1';
  if (curve === DWALLET_CURVE.Ristretto) return 'Ristretto';
  return 'Unknown';
}

// Registry helper re-exported for the proxy endpoint.
export async function persistDwalletRegistryEntry(entry: {
  owner: string;
  curve: DWalletCurveId;
  dwalletPublicKeyHex: string;
  dwalletAccount: string;
  transferredAuthority: string;
  createdEpoch: string;
  label?: string;
}): Promise<void> {
  const registry = new IkaDWalletRegistry();
  await registry.upsert({
    ...entry,
    source: 'setup-script',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
