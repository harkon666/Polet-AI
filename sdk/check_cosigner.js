import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const privKey = 'FKCYmMfkShj1fghk45toismmvMfLppAEFb6KiYMZia9xcV3ghKPEH83VTMZLuuR1r14n6gdFGsj8FQAf7YVhsgK';
const expectedPubKey = '5v8akfxPx4hTJDVg8Dnh8vFGfhHvHcPngYXYa6Nrk6o9';

const decoded = bs58.decode(privKey);
console.log('Bytes length:', decoded.length);
const kp = Keypair.fromSecretKey(decoded);
console.log('Derived pubkey:', kp.publicKey.toBase58());
console.log('Matches expected:', kp.publicKey.toBase58() === expectedPubKey);
