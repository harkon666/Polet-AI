import { useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Wraps children in Solana wallet-adapter providers on the client.
 *
 * Landing routes (/, /about) don't call wallet hooks, so they render
 * safely even without the providers. The /app route is the only surface
 * that uses `useWallet()` — which is fine because by the time that route
 * matters, client-side hydration has completed and `mounted` is `true`.
 *
 * Rendering `children` directly during SSR is important: previously this
 * component returned an empty `<div />` pre-hydration, which made the
 * ENTIRE page blank whenever client-side JS failed to execute (stale
 * cache, extension interference, etc.). That pattern broke the landing
 * page in the worst possible way — nothing to show, no error, just black.
 */
export const ClientWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  // Standard wallet adapters auto-detect most wallets; empty array is fine.
  const wallets = useMemo(() => [], []);

  if (!mounted) {
    // SSR + pre-hydration: render children plainly so landing content is
    // visible even before the client JS runs. Wallet hooks on /app resolve
    // once hydration completes.
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
