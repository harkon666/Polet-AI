import { createHash } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PROGRAM_ID_STRING } from './program-identity';
import type { IkaBridgelessExecutionRequest } from './ika-bridgeless-request';

export type IkaPreAlphaSigningStatus =
  | 'request-prepared'
  | 'message-approved'
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
}

export interface IkaPreAlphaSigningRequest {
  status: IkaPreAlphaSigningStatus;
  settlement: 'not-executed';
  dwalletAccount: string;
  messageDigest: string;
  messageDigestSource: 'polet-request-envelope' | 'sui-devnet-transaction-digest' | 'ethereum-sepolia-message-digest';
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
  const messageDigest = deriveIkaMessageDigest(input.request);
  const messageDigestSource = deriveIkaMessageDigestSource(input.request);
  const derivation = deriveIkaPreAlphaApprovalAccounts({
    dwalletAccount,
    dwalletCurve: input.dwalletCurve,
    dwalletPublicKey: input.dwalletPublicKey,
    smartWalletAuthority: input.request.sessionContext.smartWalletAuthority,
    messageDigest,
    signatureScheme,
  });

  return {
    status: 'message-approved',
    settlement: 'not-executed',
    dwalletAccount,
    messageDigest,
    messageDigestSource,
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
  messageDigest: string;
  signatureScheme?: IkaPreAlphaSignatureScheme;
}): IkaPreAlphaPdaDerivation {
  const dwallet = normalizePublicKey(input.dwalletAccount, 'dwalletAccount');
  const digestBytes = parseMessageDigest(input.messageDigest);
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
  if (request.suiTransactionDigest?.digestHex) {
    return parseMessageDigest(request.suiTransactionDigest.digestHex).toString('hex');
  }
  if (request.ethereumMessageDigest?.digestHex) {
    return parseMessageDigest(request.ethereumMessageDigest.digestHex).toString('hex');
  }

  return createHash('sha256')
    .update(JSON.stringify({
      requestId: request.requestId,
      source: request.source,
      target: request.target,
      amountBaseUnits: request.amountBaseUnits,
      routeIntent: request.routeIntent,
      sessionContext: request.sessionContext,
      policyAttestation: {
        status: request.policyAttestation.status,
        policySequence: request.policyAttestation.policySequence,
        attestationHash: request.policyAttestation.attestationHash,
      },
    }))
    .digest('hex');
}

function deriveIkaMessageDigestSource(request: IkaBridgelessExecutionRequest): IkaPreAlphaSigningRequest['messageDigestSource'] {
  if (request.suiTransactionDigest) return 'sui-devnet-transaction-digest';
  if (request.ethereumMessageDigest) return 'ethereum-sepolia-message-digest';
  return 'polet-request-envelope';
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
