import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { getWalletData } from '#shared/lib/api'
import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { KickerLabel } from '../primitives/KickerLabel'
import { EncryptedField } from '../EncryptedField'

/**
 * SetupLedger, the /app linear setup checklist.
 *
 * Four rows representing the prerequisites for running Polet's
 * confidential demo:
 *
 *   01 / WALLET   smart-wallet PDA initialization
 *   02 / CUSTODY  PDA-owned demo USDC + wSOL token accounts
 *   03 / POLICY   confidential numeric guardrails — RENDERS AS CIPHERTEXT
 *   04 / SESSION  agent session key (temporary signing authority)
 *
 * The POLICY row is intentionally the visual hero. Its sealed value is
 * rendered with the same `<EncryptedField>` component the landing
 * Crypto-Blur Theater uses, so the redacted ciphertext glows with the
 * lagoon-bright pulse and reinforces Polet's core promise: limits stay
 * private, the gate evaluates blind.
 *
 * Day 9 (this commit) is DISPLAY ONLY. State is derived from
 * `getWalletData(owner)` and rendered, but clicking a row is a no-op.
 * Day 10 wires write CTAs (init wallet, register custody, save policy,
 * grant session) directly inline on each row.
 */

type RowState = 'pending' | 'initialized' | 'registered' | 'sealed' | 'active'

type RowDef = {
  id: 'wallet' | 'custody' | 'policy' | 'session'
  labelKey: TranslationKey
}

const ROWS: RowDef[] = [
  { id: 'wallet',  labelKey: 'app.ledger.row.wallet'  },
  { id: 'custody', labelKey: 'app.ledger.row.custody' },
  { id: 'policy',  labelKey: 'app.ledger.row.policy'  },
  { id: 'session', labelKey: 'app.ledger.row.session' },
]

const STATE_LABEL_KEY: Record<RowState, TranslationKey> = {
  pending:     'app.ledger.state.pending',
  initialized: 'app.ledger.state.initialized',
  registered:  'app.ledger.state.registered',
  sealed:      'app.ledger.state.sealed',
  active:      'app.ledger.state.active',
}

const STATE_BADGE_CLASSES: Record<RowState, string> = {
  pending:     'inline-flex items-center rounded-full border border-line bg-surface/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute',
  initialized: 'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  registered:  'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
  sealed:      'inline-flex items-center rounded-full border border-lagoon-bright/40 bg-lagoon-bright/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-lagoon-bright',
  active:      'inline-flex items-center rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-palm',
}

const shortenPubkey = (s: string) =>
  s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s

const formatExpiry = (epochMs: number) => {
  const ms = epochMs - Date.now()
  if (ms <= 0) return 'expired'
  const h = ms / 3_600_000
  if (h < 24) return `exp ${Math.max(1, Math.floor(h))}h`
  return `exp ${Math.floor(h / 24)}d`
}

export function SetupLedger() {
  const { t } = useLocale()
  const { connected, publicKey } = useWallet()
  const containerRef = useScrollReveal()
  // Loose `any` typing — proxy returns untyped JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    if (!connected || !publicKey) {
      setData(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await getWalletData(publicKey.toBase58())
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connected, publicKey])

  // Derive each row's state + display value from the proxy response.
  const walletState: RowState =
    data?.walletPda ? 'initialized' : 'pending'

  const custodyState: RowState =
    data?.usdcAccount && data?.wsolAccount ? 'registered' : 'pending'

  const policyState: RowState =
    typeof data?.policySeq === 'number' && data.policySeq > 0
      ? 'sealed'
      : 'pending'

  const activeSession =
    (data?.temporalKeys ?? data?.sessions ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        s?.authorized &&
        Number(s?.expiresAt ?? 0) * 1000 > Date.now(),
    ) ?? null

  const sessionState: RowState = activeSession ? 'active' : 'pending'

  const rowState: Record<RowDef['id'], RowState> = {
    wallet:  walletState,
    custody: custodyState,
    policy:  policyState,
    session: sessionState,
  }

  return (
    <section
      ref={containerRef}
      aria-label="Polet setup ledger"
      className="border-b border-line bg-bg-base py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <KickerLabel tone="accent" className="pl-reveal">
          {t('app.ledger.kicker')}
        </KickerLabel>

        {!connected ? (
          <p
            className="pl-reveal mt-3 text-sm text-ink-mute"
            style={{ transitionDelay: '80ms' }}
          >
            {t('app.ledger.empty.connectFirst')}
          </p>
        ) : null}

        <div
          className="pl-reveal mt-8 md:mt-10 rounded-2xl border border-line bg-bg-deep overflow-hidden divide-y divide-line/60"
          style={{ transitionDelay: '120ms' }}
        >
          {ROWS.map((row, i) => {
            const state = rowState[row.id]
            return (
              <article
                key={row.id}
                className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-5 hover:bg-surface/40 transition pl-reveal"
                style={{ transitionDelay: `${160 + 80 * i}ms` }}
              >
                {/* Index + label, fixed width on desktop */}
                <div className="sm:w-44 shrink-0 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-lagoon-bright">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-base font-semibold text-ink leading-tight">
                    {t(row.labelKey)}
                  </span>
                </div>

                {/* Value column */}
                <div className="flex-1 min-w-0 font-mono text-sm text-ink-soft">
                  <RowValue row={row} state={state} data={data} activeSession={activeSession} />
                </div>

                {/* State badge */}
                <span className={STATE_BADGE_CLASSES[state]}>
                  {t(STATE_LABEL_KEY[state])}
                </span>

                {/* Affordance arrow — Day 10 wires Solana Explorer per row */}
                <a
                  href="#"
                  aria-label="View on Solana Explorer"
                  className="opacity-50 group-hover:opacity-100 transition text-ink-soft hover:text-lagoon-bright text-sm"
                  onClick={(e) => e.preventDefault()}
                >
                  ↗
                </a>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * RowValue, render the value column for one ledger row.
 *
 * The POLICY row is special: when sealed, it renders `<EncryptedField>`
 * with phase="encrypted" so the value pulses lagoon-bright as ciphertext
 * (same component the landing DemoWidget uses). Day 10 will derive the
 * `encryptedHash` from the real on-chain policy_seq + commitment.
 */
function RowValue({
  row,
  state,
  data,
  activeSession,
}: {
  row: RowDef
  state: RowState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeSession: any
}) {
  if (state === 'pending') {
    return <span className="text-ink-mute">—</span>
  }

  if (row.id === 'wallet') {
    return <span>{shortenPubkey(String(data?.walletPda ?? ''))}</span>
  }

  if (row.id === 'custody') {
    return <span>USDC + wSOL</span>
  }

  if (row.id === 'policy') {
    // Day 9 placeholder ciphertext — Day 10 derives from policy_seq + commitment.
    return (
      <EncryptedField
        value="•••••••••••••••"
        encryptedHash="0x4Vk8c2ed7a1b"
        state="encrypted"
        monoSize="sm"
      />
    )
  }

  if (row.id === 'session') {
    const sessionKey = String(activeSession?.key ?? '')
    const expiresAt = Number(activeSession?.expiresAt ?? 0) * 1000
    return (
      <span>
        {shortenPubkey(sessionKey)} · {formatExpiry(expiresAt)}
      </span>
    )
  }

  return <span className="text-ink-mute">—</span>
}
