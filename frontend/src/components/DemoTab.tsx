import { useMemo, useState } from 'react';
import {
  Activity,
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

type Locale = 'id' | 'en';
type RunStatus = 'approved' | 'blocked';

interface ConfidentialPolicyDraft {
  maxPerRunUsdc: string;
  dailyCapUsdc: string;
}

interface DcaStrategy {
  inputMint: 'USDC';
  outputMint: 'SOL';
  amountUsdc: string;
  cadence: string;
}

interface ActivityEntry {
  id: string;
  status: RunStatus;
  amountUsdc: string;
  timestamp: number;
  message: string;
  route: string;
}

const DEMO_WALLET = 'Polet smart wallet PDA';
const DEMO_USDC_ACCOUNT = 'PDA-owned USDC token account';
const DEMO_SOL_ACCOUNT = 'PDA-owned SOL token account';

const COPY = {
  id: {
    language: 'Bahasa',
    title: 'Demo DCA Rahasia',
    subtitle:
      'Smart wallet Polet menyimpan dana, menyimpan aturan numerik sebagai policy rahasia pre-alpha, lalu membatasi aksi agen sebelum swap Jupiter dibangun.',
    walletTitle: 'Smart wallet',
    walletBody: 'Inisialisasi Polet wallet, lalu deposit USDC untuk demo DCA USDC ke SOL.',
    initialized: 'Siap',
    deposit: 'Instruksi deposit',
    usdcAccount: 'Akun USDC',
    solAccount: 'Akun SOL',
    policyTitle: 'Policy rahasia',
    policyBody: 'Nilai bisa diatur saat setup, tetapi setelah disimpan UI normal hanya menampilkan status terenkripsi.',
    maxPerRun: 'Maks per run',
    dailyCap: 'Batas harian',
    savePolicy: 'Simpan policy rahasia',
    editPolicy: 'Ubah policy',
    policySaved: 'Policy tersimpan',
    redacted: 'Nilai privat disembunyikan',
    encryptedMax: 'Maks per run terenkripsi',
    encryptedDaily: 'Batas harian terenkripsi',
    strategyTitle: 'Strategi DCA',
    fromTo: 'Pair',
    amount: 'Jumlah normal',
    cadence: 'Jadwal',
    runNow: 'Run Agent Now',
    runAllowed: 'Jalankan 5 USDC',
    runBlocked: 'Coba 25 USDC',
    activityTitle: 'Activity log',
    emptyLog: 'Belum ada aktivitas agen.',
    approved: 'DISETUJUI',
    blocked: 'DIBLOKIR',
    approvedMessage: 'Policy rahasia menyetujui run ini. Transaksi smart wallet siap dibangun melalui Jupiter Swap V2 fallback.',
    blockedMessage: 'Policy rahasia menolak run ini tanpa membuka batas privat pengguna.',
    privacyNote: 'Log aman: tidak menampilkan threshold, sisa cap, atau nilai witness.',
    preAlpha: 'Encrypt pre-alpha demo: ini membuktikan alur enforcement, bukan klaim privasi produksi.',
  },
  en: {
    language: 'English',
    title: 'Confidential DCA Demo',
    subtitle:
      'The Polet smart wallet custodies funds, stores numeric guardrails as a pre-alpha confidential policy, and gates agent actions before a Jupiter swap is built.',
    walletTitle: 'Smart wallet',
    walletBody: 'Initialize a Polet wallet, then deposit USDC for the USDC to SOL DCA demo.',
    initialized: 'Ready',
    deposit: 'Deposit instructions',
    usdcAccount: 'USDC account',
    solAccount: 'SOL account',
    policyTitle: 'Confidential policy',
    policyBody: 'Values are entered during setup, but the normal saved view only shows encrypted status.',
    maxPerRun: 'Max per run',
    dailyCap: 'Daily cap',
    savePolicy: 'Save confidential policy',
    editPolicy: 'Edit policy',
    policySaved: 'Policy saved',
    redacted: 'Private values hidden',
    encryptedMax: 'Encrypted max per run',
    encryptedDaily: 'Encrypted daily cap',
    strategyTitle: 'DCA strategy',
    fromTo: 'Pair',
    amount: 'Normal amount',
    cadence: 'Cadence',
    runNow: 'Run Agent Now',
    runAllowed: 'Run 5 USDC',
    runBlocked: 'Try 25 USDC',
    activityTitle: 'Activity log',
    emptyLog: 'No agent activity yet.',
    approved: 'APPROVED',
    blocked: 'BLOCKED',
    approvedMessage: 'Confidential policy approved this run. The smart wallet transaction can be built through the Jupiter Swap V2 fallback.',
    blockedMessage: 'Confidential policy rejected this run without revealing the user private limits.',
    privacyNote: 'Safe log: thresholds, remaining cap, and witness values are not displayed.',
    preAlpha: 'Encrypt pre-alpha demo: this proves the enforcement flow, not production privacy.',
  },
} as const;

export function DemoTab() {
  const [locale, setLocale] = useState<Locale>('id');
  const [policyDraft, setPolicyDraft] = useState<ConfidentialPolicyDraft>({
    maxPerRunUsdc: '10',
    dailyCapUsdc: '20',
  });
  const [policySaved, setPolicySaved] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(true);
  const [strategy, setStrategy] = useState<DcaStrategy>({
    inputMint: 'USDC',
    outputMint: 'SOL',
    amountUsdc: '5',
    cadence: 'Manual demo run',
  });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const t = COPY[locale];
  const canRun = policySaved;

  const savedPolicyDigest = useMemo(() => {
    if (!policySaved) return 'Not configured';
    return 'commitment: 9f42...c1a8';
  }, [policySaved]);

  const savePolicy = () => {
    setPolicySaved(true);
    setEditingPolicy(false);
  };

  const runAgent = (amountUsdc: string) => {
    if (!canRun) return;

    const numericAmount = Number(amountUsdc);
    const maxPerRun = Number(policyDraft.maxPerRunUsdc);
    const dailyCap = Number(policyDraft.dailyCapUsdc);
    const status: RunStatus = numericAmount <= maxPerRun && numericAmount <= dailyCap ? 'approved' : 'blocked';

    const entry: ActivityEntry = {
      id: `${status}-${Date.now()}`,
      status,
      amountUsdc,
      timestamp: Date.now(),
      message: status === 'approved' ? t.approvedMessage : t.blockedMessage,
      route: status === 'approved' ? 'Jupiter Tokens + Price + Swap V2 /build' : 'Confidential policy gate',
    };

    setActivity((prev) => [entry, ...prev.slice(0, 7)]);
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

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel icon={<Wallet className="h-5 w-5" />} title={t.walletTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.walletBody}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label={DEMO_WALLET} value={t.initialized} tone="green" />
            <InfoTile label={t.usdcAccount} value={DEMO_USDC_ACCOUNT} />
            <InfoTile label={t.solAccount} value={DEMO_SOL_ACCOUNT} />
          </div>
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3">
            <p className="text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">{t.deposit}</p>
            <p className="mt-1 text-sm text-[var(--sea-ink)]">
              Deposit demo USDC into the PDA-owned token account; SOL output stays under the same smart wallet authority.
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
                className="self-end rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white"
              >
                {t.savePolicy}
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
            <InfoRow label={t.cadence} value={strategy.cadence} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => runAgent('25')}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {t.runBlocked}
            </button>
            <button
              onClick={() => runAgent(strategy.amountUsdc || '5')}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--lagoon-deep)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {t.runAllowed}
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
      <p className={`mt-1 text-sm font-bold ${tone === 'green' ? 'text-green-700' : 'text-[var(--sea-ink)]'}`}>{value}</p>
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
      <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">••••••••</p>
    </div>
  );
}

function ActivityCard({ entry, labels }: { entry: ActivityEntry; labels: (typeof COPY)[Locale] }) {
  const approved = entry.status === 'approved';
  return (
    <article className={`rounded-lg border p-4 ${approved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${approved ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            {approved ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-sm font-black text-[var(--sea-ink)]">{approved ? labels.approved : labels.blocked}</p>
            <p className="text-xs text-[var(--sea-ink-soft)]">{new Date(entry.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-[var(--sea-ink)]">{entry.amountUsdc} USDC</p>
          <p className="text-xs text-[var(--sea-ink-soft)]">USDC {'->'} SOL</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-[var(--sea-ink)]">{entry.message}</p>
      <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
        <Landmark className="h-3.5 w-3.5" />
        {entry.route}
      </p>
    </article>
  );
}
