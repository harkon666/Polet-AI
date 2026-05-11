import { createFileRoute } from '@tanstack/react-router'
import { PortalPagePlaceholder } from '../components/app/portal/PortalPagePlaceholder'

/**
 * /app/bridge — Phase 1 placeholder.
 *
 * Phase 6 (issue 104) replaces this with `<BridgeConfigPanel>` +
 * `<MCPToolsList>` and hosts the legacy `<WalletDashboard>` behind
 * an Advanced collapse.
 */
export const Route = createFileRoute('/app/bridge')({
  component: AppBridgePage,
})

export function AppBridgePage() {
  return (
    <PortalPagePlaceholder
      kickerKey="portal.placeholder.kicker.bridge"
      titleKey="portal.placeholder.title.bridge"
      subKey="portal.placeholder.sub.bridge"
    />
  )
}
