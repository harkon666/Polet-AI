/**
 * Managed demo fixture loader for Ika Pre-Alpha dWallets.
 *
 * Opsi A (managed demo mode): the operator runs the official Ika DKG flow
 * once at deployment time (see `scripts/ika-setup-managed-fixture.ts`) and
 * commits a JSON file describing the resulting "house" dWallet(s). All
 * browser users who click `Enable Sui trading` share the same underlying
 * dWallet — acceptable because the Ika pre-alpha mock signer is single
 * mock anyway. The fixture is loaded lazily so unit tests can run without
 * a file on disk.
 *
 * Fixture format (`.polet/ika-managed-fixture.json`):
 *
 * ```json
 * {
 *   "version": 1,
 *   "disclosure": "Polet demo managed dWallet — pre-alpha mock signer only.",
 *   "dwallets": {
 *     "curve25519": {
 *       "curve": 2,
 *       "dwalletAccount": "...",
 *       "dwalletPublicKeyHex": "...",
 *       "transferredAuthority": "...",
 *       "createdEpoch": "0",
 *       "dwalletNetworkEncryptionPublicKeyHex": "...",
 *       "dwalletAttestation": {
 *         "attestationDataHex": "...",
 *         "networkSignatureHex": "...",
 *         "networkPublicKeyHex": "...",
 *         "epoch": "0"
 *       },
 *       "messageCentralizedSignatureHex": "..."
 *     }
 *   }
 * }
 * ```
 *
 * Pre-alpha disclaimer: this fixture is not a real MPC dWallet. It only
 * reuses a single pre-alpha mock dWallet for demo continuity. Production
 * dWallets must be DKG'd per-user with zero-trust encrypted shares.
 */

import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';
import { DWALLET_CURVE, type DWalletCurveId } from './ika-grpc-schema';

export const DEFAULT_MANAGED_FIXTURE_PATH = (() => {
  // 1. Path relative to source (works if running from src/lib)
  const srcPath = path.join(__dirname, '..', '..', 'polet-data', 'ika-managed-fixture.json');
  if (existsSync(srcPath)) return srcPath;

  // 2. Absolute path for cloud deployments (Render, Railway, Docker typically use /app)
  const cloudPath = '/app/proxy/polet-data/ika-managed-fixture.json';
  if (existsSync(cloudPath)) return cloudPath;

  // 3. Fallback to process.cwd() (works if running directly inside proxy folder)
  const cwdPath = path.join(process.cwd(), 'polet-data', 'ika-managed-fixture.json');
  if (existsSync(cwdPath)) return cwdPath;

  // Default fallback
  return cloudPath; // Use cloudPath as default so the error log makes sense to the user if it fails
})();

export type ManagedCurveKey = 'curve25519' | 'secp256k1';

export interface ManagedDwalletFixtureEntry {
  curve: DWalletCurveId;
  dwalletAccount: string;
  dwalletPublicKeyHex: string;
  transferredAuthority: string;
  createdEpoch: string;
  dwalletNetworkEncryptionPublicKeyHex: string;
  dwalletAttestation: {
    attestationDataHex: string;
    networkSignatureHex: string;
    networkPublicKeyHex: string;
    epoch: string;
  };
  /**
   * BCS-serialized `message_centralized_signature` bytes produced during the
   * operator-side DKG. Required by Ika's Sign request for this curve and
   * reused across demo sessions because the mock signer does not rotate
   * user-share material.
   */
  messageCentralizedSignatureHex: string;
}

export interface ManagedDwalletFixtureFile {
  version: 1;
  disclosure: string;
  dwallets: Partial<Record<ManagedCurveKey, ManagedDwalletFixtureEntry>>;
}

export class ManagedFixtureMissingError extends Error {
  constructor(public readonly fixturePath: string) {
    super(
      `Ika managed demo fixture not found at ${fixturePath}. Run scripts/ika-setup-managed-fixture.ts once at deployment to generate it, or point POLET_IKA_MANAGED_FIXTURE_PATH at an existing file.`
    );
    this.name = 'ManagedFixtureMissingError';
  }
}

export interface LoadManagedFixtureOptions {
  filePath?: string;
  /** Inject a pre-parsed fixture (tests). */
  preloaded?: ManagedDwalletFixtureFile;
}

export async function loadManagedFixture(
  options: LoadManagedFixtureOptions = {}
): Promise<ManagedDwalletFixtureFile> {
  if (options.preloaded) return normalizeFixture(options.preloaded);
  const filePath = options.filePath
    ?? process.env.POLET_IKA_MANAGED_FIXTURE_PATH
    ?? DEFAULT_MANAGED_FIXTURE_PATH;
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as ManagedDwalletFixtureFile;
    return normalizeFixture(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ManagedFixtureMissingError(filePath);
    }
    throw error;
  }
}

export function resolveManagedCurveKey(curve: DWalletCurveId): ManagedCurveKey {
  if (curve === DWALLET_CURVE.Curve25519) return 'curve25519';
  if (curve === DWALLET_CURVE.Secp256k1) return 'secp256k1';
  throw new Error(`Managed fixture supports Curve25519 or Secp256k1 only (requested curve id ${curve})`);
}

export function requireManagedFixtureEntry(
  file: ManagedDwalletFixtureFile,
  curve: DWalletCurveId
): ManagedDwalletFixtureEntry {
  const key = resolveManagedCurveKey(curve);
  const entry = file.dwallets[key];
  if (!entry) {
    throw new Error(
      `Managed fixture has no entry for curve ${key}. Re-run the fixture setup script with --curve ${key}.`
    );
  }
  return entry;
}

function normalizeFixture(file: ManagedDwalletFixtureFile): ManagedDwalletFixtureFile {
  if (file.version !== 1) {
    throw new Error(`Unsupported managed fixture version ${file.version}; expected 1`);
  }
  return {
    version: 1,
    disclosure:
      file.disclosure
      ?? 'Polet demo managed dWallet — pre-alpha mock signer only; not a production MPC key.',
    dwallets: file.dwallets ?? {},
  };
}
