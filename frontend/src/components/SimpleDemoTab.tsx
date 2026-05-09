import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Keypair, type Signer } from '@solana/web3.js';
import {
  Shield,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Edit3,
  Coins,
  ArrowRightLeft,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import {
  createEncryptDeposit,
  executeConfidentialTransfer,
  executeConfidentialUsdcTransfer,
  executeEncryptPolicyGraph,
  getEncryptCiphertextStatus,
  getWalletData,
  grantKey,
  requestPendingAllowedOutputDecryption,
  resolveEncryptPolicyDecision,
  setConfidentialPolicy,
  setOfficialEncryptCiphertextPolicy,
  type OfficialEncryptPolicyPreview,
} from '../lib/api';
import {
  ENCRYPT_PREALPHA_CONFIG,
  ENCRYPT_PREALPHA_EVENT_AUTHORITY,
  ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
  ENCRYPT_PREALPHA_PROGRAM_ID,
  createOfficialEncryptExecutionCiphertexts,
  createOfficialEncryptPolicyCiphertexts,
} from '../lib/official-encrypt-client';
import { useI18n } from '../lib/i18n';
import { confirmFreshTransaction, prepareFreshTransaction } from '../lib/solana-transaction';
import { Panel } from './ui/Panel';
import { PrivatePolicyTile } from './ui/PrivatePolicyTile';

interface SimpleDemoTabProps {
  agentAddresses: string[];
}

const SIMPLE_POLICY_WITNESS = [42, ...Array(31).fill(0)];

type PolicyScope = 'sol' | 'usdc';

interface OfficialEncryptPolicyRefs {
  maxPerRun: string;
  dailyCap: string;
  dailySpent: string;
  wallet: string;
  policySeq: number;
  lastRevokedSlot: number;
}

function solToLamports(value: string): string {
  const raw = value.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(raw)) {
    throw new Error('SOL amount must be positive with at most 9 decimals');
  }
  const [whole, fraction = ''] = raw.split('.');
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  if (lamports <= 0n) throw new Error('SOL amount must be positive');
  return lamports.toString();
}



export function SimpleDemoTab({ agentAddresses }: SimpleDemoTabProps) {
  const { t } = useI18n();
  const { publicKey: owner, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Active scope tab
  const [activeScope, setActiveScope] = useState<PolicyScope>('sol');

  // SOL policy states
  const [editingSolPolicy, setEditingSolPolicy] = useState(false);
  const [solMaxAmount, setSolMaxAmount] = useState('0.1');
  const [solDailyLimit, setSolDailyLimit] = useState('0.5');

  // USDC DCA policy states (full FHE graph path)
  const [editingUsdcPolicy, setEditingUsdcPolicy] = useState(false);
  const [usdcMaxAmount, setUsdcMaxAmount] = useState('10');
  const [usdcDailyLimit, setUsdcDailyLimit] = useState('20');
  const [officialEncryptPolicyRefs, setOfficialEncryptPolicyRefs] = useState<OfficialEncryptPolicyRefs | null>(null);

  // Transfer (SOL) state
  const [destination, setDestination] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.01');
  const [selectedAgent, setSelectedAgent] = useState('');

  // USDC DCA execute state
  const [usdcExecuteAmount, setUsdcExecuteAmount] = useState('5');
  const [usdcDestination, setUsdcDestination] = useState('');
  const [usdcSelectedAgent, setUsdcSelectedAgent] = useState('');
  const [usdcStage, setUsdcStage] = useState<string | null>(null);

  useEffect(() => {
    if (owner) {
      refreshData();
    }
  }, [owner]);

  useEffect(() => {
    const sessions = owner
      ? [owner.toBase58(), ...agentAddresses.filter((a) => a !== owner.toBase58())]
      : agentAddresses;

    if (sessions.length > 0 && (!selectedAgent || !sessions.includes(selectedAgent))) {
      setSelectedAgent(sessions[0]);
    }
    if (sessions.length > 0 && (!usdcSelectedAgent || !sessions.includes(usdcSelectedAgent))) {
      setUsdcSelectedAgent(sessions[0]);
    }
  }, [agentAddresses, owner]);

  const refreshData = async () => {
    if (!owner) return;
    try {
      const data = await getWalletData(owner.toBase58());
      setWalletData(data);
      if (data?.solTransferPolicy?.enabled) {
        setEditingSolPolicy(false);
      } else {
        setEditingSolPolicy(true);
      }
      const encryptCiphertexts = data?.usdcDcaPolicy?.encryptCiphertexts;
      if (encryptCiphertexts?.configured && data?.walletPda) {
        setEditingUsdcPolicy(false);
        setOfficialEncryptPolicyRefs({
          maxPerRun: encryptCiphertexts.maxPerRun,
          dailyCap: encryptCiphertexts.dailyCap,
          dailySpent: encryptCiphertexts.dailySpent,
          wallet: data.walletPda,
          policySeq: Number(data.policySeq ?? 0),
          lastRevokedSlot: Number(data.lastRevokedSlot ?? 0),
        });
      } else {
        setEditingUsdcPolicy(true);
        setOfficialEncryptPolicyRefs(null);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const signAndConfirmTransaction = async (
    transaction: string,
    additionalSigners?: Signer[],
    options: { preserveExistingSignatures?: boolean } = {}
  ) => {
    const { transaction: tx, latestBlockhash } = await prepareFreshTransaction(transaction, connection, options);
    // For robustness with extra signers we prefer a manual sign+send flow when signTransaction is available.
    if (additionalSigners && additionalSigners.length > 0 && signTransaction) {
      tx.partialSign(...additionalSigners);
      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await confirmFreshTransaction(connection, signature, latestBlockhash);
      return signature;
    }
    const signature = await sendTransaction(tx, connection, { signers: additionalSigners });
    await confirmFreshTransaction(connection, signature, latestBlockhash);
    return signature;
  };

  const saveSolPolicy = async () => {
    if (!owner) return;
    setBusy('sol-policy');
    setError(null);
    try {
      const result = await setConfidentialPolicy({
        owner: owner.toBase58(),
        maxPerRunBaseUnits: solToLamports(solMaxAmount),
        dailyCapBaseUnits: solToLamports(solDailyLimit),
        maskedWitnessDevFixture: SIMPLE_POLICY_WITNESS,
        policyScope: 'sol-transfer',
      });

      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`SOL policy saved: ${signature.slice(0, 8)}...`);
      await refreshData();
      setEditingSolPolicy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set SOL policy');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  /**
   * USDC policy is saved through the full Official Encrypt FHE pipeline:
   * 1. Browser creates Encrypt ciphertext accounts for max/daily/spent.
   * 2. Proxy builds an Encrypt deposit tx (if needed) which owner signs.
   * 3. Proxy builds the policy-registration tx which owner signs.
   * This matches the FHE path used by DemoTab.tsx.
   */
  const saveUsdcPolicy = async () => {
    if (!owner) return;
    setBusy('usdc-policy');
    setError(null);
    try {
      setUsdcStage('Creating Encrypt ciphertext accounts...');
      const ciphertexts = await createOfficialEncryptPolicyCiphertexts({
        maxPerRunUsdc: usdcMaxAmount,
        dailyCapUsdc: usdcDailyLimit,
      });

      setUsdcStage('Preparing Encrypt deposit...');
      const deposit = await createEncryptDeposit(owner.toBase58());
      if (deposit.transaction) {
        const depositSig = await signAndConfirmTransaction(deposit.transaction);
        setStatus(`Encrypt deposit: ${depositSig.slice(0, 8)}...`);
      }

      setUsdcStage('Registering FHE policy on-chain...');
      const result = await setOfficialEncryptCiphertextPolicy({
        owner: owner.toBase58(),
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
          payer: owner.toBase58(),
        },
      });
      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`USDC FHE policy saved: ${signature.slice(0, 8)}...`);
      await refreshData();
      setEditingUsdcPolicy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set USDC FHE policy');
    } finally {
      setBusy(null);
      setUsdcStage(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const isSessionAuthorized = (sessionKey: string) => {
    const now = Math.floor(Date.now() / 1000);
    return Boolean(
      walletData?.sessions?.some(
        (s: any) =>
          s?.key === sessionKey &&
          s?.authorized !== false &&
          Number(s?.expiresAt ?? 0) > now &&
          Number(s?.grantedSlot ?? 0) >= Number(walletData?.lastRevokedSlot ?? 0)
      )
    );
  };

  const isOwnerSession = owner && isSessionAuthorized(owner.toBase58());

  const grantOwnerAsSession = async () => {
    if (!owner) return;
    setBusy('grant-owner');
    setError(null);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
      const result = await grantKey({
        owner: owner.toBase58(),
        sessionKey: owner.toBase58(),
        expiresAt,
        dailyLimit: 1_000_000_000, // 1 SOL
      });
      const signature = await signAndConfirmTransaction(result.transaction);
      setStatus(`Owner granted as session: ${signature.slice(0, 8)}...`);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant owner as session');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const executeTransfer = async () => {
    if (!owner || !selectedAgent || !destination) return;
    setBusy('transfer');
    setError(null);
    try {
      const result = await executeConfidentialTransfer({
        owner: owner.toBase58(),
        sessionKey: selectedAgent,
        destination,
        amountLamports: solToLamports(transferAmount),
      });

      if (!result.allowed) {
        throw new Error(result.reason || t.simpleTransferBlocked);
      }

      if (result.transaction) {
        setStatus('Waiting for signature...');
        const { transaction, latestBlockhash } = await prepareFreshTransaction(result.transaction, connection);
        const signature = await sendTransaction(transaction, connection);
        setStatus('Confirming transfer...');
        await confirmFreshTransaction(connection, signature, latestBlockhash);
        setStatus(t.simpleTransferSuccess);
        await refreshData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setBusy(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  /**
   * Poll the allowed-output ciphertext account until the Encrypt executor marks it verified.
   */
  const pollAllowedOutputVerified = async (
    allowedOutputCiphertext: string,
    attempts = 60,
    intervalMs = 3_000
  ) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const s = await getEncryptCiphertextStatus(allowedOutputCiphertext, ENCRYPT_PREALPHA_PROGRAM_ID);
      if (s.status === 'verified') return s;
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    throw new Error('Encrypt graph output is still pending executor verification. Retry after the output ciphertext is verified.');
  };

  /**
   * Poll proxy for the final policy decision (verified-allowed / verified-blocked).
   */
  const pollEncryptPolicyDecision = async (
    allowedDecryptionRequest: string,
    expectedPolicySeq: number,
    attempts = 60,
    intervalMs = 3_000
  ): Promise<OfficialEncryptPolicyPreview> => {
    let last: OfficialEncryptPolicyPreview | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      last = await resolveEncryptPolicyDecision({
        owner: owner!.toBase58(),
        allowedDecryptionRequest,
        expectedPolicySeq,
      });
      if (last.status !== 'pending-encrypt-execution') return last;
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    return last!;
  };

  /**
   * Execute a USDC -> SOL DCA using the full FHE graph pipeline. This is the
   * equivalent of DemoTab's `submitOfficialEncryptGraph` + `runConfidentialDca`
   * in one button so the simple demo can test the FHE path end-to-end.
   */
  const executeUsdcDca = async () => {
    if (!owner || !usdcSelectedAgent) return;
    if (!officialEncryptPolicyRefs) {
      setError('USDC FHE policy must be saved on-chain first.');
      return;
    }
    // Validate session is authorized
    if (!isSessionAuthorized(usdcSelectedAgent)) {
      setError('Select an authorized session key. Grant the owner as a session first if using yourself.');
      return;
    }

    setBusy('usdc-dca');
    setError(null);
    try {
      // 1. Create execution ciphertexts for the amount
      setUsdcStage('Creating FHE source-amount ciphertext...');
      const execCiphertexts = await createOfficialEncryptExecutionCiphertexts({
        amountUsdc: usdcExecuteAmount,
      });

      // 2. Create / resolve Encrypt deposit for the graph payer (session key).
      //    When the session == owner, owner pays; otherwise the owner fee-pays for the session's deposit.
      setUsdcStage('Preparing Encrypt deposit for session...');
      const deposit = await createEncryptDeposit(
        usdcSelectedAgent,
        usdcSelectedAgent !== owner.toBase58() ? owner.toBase58() : undefined
      );
      if (deposit.transaction) {
        const depSig = await signAndConfirmTransaction(deposit.transaction, [], {
          preserveExistingSignatures: true,
        });
        setStatus(`Session encrypt deposit: ${depSig.slice(0, 8)}...`);
      }

      // 3. Build + submit the graph execution tx
      setUsdcStage('Submitting FHE policy graph...');
      const graph = await executeEncryptPolicyGraph({
        owner: owner.toBase58(),
        wallet: officialEncryptPolicyRefs.wallet,
        sessionKey: usdcSelectedAgent,
        sourceAmountCiphertext: execCiphertexts.sourceAmountCiphertext,
        maxPerRunCiphertext: officialEncryptPolicyRefs.maxPerRun,
        dailySpentCiphertext: officialEncryptPolicyRefs.dailySpent,
        dailyCapCiphertext: officialEncryptPolicyRefs.dailyCap,
        allowedOutputCiphertext: execCiphertexts.allowedOutputCiphertext,
        dailySpentOutputCiphertext: execCiphertexts.dailySpentOutputCiphertext,
        attestationSlot: officialEncryptPolicyRefs.lastRevokedSlot + 1,
        attestationPolicySeq: officialEncryptPolicyRefs.policySeq,
        encrypt: {
          encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
          config: deposit.config || ENCRYPT_PREALPHA_CONFIG,
          deposit: deposit.deposit,
          networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
          eventAuthority: deposit.eventAuthority || ENCRYPT_PREALPHA_EVENT_AUTHORITY,
          payer: usdcSelectedAgent,
        },
      });
      const graphSig = await signAndConfirmTransaction(graph.transaction, [], {
        preserveExistingSignatures: true,
      });
      setStatus(`Graph submitted: ${graphSig.slice(0, 8)}...`);

      // 4. Wait for executor to verify the allowed-output ciphertext
      setUsdcStage('Waiting for Encrypt executor to verify allowed-output...');
      await pollAllowedOutputVerified(execCiphertexts.allowedOutputCiphertext);

      // 5. Request a public decryption of the allowed-output bool
      setUsdcStage('Requesting allowed-output decryption...');
      const requestKeypair = Keypair.generate();
      const decryption = await requestPendingAllowedOutputDecryption({
        owner: owner.toBase58(),
        wallet: officialEncryptPolicyRefs.wallet,
        request: requestKeypair.publicKey.toBase58(),
        encrypt: {
          encryptProgram: ENCRYPT_PREALPHA_PROGRAM_ID,
          config: deposit.config || ENCRYPT_PREALPHA_CONFIG,
          deposit: deposit.deposit,
          networkEncryptionKey: ENCRYPT_PREALPHA_NETWORK_ENCRYPTION_KEY,
          eventAuthority: deposit.eventAuthority || ENCRYPT_PREALPHA_EVENT_AUTHORITY,
          payer: owner.toBase58(),
        },
      });
      const decryptionSig = await signAndConfirmTransaction(decryption.transaction, [requestKeypair]);
      setStatus(`Decryption requested: ${decryptionSig.slice(0, 8)}...`);

      // 6. Poll proxy for the final decision
      setUsdcStage('Resolving Encrypt policy decision...');
      const decision = await pollEncryptPolicyDecision(decryption.request, decryption.policySequence);
      if (decision.status !== 'encrypt-verified-allowed') {
        throw new Error(
          decision.status === 'encrypt-verified-blocked'
            ? 'FHE policy verified this run as BLOCKED (over-limit).'
            : 'FHE policy decision is still pending; retry shortly.'
        );
      }

      // 7. Execute the actual USDC SPL transfer, gated on-chain by the verified FHE ciphertexts
      if (!usdcDestination.trim()) {
        throw new Error('Destination wallet is required.');
      }
      setUsdcStage('Executing FHE-verified USDC transfer...');
      const amountBaseUnits = (() => {
        const [w, f = ''] = usdcExecuteAmount.trim().split('.');
        return (BigInt(w) * 1_000_000n + BigInt(f.padEnd(6, '0').slice(0, 6))).toString();
      })();
      const transferResult = await executeConfidentialUsdcTransfer({
        owner: owner.toBase58(),
        sessionKey: usdcSelectedAgent,
        destination: usdcDestination.trim(),
        amountBaseUnits,
        allowedDecryptionRequest: decryption.request,
      });

      if (!transferResult.allowed || !transferResult.transaction) {
        throw new Error(transferResult.reason || 'USDC transfer was blocked by Polet policy.');
      }

      setUsdcStage('Signing USDC SPL transfer...');
      const transferSig = await signAndConfirmTransaction(transferResult.transaction);
      setStatus(
        `USDC FHE transfer executed: ${transferSig.slice(0, 8)}... → ${transferResult.destinationUsdcAccount?.slice(0, 8) ?? ''}`
      );
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'USDC FHE DCA failed');
    } finally {
      setBusy(null);
      setUsdcStage(null);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  if (loading) {
    return <div className="animate-pulse py-12 text-center text-[var(--sea-ink-soft)]">Loading...</div>;
  }

  const solPolicyEnabled = walletData?.solTransferPolicy?.enabled;
  const usdcPolicyEnabled = Boolean(walletData?.usdcDcaPolicy?.enabled && walletData?.usdcDcaPolicy?.encryptCiphertexts?.configured);
  const sessionOptions = owner
    ? [owner.toBase58(), ...agentAddresses.filter((a) => a !== owner.toBase58())]
    : agentAddresses;

  return (
    <div className="space-y-6">
      {/* Scoped Policy Panel */}
      <section>
        <Panel icon={<Shield className="h-5 w-5" />} title={t.policyTitle}>
          <p className="mb-4 text-sm leading-6 text-[var(--sea-ink-soft)]">{t.simpleBody}</p>

          {/* Scope Tabs */}
          <div className="mb-4 flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-1">
            <button
              onClick={() => setActiveScope('sol')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                activeScope === 'sol'
                  ? 'bg-[var(--lagoon-deep)] text-white shadow-sm'
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <Coins className="h-4 w-4" />
              SOL Transfer
              {solPolicyEnabled && <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />}
            </button>
            <button
              onClick={() => setActiveScope('usdc')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-all ${
                activeScope === 'usdc'
                  ? 'bg-[var(--lagoon-deep)] text-white shadow-sm'
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              USDC DCA (FHE)
              {usdcPolicyEnabled && <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />}
            </button>
          </div>

          {/* SOL Transfer Policy */}
          {activeScope === 'sol' && (
            <div className="animate-fadeIn">
              {editingSolPolicy ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleMaxAmount}</span>
                      <div className="relative">
                        <input
                          value={solMaxAmount}
                          onChange={(e) => setSolMaxAmount(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleDailyLimit}</span>
                      <div className="relative">
                        <input
                          value={solDailyLimit}
                          onChange={(e) => setSolDailyLimit(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">SOL</span>
                      </div>
                    </label>
                  </div>
                  <p className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-2 text-[11px] text-[var(--sea-ink-soft)]">
                    SOL policy uses the legacy masked-witness fixture (non-FHE) — lightweight gate for the native transfer demo.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={saveSolPolicy}
                      disabled={Boolean(busy)}
                      className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === 'sol-policy' ? 'Signing...' : `${t.savePolicy} (SOL)`}
                    </button>
                    {solPolicyEnabled && (
                      <button
                        onClick={() => setEditingSolPolicy(false)}
                        className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)]"
                      >
                        {t.confirmCancel}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PrivatePolicyTile label={t.simpleMaxAmount} unit="SOL" disabled={Boolean(busy)} />
                    <PrivatePolicyTile label={t.simpleDailyLimit} unit="SOL" disabled={Boolean(busy)} />
                  </div>
                  <button
                    onClick={() => setEditingSolPolicy(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" />
                    {t.editPolicy}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* USDC DCA Policy (FHE) */}
          {activeScope === 'usdc' && (
            <div className="animate-fadeIn">
              {editingUsdcPolicy ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Max USDC per DCA run</span>
                      <div className="relative">
                        <input
                          value={usdcMaxAmount}
                          onChange={(e) => setUsdcMaxAmount(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">USDC</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Daily USDC DCA limit</span>
                      <div className="relative">
                        <input
                          value={usdcDailyLimit}
                          onChange={(e) => setUsdcDailyLimit(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg px-3 py-2 text-sm"
                        />
                        <span className="absolute right-3 top-2 text-xs text-[var(--sea-ink-soft)]">USDC</span>
                      </div>
                    </label>
                  </div>
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] font-medium text-amber-600">
                    USDC policy uses the <strong>full Official Encrypt FHE graph</strong>. Saving this policy creates on-chain Encrypt ciphertext accounts — owner will sign 1–2 transactions.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={saveUsdcPolicy}
                      disabled={Boolean(busy)}
                      className="rounded-lg bg-[var(--lagoon-deep)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === 'usdc-policy' ? usdcStage ?? 'Signing...' : `${t.savePolicy} (USDC FHE)`}
                    </button>
                    {usdcPolicyEnabled && (
                      <button
                        onClick={() => setEditingUsdcPolicy(false)}
                        className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)]"
                      >
                        {t.confirmCancel}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PrivatePolicyTile label="Max USDC per DCA run" unit="USDC" disabled={Boolean(busy)} />
                    <PrivatePolicyTile label="Daily USDC DCA limit" unit="USDC" disabled={Boolean(busy)} />
                  </div>
                  <button
                    onClick={() => setEditingUsdcPolicy(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
                  >
                    <Edit3 className="h-4 w-4" />
                    {t.editPolicy}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scope status pills */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                solPolicyEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Coins className="h-3 w-3" />
              SOL: {solPolicyEnabled ? 'Active (masked witness)' : 'Not set'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                usdcPolicyEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <ArrowRightLeft className="h-3 w-3" />
              USDC DCA: {usdcPolicyEnabled ? 'Active (FHE)' : 'Not set'}
            </span>
          </div>
        </Panel>
      </section>

      {/* Two Execute Transfer sections side-by-side */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Panel: SOL Shielded Transfer (non-FHE) */}
        <Panel icon={<Send className="h-5 w-5" />} title={`${t.simpleTransferTitle} · SOL`}>
          <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">
            Native SOL transfer gated by the <strong>masked-witness</strong> policy (non-FHE).
          </p>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.simpleDestination}</span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t.simpleDestinationPlaceholder}
                className="w-full rounded-lg px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">{t.amount} (SOL)</span>
                <input
                  type="number"
                  step="0.001"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Session</span>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                >
                  {sessionOptions.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr === owner?.toBase58() ? 'Owner (Me)' : `${addr.slice(0, 4)}...${addr.slice(-4)}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedAgent === owner?.toBase58() && !isOwnerSession && (
              <button
                onClick={grantOwnerAsSession}
                disabled={Boolean(busy)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {busy === 'grant-owner' ? 'Signing...' : 'Grant Owner as Session Key (required once)'}
              </button>
            )}

            <button
              onClick={executeTransfer}
              disabled={
                Boolean(busy) ||
                !destination ||
                !selectedAgent ||
                !solPolicyEnabled ||
                (selectedAgent === owner?.toBase58() && !isOwnerSession)
              }
              className="w-full rounded-lg bg-[var(--lagoon-deep)] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'transfer'
                ? '...'
                : !solPolicyEnabled
                ? 'Set SOL Policy First'
                : selectedAgent === owner?.toBase58() && !isOwnerSession
                ? 'Grant Owner Session First ↑'
                : !destination
                ? 'Enter Destination'
                : t.simpleTransferTitle}
            </button>

            {!solPolicyEnabled && (
              <p className="mt-2 text-center text-[10px] font-medium text-amber-600 animate-pulse">
                ⚠️ Please save a SOL policy above to enable transfers.
              </p>
            )}
          </div>
        </Panel>

        {/* Panel: USDC SPL Transfer (full FHE graph) */}
        <Panel icon={<Sparkles className="h-5 w-5" />} title="Execute USDC Transfer · Full FHE Graph">
          <p className="mb-3 text-xs text-[var(--sea-ink-soft)]">
            USDC SPL transfer from PDA custody to any wallet, gated on-chain by the{' '}
            <strong>Official Encrypt FHE graph</strong>. Flow: create execution ciphertext → submit graph →
            poll verified → request decryption → resolve decision → contract-enforced FHE transfer.
          </p>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">
                Destination Wallet (proxy derives USDC ATA)
              </span>
              <input
                type="text"
                value={usdcDestination}
                onChange={(e) => setUsdcDestination(e.target.value)}
                placeholder="Masukkan alamat Solana tujuan"
                className="w-full rounded-lg px-3 py-2 font-mono text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Amount (USDC)</span>
                <input
                  type="number"
                  step="0.01"
                  value={usdcExecuteAmount}
                  onChange={(e) => setUsdcExecuteAmount(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--sea-ink-soft)]">Session</span>
                <select
                  value={usdcSelectedAgent}
                  onChange={(e) => setUsdcSelectedAgent(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                >
                  {sessionOptions.map((addr) => (
                    <option key={addr} value={addr}>
                      {addr === owner?.toBase58() ? 'Owner (Me)' : `${addr.slice(0, 4)}...${addr.slice(-4)}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {usdcSelectedAgent === owner?.toBase58() && !isOwnerSession && (
              <button
                onClick={grantOwnerAsSession}
                disabled={Boolean(busy)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {busy === 'grant-owner' ? 'Signing...' : 'Grant Owner as Session Key (required once)'}
              </button>
            )}

            <button
              onClick={executeUsdcDca}
              disabled={
                Boolean(busy) ||
                !usdcSelectedAgent ||
                !usdcPolicyEnabled ||
                !officialEncryptPolicyRefs ||
                !usdcDestination.trim() ||
                (usdcSelectedAgent === owner?.toBase58() && !isOwnerSession)
              }
              className="w-full rounded-lg bg-gradient-to-r from-[var(--lagoon-deep)] to-purple-600 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'usdc-dca'
                ? usdcStage ?? 'Running FHE graph...'
                : !usdcPolicyEnabled
                ? 'Set USDC FHE Policy First'
                : usdcSelectedAgent === owner?.toBase58() && !isOwnerSession
                ? 'Grant Owner Session First ↑'
                : !usdcDestination.trim()
                ? 'Enter Destination Wallet'
                : `Transfer ${usdcExecuteAmount || '0'} USDC (FHE)`}
            </button>

            {usdcStage && busy === 'usdc-dca' && (
              <p className="rounded-lg border border-[var(--lagoon-deep)]/20 bg-[var(--lagoon-deep)]/5 p-2 text-center text-[11px] font-semibold text-[var(--lagoon-deep)]">
                {usdcStage}
              </p>
            )}

            {!usdcPolicyEnabled && (
              <p className="text-center text-[10px] font-medium text-amber-600 animate-pulse">
                ⚠️ Please save a USDC FHE policy above to enable transfers.
              </p>
            )}

            <p className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-2 text-[10px] text-[var(--sea-ink-soft)]">
              💡 5 USDC (≤ 10 max) should be <strong>approved</strong>. Try 25 USDC to see the FHE graph return{' '}
              <strong>encrypt-verified-blocked</strong>.
            </p>
          </div>
        </Panel>
      </section>

      {/* Shared status / error banner */}
      {(error || status) && (
        <section>
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {error ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{error || status}</span>
          </div>
        </section>
      )}

      {/* Wallet Status on its own row */}
      <section>
        <Panel icon={<Lock className="h-5 w-5" />} title="Wallet Status">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">Smart Wallet PDA</p>
              <p className="break-all font-mono text-xs font-bold text-[var(--lagoon-deep)]">
                {walletData?.walletPda || '---'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">SOL Custody</p>
              <p className="text-xl font-black text-[var(--sea-ink)]">
                {(Number(walletData?.custodyBalances?.nativeSolLamports || 0) / 1_000_000_000).toFixed(4)} SOL
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-[var(--sea-ink-soft)]">USDC Custody</p>
              <p className="text-xl font-black text-[var(--sea-ink)]">
                {walletData?.custodyBalances?.usdcUi ?? '0'} USDC
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
