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
  Wallet,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  runConfidentialDca,
  setConfidentialPolicy,
  setupDemoCustody,
  getWalletData,
  runMultichainIntent,
  type IkaRequestPreview,
  type RunConfidentialDcaResult,
  type RunMultichainIntentResult,
  type JupiterPlanPreview,
  type SetConfidentialPolicyInput,
  type SetupDemoCustodyInput,
  type WalletTransactionResult,
} from '../lib/api';

type Locale = 'id' | 'en';
type RunStatus = 'approved' | 'blocked' | 'setup' | 'error';

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
  status: 'setup' | 'approved' | 'blocked' | 'error';
  message: string;
  route?: string;
  amountUsdc?: string;
  jupiterPlan?: JupiterPlanPreview;
  ikaRequest?: IkaRequestPreview;
  transactionSigners?: string[];
  smartWalletAuthority?: string;
}

interface DemoApi {
  setConfidentialPolicy: (input: SetConfidentialPolicyInput) => Promise<WalletTransactionResult>;
  setupDemoCustody: (input: SetupDemoCustodyInput) => Promise<WalletTransactionResult>;
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
  runConfidentialDca,
  runMultichainIntent,
  getWalletData,
};

const COPY = {
  id: {
    language: 'Bahasa',
    title: 'Demo DCA Rahasia',
    subtitle:
      'Flow ini memakai proxy dan contract Polet sungguhan: owner menandatangani setup, proxy membaca state on-chain, lalu agent run dibangun lewat policy gate dan Jupiter.',
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
    strategyTitle: 'Strategi DCA',
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
    runIka: 'Request Ika bridgeless route',
    activityTitle: 'Activity log',
    emptyLog: 'Belum ada aktivitas agen.',
    approved: 'DISETUJUI',
    blocked: 'DIBLOKIR',
    setup: 'SETUP',
    error: 'ERROR',
    approvedMessage: 'Guardrail mengizinkan request dan proxy mengembalikan unsigned smart-wallet transaction untuk ditandatangani wallet agent.',
    blockedMessage: 'Guardrail policy menolak run tanpa membuka batas privat pengguna.',
    jupiterRouteReady: 'Jupiter route siap',
    ikaRouteRequested: 'Bridgeless route requested',
    expectedOutput: 'Estimasi output',
    minOutput: 'Min setelah slippage',
    routeEngine: 'Route',
    policyTxReady: 'Tx policy-gated siap',
    signer: 'Signer',
    executionBoundary: 'Preview: route/build Jupiter ditampilkan sebagai estimasi dari proxy; swap nyata tidak dikirim dari frontend ini.',
    ikaExecutionBoundary: 'Ika request envelope siap; settlement bridgeless nyata belum dieksekusi.',
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
  },
  en: {
    language: 'English',
    title: 'Confidential DCA Demo',
    subtitle:
      'This flow uses the real Polet proxy and contract: the owner signs setup, the proxy reads on-chain state, then the agent run is built through the policy gate and Jupiter.',
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
    strategyTitle: 'DCA strategy',
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
    runIka: 'Request Ika bridgeless route',
    activityTitle: 'Activity log',
    emptyLog: 'No agent activity yet.',
    approved: 'APPROVED',
    blocked: 'BLOCKED',
    setup: 'SETUP',
    error: 'ERROR',
    approvedMessage: 'The guardrail allowed the request and the proxy returned an unsigned smart-wallet transaction for the agent wallet to sign.',
    blockedMessage: 'The guardrail policy rejected the run without revealing the user private limits.',
    jupiterRouteReady: 'Jupiter route ready',
    ikaRouteRequested: 'Bridgeless route requested',
    expectedOutput: 'Expected output',
    minOutput: 'Min after slippage',
    routeEngine: 'Route engine',
    policyTxReady: 'Policy-gated payload',
    signer: 'Authorized signer',
    executionBoundary: 'Preview: Jupiter route is built; real mainnet swap is not executed in this demo.',
    ikaExecutionBoundary: 'Ika request envelope is ready; bridgeless settlement is not executed.',
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

  const requestIkaRoute = async () => {
    if (!owner) {
      recordError(t.missingOwner);
      return;
    }
    if (!agentAddress.trim()) {
      recordError(t.missingAgent);
      return;
    }

    setBusy('ika');
    setError(null);
    try {
      const result: RunMultichainIntentResult = await api.runMultichainIntent({
        owner,
        sessionKey: agentAddress.trim(),
        sourceChain: 'solana',
        sourceAsset: 'USDC',
        targetChain: 'sui',
        targetAsset: 'SUI',
        amount: strategy.amountUsdc || '5',
        executionRail: 'ika',
        strategy: 'dca',
        slippageBps: 100,
        encryptionWitness: witness,
      });
      addActivity({
        status: result.allowed ? 'approved' : 'blocked',
        amountUsdc: strategy.amountUsdc || '5',
        message: result.allowed ? t.ikaExecutionBoundary : result.reason ?? t.blockedMessage,
        route: result.allowed ? 'Ika bridgeless request' : result.code,
        ikaRequest: result.allowed ? result.ikaRequest : undefined,
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
              onClick={requestIkaRoute}
              disabled={!canRequestIka}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-[var(--sea-ink)] transition-all hover:bg-[var(--link-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Landmark className="h-3.5 w-3.5" />
              {busy === 'ika' ? '...' : t.runIka}
            </button>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-[var(--sea-ink-soft)] font-bold">{t.runNow}: 25 USDC block scenario, 5 USDC allow scenario.</p>
        </Panel>

        <Panel icon={<Activity className="h-5 w-5" />} title={t.activityTitle}>
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

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--island-bg)] p-5">
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
  const setup = entry.status === 'setup';
  const label = approved ? labels.approved : blocked ? labels.blocked : setup ? labels.setup : labels.error;
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
            {approved || setup ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
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
      {entry.ikaRequest && <IkaRequestPreviewCard request={entry.ikaRequest} labels={labels} />}
    </article>
  );
}

function IkaRequestPreviewCard({ request, labels }: { request: IkaRequestPreview; labels: (typeof COPY)[Locale] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-xs text-[var(--sea-ink-soft)] sm:grid-cols-2">
      <InfoPill label={labels.ikaRouteRequested} value={labels.ikaExecutionBoundary} wide />
      <InfoPill label="Source" value={`${request.source.chain.toUpperCase()} ${request.source.asset}`} />
      <InfoPill label="Target" value={`${request.target.chain.toUpperCase()} ${request.target.asset}`} />
      <InfoPill label="Request" value={request.requestId} />
      <InfoPill label="Policy seq" value={request.policyAttestation.policySequence.toString()} />
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
