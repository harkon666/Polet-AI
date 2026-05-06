import { describe, expect, test } from 'bun:test';
import { createHash, generateKeyPairSync, sign } from 'crypto';
import {
  base64url,
  buildPasskeyCoapprovalChallenge,
  verifyPasskeyCoapproval,
} from '../src/lib/passkey-coapproval';

const RP_ID = 'app.polet.ai';
const ORIGIN = 'https://app.polet.ai';

describe('Passkey co-approval prototype', () => {
  test('verifies a WebAuthn-style passkey co-approval assertion', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const credentialPublicKeyJwk = publicKey.export({ format: 'jwk' });
    const challenge = buildPasskeyCoapprovalChallenge({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sharedApprovalChallenge: '{"schema":"polet.ika.shared-approval.v1"}',
      credentialId: 'credential-1',
      rpId: RP_ID,
      expiresAtUnix: 4_102_444_800,
    });
    const assertion = createAssertion(privateKey, challenge, { userVerified: true });

    const receipt = verifyPasskeyCoapproval({
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRpId: RP_ID,
      expectedCredentialId: 'credential-1',
      credentialPublicKeyJwk,
      assertion: { credentialId: 'credential-1', ...assertion },
      requireUserVerification: true,
    });

    expect(receipt).toMatchObject({
      status: 'passkey-verified',
      credentialId: 'credential-1',
      origin: ORIGIN,
      rpId: RP_ID,
      userPresent: true,
      userVerified: true,
    });
    expect(receipt.warning).toContain('requires Solana');
  });

  test('rejects replay against a different shared approval challenge', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const challenge = buildPasskeyCoapprovalChallenge({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sharedApprovalChallenge: 'challenge-a',
      credentialId: 'credential-1',
      rpId: RP_ID,
      expiresAtUnix: 4_102_444_800,
    });
    const differentChallenge = buildPasskeyCoapprovalChallenge({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sharedApprovalChallenge: 'challenge-b',
      credentialId: 'credential-1',
      rpId: RP_ID,
      expiresAtUnix: 4_102_444_800,
    });
    const assertion = createAssertion(privateKey, challenge, { userVerified: true });

    expect(() => verifyPasskeyCoapproval({
      expectedChallenge: differentChallenge,
      expectedOrigin: ORIGIN,
      expectedRpId: RP_ID,
      credentialPublicKeyJwk: publicKey.export({ format: 'jwk' }),
      assertion: { credentialId: 'credential-1', ...assertion },
    })).toThrow('passkey challenge mismatch');
  });

  test('rejects unavailable user verification when required', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const challenge = buildPasskeyCoapprovalChallenge({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sharedApprovalChallenge: 'challenge-a',
      credentialId: 'credential-1',
      rpId: RP_ID,
      expiresAtUnix: 4_102_444_800,
    });
    const assertion = createAssertion(privateKey, challenge, { userVerified: false });

    expect(() => verifyPasskeyCoapproval({
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRpId: RP_ID,
      credentialPublicKeyJwk: publicKey.export({ format: 'jwk' }),
      assertion: { credentialId: 'credential-1', ...assertion },
      requireUserVerification: true,
    })).toThrow('passkey user verification is required');
  });

  test('rejects expired passkey co-approval challenges', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const challenge = buildPasskeyCoapprovalChallenge({
      owner: 'owner-1',
      sessionKey: 'session-1',
      sharedApprovalChallenge: 'challenge-a',
      credentialId: 'credential-1',
      rpId: RP_ID,
      expiresAtUnix: 100,
    });
    const assertion = createAssertion(privateKey, challenge, { userVerified: true });

    expect(() => verifyPasskeyCoapproval({
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRpId: RP_ID,
      credentialPublicKeyJwk: publicKey.export({ format: 'jwk' }),
      assertion: { credentialId: 'credential-1', ...assertion },
      nowUnix: 101,
    })).toThrow('passkey challenge expired');
  });
});

function createAssertion(privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'], challenge: string, options: { userVerified: boolean }) {
  const clientDataJSON = Buffer.from(JSON.stringify({
    type: 'webauthn.get',
    challenge,
    origin: ORIGIN,
    crossOrigin: false,
  }));
  const flags = options.userVerified ? 0x05 : 0x01;
  const authenticatorData = Buffer.concat([
    createHash('sha256').update(RP_ID).digest(),
    Buffer.from([flags]),
    Buffer.alloc(4),
  ]);
  const signedData = Buffer.concat([
    authenticatorData,
    createHash('sha256').update(clientDataJSON).digest(),
  ]);

  return {
    clientDataJSON: base64url(clientDataJSON),
    authenticatorData: base64url(authenticatorData),
    signature: base64url(sign('sha256', signedData, privateKey)),
  };
}
