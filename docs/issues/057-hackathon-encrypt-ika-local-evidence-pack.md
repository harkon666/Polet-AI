# Hackathon Encrypt Ika Local Evidence Pack

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Create a deterministic local evidence pack for the Ika x Encrypt pre-alpha path so an agent can prove the hackathon story without depending on live devnet availability. The evidence pack should run the smallest proxy, SDK, and frontend checks and produce copy/paste-safe output that lists the observed lifecycle states and redaction guarantees.

No private keys, seed phrases, witness bytes, private thresholds, decrypted caps, or executable payloads should be written into evidence files.

## Acceptance criteria

- [ ] A documented command or script runs the targeted proxy, SDK, and frontend lifecycle checks for issue `052`.
- [ ] The evidence output lists pending, verified blocked, verified allowed, quorum required, quorum satisfied, and unsigned approval signer coverage.
- [ ] Evidence output states that Encrypt and Ika are pre-alpha, production privacy is not claimed, production MPC is not claimed, and settlement remains `not-executed`.
- [ ] Evidence output does not contain `encryptionWitness`, `[1,2,3,...,32]`, private max-per-run, daily cap, decrypted remaining cap, private keys, seed phrases, or executable Jupiter/Ika payloads for blocked or pending states.
- [ ] `docs/ika-devnet-smoke-runbook.md` links the deterministic evidence pack before the manual devnet section.
- [ ] Targeted tests pass.

## Blocked by

- `docs/issues/056-frontend-ika-encrypt-lifecycle-command-center.md`

## Implementation notes

- Prefer a small docs-first or package-script slice over a broad new harness.
- If adding a script, keep output deterministic and redacted by construction.
