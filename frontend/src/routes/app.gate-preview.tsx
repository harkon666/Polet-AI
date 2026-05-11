import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ConsoleContext } from '../components/app/use-console-actions'
import type { ConsoleState } from '../components/app/use-console-actions'
import { GateHero } from '../components/app/gate/GateHero'
import { IntentComposer } from '../components/app/gate/IntentComposer'
import { ScenarioRow } from '../components/app/gate/ScenarioRow'
import { FlowCanvas } from '../components/app/gate/FlowCanvas'
import { ActionsBar } from '../components/app/gate/ActionsBar'
import type { Rail } from '../components/app/gate/gate-state'
import { matchScenarioFromInputs } from '../components/app/gate/gate-state'

/**
 * /app/gate-preview — dev-only visual audit route for the Policy Gate.
 *
 * Renders four canonical states of the gate composition side-by-side
 * so design + product reviewers can audit every verdict tone in one
 * screenshot:
 *
 *   1. Idle (no receipts yet, default Jupiter)
 *   2. Allow verdict (last receipt: JUPITER APPROVED)
 *   3. Block verdict (last receipt: JUPITER BLOCKED)
 *   4. Evaluating (state.loading mid-flight)
 *
 * Bypasses `<ConsoleStateProvider>` by injecting fake state values
 * directly via `<ConsoleContext.Provider>`. Action handlers are
 * no-ops because the preview is read-only.
 *
 * Mirrors the structure of `/app/workspace-preview` so this becomes a
 * pattern: each phase ships a `<page>-preview` route to support
 * visual audits without a connected wallet.
 */
export const Route = createFileRoute('/app/gate-preview')({
  component: GatePreviewPage,
})

const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600

const STUB_PUBKEY = {
  toBase58: () => 'PR3VWA1k1tttttttttttttttttttttttttttttttttt',
}

const STUB_KEYPAIR = {
  publicKey: { toBase58: () => 'AGENTk1tttttttttttttttttttttttttttttttttttt' },
}

const baseData = {
  walletPda: 'PDA1111111111111111111111111111111111111111',
  demoCustody: { configured: true },
  custodyBalances: { usdcUi: '17.5' },
  usdcDcaPolicy: { enabled: true },
  policySeq: 7,
  policyCommitment: [
    0xa3, 0xf1, 0x5b, 0x29, 0x88, 0x2c, 0x77, 0x44, 0xee, 0x33, 0x9c, 0x55,
  ],
  temporalKeys: [{ authorized: true, expiresAt: FUTURE_EXPIRES_AT }],
  ikaManaged: {
    registration: { label: 'managed-curve25519', curve: 2 },
  },
}

function makeState(over: Partial<ConsoleState>): ConsoleState {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connected: true as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicKey: STUB_PUBKEY as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: baseData as any,
    solBalance: 1,
    receipts: [],
    loading: null,
    error: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionKeypair: STUB_KEYPAIR as any,
    ...over,
  }
}

const idle: ConsoleState = makeState({ receipts: [] })

const allowVerdict: ConsoleState = makeState({
  receipts: [
    {
      id: 'rc-jup-ok',
      timestamp: Date.now() - 12_000,
      action: 'JUPITER APPROVED 5 USDC',
      description: '5 USDC → SOL',
      status: 'allowed',
    },
  ],
})

const blockVerdict: ConsoleState = makeState({
  receipts: [
    {
      id: 'rc-jup-blk',
      timestamp: Date.now() - 8_000,
      action: 'JUPITER BLOCKED 25 USDC',
      description: '25 USDC over cap',
      status: 'blocked',
    },
  ],
})

const evaluating: ConsoleState = makeState({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loading: 'jupiter-allow' as any,
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

/**
 * A self-contained gate composition that hosts its own (scenario,
 * rail) state — so each preview panel can demonstrate independent
 * scenario selections without the previews sharing a state machine.
 */
function GateBody() {
  const [rail, setRail] = useState<Rail>('jupiter')
  const [amountUsdc, setAmountUsdc] = useState<string>('5')
  const activeScenario = matchScenarioFromInputs(amountUsdc, rail)
  return (
    <>
      <GateHero rail={rail} />
      <IntentComposer
        rail={rail}
        amountUsdc={amountUsdc}
        onAmountChange={setAmountUsdc}
        onRailChange={setRail}
      />
      <ScenarioRow
        active={activeScenario}
        onPresetSelect={(preset) => {
          setAmountUsdc(preset.amount)
          if (preset.rail) setRail(preset.rail)
        }}
      />
      <FlowCanvas
        rail={rail}
        amountUsdc={amountUsdc}
      />
      <ActionsBar rail={rail} amountUsdc={amountUsdc} />
    </>
  )
}

function PreviewPanel({ label, state }: { label: string; state: ConsoleState }) {
  return (
    <PreviewProvider state={state}>
      <section className="border-t border-line pt-8">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          PREVIEW · {label}
        </p>
        <GateBody />
      </section>
    </PreviewProvider>
  )
}

export function GatePreviewPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-coral/40 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-coral">
          DEV PREVIEW · NOT WIRED TO REAL STATE
        </p>
        <h1 className="mt-2 font-sans text-2xl font-bold text-ink">
          Policy Gate visual audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Four canonical verdict states rendered against the full Gate
          composition. Use this for design review only.
        </p>
      </header>

      <PreviewPanel label="1 · idle (no receipts)" state={idle} />
      <PreviewPanel label="2 · allow verdict" state={allowVerdict} />
      <PreviewPanel label="3 · block verdict" state={blockVerdict} />
      <PreviewPanel label="4 · evaluating" state={evaluating} />
    </div>
  )
}
