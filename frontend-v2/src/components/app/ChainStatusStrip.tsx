import { useLocale } from '#shared/hooks/use-locale'
import type { TranslationKey } from '#shared/locale/dictionary'
import type { IkaManagedChain } from '#shared/lib/api'
import { Spinner } from './Spinner'
import {
  useConsole,
  type ActionKey,
  type ConsoleData,
} from './use-console-actions'

type IkaManaged = NonNullable<ConsoleData['ikaManaged']>

const CHAINS: Array<{
  id: IkaManagedChain
  labelKey: TranslationKey
  enableKey: TranslationKey
  glyph: string
  curve: string
}> = [
  {
    id: 'sui',
    labelKey: 'app.chain.sui',
    enableKey: 'app.chain.enable.sui',
    glyph: 'SUI',
    curve: 'Curve25519',
  },
  {
    id: 'ethereum',
    labelKey: 'app.chain.ethereum',
    enableKey: 'app.chain.enable.ethereum',
    glyph: 'Ξ',
    curve: 'Secp256k1',
  },
]

const chainActionKey = (chain: IkaManagedChain): ActionKey =>
  `ika-enable-${chain}` as ActionKey

const shorten = (value: string | undefined) => {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value
}

function currentChain(registration: IkaManaged['registration']): IkaManagedChain | null {
  if (!registration) return null
  if (registration.label === 'managed-curve25519' || registration.curve === 2) {
    return 'sui'
  }
  if (registration.label === 'managed-secp256k1' || registration.curve === 0) {
    return 'ethereum'
  }
  return null
}

export function ChainStatusStrip() {
  const { t } = useLocale()
  const { state, actions } = useConsole()
  const { connected, publicKey, data, loading } = state
  const ika = data?.ikaManaged
  const activeChain = currentChain(ika?.registration ?? null)
  const policyReady = Boolean(data?.usdcDcaPolicy?.enabled || (data?.policySeq ?? 0) > 0)
  const fixtureMissing = ika?.fixtureAvailable === false
  const gasReady = ika?.gas?.passes === true
  const canEnable =
    connected &&
    !!publicKey &&
    policyReady &&
    !fixtureMissing
  const readinessKey: TranslationKey = !policyReady
    ? 'app.chain.waitPolicy'
    : fixtureMissing
      ? 'app.chain.fixtureMissing'
      : 'app.chain.ready'

  if (!connected) return null

  return (
    <div className="pl-reveal mt-6 rounded-2xl border border-line bg-bg-deep/90 p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-lagoon-bright">
            {t('app.chain.kicker')}
          </p>
          <p className="mt-1 max-w-2xl text-xs text-ink-mute leading-relaxed">
            {t('app.chain.note')}
          </p>
          {ika?.fixtureDisclosure ? (
            <p className="mt-1 max-w-2xl text-[11px] italic text-ink-mute/80 leading-relaxed">
              {ika.fixtureDisclosure}
            </p>
          ) : null}
        </div>
        <span
          className={
            fixtureMissing || !policyReady
              ? 'inline-flex self-start rounded-full border border-coral/40 bg-coral/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-coral'
              : 'inline-flex self-start rounded-full border border-palm/40 bg-palm/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-palm'
          }
        >
          {t(readinessKey)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHAINS.map((chain) => {
          const actionKey = chainActionKey(chain.id)
          const isLoading = loading === actionKey
          const active = activeChain === chain.id
          const disabled = active || loading !== null || !canEnable
          return (
            <article
              key={chain.id}
              className="rounded-xl border border-line bg-bg-base/50 p-4 hover:border-line-strong transition"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lagoon-bright/30 bg-lagoon-bright/10 font-mono text-[11px] font-semibold text-lagoon-bright">
                  {chain.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-sans text-sm font-semibold text-ink">
                      {t(chain.labelKey)}
                    </p>
                    <span
                      className={
                        active
                          ? 'inline-flex rounded-full border border-palm/40 bg-palm/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-palm'
                          : 'inline-flex rounded-full border border-line bg-surface/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute'
                      }
                    >
                      {active ? t('app.chain.enabled') : t('app.chain.notEnabled')}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                    <dt className="text-ink-mute">{t('app.chain.curve')}</dt>
                    <dd className="text-ink-soft truncate">{chain.curve}</dd>
                    <dt className="text-ink-mute">{t('app.chain.dwallet')}</dt>
                    <dd className="text-ink-soft truncate">
                      {active ? shorten(ika?.registration?.dwalletAccount) : '—'}
                    </dd>
                    <dt className="text-ink-mute">{t('app.chain.gas')}</dt>
                    <dd className={gasReady ? 'text-palm truncate' : 'text-coral truncate'}>
                      {gasReady
                        ? t('app.chain.gasReady')
                        : ika?.gas
                          ? t('app.chain.gasNeedsFunding')
                          : t('app.chain.gasUnknown')}
                    </dd>
                  </dl>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void actions.enableIkaChain(chain.id)}
                disabled={disabled}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Spinner size={10} /> : null}
                {isLoading
                  ? t('app.chain.enable.loading')
                  : active
                    ? t('app.chain.enabled')
                    : t(chain.enableKey)}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
