import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
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
  setupDemoCustody,
  configureSharedIkaApprovers,
  getWalletData,
  revokeSharedIkaApprover,
  runMultichainIntent,
  setRecoveryAuthority,
  recoverAccess,
  requestPasskeyChallenge,
  verifyPasskeyAssertion,
  broadcastIkaDestination,
  type RunConfidentialDcaResult,
  type RunMultichainIntentResult,
  type SharedIkaApproverConfigInput,
  type SetConfidentialPolicyInput,
  type SetupDemoCustodyInput,
  type WalletTransactionResult,
} from '../lib/api';
import { COPY, type Locale } from '../lib/i18n';
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
  setConfidentialPolicy: (input: SetConfidentialPolicyInput) => Promise<WalletTransactionResult>;
  setupDemoCustody: (input: SetupDemoCustodyInput) => Promise<WalletTransactionResult>;
  configureSharedIkaApprovers: (input: SharedIkaApproverConfigInput) => Promise<WalletTransactionResult & { threshold: number; approvers: string[] }>;
  revokeSharedIkaApprover: (input: { owner: string; approver: string }) => Promise<WalletTransactionResult & { approver: string }>;
  setRecoveryAuthority: (input: { owner: string; recoveryAuthority: string }) => Promise<WalletTransactionResult & { recoveryAuthority: string; activity: { type: string; status: string; privacy: string } }>;
  recoverAccess: (input: { owner: string; authority: string; compromisedSessions: string[]; sharedIkaThreshold: number; sharedIkaApprovers: string[]; pendingDwalletController: string }) => Promise<WalletTransactionResult & { authority: string; compromisedSessions: string[]; sharedIkaThreshold: number; sharedIkaApprovers: string[]; pendingDwalletController: string; activity: { type: string; status: string; states: string[]; privacy: string; boundary: string } }>;
  requestPasskeyChallenge: (input: { owner: string; sessionKey: string; sharedApprovalChallenge: string; credentialId: string; rpId: string; expiresAtUnix: number }) => Promise<{ challenge: number[]; publicKeyCredentialRequestOptions: { challenge: number[]; rpId: string; allowCredentials: Array<{ type: string; id: string }>; userVerification: string }; boundary: string }>;
  verifyPasskeyAssertion: (input: { expectedChallenge: number[]; expectedOrigin: string; expectedRpId: string; expectedCredentialId: string; credentialPublicKeyJwk: Record<string, unknown>; assertion: { authenticatorData: string; clientDataJSON: string; signature: string; userHandle?: string }; requireUserVerification: boolean }) => Promise<{ valid: boolean; approverPublicKey: string; challengeUsed: string; boundary: string }>;
  broadcastIkaDestination: typeof import('../lib/api').broadcastIkaDestination;
  runConfidentialDca: typeof runConfidentialDca;
  runMultichainIntent: typeof runMultichainIntent;
  getWalletData: typeof getWalletData;
}

interface DemoTabContentProps {
  owner: string | null;
  agentAddresses?: string[];
  signAndConfirmTransaction: (transactionBase64: string) => Promise<string>;
  api?: DemoApi;
}

const DEFAULT_API: DemoApi = {
  setConfidentialPolicy,
  setupDemoCustody,
  configureSharedIkaApprovers,
  revokeSharedIkaApprover,
  setRecoveryAuthority,
  recoverAccess,
  requestPasskeyChallenge,
  verifyPasskeyAssertion,
  broadcastIkaDestination,
  runConfidentialDca,
  runMultichainIntent,
  getWalletData,
};

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

export function DemoTab({ agentAddresses = [] }: { agentAddresses?: string[] }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const signAndConfirmTransaction = async (transactionBase64: string) => {
    const { transaction, latestBlockhash } = await prepareFreshTransaction(transactionBase64, connection);
    const signature = await sendTransaction(transaction, connection);
    await confirmFreshTransaction(connection, signature, latestBlockhash);
    return signature;
  };

  return (
    <DemoTabContent
      owner={publicKey?.toBase58() ?? null}
      agentAddresses={agentAddresses}
      signAndConfirmTransaction={signAndConfirmTransaction}
    />
  );
}

export function DemoTabContent({
  owner,
  agentAddresses = [],
  signAndConfirmTransaction,
  api = DEFAULT_API,
}: DemoTabContentProps) {
  const [locale, setLocale] = useState<Locale>('id');
  const [policyDraft, setPolicyDraft] = useState({ maxPerRunUsdc: '10', dailyCapUsdc: '20' });
  const [policySaved, setPolicySaved] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(true);
  const [custody, setCustody] = useState<{ usdcTokenAccount: string; solTokenAccount: string } | null>(null);
  const [sharedIkaApproval, setSharedIkaApproval] = useState<{ threshold: number; approvers: string[] } | null>(null);
  const [sharedDraft, setSharedDraft] = useState({
    threshold: Math.max(1, Math.min(2, agentAddresses.length || 1)).toString(),
    approvers: agentAddresses.slice(0, 2).join('\n'),
  });
  const [sharedApprovalProofs, setSharedApprovalProofs] = useState('');
  const [agentAddress, setAgentAddress] = useState(agentAddresses[0] ?? '');
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

  const t = COPY[locale];
  const witness = useMemo(() => Array.from({ length: 32 }, (_, index) => index + 1), []);
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
  const canSavePolicy = Boolean(owner && custody && hasAgent && !busy);
  const canRunBlocked = Boolean(owner && custody && policySaved && hasAgent && strategyReady && !busy);
  const canRunAllowed = Boolean(canRunBlocked && hasBlockedRun);
  const canRequestIka = Boolean(owner && custody && policySaved && hasAgent && !busy);

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
    setActivity((prev) => [
      { ...entry, id: `${entry.status}-${Date.now()}`, timestamp: Date.now() },
      ...prev.slice(0, 7),
    ]);
  };

  const recordError = (message: string) => {
    setError(message);
    addActivity({ status: 'error', message, route: 'Proxy / contract setup' });
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
          if (data.confidentialPolicy?.enabled) {
            setPolicySaved(true);
            setEditingPolicy(false);
          }
          const configuredShared = normalizeSharedIkaApproval(data.sharedIkaApprovals);
          if (configuredShared) {
            setSharedIkaApproval(configuredShared);
            setSharedDraft({
              threshold: configuredShared.threshold.toString(),
              approvers: configuredShared.approvers.join('\n'),
            });
          }
          if (data.recoveryAuthority) {
            setRecoveryAuthorityState(data.recoveryAuthority);
          }
        }
      }).catch(console.error);
    }
  }, [owner]);

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
          const result = await api.setupDemoCustody({
            owner,
            usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          setCustody({
            usdcTokenAccount: result.usdcTokenAccount ?? 'registered',
            solTokenAccount: result.solTokenAccount ?? 'registered',
          });
          addActivity({
            status: 'setup',
            message: `${t.custodyReady}: ${signature.slice(0, 8)}...`,
            route: 'Contract register_demo_custody',
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to set up demo custody');
        } finally {
          setBusy(null);
        }
      },
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
          const result = await api.setConfidentialPolicy({
            owner,
            maxPerRunUsdc: policyDraft.maxPerRunUsdc,
            dailyCapUsdc: policyDraft.dailyCapUsdc,
            encryptionWitness: witness,
          });
          const signature = await signAndConfirmTransaction(result.transaction);
          setPolicySaved(true);
          setEditingPolicy(false);
          addActivity({
            status: 'setup',
            message: `${t.policySaved}: ${signature.slice(0, 8)}...`,
            route: 'Contract set_confidential_numeric_policy',
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to save confidential policy');
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
          setSharedIkaApproval((prev) => {
            if (!prev) return null;
            const approvers = prev.approvers.filter((item) => item !== approver);
            return approvers.length > 0
              ? { threshold: Math.min(prev.threshold, approvers.length), approvers }
              : null;
          });
          await refreshSharedIkaApproval();
          addActivity({
            status: 'setup',
            message: `${t.revokeShared}: ${short(result.approver)} ${signature.slice(0, 8)}...`,
            route: 'Contract revoke_shared_ika_approver',
          });
        } catch (err) {
          recordError(err instanceof Error ? err.message : 'Failed to revoke shared Ika approver');
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
      const result: RunConfidentialDcaResult = await api.runConfidentialDca({
        owner,
        sessionKey: agentAddress.trim(),
        amountUsdc,
        encryptionWitness: witness,
        slippageBps: 100,
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
        encryptionWitness: witness,
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
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                  locale === option ? 'bg-[var(--lagoon-deep)] text-white' : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
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
              className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 transition-all ${
                step.done
                  ? 'border-green-500/20 bg-green-500/5 text-green-500'
                  : index === checklist.findIndex((candidate) => !candidate.done)
                    ? 'border-[var(--lagoon)]/30 bg-[var(--lagoon)]/5 text-[var(--sea-ink)] ring-1 ring-[var(--lagoon)]/20'
                    : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)]'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  step.done ? 'bg-green-600 text-white' : 'bg-white text-[var(--sea-ink-soft)]'
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
            <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.deposit}</p>
            <p className="mt-1 text-sm text-[var(--sea-ink)]">Deposit demo USDC into the PDA-owned USDC account after custody setup confirms.</p>
          </div>
        </Panel>

        <Panel icon={<Shield className="h-5 w-5" />} title={t.policyTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.policyBody}</p>
          {editingPolicy ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
              <button
                onClick={savePolicy}
                disabled={!canSavePolicy}
                className="self-end rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                title={!canSavePolicy && !busy ? t.custodyRequired : undefined}
              >
                {busy === 'policy' ? 'Signing...' : t.savePolicy}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <PrivatePolicyTile label={t.encryptedMax} />
                <PrivatePolicyTile label={t.encryptedDaily} />
              </div>
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
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.agentAddress}</span>
              <input
                value={agentAddress}
                onChange={(event) => setAgentAddress(event.target.value)}
                placeholder={t.agentPlaceholder}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono"
              />
              <span className="mt-1 block text-xs leading-5 text-[var(--sea-ink-soft)]">{t.agentHelp}</span>
            </label>

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
