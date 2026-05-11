import { createFileRoute } from '@tanstack/react-router'
import { PortalPagePlaceholder } from '../components/app/portal/PortalPagePlaceholder'

/**
 * /app/gate — Phase 1 placeholder.
 *
 * Phase 3 (issue 101) replaces this with `<GateHero>` +
 * `<IntentComposer>` + `<ScenarioRow>` + `<FlowCanvas>` +
 * `<ActionsBar>` wired to the existing rail actions on
 * `useConsole()`.
 */
export const Route = createFileRoute('/app/gate')({
  component: AppGatePage,
})

export function AppGatePage() {
  return (
    <PortalPagePlaceholder
      kickerKey="portal.placeholder.kicker.gate"
      titleKey="portal.placeholder.title.gate"
      subKey="portal.placeholder.sub.gate"
    />
  )
}
