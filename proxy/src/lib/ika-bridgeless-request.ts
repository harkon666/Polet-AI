import { createHash } from 'crypto';
import { deriveWalletPda } from './confidential-dca-execution';
import { parseUsdcAmount } from './confidential-numeric-policy';
import {
  buildCanonicalBridgelessOrder,
  hashCanonicalBridgelessOrder,
  type CanonicalBridgelessOrder,
} from './bridgeless-order';
import {
  createIkaPreAlphaSigningRequest,
  type IkaPreAlphaSigningRequest,
  type IkaPreAlphaSigningStatus,
} from './ika-prealpha-signing';
import {
  buildApproveIkaMessageSessionTransaction,
  type BuiltTransaction,
} from './transaction-builder';
import {
  buildSuiDevnetTransactionDigest,
  type SuiTransactionDigestArtifact,
} from './sui-transaction-digest';
import {
  buildEthereumSepoliaMessageDigest,
  type EthereumMessageDigestArtifact,
} from './ethereum-transaction-digest';
import type { WalletData } from './wallet-store';
import {
  executeGuardedStrategy,
  StrategyExecutionError,
  type StrategyExecutionDeps,
} from './strategy-execution';
import type { Intent, MultichainStrategyParams, PoletChain } from '../types/intent';

export interface IkaBridgelessExecutionRequest {
  executionRail: 'ika-bridgeless';
  settlement: 'not-executed';
  requestId: string;
  source: {
    chain: PoletChain;
    asset: string;
    mint?: string;
  };
  target: {
    chain: PoletChain;
    asset: string;
    mint?: string;
  };
  amount: string;
  amountBaseUnits: string;
  routeIntent: {
    strategy: 'dca' | 'swap';
    slippageBps?: number;
    bridgeMode: 'bridgeless';
  };
  sessionContext: {
    owner: string;
    sessionKey: string;
    smartWalletAuthority: string;
    policySequence: number;
  };
  policyAttestation: {
    status: 'approved';
    policySequence: number;
    policyCommitment: number[];
    attestationHash: string;
  };
  canonicalOrder: CanonicalBridgelessOrder;
  canonicalOrderHash: string;
  suiTransactionDigest?: SuiTransactionDigestArtifact;
  ethereumMessageDigest?: EthereumMessageDigestArtifact;
  executionBoundary: {
    status: IkaPreAlphaSigningStatus;
    note: string;
  };
  preAlphaSigning?: IkaPreAlphaSigningRequest;
  poletApprovalTransaction?: BuiltTransaction;
}

export interface IkaBridgelessAllowed {
  allowed: true;
  code: 'IKA_BRIDGELESS_REQUEST_READY' | 'IKA_PREALPHA_MESSAGE_APPROVED';
  status: IkaPreAlphaSigningStatus;
  ikaRequest: IkaBridgelessExecutionRequest;
}

export interface IkaBridgelessBlocked {
  allowed: false;
  code:
    | 'SESSION_NOT_AUTHORIZED'
    | 'SESSION_EXPIRED'
    | 'SESSION_STALE'
    | 'POLICY_NOT_CONFIGURED'
    | 'INVALID_POLICY_WITNESS'
    | 'CONFIDENTIAL_POLICY_BLOCKED';
  reason: string;
}

export type IkaBridgelessResult = IkaBridgelessAllowed | IkaBridgelessBlocked;

export interface IkaBridgelessDeps extends StrategyExecutionDeps {
  buildApprovalTransaction?: (
    request: Parameters<typeof buildApproveIkaMessageSessionTransaction>[0]
  ) => Promise<BuiltTransaction>;
}

export class IkaBridgelessRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'IkaBridgelessRequestError';
  }
}

export async function createIkaBridgelessExecutionRequest(
  intent: Intent,
  deps: IkaBridgelessDeps = {}
): Promise<IkaBridgelessResult> {
  if (intent.action !== 'multichain-strategy') {
    throw new IkaBridgelessRequestError('Intent action must be multichain-strategy', 'INVALID_IKA_INTENT');
  }

  const params = intent.params as MultichainStrategyParams;
  if (params.executionRail !== 'ika') {
    throw new IkaBridgelessRequestError('Ika request requires executionRail ika', 'INVALID_IKA_INTENT');
  }

  const amountBaseUnits = parseIkaPolicyAmount(params.amount);

  try {
    const decision = await executeGuardedStrategy<undefined, IkaBridgelessAllowed>(
      {
        owner: intent.owner,
        sessionKey: intent.sessionKey,
        amountBaseUnits,
        encryptionWitness: params.encryptionWitness,
        blockedReason: 'Confidential policy blocked this bridgeless request.',
        buildAllowed: async ({ wallet }) => buildIkaAllowedResult(intent, params, wallet, amountBaseUnits, deps),
      },
      deps
    );

    if (!decision.allowed) return decision;
    return decision.payload;
  } catch (error) {
    if (error instanceof StrategyExecutionError) {
      throw new IkaBridgelessRequestError(error.message, error.code, error.status);
    }
    throw error;
  }
}

function parseIkaPolicyAmount(value: number | string): bigint {
  try {
    return parseUsdcAmount(value);
  } catch {
    throw new IkaBridgelessRequestError('amount must be a positive amount with up to 6 decimals', 'INVALID_IKA_INTENT');
  }
}

async function buildIkaAllowedResult(
  intent: Intent,
  params: MultichainStrategyParams,
  wallet: WalletData,
  amountBaseUnits: bigint,
  deps: IkaBridgelessDeps
): Promise<IkaBridgelessAllowed> {
  validateSupportedIkaRoute(params);
  const amount = params.amount.toString();
  const smartWalletAuthority = wallet.walletPda || deriveWalletPda(intent.owner);
  const preAlphaOverrides = getIkaPreAlphaOverrides(params);
  const canonicalOrder = buildCanonicalBridgelessOrder({
    intentId: intent.id,
    source: {
      chain: 'solana',
      asset: params.sourceAsset,
      ...(params.sourceMint && { mint: params.sourceMint }),
    },
    target: {
      chain: params.targetChain,
      asset: params.targetAsset,
      ...(params.targetMint && { mint: params.targetMint }),
    },
    amount,
    amountBaseUnits: amountBaseUnits.toString(),
    policyBaseUnits: amountBaseUnits.toString(),
    slippageBps: params.slippageBps,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policySequence: wallet.policySeq,
    nonce: intent.id,
    expiresAtUnix: intent.timestamp + 600,
  });
  const canonicalOrderHash = await hashCanonicalBridgelessOrder(canonicalOrder);
  const destinationDigest = buildDestinationDigest(canonicalOrder, canonicalOrderHash, params);
  const attestationHash = hashIkaAttestation({
    intentId: intent.id,
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    policySequence: wallet.policySeq,
    sourceChain: params.sourceChain,
    sourceAsset: params.sourceAsset,
    targetChain: params.targetChain,
    targetAsset: params.targetAsset,
    amount,
  });
  const ikaRequestBase: IkaBridgelessExecutionRequest = {
    executionRail: 'ika-bridgeless',
    settlement: 'not-executed',
    requestId: `ika-${attestationHash.slice(0, 24)}`,
    source: {
      chain: params.sourceChain,
      asset: params.sourceAsset,
      ...(params.sourceMint && { mint: params.sourceMint }),
    },
    target: {
      chain: params.targetChain,
      asset: params.targetAsset,
      ...(params.targetMint && { mint: params.targetMint }),
    },
    amount,
    amountBaseUnits: amountBaseUnits.toString(),
    routeIntent: {
      strategy: params.strategy ?? 'dca',
      ...(params.slippageBps !== undefined && { slippageBps: params.slippageBps }),
      bridgeMode: 'bridgeless',
    },
    sessionContext: {
      owner: intent.owner,
      sessionKey: intent.sessionKey,
      smartWalletAuthority,
      policySequence: wallet.policySeq,
    },
    policyAttestation: {
      status: 'approved',
      policySequence: wallet.policySeq,
      policyCommitment: wallet.confidentialPolicy.policyCommitment,
      attestationHash,
    },
    canonicalOrder,
    canonicalOrderHash,
    ...destinationDigest.requestFields,
    executionBoundary: {
      status: 'request-prepared',
      note: `Ika request envelope is prepared with a ${destinationDigest.label} sign-only digest; the Pre-Alpha message approval proof is attached when available.`,
    },
  };
  const preAlphaSigning = createIkaPreAlphaSigningRequest({
    request: ikaRequestBase,
    ...preAlphaOverrides,
  });
  const poletApprovalTransaction = await (deps.buildApprovalTransaction ?? buildApproveIkaMessageSessionTransaction)({
    wallet: smartWalletAuthority,
    sessionKey: intent.sessionKey,
    dwallet: preAlphaSigning.dwalletAccount,
    messageApproval: preAlphaSigning.messageApprovalPda,
    cpiAuthority: preAlphaSigning.cpiAuthorityPda,
    ikaProgram: preAlphaSigning.approveMessage.programId,
    canonicalOrderHash: preAlphaSigning.messageDigest,
    sourceAmount: amountBaseUnits,
    orderExpiresAt: canonicalOrder.expiresAtUnix,
    attestationSlot: BigInt(wallet.lastRevokedSlot) + 1n,
    attestationPolicySeq: wallet.policySeq,
    encryptionWitness: params.encryptionWitness,
    userPubkey: preAlphaSigning.userPublicKey,
    signatureScheme: signatureSchemeCode(preAlphaSigning.signatureScheme),
    messageApprovalBump: preAlphaSigning.messageApprovalBump,
  });

  return {
    allowed: true,
    code: 'IKA_PREALPHA_MESSAGE_APPROVED',
    status: 'message-approved',
    ikaRequest: {
      ...ikaRequestBase,
      preAlphaSigning,
      poletApprovalTransaction,
      executionBoundary: {
        status: 'message-approved',
        note: `Unsigned Polet approve_ika_message transaction is prepared for the session signer in Ika Pre-Alpha using the ${destinationDigest.label} digest. Devnet mock signer only; production MPC and settlement are not executed.`,
      },
    },
  };
}

function buildDestinationDigest(
  canonicalOrder: CanonicalBridgelessOrder,
  canonicalOrderHash: string,
  params: MultichainStrategyParams
): {
  label: string;
  requestFields: Pick<IkaBridgelessExecutionRequest, 'suiTransactionDigest' | 'ethereumMessageDigest'>;
} {
  try {
    if (params.targetChain === 'sui') {
      return {
        label: 'Sui devnet',
        requestFields: {
          suiTransactionDigest: buildSuiDevnetTransactionDigest({
            order: canonicalOrder,
            canonicalOrderHash,
            recipient: params.nativeDestinationAccount,
          }),
        },
      };
    }

    if (params.targetChain === 'ethereum') {
      return {
        label: 'Ethereum Sepolia EIP-191',
        requestFields: {
          ethereumMessageDigest: buildEthereumSepoliaMessageDigest({
            order: canonicalOrder,
            canonicalOrderHash,
            recipient: params.nativeDestinationAccount,
          }),
        },
      };
    }

    throw new Error('Unsupported Ika destination digest target');
  } catch (error) {
    const code = params.targetChain === 'ethereum' ? 'INVALID_ETHEREUM_DESTINATION' : 'INVALID_SUI_DESTINATION';
    throw new IkaBridgelessRequestError(
      error instanceof Error ? error.message : 'Invalid destination data',
      code
    );
  }
}

function validateSupportedIkaRoute(params: MultichainStrategyParams): void {
  if (
    params.sourceChain !== 'solana'
    || params.sourceAsset.toUpperCase() !== 'USDC'
    || !isSupportedIkaTarget(params)
  ) {
    throw new IkaBridgelessRequestError(
      'Unsupported Ika route: this slice only builds Solana USDC -> Sui SUI or Ethereum ETH approvals',
      'UNSUPPORTED_IKA_ROUTE'
    );
  }
}

function isSupportedIkaTarget(params: MultichainStrategyParams): boolean {
  return (params.targetChain === 'sui' && params.targetAsset.toUpperCase() === 'SUI')
    || (params.targetChain === 'ethereum' && params.targetAsset.toUpperCase() === 'ETH');
}

function signatureSchemeCode(value: IkaPreAlphaSigningRequest['signatureScheme']): number {
  if (value === 'ed25519-prealpha') return 5;
  return 0;
}

function getIkaPreAlphaOverrides(params: MultichainStrategyParams): {
  dwalletAccount?: string;
  userPublicKey?: string;
  signatureScheme?: IkaPreAlphaSigningRequest['signatureScheme'];
} {
  const raw = (params as {
    ikaPreAlpha?: {
      dwalletAccount?: unknown;
      userPublicKey?: unknown;
      signatureScheme?: unknown;
    };
  }).ikaPreAlpha;
  if (!raw || typeof raw !== 'object') return {};

  return {
    ...(typeof raw.dwalletAccount === 'string' && { dwalletAccount: raw.dwalletAccount }),
    ...(typeof raw.userPublicKey === 'string' && { userPublicKey: raw.userPublicKey }),
    ...(isIkaPreAlphaSignatureScheme(raw.signatureScheme) && { signatureScheme: raw.signatureScheme }),
  };
}

function isIkaPreAlphaSignatureScheme(value: unknown): value is IkaPreAlphaSigningRequest['signatureScheme'] {
  return value === 'ecdsa-secp256k1-sha256' || value === 'ed25519-prealpha';
}

function hashIkaAttestation(value: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}
