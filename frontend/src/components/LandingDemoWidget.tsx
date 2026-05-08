import { useState } from 'react';

type DemoScenario = 'block' | 'jupiter' | 'ika';
type DemoState =
  | { kind: 'idle' }
  | { kind: 'running'; scenario: DemoScenario }
  | { kind: 'blocked'; scenario: DemoScenario; reason: string }
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

async function mockRunBlock(scenario: 'block-jupiter' | 'block-ika'): Promise<{ reason: string }> {
  await sleep(420);
  return {
    reason:
      scenario === 'block-jupiter'
        ? 'Confidential policy rejected this run. Threshold and remaining cap stay private.'
        : 'Confidential policy rejected this Ika request. No dWallet approval data created.',
  };
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
  const [state, setState] = useState<DemoState>({ kind: 'idle' });

  const runBlock = async () => {
    setState({ kind: 'running', scenario: 'block' });
    const { reason } = await mockRunBlock('block-jupiter');
    setState({ kind: 'blocked', scenario: 'block', reason });
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
            polet · mock api
          </span>
        </div>
        <span className="qe-badge text-mono">no wallet</span>
      </div>

      {/* Scenario buttons */}
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={runBlock}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Run blocked 25 USDC scenario"
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--coral)]">
              {state.kind === 'running' && state.scenario === 'block' ? 'running…' : 'block'}
            </span>
            <span className="text-sm font-semibold">25 USDC</span>
          </span>
        </button>

        <button
          type="button"
          onClick={runJupiter}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Run allowed 5 USDC Jupiter scenario"
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--palm)]">
              {state.kind === 'running' && state.scenario === 'jupiter' ? 'running…' : 'allow'}
            </span>
            <span className="text-sm font-semibold">5 USDC · Jupiter</span>
          </span>
        </button>

        <button
          type="button"
          onClick={runIka}
          disabled={isBusy}
          className="qe-button qe-button--secondary justify-start text-left disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Run allowed 5 USDC multi-chain Ika scenario"
        >
          <span className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--palm)]">
              {state.kind === 'running' && state.scenario === 'ika' ? 'running…' : 'allow'}
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
              awaiting scenario
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)]">
              Pick one of the three runs above. Mock API responds in ~500ms.
            </p>
          </div>
        )}

        {state.kind === 'running' && (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
            <span className="qe-status-dot" aria-hidden="true" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--sea-ink-soft)]">
              policy gate evaluating
            </p>
          </div>
        )}

        {state.kind === 'blocked' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                Blocked
              </span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                Reset <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">{state.reason}</p>
            <ul className="space-y-1 font-mono text-[11px] text-[var(--sea-ink-soft)]">
              <li>· code: <span className="text-[var(--coral)]">CONFIDENTIAL_POLICY_BLOCKED</span></li>
              <li>· threshold leak: <span className="text-[var(--palm)]">none</span></li>
              <li>· dWallet approval: <span className="text-[var(--coral)]">not created</span></li>
            </ul>
          </article>
        )}

        {state.kind === 'allowed-jupiter' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill qe-pill--success">Approved · Jupiter</span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                Reset <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              In-limit DCA approved. Polet returns an unsigned smart-wallet transaction with the
              Jupiter route preview.
            </p>
            <dl className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">input</dt>
                <dd className="text-[var(--sea-ink)]">{state.amount} USDC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">est. output</dt>
                <dd className="text-[var(--sea-ink)]">~{state.outAmount} SOL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">route</dt>
                <dd className="text-[var(--sea-ink)]">{state.route}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">execution</dt>
                <dd className="text-[var(--lagoon-deep)]">swap-build-fallback</dd>
              </div>
            </dl>
          </article>
        )}

        {state.kind === 'allowed-ika' && (
          <article className="space-y-3">
            <header className="flex items-center justify-between">
              <span className="qe-pill qe-pill--success">Approved · Ika</span>
              <button type="button" onClick={reset} className="qe-link text-xs">
                Reset <span className="qe-link__arrow">↺</span>
              </button>
            </header>
            <p className="text-sm leading-6 text-[var(--sea-ink)]">
              In-limit multi-chain Ika approved. Polet prepares an unsigned <code>approve_ika_message_as_session</code>{' '}
              transaction and destination-chain digest. Settlement not executed.
            </p>
            <dl className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">amount</dt>
                <dd className="text-[var(--sea-ink)]">{state.amount} USDC eq.</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">target</dt>
                <dd className="text-[var(--sea-ink)]">Multi-chain</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">message hash</dt>
                <dd className="text-[var(--sea-ink)]">{TRUNC(state.messageHash)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--sea-ink-soft)]">scheme</dt>
                <dd className="text-[var(--lagoon-deep)]">{state.sigScheme}</dd>
              </div>
            </dl>
          </article>
        )}
      </div>

      {/* Footer note */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--kicker)]">
        Mock API · No private key · No real funds · Run on /app for the live devnet flow
      </p>
    </div>
  );
}
