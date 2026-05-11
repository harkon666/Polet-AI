import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { GateHero } from '../components/app/gate/GateHero'
import { IntentComposer } from '../components/app/gate/IntentComposer'
import { ScenarioRow } from '../components/app/gate/ScenarioRow'
import { FlowCanvas } from '../components/app/gate/FlowCanvas'
import { ActionsBar } from '../components/app/gate/ActionsBar'
import type { Rail } from '../components/app/gate/gate-state'
import { matchScenarioFromInputs } from '../components/app/gate/gate-state'
import { useConsole } from '../components/app/use-console-actions'

/**
 * /app/gate — Polet Portal Policy Gate.
 *
 * Post-BYO redesign: the gate is an **owner self-test surface**.
 * The composer has a free-form USDC amount input, scenario chips
 * act as preset setters, and a single "Run trade" action:
 *
 *   1. Checks the owner wallet is registered as an authorized
 *      session on-chain. If not, surfaces an inline "Authorize
 *      yourself as session" banner.
 *   2. Evaluates the confidential policy at the entered amount.
 *      Blocked → blocked receipt, no broadcast.
 *   3. Allowed → signs + broadcasts via Phantom (owner = session
 *      for this path; one signature covers fee-payer + session-signer
 *      roles). Ika rail also progresses the lifecycle to commit a
 *      signature on-chain.
 *
 * The AI agent execution path is separate — agents run via
 * Hermes / Claude / Cursor / SendAI against the SDK and MCP, with
 * their own session keys. Multiple sessions can coexist (owner
 * self-session + multiple BYO agent sessions).
 */
export const Route = createFileRoute('/app/gate')({
  component: AppGatePage,
})

export function AppGatePage() {
  const { state } = useConsole()
  const [rail, setRail] = useState<Rail>('jupiter')
  const policySealed = Boolean(state.data?.usdcDcaPolicy?.enabled)
  // Default amount: if the owner already sealed a policy, start at
  // half the (encrypted) max-per-run so the field is near-always
  // "allowed" on first render. That's best-effort since the plaintext
  // is encrypted; we fall back to 5 USDC when no policy / no hints.
  const defaultAmount = useMemo(
    () => (policySealed ? '5' : '5'),
    [policySealed],
  )
  const [amountUsdc, setAmountUsdc] = useState<string>(defaultAmount)
  const activeScenario = matchScenarioFromInputs(amountUsdc, rail)

  const handlePresetSelect = (preset: { amount: string; rail: Rail | null }) => {
    setAmountUsdc(preset.amount)
    if (preset.rail) setRail(preset.rail)
  }

  return (
    <section
      data-testid="gate-page"
      data-rail={rail}
      data-scenario={activeScenario ?? 'custom'}
    >
      <GateHero rail={rail} />
      <IntentComposer
        rail={rail}
        amountUsdc={amountUsdc}
        onAmountChange={setAmountUsdc}
        onRailChange={setRail}
      />
      <ScenarioRow active={activeScenario} onPresetSelect={handlePresetSelect} />
      <FlowCanvas
        rail={rail}
        amountUsdc={amountUsdc}
      />
      <ActionsBar rail={rail} amountUsdc={amountUsdc} />
    </section>
  )
}
