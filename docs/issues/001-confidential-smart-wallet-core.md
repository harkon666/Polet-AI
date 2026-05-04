# Confidential Smart Wallet Core

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Refactor the single Polet AI contract into the core of a confidential smart wallet. The wallet must remain a PDA-controlled custody account, preserve owner authority and session-key delegation, and remove plaintext numeric policy fields from the final execution path so the privacy claim is not contradicted by on-chain state.

This slice should establish the new wallet shape and minimum owner/session lifecycle needed by later confidential policy and DCA execution slices.

## Acceptance criteria

- [ ] A wallet can be initialized as a PDA controlled by the Polet program.
- [ ] The wallet stores owner authority, proxy/agent authority metadata, policy commitment or equivalent non-plaintext policy reference, policy sequence, revocation slot, and session key records.
- [ ] The final execution path no longer depends on plaintext `daily_limit`, `daily_spent`, or plaintext serialized numeric policy fields.
- [ ] The owner can grant a temporary AI agent session key.
- [ ] The owner can revoke one session key.
- [ ] The owner can revoke all sessions with a kill switch.
- [ ] Session validation rejects unauthorized, expired, individually revoked, or globally stale sessions.
- [ ] Contract tests cover initialization, grant, revoke, revoke-all, expiry, and basic session validation behavior.

## Blocked by

None - can start immediately.
