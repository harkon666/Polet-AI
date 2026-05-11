import { Link } from '@tanstack/react-router'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useLocale } from '#shared/hooks/use-locale'
import { useConsole } from '../use-console-actions'
import type { ReadinessSlot } from '../selectors/console-selectors'
import { nextBlockingStep } from '../selectors/console-selectors'

/**
 * ContinueCTA, the primary next-step link on the Workspace home.
 *
 * Behaviour is derived from `nextBlockingStep(state)` so the primary
 * button always points at the page where the operator can unblock
 * the current slot. When every slot is ready, the primary CTA flips
 * to "Compose an intent" and routes to `/app/gate`.
 *
 * Routing rules (primary):
 *   - wallet · custody · policy · session · gas → /app/funds
 *     (Phase 4 places all owner-side funding actions on the Funds
 *     & Setup page, including the session/gas primitives, so the
 *     primary always hands off there while onboarding is unfinished.)
 *   - null (all slots done) → /app/gate
 *
 * Ghost CTAs always render: `Gate` + `Proof` when primary is Funds,
 * or `Funds` + `Proof` when primary is Gate, so the operator can
 * always jump sideways without going back to the sidebar.
 */
type PortalPath =
  | '/app'
  | '/app/workspace'
  | '/app/gate'
  | '/app/funds'
  | '/app/proof'
  | '/app/bridge'

const TARGET_BY_SLOT: Record<ReadinessSlot, PortalPath> = {
  wallet: '/app/funds',
  custody: '/app/funds',
  policy: '/app/funds',
  session: '/app/funds',
  gas: '/app/funds',
}

const LABEL_BY_SLOT: Record<ReadinessSlot, TranslationKey> = {
  wallet: 'portal.workspace.cta.openFunds',
  custody: 'portal.workspace.cta.openFunds',
  policy: 'portal.workspace.cta.openFunds',
  session: 'portal.workspace.cta.openFunds',
  gas: 'portal.workspace.cta.openFunds',
}

type GhostLink = { to: PortalPath; labelKey: TranslationKey }

export function ContinueCTA() {
  const { t } = useLocale()
  const { state } = useConsole()
  const blocking = nextBlockingStep(state)

  const target: PortalPath = blocking === null ? '/app/gate' : TARGET_BY_SLOT[blocking]
  const labelKey: TranslationKey =
    blocking === null ? 'portal.workspace.cta.compose' : LABEL_BY_SLOT[blocking]

  // Ghost CTAs: always the sibling of the primary (Funds <-> Gate)
  // plus Proof. Keeps the Workspace one-step-away from any other page
  // without reaching for the sidebar.
  const ghostLinks: GhostLink[] = [
    blocking === null
      ? { to: '/app/funds', labelKey: 'portal.workspace.cta.openFunds' }
      : { to: '/app/gate', labelKey: 'portal.workspace.cta.openGate' },
    { to: '/app/proof', labelKey: 'portal.workspace.cta.openProof' },
  ]

  return (
    <div
      data-testid="continue-cta"
      className="mt-8 flex flex-wrap items-center gap-3"
    >
      <Link
        to={target}
        data-testid="workspace-continue-cta"
        data-target={target}
        className="inline-flex items-center gap-2 rounded-full border border-lagoon-bright bg-lagoon-bright/15 px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright transition-colors hover:bg-lagoon-bright/25"
      >
        {t(labelKey)}
        <span aria-hidden="true">→</span>
      </Link>
      {ghostLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          data-testid={`workspace-ghost-cta-${link.to.replace('/app/', '')}`}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors hover:border-lagoon-bright/40 hover:text-ink"
        >
          {t(link.labelKey)}
        </Link>
      ))}
    </div>
  )
}
