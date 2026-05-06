import { keccak_256 } from '@noble/hashes/sha3.js';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PROGRAM_ID_STRING } from './program-identity';
import type { IkaBridgelessExecutionRequest } from './ika-bridgeless-request';

export type IkaPreAlphaSigningStatus =
  | 'request-prepared'
  | 'approval-transaction-prepared'
  | 'approval-submitted'
  | 'signature-pending'
  | 'signature-produced-prealpha';

export type IkaPreAlphaSignatureScheme = 'ecdsa-secp256k1-sha256' | 'ed25519-prealpha';

export const IKA_PREALPHA_CLUSTER = 'devnet';
export const IKA_PREALPHA_RPC_URL = 'https://api.devnet.solana.com';
export const IKA_PREALPHA_PROGRAM_ID_STRING = '87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY';
export const IKA_PREALPHA_PROGRAM_ID = new PublicKey(IKA_PREALPHA_PROGRAM_ID_STRING);

export interface IkaPreAlphaSigningInput {
  request: IkaBridgelessExecutionRequest;
  dwalletAccount?: string;
  dwalletCurve?: number;
  dwalletPublicKey?: number[] | string;
  userPublicKey?: string;
  signatureScheme?: IkaPreAlphaSignatureScheme;
}

export interface IkaPreAlphaPdaDerivation {
  coordinatorPda: string;
  cpiAuthorityPda: string;
  cpiAuthorityBump: number;
  messageApprovalPda: string;
  messageApprovalBump: number;
  messageApprovalDerivation: 'official-dwallet-public-key' | 'local-compatibility-fallback';
}

export interface IkaPreAlphaSigningRequest {
  status: IkaPreAlphaSigningStatus;
  settlement: 'not-executed';
  dwalletAccount: string;
  ikaMessageHash: string;
  ikaMessageHashPreimage: IkaMessageHashPreimage;
  ikaMessageHashSource: 'polet-ika-approval-preimage-keccak256';
  messageDigest: string;
  messageDigestSource: 'ika-message-hash';
  destinationSigningDigest?: {
    digestHex: string;
    source: 'sui-devnet-transaction-digest' | 'ethereum-sepolia-message-digest';
    hashScheme: 'sui-blake2b-256' | 'ethereum-eip191-keccak256';
    signPayload: 'destination-chain-sign-only-artifact';
  };
  userPublicKey: string;
  signatureScheme: IkaPreAlphaSignatureScheme;
  cpiAuthorityPda: string;
  cpiAuthorityBump: number;
  messageApprovalPda: string;
  messageApprovalBump: number;
  approveMessage: {
    programId: string;
    instruction: 'approve_message';
    authority: string;
    callerProgram: string;
    accounts: {
      coordinator: string;
      dwalletAccount: string;
      messageApproval: string;
      cpiAuthority: string;
      userPublicKey: string;
    };
  };
  preAlphaEnvironment: {
    provider: 'ika';
    cluster: typeof IKA_PREALPHA_CLUSTER;
    rpcUrl: typeof IKA_PREALPHA_RPC_URL;
    mockSigner: true;
    productionMpc: false;
    note: string;
  };
}

export interface IkaMessageHashPreimage {
  schema: 'polet.ika.message-approval.v1';
  canonicalOrderHash: string;
  requestId: string;
  dwalletAccount: string;
  destinationChain: string;
  destinationAsset: string;
  destinationSigningDigest?: string;
  signatureScheme: IkaPreAlphaSignatureScheme;
  userPublicKey: string;
  policySequence: number;
  expiresAtUnix: number;
}

export function createIkaPreAlphaSigningRequest(input: IkaPreAlphaSigningInput): IkaPreAlphaSigningRequest {
  const dwalletAccount = normalizePublicKey(
    input.dwalletAccount ?? deriveIkaDwalletAccount(input.request),
    'dwalletAccount'
  );
  const userPublicKey = normalizePublicKey(
    input.userPublicKey ?? input.request.sessionContext.owner,
    'userPublicKey'
  );
  const signatureScheme = input.signatureScheme ?? defaultSignatureScheme(input.request);
  const destinationSigningDigest = deriveDestinationSigningDigest(input.request);
  const ikaMessageHashPreimage = buildIkaMessageHashPreimage({
    request: input.request,
    dwalletAccount,
    userPublicKey,
    signatureScheme,
    destinationSigningDigest: destinationSigningDigest?.digestHex,
  });
  const ikaMessageHash = deriveIkaMessageHash(ikaMessageHashPreimage);
  const derivation = deriveIkaPreAlphaApprovalAccounts({
    dwalletAccount,
    dwalletCurve: input.dwalletCurve,
    dwalletPublicKey: input.dwalletPublicKey,
    smartWalletAuthority: input.request.sessionContext.smartWalletAuthority,
    ikaMessageHash,
    signatureScheme,
  });

  return {
    status: 'approval-transaction-prepared',
    settlement: 'not-executed',
    dwalletAccount,
    ikaMessageHash,
    ikaMessageHashPreimage,
    ikaMessageHashSource: 'polet-ika-approval-preimage-keccak256',
    messageDigest: ikaMessageHash,
    messageDigestSource: 'ika-message-hash',
    ...(destinationSigningDigest && { destinationSigningDigest }),
    userPublicKey,
    signatureScheme,
    ...derivation,
    approveMessage: {
      programId: IKA_PREALPHA_PROGRAM_ID_STRING,
      instruction: 'approve_message',
      authority: derivation.cpiAuthorityPda,
      callerProgram: PROGRAM_ID_STRING,
      accounts: {
        coordinator: derivation.coordinatorPda,
        dwalletAccount,
        messageApproval: derivation.messageApprovalPda,
        cpiAuthority: derivation.cpiAuthorityPda,
        userPublicKey,
      },
    },
    preAlphaEnvironment: {
      provider: 'ika',
      cluster: IKA_PREALPHA_CLUSTER,
      rpcUrl: IKA_PREALPHA_RPC_URL,
      mockSigner: true,
      productionMpc: false,
      note: 'Ika Solana Pre-Alpha proof only: devnet mock signer metadata is prepared after Polet policy approval; production MPC and settlement are not executed.',
    },
  };
}

export function deriveIkaPreAlphaApprovalAccounts(input: {
  dwalletAccount: string;
  dwalletCurve?: number;
  dwalletPublicKey?: number[] | string;
  smartWalletAuthority: string;
  ikaMessageHash: string;
  signatureScheme?: IkaPreAlphaSignatureScheme;
}): IkaPreAlphaPdaDerivation {
  const dwallet = normalizePublicKey(input.dwalletAccount, 'dwalletAccount');
  const digestBytes = parseMessageDigest(input.ikaMessageHash);
  const signatureSchemeCode = input.signatureScheme === 'ecdsa-secp256k1-sha256' ? 0 : 5;

  const [cpiAuthorityPda, cpiAuthorityBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('__ika_cpi_authority'),
    ],
    PROGRAM_ID
  );
  const [coordinatorPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('dwallet_coordinator'),
    ],
    IKA_PREALPHA_PROGRAM_ID
  );
  const messageApprovalSeeds = input.dwalletPublicKey !== undefined && input.dwalletCurve !== undefined
    ? buildOfficialMessageApprovalSeeds(input.dwalletCurve, input.dwalletPublicKey, signatureSchemeCode, digestBytes)
    : [
      Buffer.from('message_approval'),
      new PublicKey(dwallet).toBuffer(),
      digestBytes,
    ];
  const messageApprovalDerivation = input.dwalletPublicKey !== undefined && input.dwalletCurve !== undefined
    ? 'official-dwallet-public-key'
    : 'local-compatibility-fallback';
  const [messageApprovalPda, messageApprovalBump] = PublicKey.findProgramAddressSync(
    messageApprovalSeeds,
    IKA_PREALPHA_PROGRAM_ID
  );

  return {
    coordinatorPda: coordinatorPda.toString(),
    cpiAuthorityPda: cpiAuthorityPda.toString(),
    cpiAuthorityBump,
    messageApprovalPda: messageApprovalPda.toString(),
    messageApprovalBump,
    messageApprovalDerivation,
  };
}

function buildOfficialMessageApprovalSeeds(
  curve: number,
  dwalletPublicKey: number[] | string,
  signatureScheme: number,
  messageDigest: Buffer
): Buffer[] {
  if (!Number.isInteger(curve) || curve < 0 || curve > 0xffff) {
    throw new Error('ikaPreAlpha.dwalletCurve must be a u16 curve code');
  }
  const publicKey = parseBytes(dwalletPublicKey, 'ikaPreAlpha.dwalletPublicKey');
  const payload = Buffer.alloc(2 + publicKey.length);
  payload.writeUInt16LE(curve, 0);
  publicKey.copy(payload, 2);

  const seeds: Buffer[] = [Buffer.from('dwallet')];
  for (let offset = 0; offset < payload.length; offset += 32) {
    seeds.push(payload.subarray(offset, Math.min(offset + 32, payload.length)));
  }

  const scheme = Buffer.alloc(2);
  scheme.writeUInt16LE(signatureScheme, 0);
  seeds.push(Buffer.from('message_approval'), scheme, messageDigest);
  return seeds;
}

function parseBytes(value: number[] | string, field: string): Buffer {
  if (Array.isArray(value)) {
    return Buffer.from(Uint8Array.from(value));
  }
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error(`${field} must be hex or a byte array`);
  }
  return Buffer.from(normalized, 'hex');
}

export function deriveIkaMessageDigest(request: IkaBridgelessExecutionRequest): string {
  return deriveIkaMessageHash(buildIkaMessageHashPreimage({
    request,
    dwalletAccount: deriveIkaDwalletAccount(request),
    userPublicKey: request.sessionContext.owner,
    signatureScheme: defaultSignatureScheme(request),
    destinationSigningDigest: deriveDestinationSigningDigest(request)?.digestHex,
  }));
}

export function deriveIkaMessageHash(preimage: IkaMessageHashPreimage): string {
  return Buffer.from(keccak_256(Buffer.from(JSON.stringify(preimage), 'utf8'))).toString('hex');
}

function buildIkaMessageHashPreimage(input: {
  request: IkaBridgelessExecutionRequest;
  dwalletAccount: string;
  userPublicKey: string;
  signatureScheme: IkaPreAlphaSignatureScheme;
  destinationSigningDigest?: string;
}): IkaMessageHashPreimage {
  return {
    schema: 'polet.ika.message-approval.v1',
    canonicalOrderHash: input.request.canonicalOrderHash,
    requestId: input.request.requestId,
    dwalletAccount: input.dwalletAccount,
    destinationChain: input.request.target.chain,
    destinationAsset: input.request.target.asset,
    ...(input.destinationSigningDigest && { destinationSigningDigest: input.destinationSigningDigest }),
    signatureScheme: input.signatureScheme,
    userPublicKey: input.userPublicKey,
    policySequence: input.request.sessionContext.policySequence,
    expiresAtUnix: input.request.canonicalOrder.expiresAtUnix,
  };
}

function deriveDestinationSigningDigest(request: IkaBridgelessExecutionRequest): IkaPreAlphaSigningRequest['destinationSigningDigest'] {
  if (request.suiTransactionDigest?.digestHex) {
    return {
      digestHex: parseMessageDigest(request.suiTransactionDigest.digestHex).toString('hex'),
      source: 'sui-devnet-transaction-digest',
      hashScheme: 'sui-blake2b-256',
      signPayload: 'destination-chain-sign-only-artifact',
    };
  }
  if (request.ethereumMessageDigest?.digestHex) {
    return {
      digestHex: parseMessageDigest(request.ethereumMessageDigest.digestHex).toString('hex'),
      source: 'ethereum-sepolia-message-digest',
      hashScheme: 'ethereum-eip191-keccak256',
      signPayload: 'destination-chain-sign-only-artifact',
    };
  }
  return undefined;
}

export function deriveIkaDwalletAccount(request: IkaBridgelessExecutionRequest): string {
  const owner = normalizePublicKey(request.sessionContext.owner, 'owner');
  const [dwalletAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('ika_dwallet'),
      new PublicKey(owner).toBuffer(),
      Buffer.from(request.target.chain),
      Buffer.from(request.target.asset.toUpperCase()),
    ],
    IKA_PREALPHA_PROGRAM_ID
  );

  return dwalletAccount.toString();
}

function defaultSignatureScheme(request: IkaBridgelessExecutionRequest): IkaPreAlphaSignatureScheme {
  return request.target.chain === 'sui' ? 'ed25519-prealpha' : 'ecdsa-secp256k1-sha256';
}

function normalizePublicKey(value: string, label: string): string {
  try {
    return new PublicKey(value).toString();
  } catch {
    throw new Error(`${label} must be a valid Solana public key`);
  }
}

function parseMessageDigest(value: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error('messageDigest must be a 32-byte hex string');
  }
  return Buffer.from(value, 'hex');
}
