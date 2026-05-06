# Passkey Co-Approval Prototype

Polet uses passkeys as a co-approval UX layer only. The selected issue `036` scope is `co-approval`, not owner login, not session key creation, and not Ika dWallet authority replacement.

## Decision

- Passkeys can help a human co-approver approve a shared Ika request in a browser-native way.
- Solana owner signatures still configure wallet state.
- Solana session keys still sign session execution transactions.
- Solana co-approver signer accounts still satisfy the on-chain shared Ika quorum.
- Ika dWallet authority remains Polet's CPI authority PDA and is not controlled by a passkey.

## Threat Model

A passkey can authorize:

- A browser-origin-bound co-approval proof for a specific Polet shared approval challenge.
- A user-presence or user-verification check, depending on authenticator support.
- A replay-resistant proof bound to `owner`, `sessionKey`, shared Ika approval challenge, credential id, rpId, and expiry.

A passkey cannot authorize:

- Direct movement of Polet wallet funds.
- Creation, revocation, or mutation of on-chain wallet policy without the owner Solana signature.
- Agent session execution without the Solana session signer.
- Shared Ika quorum on-chain without the configured Solana co-approver signer accounts.
- Ika dWallet signing authority or production MPC settlement.

## Prototype API

`POST /passkey/coapproval/challenge` builds a WebAuthn-compatible challenge for an existing shared Ika approval challenge.

Required fields:

- `owner`
- `sessionKey`
- `sharedApprovalChallenge`
- `credentialId`
- `rpId`
- `expiresAtUnix`

`POST /passkey/coapproval/verify` verifies the browser assertion.

Verified fields:

- `clientDataJSON.type === "webauthn.get"`
- `clientDataJSON.challenge` matches the Polet passkey challenge
- `clientDataJSON.origin` matches the expected origin
- authenticator data rpId hash matches expected `rpId`
- user presence is set
- user verification is set when required
- P-256 WebAuthn signature verifies over `authenticatorData || sha256(clientDataJSON)`

Successful verification returns a `passkey-verified` receipt with an explicit warning that Solana signatures and on-chain checks are still required.

## Recovery And Failure Checks

- If the passkey is unavailable, the request stays in `needs-approval`; the user can fall back to the configured Solana co-approver signer flow.
- If origin or rpId mismatch, verification fails and no co-approval receipt is produced.
- If the challenge is replayed against a different shared Ika approval challenge, verification fails.
- If user verification is required but not available, verification fails.
- If the passkey receipt exists but Solana co-approver signers are missing, the contract still blocks Ika `approve_message` before CPI.

## Verification

- `bun test ./tests/passkey-coapproval.test.ts` in `proxy/` covers valid assertion verification, replay rejection, and unavailable user-verification failure.
- `bun run build` in `proxy/` verifies the route and prototype module compile.
