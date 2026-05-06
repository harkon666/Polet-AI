import { createHash, createPublicKey, verify as verifySignature, type JsonWebKey } from 'crypto';

export const PASSKEY_COAPPROVAL_CHALLENGE_SCHEMA = 'polet.passkey.coapproval.v1';

export interface PasskeyCoapprovalChallengeInput {
  owner: string;
  sessionKey: string;
  sharedApprovalChallenge: string;
  credentialId: string;
  rpId: string;
  expiresAtUnix: number;
}

export interface PasskeyAssertionInput {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

export interface PasskeyCoapprovalVerificationInput {
  expectedChallenge: string;
  expectedOrigin: string;
  expectedRpId: string;
  expectedCredentialId?: string;
  credentialPublicKeyJwk: JsonWebKey;
  assertion: PasskeyAssertionInput;
  requireUserVerification?: boolean;
}

export interface PasskeyCoapprovalReceipt {
  status: 'passkey-verified';
  credentialId: string;
  origin: string;
  rpId: string;
  userPresent: boolean;
  userVerified: boolean;
  warning: string;
}

export function buildPasskeyCoapprovalChallenge(input: PasskeyCoapprovalChallengeInput): string {
  return base64url(Buffer.from(stableStringify({
    schema: PASSKEY_COAPPROVAL_CHALLENGE_SCHEMA,
    owner: input.owner,
    sessionKey: input.sessionKey,
    sharedApprovalChallenge: input.sharedApprovalChallenge,
    credentialId: input.credentialId,
    rpId: input.rpId,
    expiresAtUnix: input.expiresAtUnix,
  })));
}

export function verifyPasskeyCoapproval(input: PasskeyCoapprovalVerificationInput): PasskeyCoapprovalReceipt {
  if (input.expectedCredentialId && input.assertion.credentialId !== input.expectedCredentialId) {
    throw new Error('passkey credential id mismatch');
  }

  const clientData = JSON.parse(base64urlDecode(input.assertion.clientDataJSON).toString('utf8')) as {
    type?: string;
    challenge?: string;
    origin?: string;
  };
  if (clientData.type !== 'webauthn.get') {
    throw new Error('passkey assertion must be webauthn.get');
  }
  if (clientData.challenge !== input.expectedChallenge) {
    throw new Error('passkey challenge mismatch');
  }
  if (clientData.origin !== input.expectedOrigin) {
    throw new Error('passkey origin mismatch');
  }

  const authenticatorData = base64urlDecode(input.assertion.authenticatorData);
  if (authenticatorData.length < 37) {
    throw new Error('passkey authenticator data is too short');
  }
  const expectedRpIdHash = createHash('sha256').update(input.expectedRpId).digest();
  if (!authenticatorData.subarray(0, 32).equals(expectedRpIdHash)) {
    throw new Error('passkey rpId hash mismatch');
  }

  const flags = authenticatorData[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  if (!userPresent) {
    throw new Error('passkey user presence is required');
  }
  if (input.requireUserVerification && !userVerified) {
    throw new Error('passkey user verification is required');
  }

  const signedData = Buffer.concat([
    authenticatorData,
    createHash('sha256').update(base64urlDecode(input.assertion.clientDataJSON)).digest(),
  ]);
  const publicKey = createPublicKey({ key: input.credentialPublicKeyJwk, format: 'jwk' });
  const valid = verifySignature('sha256', signedData, publicKey, base64urlDecode(input.assertion.signature));
  if (!valid) {
    throw new Error('passkey signature verification failed');
  }

  return {
    status: 'passkey-verified',
    credentialId: input.assertion.credentialId,
    origin: clientData.origin,
    rpId: input.expectedRpId,
    userPresent,
    userVerified,
    warning: 'Passkey co-approval is a UX proof only; Polet still requires Solana session/co-approver signatures and on-chain policy checks.',
  };
}

export function base64url(data: Buffer): string {
  return data.toString('base64url');
}

export function base64urlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}
