import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID_STRING = 'H2z7UMkXh6MirSNaB55pb2gLYvY9Zgz5PLQnQUqnYt6a';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);
export const WALLET_SEED = 'polet_wallet';

export function deriveWalletPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}
