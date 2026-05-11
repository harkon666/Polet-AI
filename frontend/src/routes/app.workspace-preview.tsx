import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ConsoleContext } from '../components/app/use-console-actions'
import type { ConsoleState } from '../components/app/use-console-actions'
import { WorkspaceHero } from '../components/app/workspace/WorkspaceHero'
import { ReadinessStrip } from '../components/app/workspace/ReadinessStrip'
import { ContinueCTA } from '../components/app/workspace/ContinueCTA'
import { ActivityLine } from '../components/app/workspace/ActivityLine'

/**
 * /app/workspace-preview — dev-only visual audit route.
 *
 * Renders the full Workspace composition (WorkspaceHero +
 * ReadinessStrip + ContinueCTA + ActivityLine) four times against
 * canonical state snapshots so design + product reviewers can see
 * every readiness branch in one screenshot:
 *
 *   1. Blocking on wallet (initial connect, nothing set up)
 *   2. Mid-progress (wallet + custody done, blocking on policy)
 *   3. Blocking on gas (everything but agent gas)
 *   4. All ready (every slot done, primary CTA flips to /app/gate)
 *
 * Bypasses `<ConsoleStateProvider>` by injecting a fake context
 * value directly via `<ConsoleContext.Provider>`. Action handlers
 * are no-ops since the preview is read-only.
 *
 * Lives outside the production navigation surface — operators won't
 * stumble onto this from the sidebar. Kept around for future visual
 * reviews instead of being deleted after Phase 2 sign-off.
 */
export const Route = createFileRoute('/app/workspace-preview')({
  component: WorkspacePreviewPage,
})

const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600

const STUB_PUBKEY = {
  toBase58: () => 'PR3VWA1k1tttttttttttttttttttttttttttttttttt',
}

const STUB_KEYPAIR = {
  publicKey: { toBase58: () => 'AGENTk1tttttttttttttttttttttttttttttttttttt' },
}

const baseState = (): ConsoleState => ({
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
})

const blockingWallet: ConsoleState = baseState()

const blockingPolicy: ConsoleState = {
  ...baseState(),
  data: {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '5' },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
}

const blockingGas: ConsoleState = {
  ...baseState(),
  data: {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '5' },
    usdcDcaPolicy: { enabled: true },
    policySeq: 7,
    temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  receipts: [
    {
      id: 'rc-1',
      timestamp: Date.now() - 47_000,
      action: 'POLICY SEALED',
      description: 'cap 25 USDC · 4 trades / 24h · cooldown 6h',
      status: 'info',
    },
  ],
}

const allReady: ConsoleState = {
  ...baseState(),
  data: {
    walletPda: 'PDA1111111111111111111111111111111111111111',
    demoCustody: { configured: true },
    custodyBalances: { usdcUi: '17.5' },
    usdcDcaPolicy: { enabled: true },
    policySeq: 7,
    temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionKeypair: STUB_KEYPAIR as any,
  receipts: [
    {
      id: 'rc-jup',
      timestamp: Date.now() - 12_000,
      action: 'JUPITER ALLOWED',
      description: '5 USDC → WSOL DCA',
      status: 'allowed',
    },
    {
      id: 'rc-gas',
      timestamp: Date.now() - 5 * 60_000,
      action: 'SOL FUNDED TO AGENT',
      description: 'Funded 0.02 SOL',
      status: 'allowed',
    },
  ],
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

function PreviewPanel({
  label,
  state,
}: {
  label: string
  state: ConsoleState
}) {
  return (
    <PreviewProvider state={state}>
      <section className="border-t border-line pt-8">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          PREVIEW · {label}
        </p>
        <WorkspaceHero />
        <ReadinessStrip />
        <ContinueCTA />
        <ActivityLine />
      </section>
    </PreviewProvider>
  )
}

export function WorkspacePreviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-coral/40 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          DEV PREVIEW · NOT WIRED TO REAL STATE
        </p>
        <h1 className="mt-2 font-sans text-2xl font-bold text-ink">
          Workspace visual audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Four canonical readiness states rendered against the full
          Workspace composition. Use this for design review only.
        </p>
      </header>

      <PreviewPanel label="1 · blocking on wallet" state={blockingWallet} />
      <PreviewPanel label="2 · blocking on policy" state={blockingPolicy} />
      <PreviewPanel label="3 · blocking on gas" state={blockingGas} />
      <PreviewPanel label="4 · all rails ready" state={allReady} />
    </div>
  )
}
