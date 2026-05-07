/**
 * Full Ika co-signer quorum flow:
 * 1. Submit Ika intent → get challenge
 * 2. Sign challenge with co-signer Ed25519 key
 * 3. Re-submit intent with sharedAccess.approvals → get unsigned tx
 * 4. Sign + send with session key
 */
import { createPoletAgent } from './dist/index.js';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { readFileSync } from 'fs';

// === CONFIG ===
const OWNER = 'BZiugeMWHFyL5BLuAo4fH6VgNzFLx2cFsP6tcA5e6HHe';
const SESSION_KEY = 'ECFFvJe8yPaTSH2qdXP1CkQTxWfWy5B3fZ7HEcCQPhSn';
const SESSION_KEYPAIR_PATH = '/home/harkon666/.hermes/keys/polet_session_keypair.json';
const CO_SIGNER_PRIVKEY = 'FKCYmMfkShj1fghk45toismmvMfLppAEFb6KiYMZia9xcV3ghKPEH83VTMZLuuR1r14n6gdFGsj8FQAf7YVhsgK';
const CO_SIGNER_PUBKEY = '5v8akfxPx4hTJDVg8Dnh8vFGfhHvHcPngYXYa6Nrk6o9';
const DWALLET_ACCOUNT = '3yNnpN8G3w1NGf4Lj7JG7xJpSh6hkwGFAJkWSxcHbP6F';
const PROXY_URL = 'http://localhost:3001';

// === Co-signer keypair ===
const coSignerKp = nacl.sign.keyPair.fromSecretKey(new Uint8Array(bs58.decode(CO_SIGNER_PRIVKEY)));
console.log('Co-signer pubkey:', CO_SIGNER_PUBKEY);

// === Polet agent ===
const p = createPoletAgent({
  owner: OWNER,
  sessionKey: SESSION_KEY,
  baseUrl: PROXY_URL,
});

// === Step 1: Request Ika trade → get challenge ===
console.log('\n=== Step 1: Request Ika intent (expect needs-approval) ===');
const step1 = await p.trade({
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'sui', asset: 'SUI' },
  amount: '5',
  rail: 'ika',
  params: {
    slippageBps: 100,
    encryptionWitness: Array.from({ length: 32 }, (_, i) => i + 1),
    ikaPreAlpha: {
      dwalletAccount: DWALLET_ACCOUNT,
      userPublicKey: OWNER,
      signatureScheme: 'ed25519-prealpha',
    },
  },
});

console.log('allowed:', step1.allowed);
console.log('status:', step1.status);
console.log('code:', step1.code);

if (step1.allowed !== false || step1.status !== 'needs-approval') {
  console.log('Unexpected. Full response:', JSON.stringify(step1, null, 2));
  process.exit(1);
}

const challenge = step1.approval?.progress?.challenge;
if (!challenge) {
  console.log('No challenge in response:', JSON.stringify(step1.approval, null, 2));
  process.exit(1);
}
console.log('Challenge received:', challenge);

// === Step 2: Co-signer signs the challenge ===
console.log('\n=== Step 2: Co-signer signs challenge ===');
const signature = nacl.sign.detached(
  new TextEncoder().encode(challenge),
  coSignerKp.secretKey
);
const signatureBase64 = Buffer.from(signature).toString('base64');
console.log('Signature (64 bytes, base64):', signatureBase64);

// === Step 3: Re-submit with sharedAccess.approvals ===
console.log('\n=== Step 3: Submit with co-signer approval ===');
const step3 = await p.trade({
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'sui', asset: 'SUI' },
  amount: '5',
  rail: 'ika',
  params: {
    slippageBps: 100,
    encryptionWitness: Array.from({ length: 32 }, (_, i) => i + 1),
    ikaPreAlpha: {
      dwalletAccount: DWALLET_ACCOUNT,
      userPublicKey: OWNER,
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

console.log('allowed:', step3.allowed);
console.log('status:', step3.status);
console.log('code:', step3.code);

if (step3.allowed === true && step3.status === 'approval-transaction-prepared') {
  console.log('\n=== SUCCESS: Unsigned tx ready ===');
  console.log('ikaRequest.requestId:', step3.ikaRequest?.requestId);
  console.log('ikaRequest.canonicalOrderHash:', step3.ikaRequest?.canonicalOrderHash);
  console.log('poletApprovalTransaction present:', !!step3.ikaRequest?.poletApprovalTransaction);
  console.log('signers:', step3.ikaRequest?.poletApprovalTransaction?.signers);
} else {
  console.log('Still not approved. Full response:', JSON.stringify(step3, null, 2));
}
