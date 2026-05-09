import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID_STRING = 'H6hT33LKBLnN1G55iRtjmMuNMmyJagxfxsvd7jTjw5oG';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);
export const WALLET_SEED = 'polet_wallet';

export function deriveWalletPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}
