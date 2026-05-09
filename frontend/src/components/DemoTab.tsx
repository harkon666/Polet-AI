import { useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, Connection, type Signer } from '@solana/web3.js';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  ClipboardCheck,
  Landmark,
  Languages,
  Play,
  Shield,
  Trash2,
  UserPlus,
  Wallet,
  X,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import {
  runConfidentialDca,
  setConfidentialPolicy,
  setOfficialEncryptCiphertextPolicy,
  setupDemoCustody,
  depositCustody,
  withdrawCustody,
  fundAgentGas,
  configureSharedIkaApprovers,
  getWalletData,
  getEncryptCiphertextStatus,
  revokeSession,
  revokeSharedIkaApprover,
  runMultichainIntent,
  setRecoveryAuthority,
  recoverAccess,
  requestPasskeyChallenge,
  verifyPasskeyAssertion,
  broadcastIkaDestination,
  createEncryptDeposit,
  executeEncryptPolicyGraph,
  initializeWallet,
  requestPendingAllowedOutputDecryption,
  requestPolicyValueDecryption,
  resolveEncryptPolicyDecision,
  type RunConfidentialDcaResult,
  type RunMultichainIntentResult,
  type SharedIkaApproverConfigInput,
  type SetConfidentialPolicyInput,
  type SetOfficialEncryptCiphertextPolicyInput,
  type SetOfficialEncryptCiphertextPolicyResult,
  type SetupDemoCustodyInput,
  type WalletTransactionResult,
  type DepositCustodyInput,
  type DepositCustodyResult,
  type WithdrawCustodyInput,
  type WithdrawCustodyResult,
  type ExecuteEncryptPolicyGraphInput,
  type ExecuteEncryptPolicyGraphResult,
  type OfficialEncryptExecutionRefs,
  type PolicyRevealKind,
  type RequestPolicyValueDecryptionInput,
  type RequestPolicyValueDecryptionResult,
  type RequestPendingAllowedOutputDecryptionInput,
  type RequestPendingAllowedOutputDecryptionResult,
  type OfficialEncryptPolicyPreview,
} from '../lib/api';
import { COPY, type Locale } from '../lib/i18n';
import {
  ENCRYPT_PREALPHA_CONFIG,
  ENCRYPT_PREALPHA_EVENT_AUTHORITY,
  ENCRYPT_PREALPHA_GRPC_ENDPOINT,
  ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
  ENCRYPT_PREALPHA_PROGRAM_ID,
  createOfficialEncryptExecutionCiphertexts,
  createOfficialEncryptPolicyCiphertexts,
  type OfficialEncryptExecutionCiphertexts,
  type OfficialEncryptPolicyCiphertexts,
} from '../lib/official-encrypt-client';
import { confirmFreshTransaction, prepareFreshTransaction } from '../lib/solana-transaction';
import { Panel } from './ui/Panel';
import { InfoTile } from './ui/InfoTile';
import { InfoRow } from './ui/InfoRow';
import { PrivatePolicyTile } from './ui/PrivatePolicyTile';
import { ActivityCard } from './ActivityCard';
import type { ActivityEntry } from './activity-log';
import { isBlockedStatus, isAllowedStatus, getEncryptStatus, encryptMessage } from './activity-log';

interface DcaStrategy {
  sourceChain: 'Solana';
  inputMint: 'USDC';
  targetChain: 'Solana';
  outputMint: 'SOL';
  executionRail: 'Jupiter';
  amountUsdc: string;
  cadence: string;
}

interface DemoApi {
  initializeWallet: typeof initializeWallet;
  setConfidentialPolicy: (input: SetConfidentialPolicyInput) => Promise<WalletTransactionResult>;
  setOfficialEncryptCiphertextPolicy: (input: SetOfficialEncryptCiphertextPolicyInput) => Promise<SetOfficialEncryptCiphertextPolicyResult>;
  setupDemoCustody: (input: SetupDemoCustodyInput) => Promise<WalletTransactionResult>;
  depositCustody: (input: DepositCustodyInput) => Promise<DepositCustodyResult>;
  withdrawCustody: (input: WithdrawCustodyInput) => Promise<WithdrawCustodyResult>;
  fundAgentGas: (input: { owner: string; agentWallet: string; amount: string }) => Promise<{ transaction: string; source: string; destination: string; amountLamports: string; amountUi: string; boundary: string }>;
  configureSharedIkaApprovers: (input: SharedIkaApproverConfigInput) => Promise<WalletTransactionResult & { threshold: number; approvers: string[] }>;
  revokeSharedIkaApprover: (input: { owner: string; approver: string }) => Promise<WalletTransactionResult & { approver: string }>;
  setRecoveryAuthority: (input: { owner: string; recoveryAuthority: string }) => Promise<WalletTransactionResult & { recoveryAuthority: string; activity: { type: string; status: string; privacy: string } }>;
  recoverAccess: (input: { owner: string; authority: string; compromisedSessions: string[]; sharedIkaThreshold: number; sharedIkaApprovers: string[]; pendingDwalletController: string }) => Promise<WalletTransactionResult & { authority: string; compromisedSessions: string[]; sharedIkaThreshold: number; sharedIkaApprovers: string[]; pendingDwalletController: string; activity: { type: string; status: string; states: string[]; privacy: string; boundary: string } }>;
  revokeSession: typeof revokeSession;
  requestPasskeyChallenge: (input: { owner: string; sessionKey: string; sharedApprovalChallenge: string; credentialId: string; rpId: string; expiresAtUnix: number }) => Promise<{ challenge: number[]; publicKeyCredentialRequestOptions: { challenge: number[]; rpId: string; allowCredentials: Array<{ type: string; id: string }>; userVerification: string }; boundary: string }>;
  verifyPasskeyAssertion: (input: { expectedChallenge: number[]; expectedOrigin: string; expectedRpId: string; expectedCredentialId: string; credentialPublicKeyJwk: Record<string, unknown>; assertion: { authenticatorData: string; clientDataJSON: string; signature: string; userHandle?: string }; requireUserVerification: boolean }) => Promise<{ valid: boolean; approverPublicKey: string; challengeUsed: string; boundary: string }>;
  broadcastIkaDestination: typeof import('../lib/api').broadcastIkaDestination;
  runConfidentialDca: typeof runConfidentialDca;
  runMultichainIntent: typeof runMultichainIntent;
  getWalletData: typeof getWalletData;
  getEncryptCiphertextStatus: typeof getEncryptCiphertextStatus;
  createEncryptDeposit: typeof createEncryptDeposit;
  executeEncryptPolicyGraph: (input: ExecuteEncryptPolicyGraphInput) => Promise<ExecuteEncryptPolicyGraphResult>;
  requestPolicyValueDecryption: (input: RequestPolicyValueDecryptionInput) => Promise<RequestPolicyValueDecryptionResult>;
  requestPendingAllowedOutputDecryption: (input: RequestPendingAllowedOutputDecryptionInput) => Promise<RequestPendingAllowedOutputDecryptionResult>;
  resolveEncryptPolicyDecision: typeof resolveEncryptPolicyDecision;
}

interface DemoTabContentProps {
  owner: string | null;
  agentAddresses?: string[];
  signAndConfirmTransaction: (transactionBase64: string, extraSigners?: Signer[], options?: { preserveExistingSignatures?: boolean }) => Promise<string>;
  api?: DemoApi;
  createPolicyCiphertexts?: typeof createOfficialEncryptPolicyCiphertexts;
  createExecutionCiphertexts?: typeof createOfficialEncryptExecutionCiphertexts;
  executeGraphBeforeRequests?: boolean;
  initialExecutionCiphertexts?: OfficialEncryptExecutionCiphertexts | null;
  readDecryptionRequest?: (request: string) => Promise<Uint8Array | null>;
}

const DEFAULT_API: DemoApi = {
  initializeWallet,
  setConfidentialPolicy,
  setOfficialEncryptCiphertextPolicy,
  setupDemoCustody,
  depositCustody,
  withdrawCustody,
  fundAgentGas,
  configureSharedIkaApprovers,
  revokeSharedIkaApprover,
  setRecoveryAuthority,
  recoverAccess,
  revokeSession,
  requestPasskeyChallenge,
  verifyPasskeyAssertion,
  broadcastIkaDestination,
  runConfidentialDca,
  runMultichainIntent,
  getWalletData,
  getEncryptCiphertextStatus,
  createEncryptDeposit,
  executeEncryptPolicyGraph,
  requestPolicyValueDecryption,
  requestPendingAllowedOutputDecryption,
  resolveEncryptPolicyDecision,
};

const DEFAULT_CREATE_POLICY_CIPHERTEXTS = createOfficialEncryptPolicyCiphertexts;
const DEFAULT_CREATE_EXECUTION_CIPHERTEXTS = createOfficialEncryptExecutionCiphertexts;

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

interface OfficialEncryptPolicyRefs {
  maxPerRun: string;
  dailyCap: string;
  dailySpent: string;
  config: string;
  networkEncryptionKey: string;
  eventAuthority: string;
  graph?: string;
  grpcEndpoint?: string;
  wallet?: string;
  policySeq?: number;
  lastRevokedSlot?: number;
  source: 'wallet';
}

interface AuthorizedSessionOption {
  key: string;
  label: string;
}

export function DemoTab({ agentAddresses = [] }: { agentAddresses?: string[] }) {
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();

  const signAndConfirmTransaction = async (
    transactionBase64: string,
    extraSigners: Signer[] = [],
    options: { preserveExistingSignatures?: boolean } = {}
  ) => {
    const { transaction, latestBlockhash } = await prepareFreshTransaction(transactionBase64, connection, options);
    if (extraSigners.length > 0) {
      if (!signTransaction) {
        throw new Error('Wallet does not support signing transactions with additional request signers.');
      }
      transaction.partialSign(...extraSigners);
      const signedTransaction = await signTransaction(transaction);
      const simulation = await connection.simulateTransaction(signedTransaction);
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)} / ${(simulation.value.logs ?? []).join(' | ')}`);
      }
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      return signature;
    }
    if (signTransaction) {
      const signedTransaction = await signTransaction(transaction);
      const simulation = await connection.simulateTransaction(signedTransaction);
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)} / ${(simulation.value.logs ?? []).join(' | ')}`);
      }
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      return signature;
    }
    const signature = await sendTransaction(transaction, connection, undefined);
    await confirmFreshTransaction(connection, signature, latestBlockhash);
    return signature;
  };

  return (
    <DemoTabContent
      owner={publicKey?.toBase58() ?? null}
      agentAddresses={agentAddresses}
      signAndConfirmTransaction={signAndConfirmTransaction}
      readDecryptionRequest={async (request) => {
        const info = await connection.getAccountInfo(new PublicKey(request));
        return info?.data ?? null;
      }}
    />
  );
}

export function DemoTabContent({
  owner,
  agentAddresses = [],
  signAndConfirmTransaction,
  api = DEFAULT_API,
  createPolicyCiphertexts = DEFAULT_CREATE_POLICY_CIPHERTEXTS,
  createExecutionCiphertexts = DEFAULT_CREATE_EXECUTION_CIPHERTEXTS,
  executeGraphBeforeRequests = true,
  initialExecutionCiphertexts = null,
  readDecryptionRequest,
}: DemoTabContentProps) {
  const [locale, setLocale] = useState<Locale>('id');
  const [policyDraft, setPolicyDraft] = useState({ maxPerRunUsdc: '10', dailyCapUsdc: '20' });
  const [officialEncryptPolicyRefs, setOfficialEncryptPolicyRefs] = useState<OfficialEncryptPolicyRefs | null>(null);
  const [officialEncryptExecutionDraft, setOfficialEncryptExecutionDraft] = useState<OfficialEncryptExecutionCiphertexts | null>(initialExecutionCiphertexts);
  const [policySaved, setPolicySaved] = useState(false);
  const [policyMode, setPolicyMode] = useState<'official' | 'legacy' | null>(null);
  const [editingPolicy, setEditingPolicy] = useState(true);
  const [custody, setCustody] = useState<{ usdcTokenAccount: string; solTokenAccount: string } | null>(null);
  const [custodyBalances, setCustodyBalances] = useState<{
    usdcUi: string;
    nativeSolUi: string;
    minNativeSolReserveUi: string;
    tradableNativeSolUi: string;
    nativeCustodyAddress: string;
    funded: boolean;
  } | null>(null);
  const [depositDraft, setDepositDraft] = useState({ asset: 'USDC' as 'USDC' | 'SOL', amount: '5' });
  const [withdrawDraft, setWithdrawDraft] = useState({ asset: 'USDC' as 'USDC' | 'SOL', amount: '1' });
  const [agentGasBalance, setAgentGasBalance] = useState<string | null>(null);
  const [fundAgentGasDraft, setFundAgentGasDraft] = useState('0.1');
  const [sharedIkaApproval, setSharedIkaApproval] = useState<{ threshold: number; approvers: string[] } | null>(null);
  const [sharedDraft, setSharedDraft] = useState({
    threshold: Math.max(1, Math.min(2, agentAddresses.length || 1)).toString(),
    approvers: agentAddresses.slice(0, 2).join('\n'),
  });
  const [sharedApprovalProofs, setSharedApprovalProofs] = useState('');
  const [agentAddress, setAgentAddress] = useState(owner ?? agentAddresses[0] ?? '');
  const [authorizedSessionOptions, setAuthorizedSessionOptions] = useState<AuthorizedSessionOption[]>([]);
  const [strategy, setStrategy] = useState<DcaStrategy>({
    sourceChain: 'Solana',
    inputMint: 'USDC',
    targetChain: 'Solana',
    outputMint: 'SOL',
    executionRail: 'Jupiter',
    amountUsdc: '5',
    cadence: 'Manual demo run',
  });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const activitySeq = useRef(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryAuthority, setRecoveryAuthorityState] = useState<string | null>(null);
  const [recoveryDraft, setRecoveryDraft] = useState({
    recoveryAuthority: '',
    compromisedSessions: '',
    sharedIkaThreshold: '1',
    sharedIkaApprovers: '',
    pendingDwalletController: '',
  });
  const [passkeyChallenge, setPasskeyChallenge] = useState<string | null>(null);
  const [passkeyVerified, setPasskeyVerified] = useState(false);
  const [passkeyUnavailable, setPasskeyUnavailable] = useState(false);
  const [passkeyDraft, setPasskeyDraft] = useState({
    credentialId: '',
    rpId: '',
    assertion: '',
  });
  const [lastIkaBroadcastable, setLastIkaBroadcastable] = useState<{
    ikaRequest: import('../lib/api').IkaRequestPreview;
    producedSignature: { status: 'signature-produced-prealpha'; signature: string; publicKey: string; messageDigest: string; signatureScheme: string };
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    action: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [routeRiskDraft, setRouteRiskDraft] = useState({
    slippageBps: 100,
    maxPriceImpactBps: 120,
    minLiquidityScore: 'medium' as 'low' | 'medium' | 'high',
    requireVerifiedRoute: true,
  });
  const [revealedPolicyValues, setRevealedPolicyValues] = useState<Partial<Record<PolicyRevealKind, string>>>({});

  const t = COPY[locale];
  const hasAgent = Boolean(agentAddress.trim());
  const hasBlockedRun = activity.some((entry) => isBlockedStatus(entry.status) && entry.amountUsdc === '25');
  const hasAllowedRun = activity.some(
    (entry) => isAllowedStatus(entry.status) && entry.amountUsdc === (strategy.amountUsdc || '5')
  );
  const hasBlockedIkaRun = activity.some(
    (entry) => isBlockedStatus(entry.status) && entry.amountUsdc === '25' && entry.route?.includes('Ika')
  );
  const hasSafeLog =
    activity.length > 0 && activity.every((entry) => !entry.message.includes('10 USDC') && !entry.message.includes('20 USDC'));
  const hasAllowedIkaSuiRun = activity.some(
    (entry) => isAllowedStatus(entry.status) && entry.amountUsdc === '5' && entry.routePair?.includes('SUI')
  );
  const hasAllowedIkaEthRun = activity.some(
    (entry) => isAllowedStatus(entry.status) && entry.amountUsdc === '5' && entry.routePair?.includes('ETH')
  );
  const hasRouteRiskBlock = activity.some((entry) => entry.route?.includes('IKA_RISK_GUARDRAIL_BLOCKED'));
  const strategyReady = strategy.inputMint === 'USDC' && strategy.outputMint === 'SOL' && Boolean(strategy.amountUsdc);
  const maxPerRun = Number(policyDraft.maxPerRunUsdc);
  const dailyCap = Number(policyDraft.dailyCapUsdc);
  const policyNumbersReady = Number.isFinite(maxPerRun) && Number.isFinite(dailyCap) && maxPerRun > 0 && dailyCap >= maxPerRun;
  const canSavePolicy = Boolean(owner && custody && hasAgent && policyNumbersReady && !busy);
  const canRunBlocked = Boolean(owner && custody && policySaved && hasAgent && strategyReady && !busy);
  const canRunAllowed = Boolean(canRunBlocked && hasBlockedRun);
  const canRequestIka = Boolean(owner && custody && policySaved && hasAgent && !busy);
  const canRevealPolicy = Boolean(owner && officialEncryptPolicyRefs?.wallet && !busy);

  const checklist = [
    { label: t.stepWallet, done: Boolean(owner), next: t.nextWallet },
    { label: t.stepCustody, done: Boolean(custody), next: t.nextCustody },
    { label: t.stepAgent, done: hasAgent, next: t.nextAgent },
    { label: t.stepPolicy, done: policySaved, next: t.nextPolicy },
    { label: t.stepSharedAccess, done: Boolean(sharedIkaApproval), next: t.nextSharedAccess },
    { label: t.stepRecovery, done: Boolean(recoveryAuthority), next: t.nextRecovery },
    { label: t.stepStrategy, done: strategyReady, next: t.nextBlocked },
    { label: t.stepBlocked, done: hasBlockedRun, next: t.nextBlocked },
    { label: t.stepAllowed, done: hasAllowedRun, next: t.nextAllowed },
    { label: t.stepIkaSui, done: hasAllowedIkaSuiRun, next: t.nextIkaSui },
    { label: t.stepIkaEth, done: hasAllowedIkaEthRun, next: t.nextIkaEth },
    { label: t.stepRouteRisk, done: hasRouteRiskBlock, next: t.nextRouteRisk },
    { label: t.stepLog, done: hasAllowedRun && hasSafeLog, next: t.nextLog },
  ];
  const nextStep = checklist.find((step) => !step.done);
  const nextAction = nextStep?.next ?? t.nextComplete;

  const addActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    activitySeq.current += 1;
    const timestamp = Date.now();
    const idSuffix = globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${activitySeq.current}-${Math.random().toString(36).slice(2)}`;
    setActivity((prev) => [
      { ...entry, id: `${entry.status}-${idSuffix}`, timestamp },
      ...prev.slice(0, 7),
    ]);
  };

  const recordError = (message: string) => {
    setError(message);
    addActivity({ status: 'error', message, route: 'Proxy / contract setup' });
  };

  const recordSignedActivity = (
    signature: string,
    entry: Omit<ActivityEntry, 'id' | 'timestamp' | 'signature'>
  ) => {
    addActivity({ ...entry, signature });
  };

  const formatError = (err: unknown, fallback: string) => {
    if (!(err instanceof Error)) return fallback;
    const details: string[] = [];
    const anyErr = err as Error & {
      logs?: string[];
      error?: { message?: string; code?: number };
      cause?: unknown;
    };
    if (anyErr.error?.message && anyErr.error.message !== err.message) {
      details.push(anyErr.error.message);
    }
    if (typeof anyErr.error?.code === 'number') {
      details.push(`code ${anyErr.error.code}`);
    }
    if (Array.isArray(anyErr.logs) && anyErr.logs.length > 0) {
      details.push(anyErr.logs.join(' | '));
    }
    if (anyErr.cause instanceof Error) {
      details.push(anyErr.cause.message);
    }
    return details.length > 0 ? `${err.message}: ${details.join(' / ')}` : err.message;
  };

  const ensureWalletInitialized = async () => {
    const existing = await api.getWalletData(owner!).catch(() => null);
    if (existing?.walletPda) return existing;

    const result = await api.initializeWallet(owner!);
    const signature = await signAndConfirmTransaction(result.transaction);
    addActivity({
      status: 'setup',
      message: `${t.initialized}: ${signature.slice(0, 8)}...`,
      route: 'Polet wallet PDA initialized for current program id',
      signature,
    });
    return api.getWalletData(owner!).catch(() => ({ walletPda: result.wallet }));
  };

  const isSessionAuthorizedInWallet = (data: any, sessionKey: string) => {
    const now = Math.floor(Date.now() / 1000);
    return Boolean(data?.sessions?.some((session: any) =>
      session?.key === sessionKey &&
      session?.authorized !== false &&
      Number(session?.expiresAt ?? 0) > now &&
      Number(session?.grantedSlot ?? 0) >= Number(data?.lastRevokedSlot ?? 0)
    ));
  };

  const readAuthorizedSessionOptions = (data: any): AuthorizedSessionOption[] => {
    const now = Math.floor(Date.now() / 1000);
    const sessionOptions = (data?.sessions ?? [])
      .filter((session: any) =>
        session?.key &&
        session?.authorized !== false &&
        Number(session?.expiresAt ?? 0) > now &&
        Number(session?.grantedSlot ?? 0) >= Number(data?.lastRevokedSlot ?? 0)
      )
      .map((session: any) => ({
        key: session.key,
        label: `Session ${short(session.key)}`,
      }));
    return sessionOptions;
  };

  const requireExistingGraphSigner = (walletData: any, sessionKey: string) => {
    if (isSessionAuthorizedInWallet(walletData, sessionKey)) return;
    throw new Error('Select an existing authorized session key from the wallet. Graph execution will not create or grant a new session key.');
  };

  const refreshAgentSessions = async () => {
    if (!owner) return;
    const data = await api.getWalletData(owner);
    const sessionOptions = readAuthorizedSessionOptions(data);
    setAuthorizedSessionOptions(sessionOptions);
    if (sessionOptions.length > 0 && !sessionOptions.some((session) => session.key === agentAddress.trim())) {
      setAgentAddress(sessionOptions[0].key);
    }
    if (sessionOptions.length === 0) {
      setAgentAddress('');
    }
  };

  useEffect(() => {
    if (owner) {
      api.getWalletData(owner).then((data) => {
        if (data) {
          if (data.demoCustody?.configured) {
            setCustody({
              usdcTokenAccount: data.demoCustody.usdcTokenAccount,
              solTokenAccount: data.demoCustody.solTokenAccount,
            });
          }
          if (data.custodyBalances) {
            setCustodyBalances({
              usdcUi: data.custodyBalances.usdcUi ?? '0',
              nativeSolUi: data.custodyBalances.nativeSolUi ?? '0',
              minNativeSolReserveUi: data.custodyBalances.minNativeSolReserveUi ?? '0.05',
              tradableNativeSolUi: data.custodyBalances.tradableNativeSolUi ?? '0',
              nativeCustodyAddress: data.custodyBalances.nativeCustodyAddress ?? data.walletPda,
              funded: Boolean(data.custodyBalances.funded),
            });
          }
          if (data.confidentialPolicy?.enabled) {
            setPolicySaved(true);
            setPolicyMode('legacy');
            setEditingPolicy(false);
          }
          const encryptCiphertexts = data.confidentialPolicy?.encryptCiphertexts;
          const sessionOptions = readAuthorizedSessionOptions(data);
          setAuthorizedSessionOptions(sessionOptions);
          if (sessionOptions.length > 0 && !sessionOptions.some((session) => session.key === agentAddress.trim())) {
            setAgentAddress(sessionOptions[0].key);
          }
          if (encryptCiphertexts?.configured) {
            setPolicyMode('official');
            setOfficialEncryptPolicyRefs({
              maxPerRun: encryptCiphertexts.maxPerRun,
              dailyCap: encryptCiphertexts.dailyCap,
              dailySpent: encryptCiphertexts.dailySpent,
              config: ENCRYPT_PREALPHA_CONFIG,
              networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
              eventAuthority: ENCRYPT_PREALPHA_EVENT_AUTHORITY,
              wallet: data.walletPda,
              policySeq: data.policySeq,
              lastRevokedSlot: data.lastRevokedSlot,
              source: 'wallet',
            });
            if (encryptCiphertexts.pending) {
              setOfficialEncryptExecutionDraft({
                sourceAmountCiphertext: encryptCiphertexts.pendingSourceAmount,
                allowedOutputCiphertext: encryptCiphertexts.pendingAllowedOutput,
                dailySpentOutputCiphertext: encryptCiphertexts.pendingDailySpentOutput,
                grpcEndpoint: ENCRYPT_PREALPHA_GRPC_ENDPOINT,
              });
            }
          }
          const configuredShared = normalizeSharedIkaApproval(data.sharedIkaApprovals);
          if (configuredShared) {
            setSharedIkaApproval(configuredShared);
            setSharedDraft({
              threshold: configuredShared.threshold.toString(),
              approvers: configuredShared.approvers.join('\n'),
            });
          } else {
            setSharedIkaApproval(null);
          }
          if (data.recoveryAuthority) {
            setRecoveryAuthorityState(data.recoveryAuthority);
          }
        } else {
          setPolicySaved(false);
          setPolicyMode(null);
          setOfficialEncryptPolicyRefs(null);
          setAuthorizedSessionOptions([]);
          setCustodyBalances(null);
        }
      }).catch(() => {
        setPolicySaved(false);
        setPolicyMode(null);
        setOfficialEncryptPolicyRefs(null);
        setAuthorizedSessionOptions([]);
        setCustodyBalances(null);
      });
    } else {
      setPolicySaved(false);
      setPolicyMode(null);
      setOfficialEncryptPolicyRefs(null);
      setAuthorizedSessionOptions([]);
      setCustodyBalances(null);
    }
  }, [owner]);

  const refreshCustodyBalances = async () => {
    if (!owner) return;
    const data = await api.getWalletData(owner);
    if (data?.custodyBalances) {
      setCustodyBalances({
        usdcUi: data.custodyBalances.usdcUi ?? '0',
        nativeSolUi: data.custodyBalances.nativeSolUi ?? '0',
        minNativeSolReserveUi: data.custodyBalances.minNativeSolReserveUi ?? '0.05',
        tradableNativeSolUi: data.custodyBalances.tradableNativeSolUi ?? '0',
        nativeCustodyAddress: data.custodyBalances.nativeCustodyAddress ?? data.walletPda,
        funded: Boolean(data.custodyBalances.funded),
      });
    }
  };

  useEffect(() => {
    if (!agentAddress && agentAddresses[0]) {
      setAgentAddress(agentAddresses[0]);
    }
  }, [agentAddresses, agentAddress]);

  const normalizeApproverLines = (value: string) =>
    Array.from(new Set(value.split(/\s+/).map((line) => line.trim()).filter(Boolean)));

  const setupCustodyAccounts = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    setPendingConfirm({
      action: t.setupCustody,
      description: t.confirmCustody,
      onConfirm: async () => {
        setBusy('custody');
        setError(null);
        try {
          await ensureWalletInitialized();
          const result = await api.setupDemoCustody({
            owner,
            usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          setCustody({
            usdcTokenAccount: result.usdcTokenAccount ?? 'registered',
            solTokenAccount: result.solTokenAccount ?? 'registered',
          });
          await refreshCustodyBalances();
          addActivity({
            status: 'setup',
            message: `${t.custodyReady}: ${signature.slice(0, 8)}...`,
            route: 'Contract register_demo_custody',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to set up demo custody');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const depositToCustody = async () => {
    if (!owner || !custody) {
      recordError('Set up custody before depositing funds.');
      return;
    }
    const asset = depositDraft.asset;
    const amount = depositDraft.amount.trim();
    setPendingConfirm({
      action: `${t.depositToSmartWallet} ${asset}`,
      description: `${t.confirmDeposit} ${amount} ${asset}`,
      onConfirm: async () => {
        setBusy('deposit-custody');
        setError(null);
        try {
          const result = await api.depositCustody({
            owner,
            asset,
            amount,
            usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            custodyTokenAccount: custody.usdcTokenAccount,
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          await refreshCustodyBalances();
          addActivity({
            status: 'setup',
            message: `${asset} ${t.depositConfirmed}: ${signature.slice(0, 8)}...`,
            route: 'Owner deposit to smart-wallet custody',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to build custody deposit');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const withdrawFromCustody = async () => {
    if (!owner || !custody) {
      recordError('Set up custody before withdrawing.');
      return;
    }
    const asset = withdrawDraft.asset;
    const amount = withdrawDraft.amount.trim();
    setPendingConfirm({
      action: `${t.withdrawFromSmartWallet} ${asset}`,
      description: `${t.confirmWithdraw} ${amount} ${asset}`,
      onConfirm: async () => {
        setBusy('withdraw-custody');
        setError(null);
        try {
          const result = await api.withdrawCustody({
            owner,
            asset,
            amount,
            usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            custodyTokenAccount: custody.usdcTokenAccount,
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          await refreshCustodyBalances();
          addActivity({
            status: 'setup',
            message: `${asset} ${t.withdrawConfirmed}: ${signature.slice(0, 8)}...`,
            route: 'Owner withdraw from smart-wallet custody',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to build custody withdraw');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const fundAgentGas = async () => {
    if (!owner || !agentAddress.trim()) {
      recordError('Select an authorized agent wallet first.');
      return;
    }
    const amount = fundAgentGasDraft.trim();
    setPendingConfirm({
      action: t.fundAgentGas,
      description: `${t.confirmFundAgentGas} ${amount} SOL → ${short(agentAddress.trim())}`,
      onConfirm: async () => {
        setBusy('fund-agent-gas');
        setError(null);
        try {
          const result = await api.fundAgentGas({
            owner,
            agentWallet: agentAddress.trim(),
            amount,
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          await refreshAgentGasBalance();
          addActivity({
            status: 'setup',
            message: `${t.fundAgentGas} ${amount} SOL: ${signature.slice(0, 8)}...`,
            route: 'Owner fund agent gas wallet',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to build agent gas funding transaction');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const refreshAgentGasBalance = async () => {
    if (!agentAddress.trim()) {
      setAgentGasBalance(null);
      return;
    }
    try {
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
      const balance = await connection.getBalance(new PublicKey(agentAddress.trim()));
      setAgentGasBalance((balance / 1e9).toFixed(4));
    } catch {
      setAgentGasBalance(null);
    }
  };

  const readOfficialEncryptRefsFromWallet = (data: any): OfficialEncryptPolicyRefs | null => {
    const encryptCiphertexts = data?.confidentialPolicy?.encryptCiphertexts;
    if (!encryptCiphertexts?.configured) return null;
    return {
      maxPerRun: encryptCiphertexts.maxPerRun,
      dailyCap: encryptCiphertexts.dailyCap,
      dailySpent: encryptCiphertexts.dailySpent,
      config: ENCRYPT_PREALPHA_CONFIG,
      networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
      eventAuthority: ENCRYPT_PREALPHA_EVENT_AUTHORITY,
      wallet: data.walletPda,
      policySeq: data.policySeq,
      lastRevokedSlot: data.lastRevokedSlot,
      source: 'wallet',
    };
  };

  const fallbackOfficialEncryptRefs = (
    ciphertexts: OfficialEncryptPolicyCiphertexts,
    result: SetOfficialEncryptCiphertextPolicyResult
  ): OfficialEncryptPolicyRefs => ({
    maxPerRun: result.ciphertexts.maxPerRun,
    dailyCap: result.ciphertexts.dailyCap,
    dailySpent: result.ciphertexts.dailySpent,
    config: ENCRYPT_PREALPHA_CONFIG,
    networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
    eventAuthority: ENCRYPT_PREALPHA_EVENT_AUTHORITY,
    graph: result.graph,
    grpcEndpoint: ciphertexts.grpcEndpoint,
    wallet: result.wallet,
    source: 'wallet',
  });

  const revealCiphertextForKind = (kind: PolicyRevealKind, refs: OfficialEncryptPolicyRefs) => {
    if (kind === 'max-per-run') return refs.maxPerRun;
    if (kind === 'daily-cap') return refs.dailyCap;
    return refs.dailySpent;
  };

  const revealLabel = (kind: PolicyRevealKind) => {
    if (kind === 'max-per-run') return t.maxPerRun;
    if (kind === 'daily-cap') return t.dailyCap;
    return t.dailySpentCiphertext;
  };

  const decodePolicyRevealUsdc = (data: Uint8Array): string | null => {
    if (data.length < 115) return null;
    const totalLen = new DataView(data.buffer, data.byteOffset + 99, 4).getUint32(0, true);
    const written = new DataView(data.buffer, data.byteOffset + 103, 4).getUint32(0, true);
    if (totalLen < 8 || written < totalLen) return null;
    const baseUnits = new DataView(data.buffer, data.byteOffset + 107, 8).getBigUint64(0, true);
    const whole = baseUnits / 1_000_000n;
    const fraction = (baseUnits % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
  };

  const pollPolicyReveal = async (request: string) => {
    if (!readDecryptionRequest) return null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const data = await readDecryptionRequest(request);
      const decoded = data ? decodePolicyRevealUsdc(data) : null;
      if (decoded) return decoded;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return null;
  };

  const revealPolicyValue = async (kind: PolicyRevealKind) => {
    if (!owner || !officialEncryptPolicyRefs?.wallet) {
      recordError(t.policyRevealNeedsPolicy);
      return;
    }
    const refs = officialEncryptPolicyRefs;
    setPendingConfirm({
      action: `${t.revealPolicy}: ${revealLabel(kind)}`,
      description: t.confirmPolicyReveal,
      onConfirm: async () => {
        setBusy(`reveal-${kind}`);
        setError(null);
        try {
          const requestKeypair = Keypair.generate();
          const deposit = await api.createEncryptDeposit(owner);
          if (deposit.transaction) {
            const depositSignature = await signAndConfirmTransaction(deposit.transaction);
            recordSignedActivity(depositSignature, {
              status: 'setup',
              message: `Encrypt deposit created: ${depositSignature.slice(0, 8)}...`,
              route: 'Official Encrypt create_deposit',
            });
          }
          const result = await api.requestPolicyValueDecryption({
            owner,
            wallet: refs.wallet!,
            request: requestKeypair.publicKey.toBase58(),
            kind,
            ciphertext: revealCiphertextForKind(kind, refs),
            encrypt: {
              encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
              config: deposit.config || refs.config,
              deposit: deposit.deposit,
              networkEncryptionKey: refs.networkEncryptionKey,
              eventAuthority: deposit.eventAuthority || refs.eventAuthority,
              payer: owner,
            },
          });
          console.log(`Hasil Result: ${JSON.stringify(result)}`);
          const signature = await signAndConfirmTransaction(result.transaction, [requestKeypair]);
          addActivity({
            status: 'setup',
            message: `${t.policyRevealRequested}: ${signature.slice(0, 8)}...`,
            route: `Official Encrypt owner reveal request: ${kind}`,
            signature,
          });
          console.log(`Hasil Signature: ${signature}`);
          const decoded = await pollPolicyReveal(result.request);
          if (decoded) {
            setRevealedPolicyValues((prev) => ({ ...prev, [kind]: decoded }));
            addActivity({
              status: 'setup',
              message: t.policyRevealReady,
              route: `Official Encrypt owner reveal ready: ${kind}`,
            });
          } else {
            addActivity({
              status: 'pending-encrypt-execution',
              message: t.policyRevealPending,
              route: `Official Encrypt owner reveal pending: ${kind}`,
            });
          }
        } catch (err) {
          recordError(formatError(err, 'Failed to request policy reveal'));
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const hidePolicyValue = (kind: PolicyRevealKind) => {
    setRevealedPolicyValues((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
  };

  const savePolicy = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    setPendingConfirm({
      action: t.savePolicy,
      description: t.confirmPolicy,
      onConfirm: async () => {
        setBusy('policy');
        setError(null);
        try {
          await ensureWalletInitialized();
          const ciphertexts = await createPolicyCiphertexts({
            maxPerRunUsdc: policyDraft.maxPerRunUsdc,
            dailyCapUsdc: policyDraft.dailyCapUsdc,
          });
          const deposit = await api.createEncryptDeposit(owner);
          if (deposit.transaction) {
            const depositSignature = await signAndConfirmTransaction(deposit.transaction);
            recordSignedActivity(depositSignature, {
              status: 'setup',
              message: `Encrypt deposit created: ${depositSignature.slice(0, 8)}...`,
              route: 'Official Encrypt create_deposit',
            });
          }
          const result = await api.setOfficialEncryptCiphertextPolicy({
            owner,
            maxPerRunCiphertext: ciphertexts.maxPerRunCiphertext,
            dailyCapCiphertext: ciphertexts.dailyCapCiphertext,
            dailySpentCiphertext: ciphertexts.dailySpentCiphertext,
            policyCommitment: ciphertexts.policyCommitment,
            encrypt: {
              encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
              config: deposit.config || ENCRYPT_PREALPHA_CONFIG,
              deposit: deposit.deposit,
              networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
              eventAuthority: deposit.eventAuthority || ENCRYPT_PREALPHA_EVENT_AUTHORITY,
              payer: owner,
            },
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          const walletData = await api.getWalletData(owner).catch(() => null);
          setOfficialEncryptPolicyRefs(readOfficialEncryptRefsFromWallet(walletData) ?? fallbackOfficialEncryptRefs(ciphertexts, result));
          setPolicySaved(true);
          setPolicyMode('official');
          setEditingPolicy(false);
          addActivity({
            status: 'setup',
            message: `${t.policySaved}: ${signature.slice(0, 8)}...`,
            route: 'Official Encrypt pre-alpha ciphertext policy registration',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? `Official Encrypt pre-alpha setup failed: ${err.message}` : 'Official Encrypt pre-alpha setup failed');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const saveLegacyDevPolicy = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    setPendingConfirm({
      action: t.saveLegacyPolicy,
      description: t.confirmLegacyPolicy,
      onConfirm: async () => {
        setBusy('policy-legacy');
        setError(null);
        try {
          await ensureWalletInitialized();
          const result = await api.setConfidentialPolicy({
            owner,
            maxPerRunUsdc: policyDraft.maxPerRunUsdc,
            dailyCapUsdc: policyDraft.dailyCapUsdc,
            maskedWitnessDevFixture: Array.from({ length: 32 }, () => 7),
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          setPolicySaved(true);
          setPolicyMode('legacy');
          setEditingPolicy(false);
          addActivity({
            status: 'setup',
            message: `${t.policySaved}: ${signature.slice(0, 8)}...`,
            route: 'Legacy dev masked-witness fallback',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to save legacy dev policy');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const refreshSharedIkaApproval = async () => {
    if (!owner) return;
    const data = await api.getWalletData(owner);
    if (!data) return;
    const configuredShared = normalizeSharedIkaApproval(data?.sharedIkaApprovals);
    setSharedIkaApproval(configuredShared);
    if (configuredShared) {
      setSharedDraft({
        threshold: configuredShared.threshold.toString(),
        approvers: configuredShared.approvers.join('\n'),
      });
    } else {
      setSharedDraft((prev) => ({ ...prev, approvers: '' }));
    }
  };

  const configureSharedApproval = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    const approvers = normalizeApproverLines(sharedDraft.approvers);
    const threshold = Number.parseInt(sharedDraft.threshold, 10);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > approvers.length) {
      recordError(t.invalidSharedApprover);
      return;
    }
    setPendingConfirm({
      action: t.configureShared,
      description: `${t.confirmShared}: ${threshold}/${approvers.length}.`,
      onConfirm: async () => {
        setBusy('shared-config');
        setError(null);
        try {
          const result = await api.configureSharedIkaApprovers({ owner, threshold, approvers });
          const signature = await signAndConfirmTransaction(result.transaction);
          const nextConfig = { threshold: result.threshold, approvers: result.approvers };
          setSharedIkaApproval(nextConfig);
          setSharedDraft({
            threshold: result.threshold.toString(),
            approvers: result.approvers.join('\n'),
          });
          await refreshSharedIkaApproval();
          addActivity({
            status: 'setup',
            message: `${t.sharedReady}: ${signature.slice(0, 8)}...`,
            route: 'Contract configure_shared_ika_approvers',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to configure shared Ika approval');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const revokeSharedApproval = async (approver: string) => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }

    setPendingConfirm({
      action: t.revokeShared,
      description: `${t.confirmRevokeShared}: ${short(approver)}.`,
      onConfirm: async () => {
        setBusy(`shared-revoke-${approver}`);
        setError(null);
        try {
          const result = await api.revokeSharedIkaApprover({ owner, approver });
          const signature = await signAndConfirmTransaction(result.transaction);
          await refreshSharedIkaApproval();
          addActivity({
            status: 'setup',
            message: `${t.revokeShared}: ${short(result.approver)} ${signature.slice(0, 8)}...`,
            route: 'Contract revoke_shared_ika_approver',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to revoke shared Ika approver');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const revokeAgentSession = async (sessionKey: string) => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }

    setPendingConfirm({
      action: t.revokeSession,
      description: `${t.confirmRevokeSession}: ${short(sessionKey)}.`,
      onConfirm: async () => {
        setBusy(`session-revoke-${sessionKey}`);
        setError(null);
        try {
          const result = await api.revokeSession({ owner, sessionKey });
          const signature = await signAndConfirmTransaction(result.transaction);
          await refreshAgentSessions();
          addActivity({
            status: 'setup',
            message: `${t.revokeSession}: ${short(result.sessionKey)} ${signature.slice(0, 8)}...`,
            route: 'Contract revoke_session',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to revoke agent session');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const setRecoveryAuth = async () => {
    if (!owner || !recoveryDraft.recoveryAuthority.trim()) {
      return;
    }
    setPendingConfirm({
      action: t.recoverySetAuthority,
      description: `${t.confirmRecoveryAuthority}: ${short(recoveryDraft.recoveryAuthority.trim())}.`,
      onConfirm: async () => {
        setBusy('recovery-authority');
        setError(null);
        try {
          const result = await api.setRecoveryAuthority({ owner, recoveryAuthority: recoveryDraft.recoveryAuthority.trim() });
          const signature = await signAndConfirmTransaction(result.transaction);
          setRecoveryAuthorityState(result.recoveryAuthority);
          addActivity({
            status: 'setup',
            message: `${t.recoveryReady}: ${signature.slice(0, 8)}...`,
            route: 'Contract set_recovery_authority',
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to set recovery authority');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const runRecoveryAccess = async () => {
    if (!owner || !recoveryAuthority || !recoveryDraft.compromisedSessions.trim()) {
      return;
    }
    const compromisedSessions = normalizeApproverLines(recoveryDraft.compromisedSessions);
    const approvers = normalizeApproverLines(recoveryDraft.sharedIkaApprovers);
    const threshold = Number.parseInt(recoveryDraft.sharedIkaThreshold, 10);
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > approvers.length) {
      recordError(t.invalidSharedApprover);
      return;
    }
    setPendingConfirm({
      action: t.recoveryRecoveryAccess,
      description: `${t.confirmRecoveryAccess}: ${compromisedSessions.length}.`,
      onConfirm: async () => {
        setBusy('recovery-access');
        setError(null);
        try {
          const result = await api.recoverAccess({
            owner,
            authority: owner,
            compromisedSessions,
            sharedIkaThreshold: threshold,
            sharedIkaApprovers: approvers,
            pendingDwalletController: recoveryDraft.pendingDwalletController.trim(),
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          addActivity({
            status: 'setup',
            message: `Recovery: ${signature.slice(0, 8)}...`,
            route: `Contract recover_wallet_access: ${result.activity.states.join(', ')}`,
            signature,
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to recover access');
        } finally {
          setBusy(null);
        }
      },
    });
  };

  const isWebAuthnAvailable = () => typeof navigator !== 'undefined' && typeof navigator.credentials !== 'undefined';

  const requestPasskeyChallenge = async () => {
    if (!owner || !agentAddress.trim() || !passkeyDraft.credentialId.trim() || !passkeyDraft.rpId.trim()) {
      return;
    }
    if (!isWebAuthnAvailable()) {
      setPasskeyUnavailable(true);
      return;
    }
    setBusy('passkey-challenge');
    setError(null);
    try {
      const challengeResult = await api.requestPasskeyChallenge({
        owner,
        sessionKey: agentAddress.trim(),
        sharedApprovalChallenge: 'demo-shared-approval-challenge',
        credentialId: passkeyDraft.credentialId.trim(),
        rpId: passkeyDraft.rpId.trim(),
        expiresAtUnix: Math.floor(Date.now() / 1000) + 300,
      });
      const challengeHex = Array.from(new Uint8Array(challengeResult.challenge)).map(b => b.toString(16).padStart(2, '0')).join('');
      setPasskeyChallenge(challengeHex);
      addActivity({
        status: 'setup',
        message: `Passkey challenge prepared`,
        route: 'Passkey coapproval challenge',
      });
    } catch (err) {
      recordError(err instanceof Error ? err.message : 'Failed to request passkey challenge');
    } finally {
      setBusy(null);
    }
  };

  const verifyPasskeyProof = async () => {
    if (!passkeyChallenge || !passkeyDraft.assertion.trim()) {
      return;
    }
    setBusy('passkey-verify');
    setError(null);
    try {
      const assertion = JSON.parse(passkeyDraft.assertion);
      const challengeBytes = new Uint8Array(passkeyChallenge.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const result = await api.verifyPasskeyAssertion({
        expectedChallenge: Array.from(challengeBytes),
        expectedOrigin: 'http://localhost',
        expectedRpId: passkeyDraft.rpId.trim(),
        expectedCredentialId: passkeyDraft.credentialId.trim(),
        credentialPublicKeyJwk: { kty: 'RSA', alg: 'RS256' },
        assertion: {
          authenticatorData: assertion.authenticatorData,
          clientDataJSON: assertion.clientDataJSON,
          signature: assertion.signature,
          userHandle: assertion.userHandle,
        },
        requireUserVerification: false,
      });
      if (result.valid) {
        setPasskeyVerified(true);
        addActivity({
          status: 'setup',
          message: `Passkey verified for co-approval`,
          route: 'Passkey coapproval verified',
        });
      } else {
        recordError('Passkey verification failed');
      }
    } catch (err) {
      recordError(err instanceof Error ? err.message : 'Failed to verify passkey assertion');
    } finally {
      setBusy(null);
    }
  };

  const submitOfficialEncryptGraph = async (amountUsdc: string, routePair: string, route: string): Promise<OfficialEncryptPolicyPreview | null> => {
    if (!owner || !agentAddress.trim()) {
      recordError(!owner ? t.missingOwner : t.missingAgent);
      return null;
    }
    const walletData = await api.getWalletData(owner);
    requireExistingGraphSigner(walletData, agentAddress.trim());
    const policyRefs = readOfficialEncryptRefsFromWallet(walletData) ?? officialEncryptPolicyRefs;
    if (!policyRefs?.wallet || policyRefs.policySeq === undefined || policyRefs.lastRevokedSlot === undefined) {
      recordError('Official Encrypt policy must be configured on-chain before graph execution.');
      return null;
    }

    const executionCiphertexts = await createExecutionCiphertexts({ amountUsdc });
    const deposit = await api.createEncryptDeposit(agentAddress.trim(), owner);
    if (deposit.transaction) {
      const depositSignature = await signAndConfirmTransaction(deposit.transaction, [], { preserveExistingSignatures: true });
      recordSignedActivity(depositSignature, {
        status: 'setup',
        message: `Session Encrypt deposit created: ${depositSignature.slice(0, 8)}...`,
        route: 'Official Encrypt create_deposit',
      });
    }
    const graphResult = await api.executeEncryptPolicyGraph({
      owner,
      wallet: policyRefs.wallet,
      sessionKey: agentAddress.trim(),
      sourceAmountCiphertext: executionCiphertexts.sourceAmountCiphertext,
      maxPerRunCiphertext: policyRefs.maxPerRun,
      dailySpentCiphertext: policyRefs.dailySpent,
      dailyCapCiphertext: policyRefs.dailyCap,
      allowedOutputCiphertext: executionCiphertexts.allowedOutputCiphertext,
      dailySpentOutputCiphertext: executionCiphertexts.dailySpentOutputCiphertext,
      attestationSlot: policyRefs.lastRevokedSlot + 1,
      attestationPolicySeq: policyRefs.policySeq,
      encrypt: {
        encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
        config: deposit.config || policyRefs.config,
        deposit: deposit.deposit,
        networkEncryptionKey: policyRefs.networkEncryptionKey,
        eventAuthority: deposit.eventAuthority || policyRefs.eventAuthority,
        payer: agentAddress.trim(),
      },
    });
    const signature = await signAndConfirmTransaction(graphResult.transaction, [], { preserveExistingSignatures: true });
    const pendingWallet = await api.getWalletData(owner).catch(() => null);
    const pendingState = pendingWallet?.confidentialPolicy?.encryptCiphertexts;
    const pendingRefs = {
      sourceAmountCiphertext: pendingState?.pendingSourceAmount || executionCiphertexts.sourceAmountCiphertext,
      allowedOutputCiphertext: pendingState?.pendingAllowedOutput || executionCiphertexts.allowedOutputCiphertext,
      dailySpentOutputCiphertext: pendingState?.pendingDailySpentOutput || executionCiphertexts.dailySpentOutputCiphertext,
      grpcEndpoint: executionCiphertexts.grpcEndpoint,
    };
    setOfficialEncryptExecutionDraft(pendingRefs);
    setOfficialEncryptPolicyRefs(policyRefs);
    addActivity({
      status: 'pending-encrypt-execution',
      amountUsdc,
      routePair,
      message: t.encryptGraphSubmitted,
      route: `${route}: ${signature.slice(0, 8)}...`,
      signature,
      encryptPolicy: {
        status: 'pending-encrypt-execution',
        policySequence: pendingState?.pendingPolicySeq || policyRefs.policySeq,
        sourceAmountCiphertext: pendingRefs.sourceAmountCiphertext,
        allowedOutputCiphertext: pendingRefs.allowedOutputCiphertext,
        dailySpentOutputCiphertext: pendingRefs.dailySpentOutputCiphertext,
        ...(pendingState?.pendingSlot && { pendingSlot: pendingState.pendingSlot }),
        graph: graphResult.graph,
        encryptProgram: graphResult.encryptProgram,
        grpcEndpoint: graphResult.grpcEndpoint,
        inputCiphertexts: graphResult.inputCiphertexts,
        pendingOutputCiphertexts: graphResult.pendingOutputCiphertexts,
        suppressedUntilVerified: graphResult.suppressedUntilVerified,
      },
    });

    await pollAllowedOutputVerified(pendingRefs.allowedOutputCiphertext);

    const requestKeypair = Keypair.generate();
    const decryption = await api.requestPendingAllowedOutputDecryption({
      owner,
      wallet: policyRefs.wallet,
      request: requestKeypair.publicKey.toBase58(),
      encrypt: {
        encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
        config: deposit.config || policyRefs.config,
        deposit: deposit.deposit,
        networkEncryptionKey: policyRefs.networkEncryptionKey,
        eventAuthority: deposit.eventAuthority || policyRefs.eventAuthority,
        payer: owner,
      },
    });
    const decryptionSignature = await signAndConfirmTransaction(decryption.transaction, [requestKeypair]);
    recordSignedActivity(decryptionSignature, {
      status: 'pending-encrypt-execution',
      amountUsdc,
      routePair,
      message: `Allowed-output decryption requested: ${decryptionSignature.slice(0, 8)}...`,
      route: `${route}: request allowed-output decrypt`,
    });
    const decision = await pollEncryptPolicyDecision(decryption.request, decryption.policySequence);
    addActivity({
      status: decision.status,
      amountUsdc,
      routePair,
      message: encryptMessage(decision.status, t),
      route: `${route}: allowed-output ${short(decision.allowedOutputCiphertext)}`,
      encryptPolicy: decision,
    });
    return decision;
  };

  const officialEncryptRefsFromDecision = (
    decision: OfficialEncryptPolicyPreview | null
  ): OfficialEncryptExecutionRefs | null => {
    if (!decision || decision.status !== 'encrypt-verified-allowed') return null;
    return {
      sourceAmountCiphertext: decision.sourceAmountCiphertext,
      allowedOutputCiphertext: decision.allowedOutputCiphertext,
      dailySpentOutputCiphertext: decision.dailySpentOutputCiphertext,
      ...(decision.allowedDecryptionRequest && { allowedDecryptionRequest: decision.allowedDecryptionRequest }),
    };
  };

  const pollAllowedOutputVerified = async (
    allowedOutputCiphertext: string,
    attempts = 60,
    intervalMs = 3_000
  ) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const status = await api.getEncryptCiphertextStatus(allowedOutputCiphertext, ENCRYPT_PREALPHA_PROGRAM_ID);
      if (status.status === 'verified') return status;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error('Official Encrypt graph output is still pending executor verification. This is a pending executor/decryptor state, not an infrastructure blocker; retry resolve after the output ciphertext is verified.');
  };

  const pollEncryptPolicyDecision = async (
    allowedDecryptionRequest: string,
    expectedPolicySeq: number,
    attempts = 60,
    intervalMs = 3_000
  ): Promise<OfficialEncryptPolicyPreview> => {
    let last: OfficialEncryptPolicyPreview | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      last = await api.resolveEncryptPolicyDecision({
        owner: owner!,
        allowedDecryptionRequest,
        expectedPolicySeq,
      });
      if (last.status !== 'pending-encrypt-execution') return last;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return last!;
  };

  const runAgent = async (amountUsdc: string) => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    if (!agentAddress.trim()) {
      recordError(t.missingAgent);
      return;
    }

    setBusy(`run-${amountUsdc}`);
    setError(null);
    try {
      const shouldSubmitOfficialGraph = executeGraphBeforeRequests && policyMode === 'official';
      let officialEncryptForRequest: OfficialEncryptExecutionRefs | null = officialEncryptExecutionDraft;
      if (shouldSubmitOfficialGraph) {
        const decision = await submitOfficialEncryptGraph(amountUsdc, 'USDC -> SOL', 'Official Encrypt graph / Jupiter gated');
        if (!decision || decision.status !== 'encrypt-verified-allowed') return;
        officialEncryptForRequest = officialEncryptRefsFromDecision(decision);
      }
      const result: RunConfidentialDcaResult = await api.runConfidentialDca({
        owner,
        sessionKey: agentAddress.trim(),
        amountUsdc,
        slippageBps: 100,
        ...(officialEncryptForRequest && { officialEncrypt: officialEncryptForRequest }),
      });
      const encryptStatus = getEncryptStatus(result.status, result.encryptPolicy);
      addActivity({
        status: result.allowed
          ? encryptStatus === 'encrypt-verified-allowed' ? 'encrypt-verified-allowed' : 'approved'
          : encryptStatus ?? 'blocked',
        amountUsdc,
        routePair: 'USDC -> SOL',
        message: encryptStatus
          ? encryptMessage(encryptStatus, t, result.reason)
          : result.allowed
            ? t.approvedMessage
            : result.reason ?? t.blockedMessage,
        route: result.allowed
          ? `${result.executionPath ?? 'Jupiter Swap V2'} / route preview`
          : result.code ?? encryptStatus,
        encryptPolicy: result.encryptPolicy,
        jupiterPlan: result.allowed ? result.jupiterPlan : undefined,
        transactionSigners: result.allowed ? result.transaction?.signers : undefined,
        unsignedTransaction: result.allowed && result.transaction
          ? {
            transaction: result.transaction.transaction,
            signers: result.transaction.signers,
            kind: 'jupiter-dca',
          }
          : undefined,
        smartWalletAuthority: result.allowed ? result.smartWalletAuthority : undefined,
      });
    } catch (err) {
      recordError(err instanceof Error ? err.message : 'Failed to run confidential DCA');
    } finally {
      setBusy(null);
    }
  };

  const requestIkaRoute = async (
    amount: string,
    target: { chain: 'sui' | 'ethereum' | 'base'; asset: string } = { chain: 'sui', asset: 'SUI' }
  ) => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    if (!agentAddress.trim()) {
      recordError(t.missingAgent);
      return;
    }

    const isAllowedIkaTarget =
      (target.chain === 'sui' && target.asset === 'SUI') ||
      (target.chain === 'ethereum' && target.asset === 'ETH');
    setBusy(isAllowedIkaTarget ? `ika-${target.chain}-${amount}` : 'ika-unsupported');
    setError(null);
    try {
      const shouldSubmitOfficialGraph = executeGraphBeforeRequests && policyMode === 'official' && isAllowedIkaTarget;
      let officialEncryptForRequest: OfficialEncryptExecutionRefs | null = officialEncryptExecutionDraft;
      if (shouldSubmitOfficialGraph) {
        const decision = await submitOfficialEncryptGraph(amount, `USDC -> ${target.asset}`, `Official Encrypt graph / Ika ${target.chain.toUpperCase()} gated`);
        if (!decision || decision.status !== 'encrypt-verified-allowed') return;
        officialEncryptForRequest = officialEncryptRefsFromDecision(decision);
      }
      const result: RunMultichainIntentResult = await api.runMultichainIntent({
        owner,
        sessionKey: agentAddress.trim(),
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: target.chain,
        targetAsset: target.asset,
        amount,
        executionRail: 'ika',
        strategy: 'dca',
        slippageBps: routeRiskDraft.slippageBps,
        routeRisk: { priceImpactBps: routeRiskDraft.maxPriceImpactBps, liquidityScore: routeRiskDraft.minLiquidityScore, verifiedRoute: routeRiskDraft.requireVerifiedRoute, provider: 'polet-demo-precheck' },
        riskGuardrails: { mode: 'bridgeless-route-risk', maxSlippageBps: 150, maxPriceImpactBps: 300, minLiquidityScore: routeRiskDraft.minLiquidityScore, requireVerifiedRoute: routeRiskDraft.requireVerifiedRoute },
        sharedAccess: buildSharedAccess(sharedIkaApproval, sharedApprovalProofs, t.invalidSharedProofs),
        ...(officialEncryptForRequest && { officialEncrypt: officialEncryptForRequest }),
        routeGuardrails: {
          mode: 'chain-asset-allowlist',
          allowedSourceChains: ['solana'],
          allowedTargetChains: ['sui', 'ethereum'],
          allowedSourceAssets: ['USDC'],
          allowedTargetAssets: ['SUI', 'ETH'],
        },
      });
      const encryptStatus = getEncryptStatus(result.status, result.encryptPolicy);
      addActivity({
        status: result.allowed
          ? result.ikaRequest?.policyAttestation.status === 'encrypt-verified-allowed'
            ? 'encrypt-verified-allowed'
            : 'approved'
          : encryptStatus ?? (result.status === 'needs-approval' ? 'needs-approval' : 'blocked'),
        amountUsdc: amount,
        routePair: `USDC -> ${target.asset}`,
        message: encryptStatus
          ? encryptMessage(encryptStatus, t, result.reason)
          : result.allowed
            ? t.ikaExecutionBoundary
            : result.code === 'IKA_ROUTE_NOT_ALLOWED'
              ? result.reason ?? t.ikaUnsupportedBoundary
              : result.reason ?? t.ikaBlockedBoundary,
        route: result.allowed
          ? `Ika dWallet approval: ${target.chain.toUpperCase()} ${target.asset}`
          : result.code === 'IKA_ROUTE_NOT_ALLOWED'
            ? `${t.ikaRouteUnsupported}: ${target.chain.toUpperCase()} ${target.asset}`
            : `Ika ${result.code}`,
        encryptPolicy: result.encryptPolicy ?? result.ikaRequest?.policyAttestation.encryptPolicy,
        ikaRequest: result.allowed ? result.ikaRequest : undefined,
        approval: result.approval,
        sharedApprovers: result.allowed ? sharedApproversFromResult(result) : result.approval?.approvedApprovers,
        unsignedTransaction: result.allowed && result.ikaRequest?.poletApprovalTransaction?.transaction
          ? {
            transaction: result.ikaRequest.poletApprovalTransaction.transaction,
            signers: result.ikaRequest.poletApprovalTransaction.signers ?? [],
            kind: 'ika-approval',
          }
          : undefined,
        smartWalletAuthority: result.allowed ? result.ikaRequest?.sessionContext.smartWalletAuthority : undefined,
      });
      if (result.allowed && result.ikaRequest?.preAlphaSigning?.status === 'signature-produced-prealpha' && result.ikaRequest.preAlphaSigning.messageDigest) {
        const preSign = result.ikaRequest.preAlphaSigning;
        setLastIkaBroadcastable({
          ikaRequest: result.ikaRequest,
          producedSignature: {
            status: 'signature-produced-prealpha' as const,
            signature: preSign.dwalletAccount ? `demo-sig-${preSign.dwalletAccount.slice(0, 8)}` : `demo-sig-${Date.now()}`,
            publicKey: preSign.dwalletAccount ?? owner ?? 'demo',
            messageDigest: preSign.messageDigest!,
            signatureScheme: preSign.signatureScheme ?? 'ed25519',
          },
        });
      }
    } catch (err) {
      recordError(err instanceof Error ? err.message : 'Failed to request Ika bridgeless route');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-bold text-[var(--sea-ink)]">{t.confirmTitle}</h3>
            <p className="mb-1 text-sm font-semibold text-[var(--sea-ink)]">{pendingConfirm.action}</p>
            <p className="mb-5 text-sm text-[var(--sea-ink-soft)]">{pendingConfirm.description}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingConfirm(null)}
                className="flex-1 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
              >
                {t.confirmCancel}
              </button>
              <button
                onClick={() => {
                  const cb = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  cb();
                }}
                className="flex-1 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {t.confirmExecute}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="island-kicker mb-2">Polet AI</p>
            <h2 className="mb-2 text-2xl font-bold text-[var(--sea-ink)]">{t.title}</h2>
            <p className="text-sm leading-6 text-[var(--sea-ink-soft)]">{t.subtitle}</p>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-1">
            {(['id', 'en'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setLocale(option)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${locale === option ? 'bg-[var(--lagoon-deep)] text-white' : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
                  }`}
              >
                <Languages className="h-4 w-4" />
                {COPY[option].language}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] font-bold uppercase tracking-wider text-amber-500">
          {t.demoTruth}
        </p>
      </section>

      {/* Checklist */}
      <section data-testid="demo-checklist" className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--sea-ink)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            {t.checklistTitle}
          </h3>
          <div data-testid="next-action" className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm">
            <span className="font-semibold text-[var(--sea-ink)]">{t.checklistNext}: </span>
            <span className="text-[var(--sea-ink-soft)]">{nextAction}</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checklist.map((step, index) => (
            <div
              key={step.label}
              className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 transition-all ${step.done
                ? 'border-green-500/20 bg-green-500/5 text-green-500'
                : index === checklist.findIndex((candidate) => !candidate.done)
                  ? 'border-[var(--lagoon)]/30 bg-[var(--lagoon)]/5 text-[var(--sea-ink)] ring-1 ring-[var(--lagoon)]/20'
                  : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)]'
                }`}
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${step.done ? 'bg-green-600 text-white' : 'bg-white text-[var(--sea-ink-soft)]'
                  }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="text-sm font-semibold leading-5">{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Wallet + Policy Row */}
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel icon={<Wallet className="h-5 w-5" />} title={t.walletTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.walletBody}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="Owner" value={owner ? short(owner) : t.missingOwner} tone={owner ? 'green' : undefined} />
            <InfoTile label={t.usdcAccount} value={custody?.usdcTokenAccount ? short(custody.usdcTokenAccount) : 'Not registered'} />
            <InfoTile label={t.solAccount} value={custody?.solTokenAccount ? short(custody.solTokenAccount) : 'Not registered'} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <InfoTile label={t.usdcBalance} value={`${custodyBalances?.usdcUi ?? '0'} USDC`} tone={custodyBalances?.funded ? 'green' : undefined} />
            <InfoTile label={t.totalSolCustody} value={`${custodyBalances?.nativeSolUi ?? '0'} SOL`} />
            <InfoTile label={t.solReserve} value={`${custodyBalances?.minNativeSolReserveUi ?? '0.05'} SOL`} />
            <InfoTile label={t.tradableSol} value={`${custodyBalances?.tradableNativeSolUi ?? '0'} SOL`} tone={Number(custodyBalances?.tradableNativeSolUi ?? 0) > 0 ? 'green' : undefined} />
          </div>
          {!custody && (
            <button
              onClick={setupCustodyAccounts}
              disabled={!owner || Boolean(busy)}
              className="mt-4 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === 'custody' ? 'Signing...' : t.setupCustody}
            </button>
          )}
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.depositToSmartWallet}</p>
            <p className="mt-1 text-sm text-[var(--sea-ink)]">{t.depositHelp}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <select
                value={depositDraft.asset}
                onChange={(event) => setDepositDraft((prev) => ({ ...prev, asset: event.target.value as 'USDC' | 'SOL' }))}
                className="rounded-lg px-3 py-2 text-sm"
              >
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
              <input
                value={depositDraft.amount}
                onChange={(event) => setDepositDraft((prev) => ({ ...prev, amount: event.target.value }))}
                type="number"
                min="0"
                step={depositDraft.asset === 'USDC' ? '0.000001' : '0.000000001'}
                className="rounded-lg px-3 py-2 text-sm"
                aria-label={t.depositAmount}
              />
              <button
                onClick={depositToCustody}
                disabled={!owner || !custody || !depositDraft.amount || Boolean(busy)}
                className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === 'deposit-custody' ? 'Signing...' : t.depositToSmartWallet}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              {t.depositDestination}: {depositDraft.asset === 'USDC'
                ? (custody?.usdcTokenAccount ? short(custody.usdcTokenAccount) : t.notPrepared)
                : (custodyBalances?.nativeCustodyAddress ? short(custodyBalances.nativeCustodyAddress) : t.notPrepared)}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.withdrawFromSmartWallet}</p>
            <p className="mt-1 text-sm text-[var(--sea-ink)]">{t.withdrawHelp}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <select
                value={withdrawDraft.asset}
                onChange={(event) => setWithdrawDraft((prev) => ({ ...prev, asset: event.target.value as 'USDC' | 'SOL' }))}
                className="rounded-lg px-3 py-2 text-sm"
              >
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
              <input
                value={withdrawDraft.amount}
                onChange={(event) => setWithdrawDraft((prev) => ({ ...prev, amount: event.target.value }))}
                type="number"
                min="0"
                step={withdrawDraft.asset === 'USDC' ? '0.000001' : '0.000000001'}
                className="rounded-lg px-3 py-2 text-sm"
                aria-label={t.withdrawAmount}
              />
              <button
                onClick={withdrawFromCustody}
                disabled={!owner || !custody || !withdrawDraft.amount || Boolean(busy)}
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] disabled:opacity-50"
              >
                {busy === 'withdraw-custody' ? 'Signing...' : t.withdrawFromSmartWallet}
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
              {t.withdrawDestination}: {withdrawDraft.asset === 'USDC' ? 'Owner USDC ATA' : (owner ? short(owner) : t.missingOwner)}
            </p>
          </div>

          {/* Agent Gas Wallet Funding */}
          {hasAgent && (
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.fundAgentGas}</p>
              <p className="mt-1 text-sm text-[var(--sea-ink)]">{t.fundAgentGasHelp}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InfoTile label={t.fundAgentGasDestination} value={short(agentAddress.trim())} small />
                <InfoTile
                  label="Agent SOL balance"
                  value={agentGasBalance ? `${agentGasBalance} SOL` : '—'}
                  tone={agentGasBalance && Number(agentGasBalance) < 0.05 ? 'green' : undefined}
                />
              </div>
              {agentGasBalance && Number(agentGasBalance) < 0.05 && (
                <p className="mt-2 text-xs font-semibold text-amber-600">{t.fundAgentGasLowBalance}</p>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={fundAgentGasDraft}
                  onChange={(event) => setFundAgentGasDraft(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg px-3 py-2 text-sm"
                  aria-label={t.fundAgentGasAmount}
                />
                <button
                  onClick={fundAgentGas}
                  disabled={!owner || !agentAddress.trim() || !fundAgentGasDraft || Boolean(busy)}
                  className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === 'fund-agent-gas' ? 'Signing...' : t.fundAgentGas}
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel icon={<Shield className="h-5 w-5" />} title={t.policyTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.policyBody}</p>
          {editingPolicy ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.maxPerRun} (USDC)</span>
                  <input
                    value={policyDraft.maxPerRunUsdc}
                    onChange={(event) => setPolicyDraft((prev) => ({ ...prev, maxPerRunUsdc: event.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.dailyCap} (USDC)</span>
                  <input
                    value={policyDraft.dailyCapUsdc}
                    onChange={(event) => setPolicyDraft((prev) => ({ ...prev, dailyCapUsdc: event.target.value }))}
                    type="number"
                    min="0"
                    step="1"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.encryptPrealphaStatus}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">{t.encryptPrealphaStatusHelp}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={savePolicy}
                  disabled={!canSavePolicy}
                  className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  title={!canSavePolicy && !busy ? t.custodyRequired : undefined}
                >
                  {busy === 'policy' ? 'Signing...' : t.savePolicy}
                </button>
                <button
                  onClick={saveLegacyDevPolicy}
                  disabled={!canSavePolicy}
                  className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] disabled:opacity-50"
                  title={t.confirmLegacyPolicy}
                >
                  {busy === 'policy-legacy' ? 'Signing...' : t.saveLegacyPolicy}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <PrivatePolicyTile
                  label={t.encryptedMax}
                  value={revealedPolicyValues['max-per-run']}
                  revealLabel={t.revealToOwner}
                  hideLabel={t.hidePolicyValue}
                  onReveal={() => revealPolicyValue('max-per-run')}
                  onHide={() => hidePolicyValue('max-per-run')}
                  disabled={!canRevealPolicy}
                  busy={busy === 'reveal-max-per-run'}
                />
                <PrivatePolicyTile
                  label={t.encryptedDaily}
                  value={revealedPolicyValues['daily-cap']}
                  revealLabel={t.revealToOwner}
                  hideLabel={t.hidePolicyValue}
                  onReveal={() => revealPolicyValue('daily-cap')}
                  onHide={() => hidePolicyValue('daily-cap')}
                  disabled={!canRevealPolicy}
                  busy={busy === 'reveal-daily-cap'}
                />
                <PrivatePolicyTile
                  label={t.dailySpentCiphertext}
                  value={revealedPolicyValues['daily-spent']}
                  revealLabel={t.revealToOwner}
                  hideLabel={t.hidePolicyValue}
                  onReveal={() => revealPolicyValue('daily-spent')}
                  onHide={() => hidePolicyValue('daily-spent')}
                  disabled={!canRevealPolicy}
                  busy={busy === 'reveal-daily-spent'}
                />
              </div>
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs font-semibold text-amber-600">
                {t.policyRevealBoundary}
              </p>
              {officialEncryptPolicyRefs && (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.encryptTechnicalRefs}</p>
                    <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--sea-ink-soft)]">{t.encryptRefsFromWallet}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoRow label={t.maxPerRunCiphertext} value={short(officialEncryptPolicyRefs.maxPerRun)} />
                    <InfoRow label={t.dailyCapCiphertext} value={short(officialEncryptPolicyRefs.dailyCap)} />
                    <InfoRow label={t.dailySpentCiphertext} value={short(officialEncryptPolicyRefs.dailySpent)} />
                    <InfoRow label={t.encryptConfig} value={short(officialEncryptPolicyRefs.config)} />
                    <InfoRow label={t.encryptNetworkKey} value={short(officialEncryptPolicyRefs.networkEncryptionKey)} />
                    <InfoRow label={t.encryptEventAuthority} value={short(officialEncryptPolicyRefs.eventAuthority)} />
                    {officialEncryptPolicyRefs.graph && <InfoRow label={t.encryptGraph} value={officialEncryptPolicyRefs.graph} />}
                    {officialEncryptPolicyRefs.grpcEndpoint && <InfoRow label={t.encryptGrpcEndpoint} value={officialEncryptPolicyRefs.grpcEndpoint} />}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--sea-ink)]">{t.policySaved}</p>
                  <p className="text-xs text-[var(--sea-ink-soft)]">{t.redacted}</p>
                </div>
                <button
                  onClick={() => setEditingPolicy(true)}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--sea-ink)]"
                >
                  {t.editPolicy}
                </button>
              </div>
            </div>
          )}
        </Panel>
      </section>

      {/* Shared Ika Approval */}
      <section>
        <Panel icon={<UserPlus className="h-5 w-5" />} title={t.sharedTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.sharedBody}</p>
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.sharedThreshold}</span>
                <input
                  value={sharedDraft.threshold}
                  onChange={(event) => setSharedDraft((prev) => ({ ...prev, threshold: event.target.value }))}
                  type="number"
                  min="1"
                  step="1"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.sharedApprovers}</span>
                <textarea
                  value={sharedDraft.approvers}
                  onChange={(event) => setSharedDraft((prev) => ({ ...prev, approvers: event.target.value }))}
                  placeholder={t.sharedApproverPlaceholder}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 font-mono text-xs"
                />
              </label>
              <button
                onClick={configureSharedApproval}
                disabled={!owner || Boolean(busy)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {busy === 'shared-config' ? 'Signing...' : t.configureShared}
              </button>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.sharedTitle}</p>
                <p className="mt-1 text-sm font-black text-[var(--sea-ink)]">
                  {sharedIkaApproval
                    ? `${sharedIkaApproval.threshold}/${sharedIkaApproval.approvers.length} ${t.sharedReady}`
                    : t.sharedNotConfigured}
                </p>
              </div>
              {sharedIkaApproval && (
                <div className="grid gap-2">
                  {sharedIkaApproval.approvers.map((approver) => (
                    <div key={approver} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                      <span className="break-all font-mono text-xs font-bold text-[var(--sea-ink)]">{approver}</span>
                      <button
                        onClick={() => revokeSharedApproval(approver)}
                        disabled={Boolean(busy)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs font-bold text-red-500 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {busy === `shared-revoke-${approver}` ? '...' : t.revokeShared}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.sharedProofs}</span>
                <textarea
                  value={sharedApprovalProofs}
                  onChange={(event) => setSharedApprovalProofs(event.target.value)}
                  placeholder='[{"approver":"...","signature":"...","encoding":"base64"}]'
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 font-mono text-xs"
                />
                <span className="mt-1 block text-xs leading-5 text-[var(--sea-ink-soft)]">{t.sharedProofHelp}</span>
              </label>
            </div>
          </div>
        </Panel>
      </section>

      {/* Recovery Authority */}
      <section>
        <Panel icon={<KeyRound className="h-5 w-5" />} title={t.recoveryTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.recoveryBody}</p>
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.recoveryRecoveryAuthority}</span>
                <input
                  value={recoveryDraft.recoveryAuthority}
                  onChange={(event) => setRecoveryDraft((prev) => ({ ...prev, recoveryAuthority: event.target.value }))}
                  placeholder={t.recoveryPlaceholder}
                  className="w-full rounded-lg px-3 py-2 font-mono text-sm"
                />
              </label>
              <button
                onClick={setRecoveryAuth}
                disabled={!owner || !recoveryDraft.recoveryAuthority.trim() || Boolean(busy)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {busy === 'recovery-authority' ? '...' : t.recoverySetAuthority}
              </button>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.recoveryTitle}</p>
                <p className="mt-1 text-sm font-black text-[var(--sea-ink)]">
                  {recoveryAuthority ? t.recoveryReady : t.recoveryNotConfigured}
                </p>
              </div>
              {recoveryAuthority && (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                  <p className="break-all font-mono text-xs font-bold text-[var(--sea-ink)]">{recoveryAuthority}</p>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </section>

      {/* Recovery Access */}
      <section>
        <Panel icon={<Shield className="h-5 w-5" />} title={t.recoveryRecoveryAccess}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.recoveryCompromisedSessions}</span>
                <textarea
                  value={recoveryDraft.compromisedSessions}
                  onChange={(event) => setRecoveryDraft((prev) => ({ ...prev, compromisedSessions: event.target.value }))}
                  placeholder={t.recoverySessionsPlaceholder}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 font-mono text-xs"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.recoverySharedIkaThreshold}</span>
                <input
                  value={recoveryDraft.sharedIkaThreshold}
                  onChange={(event) => setRecoveryDraft((prev) => ({ ...prev, sharedIkaThreshold: event.target.value }))}
                  type="number"
                  min="1"
                  step="1"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.recoverySharedIkaApprovers}</span>
                <textarea
                  value={recoveryDraft.sharedIkaApprovers}
                  onChange={(event) => setRecoveryDraft((prev) => ({ ...prev, sharedIkaApprovers: event.target.value }))}
                  placeholder={t.recoveryApproversPlaceholder}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 font-mono text-xs"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.recoveryPendingDwalletController}</span>
                <input
                  value={recoveryDraft.pendingDwalletController}
                  onChange={(event) => setRecoveryDraft((prev) => ({ ...prev, pendingDwalletController: event.target.value }))}
                  placeholder={t.recoveryDwalletPlaceholder}
                  className="w-full rounded-lg px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-600">
              {t.recoveryPrivacy}
            </div>
            <button
              onClick={runRecoveryAccess}
              disabled={!owner || !recoveryAuthority || !recoveryDraft.compromisedSessions.trim() || Boolean(busy)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              {busy === 'recovery-access' ? '...' : t.recoveryRecoveryAccess}
            </button>
          </div>
        </Panel>
      </section>

      {/* Passkey Co-approval */}
      <section>
        <Panel icon={<Fingerprint className="h-5 w-5" />} title={t.passkeyTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.passkeyBody}</p>
          {passkeyUnavailable ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs font-medium text-amber-600">
              {t.passkeyUnavailable}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.passkeyCredentialId}</span>
                  <input
                    value={passkeyDraft.credentialId}
                    onChange={(event) => setPasskeyDraft((prev) => ({ ...prev, credentialId: event.target.value }))}
                    placeholder={t.passkeyCredentialIdPlaceholder}
                    className="w-full rounded-lg px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.passkeyRpId}</span>
                  <input
                    value={passkeyDraft.rpId}
                    onChange={(event) => setPasskeyDraft((prev) => ({ ...prev, rpId: event.target.value }))}
                    placeholder={t.passkeyRpIdPlaceholder}
                    className="w-full rounded-lg px-3 py-2 font-mono text-sm"
                  />
                </label>
                <button
                  onClick={requestPasskeyChallenge}
                  disabled={!owner || !passkeyDraft.credentialId.trim() || !passkeyDraft.rpId.trim() || Boolean(busy)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Fingerprint className="h-4 w-4" />
                  {busy === 'passkey-challenge' ? '...' : t.passkeyRequestChallenge}
                </button>
              </div>
              <div className="grid gap-3">
                {passkeyChallenge && !passkeyVerified && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.passkeyAssertion}</span>
                    <textarea
                      value={passkeyDraft.assertion}
                      onChange={(event) => setPasskeyDraft((prev) => ({ ...prev, assertion: event.target.value }))}
                      placeholder={t.passkeyAssertionPlaceholder}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 font-mono text-xs"
                    />
                  </label>
                )}
                {passkeyChallenge && !passkeyVerified && (
                  <button
                    onClick={verifyPasskeyProof}
                    disabled={!passkeyDraft.assertion.trim() || Boolean(busy)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busy === 'passkey-verify' ? '...' : t.passkeyVerify}
                  </button>
                )}
                {passkeyVerified && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                    <p className="text-xs font-semibold uppercase text-green-500">{t.passkeyVerified}</p>
                  </div>
                )}
                {passkeyChallenge && (
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                    <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">{t.passkeyBoundary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </section>

      {/* Strategy + Activity Row */}
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Panel icon={<Bot className="h-5 w-5" />} title={t.strategyTitle}>
          <div className="grid gap-3">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.multichainBoundary}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InfoTile label="Source" value={`${strategy.sourceChain.toUpperCase()} ${strategy.inputMint}`} small />
                <InfoTile label="Target" value={`${strategy.targetChain.toUpperCase()} ${strategy.outputMint}`} small />
                <InfoTile label={t.executionRail} value={strategy.executionRail} small />
              </div>
              <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">{t.settlementBoundary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.jupiterRailTitle}</p>
                <p className="mt-1 text-sm font-bold text-[var(--sea-ink)]">Solana USDC {'->'} Solana SOL</p>
                <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">Jupiter route/build preview, guarded by Polet policy.</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.ikaRailTitle}</p>
                <p className="mt-1 text-sm font-bold text-[var(--sea-ink)]">{t.suiPrimary}</p>
                <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{t.ethereumFuture}</p>
              </div>
            </div>
            <InfoRow label={t.fromTo} value={`${strategy.inputMint} -> ${strategy.outputMint}`} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.amount} (USDC)</span>
              <input
                value={strategy.amountUsdc}
                onChange={(event) => setStrategy((prev) => ({ ...prev, amountUsdc: event.target.value }))}
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.authorizedSessionKey}</span>
              <select
                value={authorizedSessionOptions.some((session) => session.key === agentAddress.trim()) ? agentAddress.trim() : ''}
                onChange={(event) => setAgentAddress(event.target.value)}
                disabled={authorizedSessionOptions.length === 0}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono disabled:opacity-60"
              >
                <option value="">{authorizedSessionOptions.length === 0 ? t.noAuthorizedSessions : t.selectAuthorizedSession}</option>
                {authorizedSessionOptions.map((session) => (
                  <option key={session.key} value={session.key}>{session.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.agentAddress}</span>
              <input
                value={agentAddress}
                onChange={(event) => setAgentAddress(event.target.value)}
                placeholder={t.agentPlaceholder}
                list="authorized-session-keys"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono"
              />
              <datalist id="authorized-session-keys">
                {authorizedSessionOptions.map((session) => (
                  <option key={session.key} value={session.key}>{session.label}</option>
                ))}
              </datalist>
            </label>
            {authorizedSessionOptions.length > 0 && (
              <div className="grid gap-2">
                {authorizedSessionOptions.map((session) => (
                  <div key={session.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setAgentAddress(session.key)}
                      className="font-mono text-[10px] font-semibold text-[var(--lagoon-deep)] hover:underline"
                    >
                      {session.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeAgentSession(session.key)}
                      disabled={Boolean(busy)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-[10px] font-bold text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {busy === `session-revoke-${session.key}` ? '...' : t.revokeSession}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <span className="block text-xs leading-5 text-[var(--sea-ink-soft)]">{t.agentHelp}</span>

            {/* Route Risk Guardrails */}
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.routeRiskTitle ?? 'Route risk guardrails'}</p>
              <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{t.routeRiskBody ?? 'Public Ika route-risk settings. This is not a private policy.'}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sea-ink-soft)]">{t.routeRiskSlippage ?? 'Slippage (bps)'}</span>
                  <input
                    data-testid="route-risk-slippage"
                    type="number"
                    value={routeRiskDraft.slippageBps}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRouteRiskDraft((d) => ({ ...d, slippageBps: value }));
                    }}
                    onInput={(e) => {
                      const value = Number(e.currentTarget.value);
                      setRouteRiskDraft((d) => ({ ...d, slippageBps: value }));
                    }}
                    min={0}
                    max={500}
                    className="w-full rounded-lg px-2 py-1 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sea-ink-soft)]">{t.routeRiskMaxPriceImpact ?? 'Max price impact (bps)'}</span>
                  <input
                    data-testid="route-risk-price-impact"
                    type="number"
                    value={routeRiskDraft.maxPriceImpactBps}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setRouteRiskDraft((d) => ({ ...d, maxPriceImpactBps: value }));
                    }}
                    onInput={(e) => {
                      const value = Number(e.currentTarget.value);
                      setRouteRiskDraft((d) => ({ ...d, maxPriceImpactBps: value }));
                    }}
                    min={0}
                    max={1000}
                    className="w-full rounded-lg px-2 py-1 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--sea-ink-soft)]">{t.routeRiskMinLiquidity ?? 'Min liquidity score'}</span>
                  <select
                    value={routeRiskDraft.minLiquidityScore}
                    onChange={(e) => setRouteRiskDraft((d) => ({ ...d, minLiquidityScore: e.target.value as 'low' | 'medium' | 'high' }))}
                    className="w-full rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="low">{t.liquidityLow ?? 'Low'}</option>
                    <option value="medium">{t.liquidityMedium ?? 'Medium'}</option>
                    <option value="high">{t.liquidityHigh ?? 'High'}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeRiskDraft.requireVerifiedRoute}
                    onChange={(e) => setRouteRiskDraft((d) => ({ ...d, requireVerifiedRoute: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-[var(--sea-ink-soft)]">{t.routeRiskVerifiedRoute ?? 'Require verified route'}</span>
                </label>
              </div>
            </div>

            <InfoRow label={t.cadence} value={strategy.cadence} />
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.encryptExecutionRefs}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--sea-ink-soft)]">{t.encryptExecutionRefsHelp}</p>
              <div className="mt-3 grid gap-2">
                <InfoRow label={t.encryptSourceAmountCiphertext} value={officialEncryptExecutionDraft ? short(officialEncryptExecutionDraft.sourceAmountCiphertext) : t.notPrepared} />
                <InfoRow label={t.encryptAllowedOutput} value={officialEncryptExecutionDraft ? short(officialEncryptExecutionDraft.allowedOutputCiphertext) : t.notPrepared} />
                <InfoRow label={t.encryptDailyOutput} value={officialEncryptExecutionDraft ? short(officialEncryptExecutionDraft.dailySpentOutputCiphertext) : t.notPrepared} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => runAgent('25')}
              disabled={!canRunBlocked}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {busy === 'run-25' ? '...' : t.runBlocked}
            </button>
            <button
              onClick={() => runAgent(strategy.amountUsdc || '5')}
              disabled={!canRunAllowed}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--lagoon-deep)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              title={!hasBlockedRun ? t.blockedFirst : undefined}
            >
              <Play className="h-3.5 w-3.5" />
              {busy === `run-${strategy.amountUsdc || '5'}` ? '...' : t.runAllowed}
            </button>
            <button
              onClick={() => requestIkaRoute('25')}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {busy === 'ika-sui-25' ? '...' : t.runIkaBlocked}
            </button>
            <button
              onClick={() => requestIkaRoute('5')}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Landmark className="h-3.5 w-3.5" />
              {busy === 'ika-sui-5' ? '...' : t.runIka}
            </button>
            <button
              onClick={() => requestIkaRoute('25', { chain: 'ethereum', asset: 'ETH' })}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {busy === 'ika-ethereum-25' ? '...' : t.runIkaEthBlocked}
            </button>
            <button
              onClick={() => requestIkaRoute('5', { chain: 'ethereum', asset: 'ETH' })}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Landmark className="h-3.5 w-3.5" />
              {busy === 'ika-ethereum-5' ? '...' : t.runIkaEth}
            </button>
            <button
              onClick={() => requestIkaRoute('5', { chain: 'base', asset: 'ETH' })}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-amber-600 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {busy === 'ika-unsupported' ? '...' : t.runIkaUnsupported}
            </button>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-[var(--sea-ink-soft)] font-bold">{t.runNow}: Jupiter and Ika each show block/allow policy behavior.</p>
          {hasBlockedIkaRun && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-500">{t.ikaRouteBlocked}: no dWallet approval data.</p>
          )}
        </Panel>

        {/* Ika Destination Broadcast Demo */}
        {lastIkaBroadcastable && (
          <Panel icon={<Activity className="h-5 w-5" />} title="Ika Destination Broadcast" testId="ika-broadcast-panel">
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">Demo Path</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <InfoRow label="Chain" value={lastIkaBroadcastable.ikaRequest.target.chain.toUpperCase()} />
                  <InfoRow label="Network" value="devnet" />
                  <InfoRow label="Action" value="Memo proof" />
                  <InfoRow label="Asset" value="None moved" />
                </div>
                <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] font-semibold text-amber-500">
                  Disabled by default. Requires POLET_DESTINATION_BROADCAST_DEMO=enabled on proxy.
                  No user asset is moved. Devnet SOL fee payer needed.
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!owner) return;
                  setBusy('broadcast-demo');
                  setError(null);
                  try {
                    const result = await api.broadcastIkaDestination({
                      ikaRequest: lastIkaBroadcastable.ikaRequest,
                      producedSignature: lastIkaBroadcastable.producedSignature,
                    });
                    if (result.ok) {
                      addActivity({
                        status: 'approved',
                        message: `Broadcast ${result.status}: ${result.receipt?.transactionId.slice(0, 8) ?? 'n/a'}...`,
                        route: 'Solana devnet memo proof',
                      });
                    } else {
                      addActivity({
                        status: result.status === 'broadcast-disabled' ? 'blocked' : 'error',
                        message: `${result.code ?? result.status}: ${result.reason ?? 'broadcast failed'}`,
                        route: 'Solana devnet memo proof',
                      });
                    }
                    setLastIkaBroadcastable(null);
                  } catch (err) {
                    recordError(err instanceof Error ? err.message : 'Destination broadcast failed');
                  } finally {
                    setBusy(null);
                  }
                }}
                disabled={Boolean(busy)}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {busy === 'broadcast-demo' ? 'Broadcasting...' : 'Request Devnet Memo Broadcast'}
              </button>
            </div>
          </Panel>
        )}

        {/* Activity Log */}
        <Panel icon={<Activity className="h-5 w-5" />} title={t.activityTitle} testId="activity-log-panel">
          <p className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs font-medium text-[var(--sea-ink-soft)]">
            {t.privacyNote}
          </p>
          {activity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--sea-ink-soft)]">
              {t.emptyLog}
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((entry) => (
                <ActivityCard key={entry.id} entry={entry} labels={t} />
              ))}
            </div>
          )}
          <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs font-bold leading-5 text-amber-500">
            {t.preAlpha}
          </p>
        </Panel>
      </section>
    </div>
  );
}

function normalizeSharedIkaApproval(value: any): { threshold: number; approvers: string[] } | null {
  if (!value?.enabled || !Number.isInteger(value.threshold)) return null;
  const approvers = (value.approvers ?? [])
    .filter((approver: any) => approver?.authorized !== false)
    .map((approver: any) => (typeof approver === 'string' ? approver : approver.key))
    .filter((approver: unknown): approver is string => typeof approver === 'string' && approver.length > 0);
  return approvers.length > 0 ? { threshold: value.threshold, approvers } : null;
}

function buildSharedAccess(
  config: { threshold: number; approvers: string[] } | null,
  proofsText: string,
  invalidMessage: string
) {
  if (!config) return undefined;
  const trimmedProofs = proofsText.trim();
  if (!trimmedProofs) {
    return {
      policy: {
        mode: 'ika-approval-quorum' as const,
        threshold: config.threshold,
        approvers: config.approvers,
        requireFor: 'all-ika' as const,
      },
    };
  }

  const parsed = JSON.parse(trimmedProofs);
  if (!Array.isArray(parsed)) {
    throw new Error(invalidMessage);
  }

  return {
    policy: {
      mode: 'ika-approval-quorum' as const,
      threshold: config.threshold,
      approvers: config.approvers,
      requireFor: 'all-ika' as const,
    },
    approvals: parsed.map((proof: any) => ({
      approver: String(proof.approver),
      signature: String(proof.signature),
      encoding: proof.encoding === 'base64' ? 'base64' as const : undefined,
    })),
  };
}

function sharedApproversFromResult(result: RunMultichainIntentResult) {
  const signers = result.ikaRequest?.poletApprovalTransaction?.signers ?? [];
  const sessionKey = result.ikaRequest?.sessionContext.sessionKey;
  return signers.filter((signer) => signer !== sessionKey);
}
