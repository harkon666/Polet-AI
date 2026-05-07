# Frontend Official Encrypt Status Surface

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/041-official-encrypt-policy-graph-execution.md`

## What to build

Add frontend status handling for the official Encrypt pre-alpha lifecycle. The UI should be able to display `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked` states returned by the proxy without leaking thresholds, remaining caps, or witness bytes.

This slice should not overclaim that the primary demo is production-private. It should be honest that Encrypt pre-alpha may store data publicly/plaintext and that the executor lifecycle is still under integration.

## Acceptance criteria

- [x] Frontend API types include official Encrypt lifecycle statuses.
- [x] DCA and Ika activity cards render pending, verified allowed, and verified blocked states distinctly.
- [x] Pending Encrypt states do not show executable Jupiter or Ika approval payloads.
- [x] Verified blocked states suppress dWallet, MessageApproval, Jupiter execution payload, thresholds, and witness data.
- [x] The UI copy keeps the Encrypt pre-alpha disclaimer visible.
- [x] Tests cover pending, verified allowed, verified blocked, and legacy masked-witness fallback states.

## Blocked by

- `docs/issues/041-official-encrypt-policy-graph-execution.md`

## Completion notes

- Added a shared frontend `OfficialEncryptLifecycleStatus` / `OfficialEncryptPolicyPreview` API type and mapped DCA/Ika proxy responses into activity states for `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked`.
- DCA and Ika activity cards now show an official Encrypt graph status panel with safe ciphertext identifiers and policy sequence metadata, while pending and verified-blocked responses continue to suppress Jupiter execution payloads, Ika dWallet data, MessageApproval data, thresholds, remaining caps, and witness bytes.
- Updated copy to keep the Encrypt pre-alpha executor/privacy disclaimer visible in the command-center activity surface.
- Added component test coverage for DCA and Ika pending, verified allowed, verified blocked, plus existing masked-witness fallback block/allow behavior.
- Verification: `bun run test src/components/DemoTab.test.tsx` passes in `frontend/` with the existing Vitest/Vite `module is not defined` and shutdown-timeout warnings; `bun run build` passes in `frontend/`.
