/**
 * ARCHIVED — Phase 7 (issue 105) moved this file out of the active
 * Polet Portal tree on 2026-05-11. Replaced by the Polet Portal
 * surface (issues 099-105). Kept on disk so future contributors can
 * reference the previous shape.
 *
 * If you're looking for the new equivalent, see:
 *   - components/app/portal/    chrome (sidebar, mobile bar, drawer)
 *   - components/app/workspace/ /app/workspace
 *   - components/app/gate/      /app/gate
 *   - components/app/funds/     /app/funds
 *   - components/app/proof/     /app/proof
 *   - components/app/bridge/    /app/bridge
 *   - components/app/selectors/console-selectors.ts (shared state derivations)
 *
 * Do not import from this file in new code. Mounted by:
 *   git log --diff-filter=A -- frontend/src/components/app/StatStrip.tsx
 */
import { useLocale } from '#/hooks/use-locale'
import type { TranslationKey } from '#/locale/dictionary'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useConsole } from './use-console-actions'

/**
 * StatStrip, four compact tiles showing live wallet state.
 *
 * Reads from `useConsole()` so it shares state with SetupLedger,
 * TwoRailConsole, and ReceiptLog — single source of truth, single
 * `getWalletData` fetch + `getBalance` poll per page.
 *
 * Tiles:
 *   - PDA           short program-derived address
 *   - SOL Balance   live lamports / 1e9, four decimals
 *   - Policy seq    `#N` from on-chain confidential policy state
 *                   plus a 5-byte ciphertext sliver (lagoon-bright,
 *                   `pl-encrypted` breath) so the policy tile carries
 *                   visible privacy primitive — readers see the seq
 *                   counter incrementing AND the underlying cipher
 *                   shifting with every confidential update
 *   - Sessions      number of authorized, non-expired sessions
 *
 * Renders nothing when disconnected so the onboarding wizard owns
 * the empty state.
 */

type TileDef = {
  id: 'pda' | 'balance' | 'policy' | 'sessions'
  labelKey: TranslationKey
}

const TILES: TileDef[] = [
  { id: 'pda',      labelKey: 'app.stat.pda'      },
  { id: 'balance',  labelKey: 'app.stat.balance'  },
  { id: 'policy',   labelKey: 'app.stat.policy'   },
  { id: 'sessions', labelKey: 'app.stat.sessions' },
]

const shortenPubkey = (s: string) =>
  s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s

/**
 * Render a 5-byte (10 hex chars) sliver of the on-chain
 * policyCommitment for the StatStrip POLICY tile. Same byte source as
 * SetupLedger.derivePolicyHash but narrower so the ciphertext fits
 * the tile width without truncating the seq counter on mobile.
 */
function policyCipherSliver(commitment: number[] | undefined): string {
  if (!commitment || commitment.length < 5) return '0x0000000000'
  const hex = commitment
    .slice(0, 5)
    .map((b) =>
      Math.max(0, Math.min(255, Math.trunc(b))).toString(16).padStart(2, '0'),
    )
    .join('')
  return `0x${hex}`
}

export function StatStrip() {
  const { t } = useLocale()
  const { state } = useConsole()
  const { connected, data, solBalance } = state
  const containerRef = useScrollReveal()

  // Always render the section so the ref attaches at mount and the
  // scroll-reveal observer initialises before the wallet connects.
  // When disconnected we just collapse the section visually via the
  // `hidden` class — the element stays in the DOM so MutationObserver
  // can pick up the tiles when they appear on connect.

  const sessions = data?.temporalKeys ?? data?.sessions ?? []
  const activeSessions = sessions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) =>
      s?.authorized && Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
  ).length

  const tileValue = (id: TileDef['id']): string => {
    if (id === 'pda') {
      return data?.walletPda ? shortenPubkey(String(data.walletPda)) : '—'
    }
    if (id === 'balance') {
      return solBalance != null ? solBalance.toFixed(4) : '—'
    }
    if (id === 'policy') {
      return typeof data?.policySeq === 'number' && data.policySeq > 0
        ? `#${data.policySeq}`
        : '—'
    }
    if (id === 'sessions') {
      return `${activeSessions} ${t('app.stat.unit.active')}`
    }
    return '—'
  }

  return (
    <section
      ref={containerRef}
      aria-label="Polet wallet stats"
      className={
        connected
          ? 'border-b border-line bg-bg-base py-4 md:py-5'
          : 'hidden'
      }
    >
      {connected ? (
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TILES.map((tile, i) => (
              <article
                key={tile.id}
                className="pl-reveal rounded-lg border border-line bg-bg-deep px-4 py-3 hover:border-line-strong transition"
                style={{ transitionDelay: `${80 * (i + 1)}ms` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {t(tile.labelKey)}
                </p>
                <p className="mt-1 font-mono tabular-nums text-base text-ink truncate">
                  {tileValue(tile.id)}
                </p>
                {tile.id === 'policy' && data?.policyCommitment ? (
                  <p
                    className="mt-0.5 font-mono text-[10px] tracking-tight pl-encrypted truncate"
                    title="On-chain confidential policy commitment (first 5 bytes)"
                  >
                    {policyCipherSliver(data.policyCommitment)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
