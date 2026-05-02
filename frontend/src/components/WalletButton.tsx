import { useWallet } from '../hooks/use-wallet';

export function WalletButton() {
  const { connected, publicKey, connect, disconnect } = useWallet();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden rounded-lg border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm sm:block">
          <span className="text-[var(--sea-ink-soft)]">Wallet:</span>{' '}
          <span className="font-mono font-medium text-[var(--sea-ink)]">
            {publicKey.length > 20 ? `${publicKey.slice(0, 8)}...${publicKey.slice(-8)}` : publicKey}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
    >
      Connect Wallet
    </button>
  );
}
