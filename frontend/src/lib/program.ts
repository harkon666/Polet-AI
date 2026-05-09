import { PublicKey } from '@solana/web3.js';

export const POLET_PROGRAM_ID = 'H2z7UMkXh6MirSNaB55pb2gLYvY9Zgz5PLQnQUqnYt6a';
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
