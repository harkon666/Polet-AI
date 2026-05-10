import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLocale } from '../hooks/use-locale';

type DemoScenario = 'block' | 'jupiter' | 'ika';
type DemoState =
  | { kind: 'idle' }
  | { kind: 'running'; scenario: DemoScenario }
  | { kind: 'blocked'; scenario: DemoScenario; reasonVariant: 'jupiter' | 'ika' }
  | {
      kind: 'allowed-jupiter';
      amount: string;
      outAmount: string;
      route: string;
    }
  | {
      kind: 'allowed-ika';
      amount: string;
      messageHash: string;
      sigScheme: string;
    };

const TRUNC = (s: string, n = 8) => `${s.slice(0, n)}…${s.slice(-4)}`;

async function mockRunBlock(): Promise<void> {
  await sleep(420);
}

async function mockRunJupiter(): Promise<{
  amount: string;
  outAmount: string;
  route: string;
}> {
  await sleep(540);
  return {
    amount: '5',
    outAmount: '0.05938',
    route: 'HumidiFi',
  };
}

async function mockRunIka(): Promise<{
  amount: string;
  messageHash: string;
  sigScheme: string;
}> {
  await sleep(600);
  return {
    amount: '5',
    messageHash: '8d8d8d8d8d8d8d8d',
    sigScheme: 'ed25519-prealpha',
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function LandingDemoWidget() {
  const { t } = useLocale();
  const [state, setState] = useState<DemoState>({ kind: 'idle' });

  const runBlock = async () => {
    setState({ kind: 'running', scenario: 'block' });
    await mockRunBlock();
    setState({ kind: 'blocked', scenario: 'block', reasonVariant: 'jupiter' });
  };

  const runJupiter = async () => {
    setState({ kind: 'running', scenario: 'jupiter' });
    const r = await mockRunJupiter();
    setState({
      kind: 'allowed-jupiter',
      amount: r.amount,
      outAmount: r.outAmount,
      route: r.route,
    });
  };

  const runIka = async () => {
    setState({ kind: 'running', scenario: 'ika' });
    const r = await mockRunIka();
    setState({
      kind: 'allowed-ika',
      amount: r.amount,
      messageHash: r.messageHash,
      sigScheme: r.sigScheme,
    });
  };

  const reset = () => setState({ kind: 'idle' });
  const isBusy = state.kind === 'running';

  return (
    <div className="qe-card flex min-h-[400px] flex-col gap-5 p-5 sm:p-6">
      {/* Mock terminal header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <span className="qe-status-dot text-[var(--palm)]" aria-hidden="true" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sea-ink-soft)]">
            {t('demoWidget.header.badge')}
          </span>
        </div>
        <span
          className="qe-pill"
          style={{ color: 'var(--sunset)', borderColor: 'var(--sunset)', background: 'var(--sunset-soft)' }}
        >
          {t('demoWidget.simulation.badge')}
        </span>
      </div>

      {/* Scenario buttons */}
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={runBlock}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('demoWidget.button.block.ariaLabel')}
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--coral)]">
              {state.kind === 'running' && state.scenario === 'block'
                ? t('demoWidget.button.block.state.running')
                : t('demoWidget.button.block.state.idle')}
            </span>
            <span className="text-sm font-semibold">25 USDC</span>
          </span>
        </button>

        <button
          type="button"
          onClick={runJupiter}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('demoWidget.button.jupiter.ariaLabel')}
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--palm)]">
              {state.kind === 'running' && state.scenario === 'jupiter'
                ? t('demoWidget.button.jupiter.state.running')
                : t('demoWidget.button.jupiter.state.idle')}
            </span>
            <span className="text-sm font-semibold">5 USDC · Jupiter</span>
          </span>
        </button>

        <button
          type="button"
          onClick={runIka}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('demoWidget.button.ika.ariaLabel')}
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--palm)]">
              {state.kind === 'running' && state.scenario === 'ika'
                ? t('demoWidget.button.ika.state.running')
                : t('demoWidget.button.ika.state.idle')}
            </span>
            <span className="text-sm font-semibold">5 USDC · Multi-chain Ika</span>
          </span>
        </button>
      </div>

      {/* Output */}
      <div className="flex-grow rounded-lg border border-[var(--line)] bg-[var(--foam)] p-4">
        {state.kind === 'idle' && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--kicker)]">
              {t('demoWidget.state.idle.title')}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              {t('demoWidget.state.idle.desc')}
            </p>
          </div>
        )}

        {state.kind === 'running' && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
            <span className="qe-status-dot" aria-hidden="true" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--sea-ink-soft)]">
              {t('demoWidget.state.running.label')}
            </p>
          </div>
        )}

        {state.kind === 'blocked' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                {t('demoWidget.state.blocked.badge')}
              </span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                {t('demoWidget.reset')} <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              {state.reasonVariant === 'jupiter'
                ? t('demoWidget.state.blocked.reason.jupiter')
                : t('demoWidget.state.blocked.reason.ika')}
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-[var(--sea-ink-soft)]">
              <li>· {t('demoWidget.state.blocked.field.code')} <span className="text-[var(--coral)]">CONFIDENTIAL_POLICY_BLOCKED</span></li>
              <li>· {t('demoWidget.state.blocked.field.leak')} <span className="text-[var(--palm)]">{t('demoWidget.state.blocked.field.leakValue')}</span></li>
              <li>· {t('demoWidget.state.blocked.field.approval')} <span className="text-[var(--coral)]">{t('demoWidget.state.blocked.field.approvalValue')}</span></li>
            </ul>
            <Link
              to="/app"
              className="qe-link text-xs"
              aria-label={t('demoWidget.live.aria.block')}
            >
              {t('demoWidget.live.cta')}
            </Link>
          </article>
        )}

        {state.kind === 'allowed-jupiter' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill qe-pill--success">{t('demoWidget.state.allowed.jupiter.badge')}</span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                {t('demoWidget.reset')} <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              {t('demoWidget.state.allowed.jupiter.body')}
            </p>
            <dl className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.jupiter.field.input')}</dt>
                <dd className="text-[var(--sea-ink)]">{state.amount} USDC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.jupiter.field.output')}</dt>
                <dd className="text-[var(--sea-ink)]">~{state.outAmount} SOL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.jupiter.field.route')}</dt>
                <dd className="text-[var(--sea-ink)]">{state.route}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.jupiter.field.execution')}</dt>
                <dd className="text-[var(--lagoon-deep)]">swap-build-fallback</dd>
              </div>
            </dl>
            <Link
              to="/app"
              className="qe-link text-xs"
              aria-label={t('demoWidget.live.aria.jupiter')}
            >
              {t('demoWidget.live.cta')}
            </Link>
          </article>
        )}

        {state.kind === 'allowed-ika' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill qe-pill--success">{t('demoWidget.state.allowed.ika.badge')}</span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                {t('demoWidget.reset')} <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              {t('demoWidget.state.allowed.ika.body')}
            </p>
            <dl className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.ika.field.amount')}</dt>
                <dd className="text-[var(--sea-ink)]">{state.amount} USDC eq.</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.ika.field.target')}</dt>
                <dd className="text-[var(--sea-ink)]">{t('demoWidget.state.allowed.ika.field.targetValue')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.ika.field.messageHash')}</dt>
                <dd className="text-[var(--sea-ink)]">{TRUNC(state.messageHash)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">{t('demoWidget.state.allowed.ika.field.scheme')}</dt>
                <dd className="text-[var(--lagoon-deep)]">{state.sigScheme}</dd>
              </div>
            </dl>
            <Link
              to="/app"
              className="qe-link text-xs"
              aria-label={t('demoWidget.live.aria.ika')}
            >
              {t('demoWidget.live.cta')}
            </Link>
          </article>
        )}
      </div>

      {/* Footer note */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--kicker)]">
        {t('demoWidget.footer.note')}
      </p>
    </div>
  );
}
