/**
 * Step 1: Request Ika trade → get challenge
 * Step 2: Sign challenge with co-signer key
 * Step 3: Submit with sharedAccess.approvals
 */
import { createPoletAgent } from './dist/index.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

// Co-signer keypair
const CO_SIGNER_PRIVKEY = process.env.POLET_CO_SIGNER_PRIVKEY;
if (!CO_SIGNER_PRIVKEY) {
  throw new Error('POLET_CO_SIGNER_PRIVKEY is required to sign the shared approval challenge');
}
const coSignerKp = nacl.sign.keyPair.fromSecretKey(bs58.decode(CO_SIGNER_PRIVKEY));
const CO_SIGNER_PUBKEY = '5v8akfxPx4hTJDVg8Dnh8vFGfhHvHcPngYXYa6Nrk6o9';
const maskedWitnessDevFixture = parseMaskedWitnessDevFixture(process.env.POLET_MASKED_WITNESS_DEV_FIXTURE);

const p = createPoletAgent({
  owner: 'BZiugeMWHFyL5BLuAo4fH6VgNzFLx2cFsP6tcA5e6HHe',
  sessionKey: 'ECFFvJe8yPaTSH2qdXP1CkQTxWfWy5B3fZ7HEcCQPhSn',
  baseUrl: 'http://localhost:3001',
});

// Step 1: Get challenge
const result1 = await p.trade({
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'sui', asset: 'SUI' },
  amount: '5',
  rail: 'ika',
  params: {
    slippageBps: 100,
    ...(maskedWitnessDevFixture && { maskedWitnessDevFixture }),
    ikaPreAlpha: {
      dwalletAccount: '3yNnpN8G3w1NGf4Lj7JG7xJpSh6hkwGFAJkWSxcHbP6F',
      userPublicKey: 'BZiugeMWHFyL5BLuAo4fH6VgNzFLx2cFsP6tcA5e6HHe',
      signatureScheme: 'ed25519-prealpha',
    },
  },
});

console.log('Step 1 result:');
console.log(JSON.stringify(result1, null, 2));

if (result1.allowed !== false || result1.status !== 'needs-approval') {
  console.log('Unexpected response - expected needs-approval');
  process.exit(1);
}

const challenge = result1.approval?.progress?.challenge;
if (!challenge) {
  console.log('No challenge found in response');
  process.exit(1);
}

console.log('\nChallenge:', challenge);

// Step 2: Sign challenge
const signature = nacl.sign.detached(
  new TextEncoder().encode(challenge),
  coSignerKp.secretKey
);
const signatureBase64 = Buffer.from(signature).toString('base64');
console.log('Signature (base64):', signatureBase64);

// Step 3: Submit with approvals
const result2 = await p.trade({
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'sui', asset: 'SUI' },
  amount: '5',
  rail: 'ika',
  params: {
    slippageBps: 100,
    ...(maskedWitnessDevFixture && { maskedWitnessDevFixture }),
    ikaPreAlpha: {
      dwalletAccount: '3yNnpN8G3w1NGf4Lj7JG7xJpSh6hkwGFAJkWSxcHbP6F',
      userPublicKey: 'BZiugeMWHFyL5BLuAo4fH6VgNzFLx2cFsP6tcA5e6HHe',
      signatureScheme: 'ed25519-prealpha',
    },
    sharedAccess: {
      policy: {
        mode: 'ika-approval-quorum',
        threshold: 1,
        approvers: [CO_SIGNER_PUBKEY],
      },
      approvals: [
        {
          approver: CO_SIGNER_PUBKEY,
          signature: signatureBase64,
        },
      ],
    },
  },
});

console.log('\nStep 3 result:');
console.log(JSON.stringify(result2, null, 2));

function parseMaskedWitnessDevFixture(value) {
  if (!value) return undefined;
  const bytes = value.split(',').map((part) => Number(part.trim()));
  if (bytes.length !== 32 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('POLET_MASKED_WITNESS_DEV_FIXTURE must be 32 comma-separated bytes when using the legacy dev fallback');
  }
  return bytes;
}
