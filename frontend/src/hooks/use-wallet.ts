import { useState, useCallback } from 'react';

export interface WalletContextValue {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE_KEY = 'polet_wallet_pubkey';

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  const connect = useCallback(async () => {
    // Check for wallet adapter support
    if (!window.solana?.isPhantom) {
      // Fallback: generate a key for demo purposes
      // In production, this would use a real wallet adapter
      const fakeKey = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
      ).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 44);

      const formattedKey = `${fakeKey.slice(0, 4)}...${fakeKey.slice(-4)}`;
      localStorage.setItem(STORAGE_KEY, formattedKey);
      setPublicKey(formattedKey);
      return;
    }

    try {
      const response = await window.solana.connect();
      const key = response.publicKey.toString();
      localStorage.setItem(STORAGE_KEY, key);
      setPublicKey(key);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPublicKey(null);
  }, []);

  return {
    connected: !!publicKey,
    publicKey,
    connect,
    disconnect,
  };
}

declare global {
  interface Window {
    solana?: {
      isPhantom: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
    };
  }
}
