import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID_STRING = 'fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);
export const WALLET_SEED = 'polet_wallet';

export function deriveWalletPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WALLET_SEED), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}
