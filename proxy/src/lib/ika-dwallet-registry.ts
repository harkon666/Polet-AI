/**
 * Local owner -> Ika dWallet registry.
 *
 * Stores the mapping so proxy routes do not have to ask the session signer
 * for dWallet metadata on every call. The registry lives on disk under
 * `POLET_IKA_REGISTRY_PATH` (default `<cwd>/.polet/ika-dwallets.json`) and is
 * deliberately small: only non-secret identifiers are persisted. Secret key
 * share material, ephemeral encryption keys, and DKG private outputs must
 * never reach this file.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PublicKey } from '@solana/web3.js';
import { bytesToHex, hexToBytes, DWALLET_CURVE, type DWalletCurveId } from './ika-grpc-schema';

export const DEFAULT_REGISTRY_PATH = path.join(process.cwd(), '.polet', 'ika-dwallets.json');

export interface IkaDWalletRegistryEntry {
  owner: string;
  dwalletPublicKeyHex: string;
  dwalletAccount: string;
  curve: DWalletCurveId;
  createdEpoch: string;
  transferredAuthority: string;
  /** Optional: user-visible label. */
  label?: string;
  /** Source tag (e.g. `setup-script`, `api`). */
  source?: string;
}

export interface IkaDWalletRegistryFile {
  version: 1;
  updatedAt: string;
  entries: IkaDWalletRegistryEntry[];
}

export interface IkaDWalletRegistryOptions {
  filePath?: string;
}

export class IkaDWalletRegistry {
  private readonly filePath: string;

  constructor(options: IkaDWalletRegistryOptions = {}) {
    this.filePath = options.filePath
      ?? process.env.POLET_IKA_REGISTRY_PATH
      ?? DEFAULT_REGISTRY_PATH;
  }

  async list(): Promise<IkaDWalletRegistryEntry[]> {
    const file = await this.readFile();
    return file.entries;
  }

  async findByOwner(owner: string): Promise<IkaDWalletRegistryEntry | null> {
    const normalized = normalizePublicKey(owner);
    const file = await this.readFile();
    return file.entries.find((entry) => entry.owner === normalized) ?? null;
  }

  async findByDwalletPublicKey(publicKey: Uint8Array | string): Promise<IkaDWalletRegistryEntry | null> {
    const hex = typeof publicKey === 'string' ? stripHex(publicKey) : bytesToHex(publicKey);
    const file = await this.readFile();
    return file.entries.find((entry) => entry.dwalletPublicKeyHex === hex) ?? null;
  }

  async upsert(entry: IkaDWalletRegistryEntry): Promise<IkaDWalletRegistryEntry> {
    const file = await this.readFile();
    const normalized: IkaDWalletRegistryEntry = {
      ...entry,
      owner: normalizePublicKey(entry.owner),
      dwalletAccount: normalizePublicKey(entry.dwalletAccount),
      transferredAuthority: normalizePublicKey(entry.transferredAuthority),
      dwalletPublicKeyHex: stripHex(entry.dwalletPublicKeyHex),
      createdEpoch: String(entry.createdEpoch ?? '0'),
    };
    const existingIndex = file.entries.findIndex(
      (candidate) =>
        candidate.owner === normalized.owner
        || candidate.dwalletPublicKeyHex === normalized.dwalletPublicKeyHex
    );
    if (existingIndex >= 0) {
      file.entries[existingIndex] = normalized;
    } else {
      file.entries.push(normalized);
    }
    file.updatedAt = new Date().toISOString();
    await this.writeFile(file);
    return normalized;
  }

  async remove(owner: string): Promise<boolean> {
    const normalized = normalizePublicKey(owner);
    const file = await this.readFile();
    const before = file.entries.length;
    file.entries = file.entries.filter((entry) => entry.owner !== normalized);
    if (file.entries.length === before) return false;
    file.updatedAt = new Date().toISOString();
    await this.writeFile(file);
    return true;
  }

  /** Retrieve the dWallet public key bytes for an owner; throws when missing. */
  async requireDwalletPublicKey(owner: string): Promise<Uint8Array> {
    const entry = await this.findByOwner(owner);
    if (!entry) {
      throw new Error(`No dWallet registered for owner ${owner}. Run scripts/ika-setup-dwallet.ts first.`);
    }
    return hexToBytes(entry.dwalletPublicKeyHex);
  }

  private async readFile(): Promise<IkaDWalletRegistryFile> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<IkaDWalletRegistryFile>;
      if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
        return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
      }
      return { version: 1, updatedAt: parsed.updatedAt ?? new Date().toISOString(), entries: parsed.entries };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
      }
      throw error;
    }
  }

  private async writeFile(file: IkaDWalletRegistryFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(file, null, 2), 'utf-8');
  }
}

function normalizePublicKey(value: string): string {
  try {
    return new PublicKey(value).toString();
  } catch {
    throw new Error(`Invalid Solana public key: ${value}`);
  }
}

function stripHex(value: string): string {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error(`Invalid hex payload: ${value}`);
  }
  return normalized.toLowerCase();
}

export function supportedIkaCurves(): DWalletCurveId[] {
  return [DWALLET_CURVE.Curve25519, DWALLET_CURVE.Secp256k1];
}

export function assertSupportedIkaCurve(curve: DWalletCurveId): void {
  if (!supportedIkaCurves().includes(curve)) {
    throw new Error(`Ika curve ${curve} is not supported by Polet's current dWallet lifecycle; use Curve25519 (2) or Secp256k1 (0)`);
  }
}
