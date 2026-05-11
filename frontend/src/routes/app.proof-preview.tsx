import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLocale } from '#/hooks/use-locale'
import { ConsoleContext } from '../components/app/use-console-actions'
import type { ConsoleState } from '../components/app/use-console-actions'
import { ProofTimeline } from '../components/app/proof/ProofTimeline'

/**
 * /app/proof-preview — dev-only visual audit route for Proof Trail.
 *
 * Renders three canonical timeline states side-by-side so reviewers
 * can see every status tag tone + the proof-panel expand affordance:
 *
 *   1. Empty (no receipts)
 *   2. Mixed (allowed Jupiter + blocked + info policy seal)
 *   3. Ika allowed with proof artifacts
 *
 * Bypasses `<ConsoleStateProvider>` by injecting fake state via
 * `<ConsoleContext.Provider>`, mirroring the workspace/gate previews.
 */
export const Route = createFileRoute('/app/proof-preview')({
  component: ProofPreviewPage,
})

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
    publicKey: null,
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

const mixed: ConsoleState = makeState({
  receipts: [
    {
      id: 'r-jup-allow',
      timestamp: Date.now() - 8_000,
      action: 'JUPITER APPROVED 5 USDC',
      description: '5 USDC → SOL',
      body: 'Route preview ready, owner policy remains sealed.',
      status: 'allowed',
      signature:
        '5xVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1ZxVc8RZ2t8M2L4vWQ1Zxx',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jupiterProof: {
        inputToken: { symbol: 'USDC', isVerified: true },
        outputToken: { symbol: 'SOL', isVerified: true },
        executionPath: 'jupiter-route',
        quote: {
          slippageBps: 25,
          priceImpactPct: '0.001',
          inputAmount: '5',
          expectedOutput: '0.0123',
          minimumOutput: '0.0120',
          routeLabel: 'Orca · Whirlpool',
        },
        routeSteps: 1,
        primaryDex: 'Orca',
        smartWalletAuthority: 'PDA1111111111111111111111111111111111111111',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
    {
      id: 'r-jup-blk',
      timestamp: Date.now() - 60_000,
      action: 'JUPITER BLOCKED 25 USDC',
      description: '25 USDC over the sealed cap',
      status: 'blocked',
      constraintRefs: {
        numericLimit: 'fail',
        scopeMatch: 'pass',
        sessionActive: 'pass',
      },
    },
    {
      id: 'r-policy',
      timestamp: Date.now() - 5 * 60_000,
      action: 'POLICY SEALED',
      description: 'cap 25 USDC · 4 trades / 24h · cooldown 6h',
      status: 'info',
    },
  ],
})

const ikaAllowed: ConsoleState = makeState({
  receipts: [
    {
      id: 'r-ika',
      timestamp: Date.now() - 2_000,
      action: 'IKA APPROVED',
      description: 'Sui dWallet message approved',
      body: 'Signature scheme: ed25519. Settlement boundary: cli-confirmed.',
      status: 'allowed',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ikaProof: {
        dwalletAccount: 'DWallet1111111111111111111111111111111111',
        messageApprovalPda: 'MsgApprov1111111111111111111111111111111',
        cpiAuthorityPda: 'CpiAuth1111111111111111111111111111111111',
        ikaMessageHash: '0x1234567890abcdef1234567890abcdef',
        destinationDigest: { chain: 'sui', digestBase58: 'SuiDigest1234567890' },
        signatureScheme: 'ed25519',
        settlement: 'cli-confirmed',
        canonicalOrderHash: '0xfedcba0987654321fedcba0987654321',
        policyAttestationHash: '0xabcdef0123456789abcdef0123456789',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
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
        <header className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright">
            {t('portal.proof.kicker')}
          </p>
          <h2 className="mt-1 font-sans text-2xl font-bold text-ink">
            {t('portal.proof.title')}
          </h2>
        </header>
        <ProofTimeline />
      </section>
    </PreviewProvider>
  )
}

export function ProofPreviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-coral/40 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          DEV PREVIEW · NOT WIRED TO REAL STATE
        </p>
        <h1 className="mt-2 font-sans text-2xl font-bold text-ink">
          Proof Trail visual audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Three canonical receipt-feed states rendered against the
          full ProofTimeline. Use this for design review only.
        </p>
      </header>

      <PreviewPanel label="1 · empty" state={empty} />
      <PreviewPanel label="2 · mixed (allowed + blocked + info)" state={mixed} />
      <PreviewPanel label="3 · ika allowed" state={ikaAllowed} />
    </div>
  )
}
