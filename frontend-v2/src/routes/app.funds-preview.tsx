import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLocale } from '#shared/hooks/use-locale'
import { ConsoleContext } from '../components/app/use-console-actions'
import type { ConsoleState } from '../components/app/use-console-actions'
import { FundsList } from '../components/app/funds/FundsList'
import { QuickActions } from '../components/app/funds/QuickActions'
import { OwnerSetupList } from '../components/app/funds/OwnerSetupList'

/**
 * /app/funds-preview — dev-only visual audit route for Funds & Setup.
 *
 * Renders three canonical states side-by-side so design + product
 * reviewers can audit each progression at one glance:
 *
 *   1. Empty (no PDA, no custody, no policy, no session)
 *   2. Partial (PDA + custody registered, no policy yet)
 *   3. Fully ready (everything done, USDC funded, session keypair held)
 *
 * Bypasses `<ConsoleStateProvider>` by injecting fake state via
 * `<ConsoleContext.Provider>`. Mirrors the `app.workspace-preview.tsx`
 * and `app.gate-preview.tsx` patterns.
 */
export const Route = createFileRoute('/app/funds-preview')({
  component: FundsPreviewPage,
})

const FUTURE = Math.floor(Date.now() / 1000) + 3600

const STUB_PUBKEY = {
  toBase58: () => 'PR3VWA1k1tttttttttttttttttttttttttttttttttt',
}

const STUB_KEYPAIR = {
  publicKey: { toBase58: () => 'AGENTk1tttttttttttttttttttttttttttttttttttt' },
}

const NOOP_ACTIONS = new Proxy(
  {},
  {
    get:
      () =>
      async () => {
        // no-op
      },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) as any

function makeState(over: Partial<ConsoleState>): ConsoleState {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connected: true as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicKey: STUB_PUBKEY as any,
    data: null,
    solBalance: 1,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
    ...over,
  }
}

const empty: ConsoleState = makeState({})

const partial: ConsoleState = makeState({
  data: {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '5', nativeSolUi: '0.05' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
})

const fullyReady: ConsoleState = makeState({
  data: {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '17.5', nativeSolUi: '0.05' },
    usdcDcaPolicy: { enabled: true },
    policySeq: 7,
    temporalKeys: [
      { authorized: true, expiresAt: FUTURE, pubkey: 'AGENT11111111111111111111' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
    ikaManaged: {
      registration: { label: 'managed-curve25519', curve: 2 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionKeypair: STUB_KEYPAIR as any,
  receipts: [
    {
      id: 'r-gas',
      timestamp: Date.now() - 5_000,
      action: 'SOL FUNDED TO AGENT',
      description: 'funded 0.02 SOL',
      status: 'allowed',
    },
  ],
})

function PreviewProvider({
  state,
  children,
}: {
  state: ConsoleState
  children: ReactNode
}) {
  return (
    <ConsoleContext.Provider value={{ state, actions: NOOP_ACTIONS }}>
      {children}
    </ConsoleContext.Provider>
  )
}

function PreviewPanel({ label, state }: { label: string; state: ConsoleState }) {
  const { t } = useLocale()
  return (
    <PreviewProvider state={state}>
      <section className="border-t border-line pt-8">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          PREVIEW · {label}
        </p>
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.funds.kicker')}
          </p>
          <h2 className="mt-1 font-sans text-2xl font-bold text-ink">
            {t('portal.funds.title')}
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-14">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {t('portal.funds.column.fundsTitle')}
            </p>
            <FundsList />
            <QuickActions />
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {t('portal.funds.column.setupTitle')}
            </p>
            <OwnerSetupList />
          </div>
        </div>
      </section>
    </PreviewProvider>
  )
}

export function FundsPreviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-coral/40 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          DEV PREVIEW · NOT WIRED TO REAL STATE
        </p>
        <h1 className="mt-2 font-sans text-2xl font-bold text-ink">
          Funds &amp; Setup visual audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Three canonical readiness states rendered against the full
          Funds composition. Use this for design review only.
        </p>
      </header>

      <PreviewPanel label="1 · empty" state={empty} />
      <PreviewPanel label="2 · partial (wallet + custody)" state={partial} />
      <PreviewPanel label="3 · fully ready" state={fullyReady} />
    </div>
  )
}
