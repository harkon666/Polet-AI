import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { GateHero } from '../components/app/gate/GateHero'
import { IntentComposer } from '../components/app/gate/IntentComposer'
import { ScenarioRow } from '../components/app/gate/ScenarioRow'
import { FlowCanvas } from '../components/app/gate/FlowCanvas'
import { ActionsBar } from '../components/app/gate/ActionsBar'
import type { Rail, Scenario } from '../components/app/gate/gate-state'
import { railForScenario, scenarioForRail } from '../components/app/gate/gate-state'

/**
 * /app/gate — Polet Portal Policy Gate.
 *
 * Composes the issue 101 sealed-gate page: hero with live verdict
 * pill, intent composer (display-only amount + rail select), scenario
 * chip row, 3-node flow canvas (Agent request → Sealed gate → Rail
 * output), and the actions bar (Preview / Try blocked / Execute).
 *
 * State machine — local component state, mirrored between scenario
 * and rail so they always agree on amount + rail:
 *   - Clicking `<ScenarioRow>` chip A:
 *       scenario = A
 *       rail = railForScenario(A, prevRail)
 *   - Switching `<IntentComposer>` rail R:
 *       rail = R
 *       scenario = scenarioForRail(R, prevScenario)
 *   - Clicking "Try blocked amount" in `<ActionsBar>`:
 *       scenario = 'block-25' (rail unchanged)
 *
 * The amount slot in the composer is **display-only** (issue 101
 * decision A). Backend actions stay hardcoded to 5/25 — the chips
 * are the only way to vary the visible number, so the page can't
 * lie to operators about what will actually broadcast.
 */
export const Route = createFileRoute('/app/gate')({
  component: AppGatePage,
})

export function AppGatePage() {
  const [rail, setRail] = useState<Rail>('jupiter')
  const [scenario, setScenario] = useState<Scenario>('allow-jupiter')

  const handleScenarioChange = (next: Scenario) => {
    setScenario(next)
    setRail(railForScenario(next, rail))
  }

  const handleRailChange = (next: Rail) => {
    setRail(next)
    setScenario(scenarioForRail(next, scenario))
  }

  return (
    <section data-testid="gate-page" data-rail={rail} data-scenario={scenario}>
      <GateHero rail={rail} />
      <IntentComposer
        rail={rail}
        scenario={scenario}
        onRailChange={handleRailChange}
      />
      <ScenarioRow active={scenario} onSelect={handleScenarioChange} />
      <FlowCanvas rail={rail} scenario={scenario} />
      <ActionsBar rail={rail} onScenarioChange={handleScenarioChange} />
    </section>
  )
}
