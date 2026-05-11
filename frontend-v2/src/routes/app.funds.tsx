import { createFileRoute } from '@tanstack/react-router'
import { PortalPagePlaceholder } from '../components/app/portal/PortalPagePlaceholder'

/**
 * /app/funds — Phase 1 placeholder.
 *
 * Phase 4 (issue 102) replaces this with `<FundsList>` +
 * `<OwnerSetupList>` + `<QuickActions>` reusing the existing
 * custody / session / Ika actions on `useConsole()`.
 */
export const Route = createFileRoute('/app/funds')({
  component: AppFundsPage,
})

export function AppFundsPage() {
  return (
    <PortalPagePlaceholder
      kickerKey="portal.placeholder.kicker.funds"
      titleKey="portal.placeholder.title.funds"
      subKey="portal.placeholder.sub.funds"
    />
  )
}
