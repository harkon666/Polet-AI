# Official Encrypt Primary API Without Static Witness

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## Status

Re-scoped after correcting the Encrypt model. Do not execute this before `059-official-encrypt-devnet-ciphertext-graph-e2e` lands or records a live blocker.

## What to build

After `059` defines the real official Encrypt path, clean up the proxy, SDK, frontend, and docs so the primary product APIs use official Encrypt ciphertext/graph references and never require static `encryptionWitness`.

The goal is not merely "no witness in JSON." The goal is that the primary API shape carries or derives:

- policy ciphertext account ids,
- source amount ciphertext id,
- pending allowed output ciphertext id,
- pending daily-spent output ciphertext id,
- verified allowed/blocked state,
- optional decryption request/result references when needed.

Masked witness remains allowed only under explicitly named legacy/dev fixture code paths.

## Acceptance Criteria

- [ ] Primary DCA/Ika request types expose official Encrypt ciphertext/graph lifecycle fields instead of `encryptionWitness`.
- [ ] Any `encryptionWitness` option is renamed or documented as `maskedWitnessDevFixture` in SDK/runtime-facing surfaces.
- [ ] Proxy routes can derive official Encrypt policy state from wallet state after `set_official_encrypt_ciphertext_policy`.
- [ ] DCA/Ika pending states are tied to pending output ciphertext ids, not synthetic placeholder ids.
- [ ] Verified allowed/blocked request paths are tied to official Encrypt result/decryption references, not mocked resolver-only status.
- [ ] Frontend and SDK examples do not serialize static witness arrays.
- [ ] Regression tests scan primary docs/examples/source for static `[1..32]` witness patterns outside explicit legacy/dev fixtures.
- [ ] Docs state that pre-alpha data may be public/plaintext internally and no production privacy is claimed.

## Blocked By

- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`

## Existing Related Work

- `docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`
- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`
- `proxy/src/lib/official-encrypt-policy.ts`
- `proxy/src/lib/strategy-execution.ts`
- `sdk/src/index.ts`
- `frontend/src/components/DemoTab.tsx`

## Notes

Previous partial work removed static witness defaults from some SDK/frontend flows. Keep that useful cleanup, but do not treat it as sufficient official Encrypt integration.
