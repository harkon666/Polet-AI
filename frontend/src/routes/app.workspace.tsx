import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceHero } from '../components/app/workspace/WorkspaceHero'
import { ReadinessStrip } from '../components/app/workspace/ReadinessStrip'
import { ContinueCTA } from '../components/app/workspace/ContinueCTA'
import { ActivityLine } from '../components/app/workspace/ActivityLine'
import { AgentAccessSection } from '../components/app/workspace/AgentAccessSection'
import { PolicyRulesSection } from '../components/app/workspace/PolicyRulesSection'

/**
 * /app/workspace — Polet Portal home.
 *
 * State-aware launchpad + owner control surface:
 *   - `<WorkspaceHero>` names the next blocking step in operator
 *     language (or celebrates "all rails ready").
 *   - `<ReadinessStrip>` shows all five slots at a glance
 *     (wallet · custody · policy · session · gas).
 *   - `<ContinueCTA>` routes to the page that unblocks the current
 *     slot (Funds for wallet/custody/policy, Bridge for session/gas,
 *     Gate when everything is ready).
 *   - `<ActivityLine>` surfaces the latest receipt with a jump into
 *     the Proof Trail page.
 *   - `<AgentAccessSection>` — BYO-wallet agent authorization: paste
 *     agent pubkey, choose expiry + legacy daily limit, revoke per
 *     session, export polet-agent.json / MCP / Hermes CLI config.
 *     Polet never sees the agent private key.
 *   - `<PolicyRulesSection>` — confidential policy update + owner
 *     reveal of the current encrypted thresholds into tab-local
 *     memory (never persisted, never logged).
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
      <AgentAccessSection />
      <PolicyRulesSection />
    </section>
  )
}
