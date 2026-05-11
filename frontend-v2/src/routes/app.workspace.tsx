import { createFileRoute } from '@tanstack/react-router'
import { PortalPagePlaceholder } from '../components/app/portal/PortalPagePlaceholder'

/**
 * /app/workspace — Phase 1 placeholder.
 *
 * Phase 2 (issue 100) replaces this with `<WorkspaceHero>` +
 * `<ReadinessStrip>` + `<ContinueCTA>` + `<ActivityLine>` driven by
 * the new `console-selectors.ts` module.
 */
export const Route = createFileRoute('/app/workspace')({
  component: AppWorkspacePage,
})

export function AppWorkspacePage() {
  return (
    <PortalPagePlaceholder
      kickerKey="portal.placeholder.kicker.workspace"
      titleKey="portal.placeholder.title.workspace"
      subKey="portal.placeholder.sub.workspace"
    />
  )
}
