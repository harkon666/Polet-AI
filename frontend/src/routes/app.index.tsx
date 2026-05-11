import { createFileRoute } from '@tanstack/react-router'
import { useLocale } from '#/hooks/use-locale'
import { WalletButton } from '../components/app/WalletButton'

/**
 * /app, the disconnected/connect-first screen.
 *
 * Renders inside the `<PortalShell>` layout (`app.tsx`). Sidebar is
 * still visible; this main panel just asks the operator to connect.
 *
 * Once `connected === true`, `<PortalRedirector>` (mounted in the
 * layout) navigates to `/app/workspace` so this screen never lingers.
 *
 * Visual rule: type-driven, no card walls. One kicker, one big title,
 * one sentence body, one prominent `<WalletButton>`.
 */
export const Route = createFileRoute('/app/')({
  component: AppIndexPage,
})

export function AppIndexPage() {
  const { t } = useLocale()

  return (
    <section
      aria-label="Connect a wallet to enter the Polet Portal"
      className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-8"
    >
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-lagoon-bright">
          {t('portal.connect.kicker')}
        </p>
        <h1 className="mt-4 font-sans text-3xl font-bold leading-[0.95] tracking-[-0.06em] text-ink sm:text-4xl md:text-5xl lg:text-6xl">
          {t('portal.connect.title')}
        </h1>
        <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink-soft">
          {t('portal.connect.body')}
        </p>
      </div>

      <div>
        <WalletButton />
      </div>
    </section>
  )
}
