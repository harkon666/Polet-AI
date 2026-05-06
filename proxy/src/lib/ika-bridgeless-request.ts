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
import {
  evaluateSharedIkaApproval,
  type SharedIkaApprovalProgress,
} from './shared-ika-approval';
import { evaluateIkaChainAssetGuardrails } from './chain-asset-guardrails';
import { evaluateBridgelessRiskGuardrails } from './bridgeless-risk-guardrails';
import type { WalletData } from './wallet-store';
import {
  executeGuardedStrategy,
  StrategyExecutionError,
  type StrategyExecutionDeps,
} from './strategy-execution';
import type { OfficialEncryptPolicyExecution } from './official-encrypt-policy';
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
    riskStatus?: 'passed';
  };
  sessionContext: {
    owner: string;
    sessionKey: string;
    smartWalletAuthority: string;
    policySequence: number;
  };
  policyAttestation: {
    status: 'approved' | 'encrypt-verified-allowed';
    policySequence: number;
    policyCommitment: number[];
    attestationHash: string;
    encryptPolicy?: Extract<OfficialEncryptPolicyExecution, { status: 'encrypt-verified-allowed' }>;
  };
  canonicalOrder: CanonicalBridgelessOrder;
  canonicalOrderHash: string;
  ikaMessageHash?: string;
  destinationSigningDigest?: IkaPreAlphaSigningRequest['destinationSigningDigest'];
  routeRisk?: CanonicalBridgelessOrder['routeRisk'];
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
  code: 'IKA_BRIDGELESS_REQUEST_READY' | 'IKA_APPROVAL_TRANSACTION_PREPARED';
  status: IkaPreAlphaSigningStatus;
  ikaRequest: IkaBridgelessExecutionRequest;
}

export interface IkaBridgelessNeedsApproval {
  allowed: false;
  code: 'IKA_APPROVAL_QUORUM_REQUIRED';
  status: 'needs-approval';
  reason: string;
  approval: SharedIkaApprovalProgress;
}

export interface IkaBridgelessBlocked {
  allowed: false;
  code:
    | 'SESSION_NOT_AUTHORIZED'
    | 'SESSION_EXPIRED'
    | 'SESSION_STALE'
    | 'POLICY_NOT_CONFIGURED'
    | 'INVALID_POLICY_WITNESS'
    | 'CONFIDENTIAL_POLICY_BLOCKED'
    | 'ENCRYPT_POLICY_PENDING'
    | 'ENCRYPT_POLICY_VERIFIED_BLOCKED'
    | 'IKA_ROUTE_NOT_ALLOWED'
    | 'IKA_RISK_GUARDRAIL_BLOCKED';
  reason: string;
  status?: 'pending-encrypt-execution' | 'encrypt-verified-blocked';
  encryptPolicy?: Extract<
    OfficialEncryptPolicyExecution,
    { status: 'pending-encrypt-execution' | 'encrypt-verified-blocked' }
  >;
}

export type IkaBridgelessResult = IkaBridgelessAllowed | IkaBridgelessNeedsApproval | IkaBridgelessBlocked;

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
  let routeDecision: ReturnType<typeof evaluateIkaChainAssetGuardrails>;
  let riskDecision: ReturnType<typeof evaluateBridgelessRiskGuardrails>;
  try {
    routeDecision = evaluateIkaChainAssetGuardrails(params);
    riskDecision = evaluateBridgelessRiskGuardrails(params);
  } catch (error) {
    throw new IkaBridgelessRequestError(
      error instanceof Error ? error.message : 'Invalid Ika route-risk metadata',
      'INVALID_IKA_RISK_METADATA'
    );
  }
  if (!routeDecision.allowed) {
    return {
      allowed: false,
      code: routeDecision.code ?? 'IKA_ROUTE_NOT_ALLOWED',
      reason: routeDecision.reason ?? 'This Ika route is outside the wallet allowed route policy.',
    };
  }
  if (!riskDecision.allowed) {
    return {
      allowed: false,
      code: riskDecision.code ?? 'IKA_RISK_GUARDRAIL_BLOCKED',
      reason: riskDecision.reason ?? 'This bridgeless route is outside the wallet route-risk policy.',
    };
  }

  try {
    const decision = await executeGuardedStrategy<undefined, IkaBridgelessAllowed | IkaBridgelessNeedsApproval>(
      {
        owner: intent.owner,
        sessionKey: intent.sessionKey,
        amountBaseUnits,
        encryptionWitness: params.encryptionWitness,
        blockedReason: 'Confidential policy blocked this bridgeless request.',
        buildAllowed: async ({ wallet, encryptPolicy }) => buildIkaAllowedResult(
          intent,
          params,
          wallet,
          amountBaseUnits,
          riskDecision,
          deps,
          encryptPolicy
        ),
      },
      deps
    );

    if (!decision.allowed) {
      return {
        ...decision,
        ...(decision.encryptPolicy && { status: decision.encryptPolicy.status }),
      };
    }
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
  riskDecision: ReturnType<typeof evaluateBridgelessRiskGuardrails>,
  deps: IkaBridgelessDeps,
  encryptPolicy?: OfficialEncryptPolicyExecution
): Promise<IkaBridgelessAllowed> {
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
    routeRisk: riskDecision.routeRisk,
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
      riskStatus: 'passed',
    },
    sessionContext: {
      owner: intent.owner,
      sessionKey: intent.sessionKey,
      smartWalletAuthority,
      policySequence: wallet.policySeq,
    },
    policyAttestation: {
      status: encryptPolicy?.status === 'encrypt-verified-allowed' ? 'encrypt-verified-allowed' : 'approved',
      policySequence: wallet.policySeq,
      policyCommitment: wallet.confidentialPolicy.policyCommitment,
      attestationHash,
      ...(encryptPolicy?.status === 'encrypt-verified-allowed' && { encryptPolicy }),
    },
    canonicalOrder,
    canonicalOrderHash,
    ...(riskDecision.routeRisk && { routeRisk: riskDecision.routeRisk }),
    ...destinationDigest.requestFields,
    executionBoundary: {
      status: 'request-prepared',
      note: `Ika request envelope is prepared with a ${destinationDigest.label} sign-only digest; the Pre-Alpha message approval proof is attached when available.`,
    },
  };
  const sharedApproval = evaluateSharedIkaApproval({
    owner: intent.owner,
    sessionKey: intent.sessionKey,
    requestId: ikaRequestBase.requestId,
    canonicalOrder,
    canonicalOrderHash,
    destinationDigest: destinationDigest.digestHex,
    params,
    walletSharedIkaApprovals: wallet.sharedIkaApprovals,
  });
  if (!sharedApproval.ready) {
    return {
      allowed: false,
      code: 'IKA_APPROVAL_QUORUM_REQUIRED',
      status: 'needs-approval',
      reason: 'Shared access quorum is required before Polet prepares Ika approval data.',
      approval: sharedApproval.progress,
    };
  }
  const preAlphaSigning = createIkaPreAlphaSigningRequest({
    request: ikaRequestBase,
    ...preAlphaOverrides,
  });
  const poletApprovalTransaction = await (deps.buildApprovalTransaction ?? buildApproveIkaMessageSessionTransaction)({
    wallet: smartWalletAuthority,
    sessionKey: intent.sessionKey,
    coordinator: preAlphaSigning.coordinatorPda,
    dwallet: preAlphaSigning.dwalletAccount,
    messageApproval: preAlphaSigning.messageApprovalPda,
    cpiAuthority: preAlphaSigning.cpiAuthorityPda,
    callerProgram: preAlphaSigning.approveMessage.callerProgram,
    ikaProgram: preAlphaSigning.approveMessage.programId,
    ikaMessageHash: preAlphaSigning.ikaMessageHash,
    sourceAmount: amountBaseUnits,
    orderExpiresAt: canonicalOrder.expiresAtUnix,
    attestationSlot: BigInt(wallet.lastRevokedSlot) + 1n,
    attestationPolicySeq: wallet.policySeq,
    encryptionWitness: params.encryptionWitness,
    userPubkey: preAlphaSigning.userPublicKey,
    signatureScheme: signatureSchemeCode(preAlphaSigning.signatureScheme),
    messageApprovalBump: preAlphaSigning.messageApprovalBump,
    sharedApprovers: sharedApproval.progress.approvedApprovers,
  });

  return {
    allowed: true,
    code: 'IKA_APPROVAL_TRANSACTION_PREPARED',
    status: 'approval-transaction-prepared',
    ikaRequest: {
      ...ikaRequestBase,
      ikaMessageHash: preAlphaSigning.ikaMessageHash,
      ...(preAlphaSigning.destinationSigningDigest && {
        destinationSigningDigest: preAlphaSigning.destinationSigningDigest,
      }),
      preAlphaSigning,
      poletApprovalTransaction,
      executionBoundary: {
        status: 'approval-transaction-prepared',
        note: `Unsigned Polet approve_ika_message transaction is prepared for the session signer in Ika Pre-Alpha. The MessageApproval lookup hash is Keccak-256 over Polet's approval preimage; the ${destinationDigest.label} digest remains destination sign-only metadata. Devnet mock signer only; production MPC and settlement are not executed.`,
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
  digestHex: string;
  requestFields: Pick<IkaBridgelessExecutionRequest, 'suiTransactionDigest' | 'ethereumMessageDigest'>;
} {
  try {
    if (params.targetChain === 'sui') {
      const suiTransactionDigest = buildSuiDevnetTransactionDigest({
        order: canonicalOrder,
        canonicalOrderHash,
        recipient: params.nativeDestinationAccount,
      });
      return {
        label: 'Sui devnet',
        digestHex: suiTransactionDigest.digestHex,
        requestFields: {
          suiTransactionDigest,
        },
      };
    }

    if (params.targetChain === 'ethereum') {
      const ethereumMessageDigest = buildEthereumSepoliaMessageDigest({
        order: canonicalOrder,
        canonicalOrderHash,
        recipient: params.nativeDestinationAccount,
      });
      return {
        label: 'Ethereum Sepolia EIP-191',
        digestHex: ethereumMessageDigest.digestHex,
        requestFields: {
          ethereumMessageDigest,
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

function signatureSchemeCode(value: IkaPreAlphaSigningRequest['signatureScheme']): number {
  if (value === 'ed25519-prealpha') return 5;
  return 0;
}

function getIkaPreAlphaOverrides(params: MultichainStrategyParams): {
  dwalletAccount?: string;
  dwalletCurve?: number;
  dwalletPublicKey?: number[] | string;
  userPublicKey?: string;
  signatureScheme?: IkaPreAlphaSigningRequest['signatureScheme'];
} {
  const raw = (params as {
    ikaPreAlpha?: {
      dwalletAccount?: unknown;
      dwalletCurve?: unknown;
      dwalletPublicKey?: unknown;
      userPublicKey?: unknown;
      signatureScheme?: unknown;
    };
  }).ikaPreAlpha;
  if (!raw || typeof raw !== 'object') return {};

  return {
    ...(typeof raw.dwalletAccount === 'string' && { dwalletAccount: raw.dwalletAccount }),
    ...(typeof raw.dwalletCurve === 'number' && { dwalletCurve: raw.dwalletCurve }),
    ...((Array.isArray(raw.dwalletPublicKey) || typeof raw.dwalletPublicKey === 'string') && {
      dwalletPublicKey: raw.dwalletPublicKey as number[] | string,
    }),
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
