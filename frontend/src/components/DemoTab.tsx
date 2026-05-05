import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
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
  sessionKeys?: string[];
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
    sessionKey: 'Session key agen',
    sessionPlaceholder: 'Masukkan public key session yang sudah di-grant',
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
    approvedMessage: 'Proxy mengembalikan allowed dan unsigned smart-wallet transaction untuk ditandatangani session key agen.',
    blockedMessage: 'Proxy/contract policy path menolak run tanpa membuka batas privat pengguna.',
    jupiterRouteReady: 'Jupiter route siap',
    ikaRouteRequested: 'Bridgeless route requested',
    expectedOutput: 'Estimasi output',
    minOutput: 'Min setelah slippage',
    routeEngine: 'Route',
    policyTxReady: 'Tx policy-gated siap',
    signer: 'Signer',
    executionBoundary: 'Devnet proof: route Jupiter dibangun, swap mainnet tidak dieksekusi dari demo ini.',
    ikaExecutionBoundary: 'Ika request envelope siap; settlement bridgeless nyata belum dieksekusi.',
    privacyNote: 'Log aman: threshold, sisa cap, dan witness tidak ditampilkan.',
    preAlpha: 'Encrypt pre-alpha demo: ini membuktikan alur enforcement, bukan klaim privasi produksi.',
    missingOwner: 'Connect dan initialize wallet dulu sebelum menjalankan demo real.',
    missingSession: 'Session key agen wajib diisi dan sudah harus di-grant di contract.',
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
    sessionKey: 'Agent session key',
    sessionPlaceholder: 'Enter a session public key already granted on-chain',
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
    approvedMessage: 'The proxy returned allowed plus an unsigned smart-wallet transaction for the agent session key to sign.',
    blockedMessage: 'The proxy/contract policy path rejected the run without revealing the user private limits.',
    jupiterRouteReady: 'Jupiter route ready',
    ikaRouteRequested: 'Bridgeless route requested',
    expectedOutput: 'Expected output',
    minOutput: 'Min after slippage',
    routeEngine: 'Route',
    policyTxReady: 'Policy-gated tx ready',
    signer: 'Signer',
    executionBoundary: 'Devnet proof: Jupiter route is built, mainnet swap is not executed from this demo.',
    ikaExecutionBoundary: 'Ika request envelope is ready; real bridgeless settlement is not executed.',
    privacyNote: 'Safe log: thresholds, remaining cap, and witness values are not displayed.',
    preAlpha: 'Encrypt pre-alpha demo: this proves the enforcement flow, not production privacy.',
    missingOwner: 'Connect and initialize a wallet before running the real demo.',
    missingSession: 'The agent session key is required and must already be granted on-chain.',
  },
} as const;

export function DemoTab() {
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
      signAndConfirmTransaction={signAndConfirmTransaction}
    />
  );
}

export function DemoTabContent({
  owner,
  sessionKeys = [],
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
  const [sessionKey, setSessionKey] = useState(sessionKeys[0] ?? '');
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
  const canRun = Boolean(owner && policySaved && sessionKey.trim() && !busy);

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
    if (!sessionKey.trim()) {
      recordError(t.missingSession);
      return;
    }

    setBusy(`run-${amountUsdc}`);
    setError(null);
    try {
      const result: RunConfidentialDcaResult = await api.runConfidentialDca({
        owner,
        sessionKey: sessionKey.trim(),
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
    if (!sessionKey.trim()) {
      recordError(t.missingSession);
      return;
    }

    setBusy('ika');
    setError(null);
    try {
      const result: RunMultichainIntentResult = await api.runMultichainIntent({
        owner,
        sessionKey: sessionKey.trim(),
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
      <section className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5">
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
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
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
                disabled={!owner || Boolean(busy)}
                className="self-end rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <InfoRow label="Source" value={`${strategy.sourceChain} ${strategy.inputMint}`} />
                <InfoRow label="Target" value={`${strategy.targetChain} ${strategy.outputMint}`} />
                <InfoRow label={t.executionRail} value={strategy.executionRail} />
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
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.sessionKey}</span>
              <input
                value={sessionKey}
                onChange={(event) => setSessionKey(event.target.value)}
                placeholder={t.sessionPlaceholder}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono"
              />
            </label>
            <InfoRow label={t.cadence} value={strategy.cadence} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => runAgent('25')}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {busy === 'run-25' ? 'Running...' : t.runBlocked}
            </button>
            <button
              onClick={() => runAgent(strategy.amountUsdc || '5')}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {busy === `run-${strategy.amountUsdc || '5'}` ? 'Running...' : t.runAllowed}
            </button>
            <button
              onClick={requestIkaRoute}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--sea-ink)] disabled:opacity-50"
            >
              <Landmark className="h-4 w-4" />
              {busy === 'ika' ? 'Requesting...' : t.runIka}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--sea-ink-soft)]">{t.runNow}: 25 USDC block scenario, 5 USDC allow scenario.</p>
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
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
            {t.preAlpha}
          </p>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--sea-ink)]">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(79,184,178,0.14)] text-[var(--lagoon-deep)]">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoTile({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
      <p className="text-xs font-semibold text-[var(--sea-ink-soft)]">{label}</p>
      <p className={`mt-1 break-all text-sm font-bold ${tone === 'green' ? 'text-green-700' : 'text-[var(--sea-ink)]'}`}>{value}</p>
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
    <article className={`rounded-lg border p-4 ${tone === 'green' ? 'border-green-200 bg-green-50' : tone === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
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
      <InfoPill label="Source" value={`${request.source.chain} ${request.source.asset}`} />
      <InfoPill label="Target" value={`${request.target.chain} ${request.target.asset}`} />
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
      <InfoPill label={labels.signer} value={signer ? short(signer) : 'Session key'} />
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
