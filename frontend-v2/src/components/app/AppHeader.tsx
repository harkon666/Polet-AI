import { Link } from '@tanstack/react-router'
import { Logo } from '../Logo'
import { useLocale } from '#shared/hooks/use-locale'
import { WalletButton } from './WalletButton'

/**
 * v2 /app header.
 *
 * Replaces the landing marketing nav with console chrome whenever the
 * user is operating the wallet:
 *   - Left: Polet brand → links back to landing
 *   - Right: Devnet network pill + WalletButton (connect / disconnect)
 *
 * Sticky `top-0` so the wallet control stays one tap away regardless
 * of scroll depth into DemoTab / TemporalKeyManager. Sits OUTSIDE
 * `.pl-app-shell` so it uses v2 dark tokens directly, not the v1 shim
 * that scopes inside the shell.
 *
 * Mounted from `routes/app.tsx` inside `<ClientWalletProvider>` so the
 * embedded `<WalletButton>` has access to wallet adapter context.
 */
export function AppHeader() {
  const { t } = useLocale()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg-base/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand → landing. Visible "Polet" wordmark is the accessible
              name; an explicit aria-label would violate label-content match. */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-ink hover:text-lagoon transition"
          >
            <Logo className="h-7 w-auto" />
            <span className="font-sans text-lg font-bold tracking-tight">
              Polet
            </span>
            <span
              aria-hidden="true"
              className="hidden sm:inline font-mono text-xs text-ink-mute pl-1"
            >
              /console
            </span>
          </Link>

          {/* Right cluster: Devnet pill + WalletButton */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-soft whitespace-nowrap">
              <span
                className="size-1.5 rounded-full bg-palm animate-pulse"
                aria-hidden="true"
              />
              {t('header.devnetPill')}
            </span>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
