import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLocale } from '#shared/hooks/use-locale'
import { ConsoleContext } from '../components/app/use-console-actions'
import type { ConsoleState } from '../components/app/use-console-actions'
import { BridgeConfigPanel } from '../components/app/bridge/BridgeConfigPanel'
import { DownloadPoletAgentJson } from '../components/app/bridge/DownloadPoletAgentJson'

/**
 * /app/bridge-preview — dev-only visual audit route for Agent Bridge.
 *
 * Renders three canonical states side-by-side so reviewers see how
 * the bridge config block, MCP tools list, and download affordance
 * look as the operator's session progresses:
 *
 *   1. Disconnected (no owner pubkey, all placeholders)
 *   2. Owner connected, no session (POLET_OWNER set, others placeholder)
 *   3. Fully ready (owner + session keypair populated)
 *
 * The advanced `<WalletDashboard>` collapse is omitted from the
 * preview so the route stays render-cheap. Mirrors the
 * workspace/gate/funds/proof preview pattern.
 */
export const Route = createFileRoute('/app/bridge-preview')({
  component: BridgePreviewPage,
})

const STUB_OWNER = {
  toBase58: () => 'OWNER111111111111111111111111111111111111Z',
}

const STUB_SESSION = {
  publicKey: {
    toBase58: () => 'AGENTk1tttttttttttttttttttttttttttttttttttt',
  },
  secretKey: new Uint8Array(64).fill(7),
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
    connected: false as any,
    publicKey: null,
    data: null,
    solBalance: null,
    receipts: [],
    loading: null,
    error: null,
    sessionKeypair: null,
    ...over,
  }
}

const disconnected: ConsoleState = makeState({})
const ownerOnly: ConsoleState = makeState({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connected: true as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicKey: STUB_OWNER as any,
})
const fullyReady: ConsoleState = makeState({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connected: true as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicKey: STUB_OWNER as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionKeypair: STUB_SESSION as any,
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
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.bridge.kicker')}
          </p>
          <h2 className="mt-1 font-sans text-2xl font-bold text-ink">
            {t('portal.bridge.title')}
          </h2>
        </header>
        <BridgeConfigPanel />
        <DownloadPoletAgentJson />
      </section>
    </PreviewProvider>
  )
}

export function BridgePreviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-coral/40 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          DEV PREVIEW · NOT WIRED TO REAL STATE
        </p>
        <h1 className="mt-2 font-sans text-2xl font-bold text-ink">
          Agent Bridge visual audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Three canonical readiness states rendered against the bridge
          config block + download affordance. Use this for design
          review only.
        </p>
      </header>

      <PreviewPanel label="1 · disconnected" state={disconnected} />
      <PreviewPanel label="2 · owner connected, no session" state={ownerOnly} />
      <PreviewPanel label="3 · fully ready" state={fullyReady} />
    </div>
  )
}
