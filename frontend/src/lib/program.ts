import { PublicKey } from '@solana/web3.js';

export const POLET_PROGRAM_ID = '9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc';
export const ENCRYPT_CPI_AUTHORITY_SEED = '__encrypt_cpi_authority';

export function shortProgramId(programId: string = POLET_PROGRAM_ID): string {
  return `${programId.slice(0, 8)}...${programId.slice(-6)}`;
}

export function derivePoletEncryptCpiAuthority(programId: string = POLET_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode(ENCRYPT_CPI_AUTHORITY_SEED)],
    new PublicKey(programId)
  );
}
