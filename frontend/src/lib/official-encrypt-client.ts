import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Chain, createEncryptWebClient, encryptValue } from '@encrypt.xyz/pre-alpha-solana-client/grpc-web';
import { POLET_PROGRAM_ID } from './program';

export const ENCRYPT_PREALPHA_GRPC_ENDPOINT = 'https://pre-alpha-dev-1.encrypt.ika-network.net:443';
export const ENCRYPT_PREALPHA_PROGRAM_ID = '4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8';
export const ENCRYPT_PREALPHA_CONFIG = 'EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3';
export const ENCRYPT_PREALPHA_EVENT_AUTHORITY = '6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ';
export const ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY = '2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur';

const FHE_BOOL = 0;
const FHE_UINT64 = 4;
const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS;

export interface OfficialEncryptPolicyCiphertexts {
  maxPerRunCiphertext: string;
  dailyCapCiphertext: string;
  dailySpentCiphertext: string;
  policyCommitment: number[];
  grpcEndpoint: string;
}

export interface OfficialEncryptPolicyInput {
  maxPerRunUsdc: string;
  dailyCapUsdc: string;
  grpcEndpoint?: string;
}

export interface OfficialEncryptExecutionCiphertexts {
  sourceAmountCiphertext: string;
  allowedOutputCiphertext: string;
  dailySpentOutputCiphertext: string;
  grpcEndpoint: string;
}

export interface OfficialEncryptExecutionInput {
  amountUsdc: string;
  grpcEndpoint?: string;
}

export async function createOfficialEncryptPolicyCiphertexts(
  input: OfficialEncryptPolicyInput
): Promise<OfficialEncryptPolicyCiphertexts> {
  const maxPerRun = parseUsdcBaseUnits(input.maxPerRunUsdc, 'maxPerRunUsdc');
  const dailyCap = parseUsdcBaseUnits(input.dailyCapUsdc, 'dailyCapUsdc');
  if (maxPerRun <= 0n) {
    throw new Error('Max per run must be greater than zero.');
  }
  if (dailyCap < maxPerRun) {
    throw new Error('Daily cap must be greater than or equal to max per run.');
  }

  const grpcEndpoint = input.grpcEndpoint ?? ENCRYPT_PREALPHA_GRPC_ENDPOINT;
  const client = createEncryptWebClient(grpcEndpoint);
  const ciphertextIds = await client.createInput({
    chain: Chain.SOLANA,
    inputs: [
      { ciphertextBytes: encryptValue(maxPerRun, FHE_UINT64), fheType: FHE_UINT64 },
      { ciphertextBytes: encryptValue(dailyCap, FHE_UINT64), fheType: FHE_UINT64 },
      { ciphertextBytes: encryptValue(0n, FHE_UINT64), fheType: FHE_UINT64 },
    ],
    authorized: new PublicKey(POLET_PROGRAM_ID).toBytes(),
    networkEncryptionPublicKey: bs58.decode(ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY),
  });

  if (ciphertextIds.length !== 3) {
    throw new Error(`Encrypt createInput returned ${ciphertextIds.length} ciphertext ids, expected 3.`);
  }

  const [maxPerRunCiphertext, dailyCapCiphertext, dailySpentCiphertext] = ciphertextIds.map((id) => bs58.encode(id));
  const policyCommitment = await sha256Bytes([
    'polet:official-encrypt-policy:v1',
    maxPerRunCiphertext,
    dailyCapCiphertext,
    dailySpentCiphertext,
  ].join('|'));

  return {
    maxPerRunCiphertext,
    dailyCapCiphertext,
    dailySpentCiphertext,
    policyCommitment,
    grpcEndpoint,
  };
}

export async function createOfficialEncryptExecutionCiphertexts(
  input: OfficialEncryptExecutionInput
): Promise<OfficialEncryptExecutionCiphertexts> {
  const sourceAmount = parseUsdcBaseUnits(input.amountUsdc, 'amountUsdc');
  if (sourceAmount <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }

  const grpcEndpoint = input.grpcEndpoint ?? ENCRYPT_PREALPHA_GRPC_ENDPOINT;
  const client = createEncryptWebClient(grpcEndpoint);
  const ciphertextIds = await client.createInput({
    chain: Chain.SOLANA,
    inputs: [
      { ciphertextBytes: encryptValue(sourceAmount, FHE_UINT64), fheType: FHE_UINT64 },
      { ciphertextBytes: encryptValue(0n, FHE_BOOL), fheType: FHE_BOOL },
      { ciphertextBytes: encryptValue(0n, FHE_UINT64), fheType: FHE_UINT64 },
    ],
    authorized: new PublicKey(POLET_PROGRAM_ID).toBytes(),
    networkEncryptionPublicKey: bs58.decode(ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY),
  });

  if (ciphertextIds.length !== 3) {
    throw new Error(`Encrypt createInput returned ${ciphertextIds.length} ciphertext ids, expected 3.`);
  }

  const [sourceAmountCiphertext, allowedOutputCiphertext, dailySpentOutputCiphertext] = ciphertextIds.map((id) => bs58.encode(id));
  return {
    sourceAmountCiphertext,
    allowedOutputCiphertext,
    dailySpentOutputCiphertext,
    grpcEndpoint,
  };
}

function parseUsdcBaseUnits(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error(`${label} must be a USDC amount with up to 6 decimals.`);
  }
  const [whole, fraction = ''] = trimmed.split('.');
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(Number(USDC_DECIMALS), '0'));
}

async function sha256Bytes(value: string): Promise<number[]> {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest));
}
