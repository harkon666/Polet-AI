# Frontend Official Encrypt Status Surface

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/issues/041-official-encrypt-policy-graph-execution.md`

## What to build

Add frontend status handling for the official Encrypt pre-alpha lifecycle. The UI should be able to display `pending-encrypt-execution`, `encrypt-verified-allowed`, and `encrypt-verified-blocked` states returned by the proxy without leaking thresholds, remaining caps, or witness bytes.

This slice should not overclaim that the primary demo is production-private. It should be honest that Encrypt pre-alpha may store data publicly/plaintext and that the executor lifecycle is still under integration.

## Acceptance criteria

- [ ] Frontend API types include official Encrypt lifecycle statuses.
- [ ] DCA and Ika activity cards render pending, verified allowed, and verified blocked states distinctly.
- [ ] Pending Encrypt states do not show executable Jupiter or Ika approval payloads.
- [ ] Verified blocked states suppress dWallet, MessageApproval, Jupiter execution payload, thresholds, and witness data.
- [ ] The UI copy keeps the Encrypt pre-alpha disclaimer visible.
- [ ] Tests cover pending, verified allowed, verified blocked, and legacy masked-witness fallback states.

## Blocked by

- `docs/issues/041-official-encrypt-policy-graph-execution.md`

