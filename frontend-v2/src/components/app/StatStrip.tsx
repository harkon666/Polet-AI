import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getWalletData } from '#shared/lib/api'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../../hooks/useScrollReveal'

/**
 * StatStrip, four compact tiles showing live wallet state.
 *
 * Day 10 layout pivot — adds dashboard density when the wallet is
 * connected. Renders nothing when disconnected so the onboarding
 * wizard owns that empty state.
 *
 * Tiles:
 *   - PDA           short program-derived address
 *   - SOL Balance   live lamports / 1e9, four decimals
 *   - Policy seq    `#N` from on-chain confidential policy state
 *   - Sessions      number of authorized, non-expired sessions
 *
 * Tiles are stat tiles, not action affordances; they read state, they
 * don't trigger writes. Day 11 will add a small "↗ explorer" link on
 * the PDA tile.
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

export function StatStrip() {
  const { t } = useLocale()
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const containerRef = useScrollReveal()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any | null>(null)
  const [solBalance, setSolBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!connected || !publicKey) {
      setData(null)
      setSolBalance(null)
      return
    }
    let cancelled = false
    const owner = publicKey.toBase58()

    ;(async () => {
      try {
        const result = await getWalletData(owner)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData(null)
      }
    })()

    ;(async () => {
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed')
        if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL)
      } catch {
        if (!cancelled) setSolBalance(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [connected, publicKey, connection])

  if (!connected) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions: any[] = data?.temporalKeys ?? data?.sessions ?? []
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
      className="border-b border-line bg-bg-base py-4 md:py-5"
    >
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
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
