import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceHero } from '../components/app/workspace/WorkspaceHero'
import { ReadinessStrip } from '../components/app/workspace/ReadinessStrip'
import { ContinueCTA } from '../components/app/workspace/ContinueCTA'
import { ActivityLine } from '../components/app/workspace/ActivityLine'

/**
 * /app/workspace — Polet Portal home.
 *
 * State-aware launchpad driven by `console-selectors`:
 *   - `<WorkspaceHero>` names the next blocking step in operator
 *     language (or celebrates "all rails ready").
 *   - `<ReadinessStrip>` shows all five slots at a glance
 *     (wallet · custody · policy · session · gas).
 *   - `<ContinueCTA>` routes to the page that unblocks the current
 *     slot (Funds for wallet/custody/policy, Bridge for session/gas,
 *     Gate when everything is ready).
 *   - `<ActivityLine>` surfaces the latest receipt with a jump into
 *     the Proof Trail page.
 *
 * No card walls — the whitespace + hairline rhythm is intentional
 * and matches the rest of the Portal.
 */
export const Route = createFileRoute('/app/workspace')({
  component: AppWorkspacePage,
})

export function AppWorkspacePage() {
  return (
    <section data-testid="workspace-page" className="flex flex-col">
      <WorkspaceHero />
      <ReadinessStrip />
      <ContinueCTA />
      <ActivityLine />
    </section>
  )
}
