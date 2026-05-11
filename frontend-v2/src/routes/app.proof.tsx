import { createFileRoute } from '@tanstack/react-router'
import { PortalPagePlaceholder } from '../components/app/portal/PortalPagePlaceholder'

/**
 * /app/proof — Phase 1 placeholder.
 *
 * Phase 5 (issue 103) replaces this with `<ProofTimeline>` and the
 * extracted `<JupiterProofPanel>` / `<IkaProofPanel>` components.
 */
export const Route = createFileRoute('/app/proof')({
  component: AppProofPage,
})

export function AppProofPage() {
  return (
    <PortalPagePlaceholder
      kickerKey="portal.placeholder.kicker.proof"
      titleKey="portal.placeholder.title.proof"
      subKey="portal.placeholder.sub.proof"
    />
  )
}
