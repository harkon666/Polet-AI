import { useCallback, useEffect, useState } from 'react';
import { Landmark, Check, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import {
  enableIkaChain,
  getIkaDwalletRegistration,
  getIkaGasDepositStatus,
  getIkaManagedFixtureStatus,
  type IkaEnableChainResult,
  type IkaManagedChain,
  type IkaManagedDwalletRegistration,
  type IkaManagedGasDepositSummary,
} from '../lib/api';
import { Panel } from './ui/Panel';
import { InfoTile } from './ui/InfoTile';

const CHAIN_LABELS: Record<IkaManagedChain, string> = {
  sui: 'Sui devnet',
  ethereum: 'Ethereum Sepolia',
};

const CHAIN_CURVES: Record<IkaManagedChain, 'curve25519' | 'secp256k1'> = {
  sui: 'curve25519',
  ethereum: 'secp256k1',
};

type EnableStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; chain: IkaManagedChain }
  | { kind: 'ok'; result: IkaEnableChainResult }
  | { kind: 'error'; reason: string; code?: string };

export interface IkaSetupPanelProps {
  owner?: string;
  onEnabled?: (result: IkaEnableChainResult) => void;
  /** When true, suppresses the disclosure banner (useful inside demo-only wizards). */
  compact?: boolean;
}

export function IkaSetupPanel({ owner, onEnabled, compact = false }: IkaSetupPanelProps) {
  const [fixtureAvailable, setFixtureAvailable] = useState<boolean | null>(null);
  const [fixtureDisclosure, setFixtureDisclosure] = useState<string | null>(null);
  const [registration, setRegistration] = useState<IkaManagedDwalletRegistration | null>(null);
  const [gas, setGas] = useState<IkaManagedGasDepositSummary['status'] & { pda: string } | null>(null);
  const [enableStatus, setEnableStatus] = useState<EnableStatus>({ kind: 'idle' });

  const refreshStatus = useCallback(async () => {
    if (!owner) {
      setRegistration(null);
      setGas(null);
      return;
    }
    try {
      const [entry, gasStatus, fixture] = await Promise.all([
        getIkaDwalletRegistration(owner).catch(() => null),
        getIkaGasDepositStatus(owner).catch(() => null),
        getIkaManagedFixtureStatus().catch(() => null),
      ]);
      setRegistration(entry);
      setGas(gasStatus);
      setFixtureAvailable(Boolean(fixture));
      setFixtureDisclosure(fixture?.disclosure ?? null);
    } catch (error) {
      setFixtureAvailable(false);
      setFixtureDisclosure(null);
    }
  }, [owner]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleEnable = useCallback(
    async (chain: IkaManagedChain) => {
      if (!owner) return;
      setEnableStatus({ kind: 'loading', chain });
      try {
        const result = await enableIkaChain({
          owner,
          chain,
          curve: CHAIN_CURVES[chain],
        });
        setEnableStatus({ kind: 'ok', result });
        setRegistration(result.registry);
        setGas({
          pda: result.gasDeposit.pda,
          ...result.gasDeposit.status,
        });
        setFixtureDisclosure(result.fixtureDisclosure);
        onEnabled?.(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to enable chain';
        const codeMatch = /MANAGED_FIXTURE_MISSING/.test(message) ? 'MANAGED_FIXTURE_MISSING' : undefined;
        setEnableStatus({ kind: 'error', reason: message, code: codeMatch });
      }
    },
    [owner, onEnabled]
  );

  const currentChainLabel = registration?.label?.startsWith('managed-')
    ? registration.label.replace('managed-', '')
    : null;

  return (
    <Panel icon={<Landmark className="h-5 w-5" />} title="Multi-chain signer (Ika managed demo)" testId="ika-setup-panel">
      {!compact && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold uppercase tracking-wide">Demo managed mode</p>
            <p className="mt-1 leading-5">
              Polet reuses a pre-generated Ika dWallet for hackathon demos (pre-alpha mock signer). Production path will
              generate a per-user dWallet with zero-trust WASM DKG; production MPC and settlement are not claimed here.
            </p>
            {fixtureDisclosure && (
              <p className="mt-1 text-[11px] italic text-amber-600/80">{fixtureDisclosure}</p>
            )}
          </div>
        </div>
      )}

      {fixtureAvailable === false && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold uppercase tracking-wide">Managed fixture not configured</p>
            <p className="mt-1 leading-5">
              Operator must run the managed fixture setup once. See{' '}
              <code className="rounded bg-red-500/20 px-1">docs/ika-devnet-smoke-runbook.md</code> (Managed Demo Mode).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          label="dWallet"
          value={registration ? shortenHex(registration.dwalletPublicKeyHex) : 'Not enabled'}
          tone={registration ? 'green' : 'amber'}
          small
        />
        <InfoTile
          label="CPI authority"
          value={registration ? truncateMiddle(registration.transferredAuthority) : 'Not enabled'}
          small
        />
        <InfoTile
          label="Curve"
          value={registration ? (registration.curve === 2 ? 'Curve25519 (Sui)' : 'Secp256k1 (ETH)') : '—'}
          small
        />
        <InfoTile
          label="Gas deposit"
          value={gas ? gasSummaryText(gas) : 'Not funded'}
          tone={gas?.passes ? 'green' : 'amber'}
          small
        />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {(['sui', 'ethereum'] as const).map((chain) => {
          const isThis = registration && currentChainLabel === CHAIN_CURVES[chain];
          const pending = enableStatus.kind === 'loading' && enableStatus.chain === chain;
          return (
            <button
              key={chain}
              type="button"
              disabled={!owner || pending || fixtureAvailable === false}
              onClick={() => void handleEnable(chain)}
              data-testid={`ika-enable-${chain}`}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--lagoon-deep)] px-3 py-3 text-[11px] font-extrabold uppercase tracking-tight text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : isThis ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Landmark className="h-3.5 w-3.5" />
              )}
              {pending ? `Enabling ${CHAIN_LABELS[chain]}…` : `Enable ${CHAIN_LABELS[chain]}`}
            </button>
          );
        })}
      </div>

      {enableStatus.kind === 'ok' && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-700">
          <p className="font-semibold uppercase tracking-wide">
            {CHAIN_LABELS[enableStatus.result.chain]} signer ready
          </p>
          <p className="mt-1 leading-5">
            dWallet {shortenHex(enableStatus.result.registry.dwalletPublicKeyHex)} bound to your owner key.
            {' '}
            {enableStatus.result.gasDeposit.action === 'funded-by-subsidy' && 'GasDeposit funded by Polet subsidy.'}
            {enableStatus.result.gasDeposit.action === 'already-funded' && 'GasDeposit already meets the floor.'}
            {enableStatus.result.gasDeposit.action === 'gas-deposit-required' && 'GasDeposit still needs funding (see runbook).'}
            {enableStatus.result.gasDeposit.action === 'funding-skipped' && 'GasDeposit funding skipped by operator.'}
          </p>
          {enableStatus.result.gasDeposit.subsidyTxSignature && (
            <p className="mt-1 text-[11px] text-green-700/80">
              Subsidy tx:{' '}
              <a
                className="underline"
                href={`https://explorer.solana.com/tx/${enableStatus.result.gasDeposit.subsidyTxSignature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                {enableStatus.result.gasDeposit.subsidyTxSignature.slice(0, 24)}…
              </a>
            </p>
          )}
          {!enableStatus.result.authorityVerification.ok && (
            <p className="mt-1 text-[11px] text-amber-600">
              ⚠ {enableStatus.result.authorityVerification.warning}
            </p>
          )}
        </div>
      )}

      {enableStatus.kind === 'error' && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
          <p className="font-semibold uppercase tracking-wide">Enable failed</p>
          <p className="mt-1 leading-5">{enableStatus.reason}</p>
          {enableStatus.code === 'MANAGED_FIXTURE_MISSING' && (
            <p className="mt-1 text-[11px] italic">
              Operator needs to run <code>scripts/ika-setup-managed-fixture.ts</code> to produce the demo fixture before
              users can enable chains.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function shortenHex(hex: string | undefined): string {
  if (!hex) return '—';
  if (hex.length <= 16) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-8)}`;
}

function truncateMiddle(value: string | undefined): string {
  if (!value) return '—';
  if (value.length <= 16) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function gasSummaryText(gas: IkaManagedGasDepositSummary['status'] & { pda: string }): string {
  if (!gas.exists) return 'Not created';
  if (!gas.passes) {
    const ika = gas.observed?.ikaBalance ?? '0';
    return `Under floor (${ika} IKA base units)`;
  }
  return `Ready (${gas.observed?.ikaBalance ?? '0'} IKA)`;
}
