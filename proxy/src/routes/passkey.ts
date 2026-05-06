import { Hono } from 'hono';
import {
  buildPasskeyCoapprovalChallenge,
  verifyPasskeyCoapproval,
} from '../lib/passkey-coapproval';

export const passkeyRouter = new Hono();

passkeyRouter.post('/coapproval/challenge', async (c) => {
  try {
    const body = await c.req.json();
    const required = ['owner', 'sessionKey', 'sharedApprovalChallenge', 'credentialId', 'rpId', 'expiresAtUnix'];
    for (const key of required) {
      if (body[key] === undefined || body[key] === '') {
        return c.json({ success: false, error: `${key} is required` }, 400);
      }
    }

    const challenge = buildPasskeyCoapprovalChallenge({
      owner: body.owner,
      sessionKey: body.sessionKey,
      sharedApprovalChallenge: body.sharedApprovalChallenge,
      credentialId: body.credentialId,
      rpId: body.rpId,
      expiresAtUnix: Number(body.expiresAtUnix),
    });

    return c.json({
      success: true,
      data: {
        challenge,
        publicKeyCredentialRequestOptions: {
          challenge,
          rpId: body.rpId,
          allowCredentials: [{ type: 'public-key', id: body.credentialId }],
          userVerification: 'preferred',
        },
        boundary: 'Passkey proof does not replace Solana wallet/session/co-approver signatures.',
      },
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to build passkey challenge' }, 500);
  }
});

passkeyRouter.post('/coapproval/verify', async (c) => {
  try {
    const body = await c.req.json();
    const receipt = verifyPasskeyCoapproval({
      expectedChallenge: body.expectedChallenge,
      expectedOrigin: body.expectedOrigin,
      expectedRpId: body.expectedRpId,
      expectedCredentialId: body.expectedCredentialId,
      credentialPublicKeyJwk: body.credentialPublicKeyJwk,
      assertion: body.assertion,
      requireUserVerification: body.requireUserVerification,
    });

    return c.json({ success: true, data: receipt });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Passkey verification failed' }, 400);
  }
});
