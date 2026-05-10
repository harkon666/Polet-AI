import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

/**
 * v2 WalletButton, two states.
 *
 * Disconnected: a single "Connect wallet" pill that opens the wallet
 * adapter modal. Sized to match the v2 ghost-button language.
 *
 * Connected: short pubkey chip on the left + "Disconnect" pill on the
 * right. The pubkey chip hides on mobile (< sm) so the button doesn't
 * overflow the dashboard header.
 */
export function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()

  if (connected && publicKey) {
    const pubkeyStr = publicKey.toBase58()
    const short =
      pubkeyStr.length > 20
        ? `${pubkeyStr.slice(0, 4)}…${pubkeyStr.slice(-4)}`
        : pubkeyStr
    return (
      <div className="inline-flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-3 py-1.5 font-mono text-xs text-ink-soft">
          <span className="size-1.5 rounded-full bg-palm" aria-hidden="true" />
          {short}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-ink hover:border-coral hover:bg-coral/5 transition"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setVisible(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-lagoon-bright/40 bg-lagoon-bright/10 px-4 py-2 text-sm font-medium text-lagoon-bright hover:bg-lagoon-bright/15 hover:border-lagoon-bright transition"
    >
      Connect wallet
      <span aria-hidden="true">→</span>
    </button>
  )
}
