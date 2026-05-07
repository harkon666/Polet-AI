import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  ClipboardCheck,
  EyeOff,
  Landmark,
  Languages,
  Play,
  Shield,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  runConfidentialDca,
  setConfidentialPolicy,
  setupDemoCustody,
  configureSharedIkaApprovers,
  getWalletData,
  revokeSharedIkaApprover,
  runMultichainIntent,
  type IkaRequestPreview,
  type RunConfidentialDcaResult,
  type RunMultichainIntentResult,
  type SharedIkaApproverConfigInput,
  type JupiterPlanPreview,
  type SetConfidentialPolicyInput,
  type SetupDemoCustodyInput,
  type WalletTransactionResult,
} from '../lib/api';

type Locale = 'id' | 'en';
type RunStatus = 'approved' | 'blocked' | 'needs-approval' | 'setup' | 'error';

interface ConfidentialPolicyDraft {
  maxPerRunUsdc: string;
  dailyCapUsdc: string;
}

interface DcaStrategy {
  sourceChain: 'Solana';
  inputMint: 'USDC';
  targetChain: 'Solana';
  outputMint: 'SOL';
  executionRail: 'Jupiter';
  amountUsdc: string;
  cadence: string;
}

interface ActivityEntry {
  id: string;
  timestamp: number;
  status: 'setup' | 'approved' | 'blocked' | 'needs-approval' | 'error';
  message: string;
  route?: string;
  amountUsdc?: string;
  jupiterPlan?: JupiterPlanPreview;
  ikaRequest?: IkaRequestPreview;
  approval?: RunMultichainIntentResult['approval'];
  sharedApprovers?: string[];
  transactionSigners?: string[];
  smartWalletAuthority?: string;
}

interface SharedIkaApprovalConfig {
  threshold: number;
  approvers: string[];
}

interface DemoApi {
  setConfidentialPolicy: (input: SetConfidentialPolicyInput) => Promise<WalletTransactionResult>;
  setupDemoCustody: (input: SetupDemoCustodyInput) => Promise<WalletTransactionResult>;
  configureSharedIkaApprovers: (input: SharedIkaApproverConfigInput) => Promise<WalletTransactionResult & SharedIkaApprovalConfig>;
  revokeSharedIkaApprover: (input: { owner: string; approver: string }) => Promise<WalletTransactionResult & { approver: string }>;
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
  runConfidentialDca,
  runMultichainIntent,
  getWalletData,
};

const COPY = {
  id: {
    language: 'Bahasa',
    title: 'Control Layer Rahasia untuk AI Agents',
    subtitle:
      'Polet adalah control layer Solana rahasia untuk AI agents: owner menandatangani setup, proxy membaca state on-chain, lalu setiap rail eksekusi agent melewati policy gate.',
    walletTitle: 'Smart wallet',
    walletBody: 'Siapkan custody PDA untuk demo DCA USDC ke SOL. Tidak ada hasil palsu jika proxy atau contract belum siap.',
    initialized: 'Owner wallet aktif',
    setupCustody: 'Setup custody PDA',
    custodyReady: 'Custody siap',
    deposit: 'Instruksi deposit',
    usdcAccount: 'Akun USDC',
    solAccount: 'Akun SOL',
    policyTitle: 'Policy rahasia',
    policyBody: 'Nilai dikirim ke proxy untuk dienkripsi/masked ke transaksi contract, lalu UI normal menyembunyikan nilai setelah transaksi dikonfirmasi.',
    maxPerRun: 'Maks per run',
    dailyCap: 'Batas harian',
    savePolicy: 'Sign & simpan policy',
    editPolicy: 'Ubah policy',
    policySaved: 'Policy on-chain tersimpan',
    redacted: 'Nilai privat disembunyikan',
    encryptedMax: 'Maks per run terenkripsi',
    encryptedDaily: 'Batas harian terenkripsi',
    strategyTitle: 'Execution rails agent',
    jupiterRailTitle: 'Jupiter strategy rail',
    ikaRailTitle: 'Ika dWallet rail',
    suiPrimary: 'Sui/SUI primary destination',
    ethereumFuture: 'Ethereum/ETH optional future',
    multichainBoundary: 'Intent multichain',
    executionRail: 'Execution rail',
    settlementBoundary: 'Settlement Ika belum dijalankan di slice ini',
    fromTo: 'Pair',
    amount: 'Jumlah normal',
    cadence: 'Jadwal',
    agentAddress: 'Alamat AI agent',
    agentPlaceholder: 'Masukkan wallet address agent yang sudah di-authorize',
    agentHelp: 'Ini public key wallet agent. Polet menyimpannya sebagai signer terotorisasi untuk memakai smart wallet sesuai policy, bukan private key baru.',
    runNow: 'Run Agent Now',
    runAllowed: 'Run 5 USDC via proxy',
    runBlocked: 'Try 25 USDC via proxy',
    runIka: 'Approve 5 USDC-equivalent Ika',
    runIkaBlocked: 'Try 25 Ika request',
    runIkaUnsupported: 'Try unsupported Ika route',
    sharedTitle: 'Shared Ika approval',
    sharedBody: 'Atur M-of-N co-approver Solana signer untuk Ika. Polet contract tetap enforcement boundary; passkey atau proof UI hanya membantu UX.',
    sharedThreshold: 'Threshold',
    sharedApprovers: 'Co-approver public keys',
    sharedApproverPlaceholder: 'Satu public key per baris',
    configureShared: 'Sign & configure quorum',
    revokeShared: 'Revoke',
    sharedReady: 'Quorum ready',
    sharedNeedsApproval: 'Butuh co-approval',
    sharedNotConfigured: 'Belum dikonfigurasi',
    sharedProofs: 'Proof co-approval JSON',
    sharedProofHelp: 'Opsional: array JSON signature dari co-approver untuk demo ready quorum. Nilai policy privat tidak dibutuhkan.',
    countedApprovers: 'Co-approver counted',
    missingApprovals: 'Approval kurang',
    activityTitle: 'Activity log',
    emptyLog: 'Belum ada aktivitas agen.',
    approved: 'DISETUJUI',
    blocked: 'DIBLOKIR',
    setup: 'SETUP',
    error: 'ERROR',
    approvedMessage: 'Guardrail mengizinkan request dan proxy mengembalikan unsigned smart-wallet transaction untuk ditandatangani wallet agent.',
    blockedMessage: 'Guardrail policy menolak run tanpa membuka batas privat pengguna.',
    jupiterRouteReady: 'Jupiter route siap',
    ikaRouteRequested: 'Ika approval transaction prepared',
    ikaRouteBlocked: 'Ika request blocked',
    ikaRouteUnsupported: 'Rute Ika tidak diizinkan',
    expectedOutput: 'Estimasi output',
    minOutput: 'Min setelah slippage',
    routeEngine: 'Route',
    policyTxReady: 'Tx policy-gated siap',
    signer: 'Signer',
    executionBoundary: 'Preview: route/build Jupiter ditampilkan sebagai estimasi dari proxy; swap nyata tidak dikirim dari frontend ini.',
    ikaExecutionBoundary: 'Ika approval transaction prepared: Polet membangun unsigned approval transaction setelah policy lulus; settlement bridgeless nyata belum dieksekusi.',
    ikaBlockedBoundary: 'Guardrail menolak request Ika tanpa membuat data approval dWallet.',
    ikaUnsupportedBoundary: 'Rute chain atau asset berada di luar policy allowlist. Data approval dWallet tidak dibuat.',
    ikaTechnicalDetails: 'Technical proof',
    dwallet: 'dWallet',
    messageApproval: 'MessageApproval',
    messageHash: 'Message hash',
    signatureScheme: 'Signature scheme',
    routeRiskStatus: 'Route risk',
    routeRiskPassed: 'Slippage and risk guardrails passed',
    privacyNote: 'Log aman: threshold, sisa cap, dan witness tidak ditampilkan.',
    preAlpha: 'Encrypt pre-alpha demo: ini membuktikan alur enforcement, bukan klaim privasi produksi.',
    demoTruth: 'Yang real di demo: setup wallet/policy on-chain, authorization agent, dan guardrail allow/block. Yang masih preview: price/route Jupiter dan transaksi swap.',
    missingOwner: 'Connect dan initialize wallet dulu sebelum menjalankan demo real.',
    missingAgent: 'Alamat AI agent wajib diisi dan sudah harus di-authorize di contract.',
    checklistTitle: 'Checklist demo',
    checklistNext: 'Aksi berikutnya',
    stepWallet: 'Wallet initialized',
    stepCustody: 'Custody PDA siap',
    stepAgent: 'Agent dipilih',
    stepPolicy: 'Policy rahasia tersimpan',
    stepStrategy: 'DCA USDC -> SOL siap',
    stepBlocked: 'Skenario 25 USDC diblokir',
    stepAllowed: 'Skenario 5 USDC disetujui',
    stepLog: 'Log aman diverifikasi',
    nextWallet: 'Connect dan initialize Polet Smart Wallet.',
    nextCustody: 'Setup custody PDA untuk akun USDC dan SOL.',
    nextAgent: 'Pilih atau masukkan agent signer yang sudah di-authorize.',
    nextPolicy: 'Simpan policy rahasia. Nilai akan disembunyikan setelah confirm.',
    nextBlocked: 'Jalankan skenario block 25 USDC terlebih dulu.',
    nextAllowed: 'Jalankan skenario allow 5 USDC untuk melihat Jupiter preview.',
    nextLog: 'Periksa activity log: tidak ada threshold, sisa cap, atau witness.',
    nextComplete: 'Demo path selesai.',
    custodyRequired: 'Setup custody dan pilih agent sebelum menyimpan policy.',
    blockedFirst: 'Jalankan block 25 USDC dulu agar flow demo linear.',
    invalidSharedApprover: 'Masukkan public key co-approver dan threshold valid.',
    invalidSharedProofs: 'Proof co-approval harus berupa array JSON.',
  },
  en: {
    language: 'English',
    title: 'Confidential Control Layer for AI Agents',
    subtitle:
      'Polet is a confidential Solana control layer for AI agents: the owner signs setup, the proxy reads on-chain state, then every agent execution rail passes through the policy gate.',
    walletTitle: 'Smart wallet',
    walletBody: 'Set up PDA custody for the USDC to SOL DCA demo. The UI does not fake outcomes when the proxy or contract is not ready.',
    initialized: 'Owner wallet active',
    setupCustody: 'Set up PDA custody',
    custodyReady: 'Custody ready',
    deposit: 'Deposit instructions',
    usdcAccount: 'USDC account',
    solAccount: 'SOL account',
    policyTitle: 'Confidential policy',
    policyBody: 'Values are sent to the proxy to be encrypted/masked into a contract transaction, then hidden in the normal UI after confirmation.',
    maxPerRun: 'Max per run',
    dailyCap: 'Daily cap',
    savePolicy: 'Sign & save policy',
    editPolicy: 'Edit policy',
    policySaved: 'On-chain policy saved',
    redacted: 'Private values hidden',
    encryptedMax: 'Encrypted max per run',
    encryptedDaily: 'Encrypted daily cap',
    strategyTitle: 'Agent execution rails',
    jupiterRailTitle: 'Jupiter strategy rail',
    ikaRailTitle: 'Ika dWallet rail',
    suiPrimary: 'Sui/SUI primary destination',
    ethereumFuture: 'Ethereum/ETH optional future',
    multichainBoundary: 'Multichain intent',
    executionRail: 'Execution rail',
    settlementBoundary: 'Ika settlement is not executed in this slice',
    fromTo: 'Pair',
    amount: 'Normal amount',
    cadence: 'Cadence',
    agentAddress: 'AI agent address',
    agentPlaceholder: 'Enter an agent wallet address already authorized on-chain',
    agentHelp: 'This is the agent wallet public key. Polet stores it as an authorized signer for the smart wallet under policy, not as a new private key.',
    runNow: 'Run Agent Now',
    runAllowed: 'Run 5 USDC through proxy',
    runBlocked: 'Try 25 USDC through proxy',
    runIka: 'Approve 5 USDC-equivalent Ika',
    runIkaBlocked: 'Try 25 Ika request',
    runIkaUnsupported: 'Try unsupported Ika route',
    sharedTitle: 'Shared Ika approval',
    sharedBody: 'Configure M-of-N Solana signer co-approvers for Ika. The Polet contract remains the enforcement boundary; passkey or proof UI is only a UX helper.',
    sharedThreshold: 'Threshold',
    sharedApprovers: 'Co-approver public keys',
    sharedApproverPlaceholder: 'One public key per line',
    configureShared: 'Sign & configure quorum',
    revokeShared: 'Revoke',
    sharedReady: 'Quorum ready',
    sharedNeedsApproval: 'Needs co-approval',
    sharedNotConfigured: 'Not configured',
    sharedProofs: 'Co-approval proof JSON',
    sharedProofHelp: 'Optional JSON signature array from co-approvers for the ready-quorum demo. Private policy values are not required.',
    countedApprovers: 'Co-approver counted',
    missingApprovals: 'Missing approvals',
    activityTitle: 'Activity log',
    emptyLog: 'No agent activity yet.',
    approved: 'APPROVED',
    blocked: 'BLOCKED',
    setup: 'SETUP',
    error: 'ERROR',
    approvedMessage: 'The guardrail allowed the request and the proxy returned an unsigned smart-wallet transaction for the agent wallet to sign.',
    blockedMessage: 'The guardrail policy rejected the run without revealing the user private limits.',
    jupiterRouteReady: 'Jupiter route ready',
    ikaRouteRequested: 'Ika approval transaction prepared',
    ikaRouteBlocked: 'Ika request blocked',
    ikaRouteUnsupported: 'Ika route not allowed',
    expectedOutput: 'Expected output',
    minOutput: 'Min after slippage',
    routeEngine: 'Route engine',
    policyTxReady: 'Policy-gated payload',
    signer: 'Authorized signer',
    executionBoundary: 'Preview: Jupiter route is built; real mainnet swap is not executed in this demo.',
    ikaExecutionBoundary: 'Ika approval transaction prepared: Polet built an unsigned approval transaction after policy approval; bridgeless settlement is not executed.',
    ikaBlockedBoundary: 'The guardrail rejected this Ika request without creating dWallet approval data.',
    ikaUnsupportedBoundary: 'The chain or asset route is outside the allowed route policy. No dWallet approval data was created.',
    ikaTechnicalDetails: 'Technical proof',
    dwallet: 'dWallet',
    messageApproval: 'MessageApproval',
    messageHash: 'Message hash',
    signatureScheme: 'Signature scheme',
    routeRiskStatus: 'Route risk',
    routeRiskPassed: 'Slippage and risk guardrails passed',
    privacyNote: 'Safe log: thresholds, remaining cap, and witness values are not displayed.',
    preAlpha: 'Encrypt pre-alpha demo: this proves the enforcement flow, not production privacy.',
    demoTruth: 'Real in this demo: on-chain wallet/policy setup, agent authorization, and guardrail allow/block. Still preview: Jupiter price/route and swap transaction execution.',
    missingOwner: 'Connect and initialize a wallet before running the real demo.',
    missingAgent: 'The AI agent address is required and must already be authorized on-chain.',
    checklistTitle: 'Demo checklist',
    checklistNext: 'Next action',
    stepWallet: 'Wallet initialized',
    stepCustody: 'PDA custody ready',
    stepAgent: 'Agent selected',
    stepPolicy: 'Confidential policy saved',
    stepStrategy: 'USDC -> SOL DCA ready',
    stepBlocked: '25 USDC scenario blocked',
    stepAllowed: '5 USDC scenario approved',
    stepLog: 'Safe log verified',
    nextWallet: 'Connect and initialize the Polet Smart Wallet.',
    nextCustody: 'Set up PDA custody for USDC and SOL accounts.',
    nextAgent: 'Select or enter an authorized agent signer.',
    nextPolicy: 'Save the confidential policy. Values will be hidden after confirmation.',
    nextBlocked: 'Run the blocked 25 USDC scenario first.',
    nextAllowed: 'Run the allowed 5 USDC scenario to view the Jupiter preview.',
    nextLog: 'Review the activity log: no thresholds, remaining cap, or witness values.',
    nextComplete: 'Demo path complete.',
    custodyRequired: 'Set up custody and select an agent before saving policy.',
    blockedFirst: 'Run the blocked 25 USDC scenario first to keep the demo linear.',
    invalidSharedApprover: 'Enter co-approver public keys and a valid threshold.',
    invalidSharedProofs: 'Co-approval proofs must be a JSON array.',
  },
} as const;

export function DemoTab({ agentAddresses = [] }: { agentAddresses?: string[] }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const signAndConfirmTransaction = async (transactionBase64: string) => {
    const transaction = Transaction.from(Uint8Array.from(atob(transactionBase64), (char) => char.charCodeAt(0)));
    const signature = await sendTransaction(transaction, connection);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
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
  const [policyDraft, setPolicyDraft] = useState<ConfidentialPolicyDraft>({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
  });
  const [policySaved, setPolicySaved] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(true);
  const [custody, setCustody] = useState<{ usdcTokenAccount: string; solTokenAccount: string } | null>(null);
  const [sharedIkaApproval, setSharedIkaApproval] = useState<SharedIkaApprovalConfig | null>(null);
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

  const t = COPY[locale];
  const witness = useMemo(() => Array.from({ length: 32 }, (_, index) => index + 1), []);
  const hasAgent = Boolean(agentAddress.trim());
  const hasBlockedRun = activity.some((entry) => entry.status === 'blocked' && entry.amountUsdc === '25');
  const hasAllowedRun = activity.some((entry) => entry.status === 'approved' && entry.amountUsdc === (strategy.amountUsdc || '5'));
  const hasBlockedIkaRun = activity.some((entry) => entry.status === 'blocked' && entry.amountUsdc === '25' && entry.route?.includes('Ika'));
  const hasSafeLog = activity.length > 0 && activity.every((entry) => !entry.message.includes('10 USDC') && !entry.message.includes('20 USDC'));
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
    { label: t.stepStrategy, done: strategyReady, next: t.nextBlocked },
    { label: t.stepBlocked, done: hasBlockedRun, next: t.nextBlocked },
    { label: t.stepAllowed, done: hasAllowedRun, next: t.nextAllowed },
    { label: t.stepLog, done: hasAllowedRun && hasSafeLog, next: t.nextLog },
  ];
  const nextStep = checklist.find((step) => !step.done);
  const nextAction = nextStep?.next ?? t.nextComplete;

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
        }
      }).catch(console.error);
    }
  }, [owner]);

  useEffect(() => {
    if (!agentAddress && agentAddresses[0]) {
      setAgentAddress(agentAddresses[0]);
    }
  }, [agentAddresses, agentAddress]);

  const savedPolicyDigest = useMemo(() => {
    if (!policySaved) return 'Not configured';
    return 'commitment: on-chain';
  }, [policySaved]);

  const addActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    setActivity((prev) => [
      { ...entry, id: `${entry.status}-${Date.now()}`, timestamp: Date.now() },
      ...prev.slice(0, 7),
    ]);
  };

  const recordError = (message: string) => {
    setError(message);
    addActivity({
      status: 'error',
      message,
      route: 'Proxy / contract setup',
    });
  };

  const setupCustodyAccounts = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    setBusy('custody');
    setError(null);
    try {
      const result = await api.setupDemoCustody({
        owner,
        usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
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
  };

  const savePolicy = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
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
      await refreshSharedIkaApproval().catch(() => undefined);
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
  };

  const revokeSharedApproval = async (approver: string) => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }

    setBusy(`shared-revoke-${approver}`);
    setError(null);
    try {
      const result = await api.revokeSharedIkaApprover({ owner, approver });
      const signature = await signAndConfirmTransaction(result.transaction);
      setSharedIkaApproval((prev) => {
        if (!prev) return null;
        const approvers = prev.approvers.filter((item) => item !== approver);
        return approvers.length > 0 ? { threshold: Math.min(prev.threshold, approvers.length), approvers } : null;
      });
      await refreshSharedIkaApproval().catch(() => undefined);
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
      addActivity({
        status: result.allowed ? 'approved' : 'blocked',
        amountUsdc,
        message: result.allowed ? t.approvedMessage : result.reason ?? t.blockedMessage,
        route: result.allowed
          ? `${result.executionPath ?? 'Jupiter Swap V2'} / route preview`
          : result.code,
        jupiterPlan: result.allowed ? result.jupiterPlan : undefined,
        transactionSigners: result.allowed ? result.transaction?.signers : undefined,
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

    const unsupportedRoute = target.chain !== 'sui' || target.asset !== 'SUI';
    setBusy(unsupportedRoute ? 'ika-unsupported' : `ika-${amount}`);
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
        slippageBps: 100,
        routeRisk: {
          priceImpactBps: 120,
          liquidityScore: 'high',
          verifiedRoute: true,
          provider: 'polet-demo-precheck',
        },
        riskGuardrails: {
          mode: 'bridgeless-route-risk',
          maxSlippageBps: 150,
          maxPriceImpactBps: 300,
          minLiquidityScore: 'medium',
          requireVerifiedRoute: true,
        },
        sharedAccess: buildSharedAccess(sharedIkaApproval, sharedApprovalProofs, t.invalidSharedProofs),
        encryptionWitness: witness,
        routeGuardrails: {
          mode: 'chain-asset-allowlist',
          allowedSourceChains: ['solana'],
          allowedTargetChains: ['sui'],
          allowedSourceAssets: ['USDC'],
          allowedTargetAssets: ['SUI'],
        },
      });
      addActivity({
        status: result.allowed ? 'approved' : result.status === 'needs-approval' ? 'needs-approval' : 'blocked',
        amountUsdc: amount,
        message: result.allowed
          ? t.ikaExecutionBoundary
          : result.code === 'IKA_ROUTE_NOT_ALLOWED'
            ? result.reason ?? t.ikaUnsupportedBoundary
            : result.reason ?? t.ikaBlockedBoundary,
        route: result.allowed
          ? 'Ika dWallet approval'
          : result.code === 'IKA_ROUTE_NOT_ALLOWED'
            ? `${t.ikaRouteUnsupported}: ${target.chain.toUpperCase()} ${target.asset}`
            : `Ika ${result.code}`,
        ikaRequest: result.allowed ? result.ikaRequest : undefined,
        approval: result.approval,
        sharedApprovers: result.allowed ? sharedApproversFromResult(result) : result.approval?.approvedApprovers,
        smartWalletAuthority: result.allowed ? result.ikaRequest?.sessionContext.smartWalletAuthority : undefined,
      });
    } catch (err) {
      recordError(err instanceof Error ? err.message : 'Failed to request Ika bridgeless route');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
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
                  locale === option
                    ? 'bg-[var(--lagoon-deep)] text-white'
                    : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
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
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                step.done ? 'bg-green-600 text-white' : 'bg-white text-[var(--sea-ink-soft)]'
              }`}>
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="text-sm font-semibold leading-5">{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

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
            <p className="mt-1 text-sm text-[var(--sea-ink)]">
              Deposit demo USDC into the PDA-owned USDC account after custody setup confirms.
            </p>
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
                  <p className="text-xs text-[var(--sea-ink-soft)]">{savedPolicyDigest}</p>
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
            <InfoRow label={t.cadence} value={strategy.cadence} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              {busy === 'ika-25' ? '...' : t.runIkaBlocked}
            </button>
            <button
              onClick={() => requestIkaRoute('5')}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Landmark className="h-3.5 w-3.5" />
              {busy === 'ika-5' ? '...' : t.runIka}
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

function Panel({ icon, title, children, testId }: { icon: ReactNode; title: string; children: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--sea-ink)]">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--lagoon)]/10 text-[var(--lagoon)]">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoTile({ label, value, tone, small = false }: { label: string; value: string; tone?: 'green'; small?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">{label}</p>
      <p className={`mt-0.5 break-words font-bold ${small ? 'text-xs' : 'text-sm'} ${tone === 'green' ? 'text-green-500' : 'text-[var(--sea-ink)]'}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <span className="text-xs font-semibold text-[var(--sea-ink-soft)]">{label}</span>
      <span className="text-sm font-bold text-[var(--sea-ink)]">{value}</span>
    </div>
  );
}

function PrivatePolicyTile({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
        <EyeOff className="h-4 w-4 text-[var(--lagoon-deep)]" />
        {label}
      </p>
      <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">********</p>
    </div>
  );
}

function ActivityCard({ entry, labels }: { entry: ActivityEntry; labels: (typeof COPY)[Locale] }) {
  const approved = entry.status === 'approved';
  const blocked = entry.status === 'blocked';
  const needsApproval = entry.status === 'needs-approval';
  const setup = entry.status === 'setup';
  const label = approved ? labels.approved : needsApproval ? 'Needs approval' : blocked ? labels.blocked : setup ? labels.setup : labels.error;
  const tone = approved || setup ? 'green' : blocked ? 'red' : 'amber';

  return (
    <article className={`rise-in rounded-lg border p-4 ${
      tone === 'green' ? 'border-green-500/20 bg-green-500/5' : 
      tone === 'red' ? 'border-red-500/20 bg-red-500/5' : 
      'border-amber-500/20 bg-amber-500/5'
    }`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone === 'green' ? 'bg-green-600' : tone === 'red' ? 'bg-red-600' : 'bg-amber-600'} text-white`}>
            {approved || setup ? <Check className="h-5 w-5" /> : needsApproval ? <AlertTriangle className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-black text-[var(--sea-ink)]">{label}</p>
            <p className="text-xs text-[var(--sea-ink-soft)]">{new Date(entry.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
        {entry.amountUsdc && (
          <div className="text-right">
            <p className="text-sm font-black text-[var(--sea-ink)]">{entry.amountUsdc} USDC</p>
            <p className="text-xs text-[var(--sea-ink-soft)]">USDC {'->'} SOL</p>
          </div>
        )}
      </div>
      <p className="text-sm leading-6 text-[var(--sea-ink)]">{entry.message}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
          <Landmark className="h-3.5 w-3.5" />
          {entry.route}
        </p>
      </div>
      {entry.jupiterPlan && <JupiterRoutePreview entry={entry} labels={labels} />}
      {entry.approval && <ApprovalProgressCard approval={entry.approval} labels={labels} />}
      {entry.ikaRequest && <IkaRequestPreviewCard request={entry.ikaRequest} labels={labels} sharedApprovers={entry.sharedApprovers} />}
    </article>
  );
}

function ApprovalProgressCard({ approval, labels }: { approval: NonNullable<RunMultichainIntentResult['approval']>; labels: (typeof COPY)[Locale] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.sharedTitle} value={`${approval.received}/${approval.required} ${approval.status === 'ready' ? labels.sharedReady : labels.sharedNeedsApproval}`} />
      <InfoPill label={labels.missingApprovals} value={`${approval.missingApprovals} co-approval${approval.missingApprovals === 1 ? '' : 's'}`} />
      <InfoPill label="Approvers" value={`${approval.totalApprovers} registered`} />
      <InfoPill label="Challenge" value={short(approval.challenge)} />
      {approval.approvedApprovers.map((approver) => (
        <InfoPill key={approver} label={labels.countedApprovers} value={short(approver)} />
      ))}
    </div>
  );
}

function IkaRequestPreviewCard({ request, labels, sharedApprovers }: { request: IkaRequestPreview; labels: (typeof COPY)[Locale]; sharedApprovers?: string[] }) {
  const signing = request.preAlphaSigning;
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.ikaRouteRequested} value={labels.ikaExecutionBoundary} wide />
      <InfoPill label="Source" value={`${request.source.chain.toUpperCase()} ${request.source.asset}`} />
      <InfoPill label="Target" value={`${request.target.chain.toUpperCase()} ${request.target.asset}`} />
      <InfoPill label="Request" value={request.requestId} />
      <InfoPill label="Policy seq" value={request.policyAttestation.policySequence.toString()} />
      <InfoPill
        label={labels.routeRiskStatus}
        value={request.routeRisk ? `${labels.routeRiskPassed}: ${request.routeRisk.priceImpactBps ?? 'n/a'} bps` : labels.routeRiskPassed}
      />
      <InfoPill label={labels.ikaTechnicalDetails} value={request.executionBoundary.note} wide />
      <InfoPill label={labels.dwallet} value={signing?.dwalletAccount ? short(signing.dwalletAccount) : 'Pre-Alpha dWallet'} />
      <InfoPill label={labels.messageApproval} value={signing?.messageApprovalPda ? short(signing.messageApprovalPda) : 'Pending account'} />
      <InfoPill label={labels.messageHash} value={signing?.ikaMessageHash ? short(signing.ikaMessageHash) : signing?.messageDigest ? short(signing.messageDigest) : request.canonicalOrderHash ? short(request.canonicalOrderHash) : 'Ika message hash'} />
      <InfoPill label={labels.signatureScheme} value={signing?.signatureScheme ?? 'Pre-Alpha'} />
      {sharedApprovers?.map((approver) => (
        <InfoPill key={approver} label={labels.countedApprovers} value={short(approver)} />
      ))}
    </div>
  );
}

function JupiterRoutePreview({ entry, labels }: { entry: ActivityEntry; labels: (typeof COPY)[Locale] }) {
  const build = entry.jupiterPlan?.build;
  const route = build?.routePlan?.[0]?.swapInfo?.label ?? 'Jupiter Swap V2';
  const outputSymbol = entry.jupiterPlan?.outputToken?.symbol ?? 'SOL';
  const outputDecimals = entry.jupiterPlan?.outputToken?.decimals ?? 9;
  const expectedOutput = formatTokenAmount(build?.outAmount, outputDecimals);
  const minimumOutput = formatTokenAmount(build?.otherAmountThreshold, outputDecimals);
  const signer = entry.transactionSigners?.[0];

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.jupiterRouteReady} value={labels.executionBoundary} wide />
      <InfoPill label={labels.expectedOutput} value={expectedOutput ? `${expectedOutput} ${outputSymbol}` : 'Available'} />
      <InfoPill label={labels.minOutput} value={minimumOutput ? `${minimumOutput} ${outputSymbol}` : 'Auto'} />
      <InfoPill label={labels.routeEngine} value={route} />
      <InfoPill label={labels.policyTxReady} value={entry.smartWalletAuthority ? short(entry.smartWalletAuthority) : 'Smart wallet'} />
      <InfoPill label={labels.signer} value={signer ? short(signer) : 'Agent address'} />
    </div>
  );
}

function InfoPill({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <p className="font-semibold uppercase tracking-normal text-[var(--sea-ink-soft)]">{label}</p>
      <p className="mt-0.5 break-words font-bold text-[var(--sea-ink)]">{value}</p>
    </div>
  );
}

function formatTokenAmount(raw: string | undefined, decimals: number) {
  if (!raw) return null;
  const value = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction.slice(0, 6)}` : whole.toString();
}

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function normalizeApproverLines(value: string) {
  return Array.from(new Set(value.split(/\s+/).map((line) => line.trim()).filter(Boolean)));
}

function normalizeSharedIkaApproval(value: any): SharedIkaApprovalConfig | null {
  if (!value?.enabled || !Number.isInteger(value.threshold)) return null;
  const approvers = (value.approvers ?? [])
    .filter((approver: any) => approver?.authorized !== false)
    .map((approver: any) => typeof approver === 'string' ? approver : approver.key)
    .filter((approver: unknown): approver is string => typeof approver === 'string' && approver.length > 0);
  return approvers.length > 0 ? { threshold: value.threshold, approvers } : null;
}

function buildSharedAccess(config: SharedIkaApprovalConfig | null, proofsText: string, invalidMessage: string) {
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
    approvals: parsed.map((proof) => ({
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
