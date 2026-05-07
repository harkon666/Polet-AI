# Official Encrypt Policy Inputs Without Static Witness

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Remove the static `encryptionWitness: [1,2,3,...,32]` requirement from the primary demo and SDK/runtime path. Polet should use official Encrypt pre-alpha policy input artifacts instead: Encrypt-owned ciphertext accounts, graph execution inputs, pending output ciphertext identifiers, and verified allowed/blocked lifecycle results.

The masked-witness path can remain as an explicit local test/dev fallback, but it must not be used by the primary hackathon setup, frontend demo, SDK agent kit, runbooks, or Hermes/OpenClaw-style examples. Users and agents should configure and request policy decisions through official Encrypt pre-alpha lifecycle state, not by passing a hardcoded witness byte array.

This issue must follow the local Encrypt docs in `docs/encrypt/SUMMARY.md`, `docs/encrypt-installation.md`, and `docs/encrypt/raw.md`: devnet Encrypt program `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`, pre-alpha gRPC endpoint `https://pre-alpha-dev-1.encrypt.ika-network.net:443`, TypeScript client `@encrypt.xyz/pre-alpha-solana-client`, and Encrypt ciphertext account identifiers as the official policy input/output handles.

## Acceptance criteria

- [ ] The primary proxy/API request shape for Jupiter DCA and Ika no longer requires `encryptionWitness` when the wallet has official Encrypt ciphertext policy configured.
- [ ] SDK `createPoletAgent()`, `createPoletAgentKit()`, local runtime, and docs examples stop using static `[1,2,3,...,32]` witness arrays for the official demo path.
- [ ] Frontend demo setup and action buttons stop constructing static witness arrays for the official Encrypt path; any witness fixture remains labeled as local masked-witness fallback only.
- [ ] Owner/demo setup can create or register official Encrypt pre-alpha ciphertext policy inputs for max-per-run, daily cap, and daily spent using documented Encrypt account/client semantics.
- [ ] DCA and Ika requests carry safe official Encrypt references or derive them from wallet state, then return `pending-encrypt-execution` until executor verification is available.
- [ ] Verified allowed output prepares Jupiter/Ika artifacts only from official Encrypt lifecycle state; verified blocked output suppresses Jupiter payloads, dWallet data, MessageApproval data, destination digests, unsigned approval transactions, private thresholds, decrypted remaining caps, and witness bytes.
- [ ] Public API/type names make the split explicit: official path uses Encrypt ciphertext/policy references; `encryptionWitness` is deprecated or quarantined under a legacy/dev fixture name.
- [ ] Tests prove the no-witness official path for pending, verified blocked, verified allowed, Ika quorum required after verified allowed, and allowed Ika transaction prepared.
- [ ] Regression tests prove the primary SDK/frontend examples do not serialize `encryptionWitness`, `[1,2,3,...,32]`, private max-per-run, daily cap, or decrypted remaining cap.
- [ ] Docs/runbooks state that Encrypt pre-alpha is not production privacy, can reset/change, and settlement remains `not-executed` unless a separate broadcast demo explicitly sends a transaction.

## Blocked by

None - can start immediately

## Ralph slice note

This is the next executable slice after `052` was converted into an umbrella tracker. Complete the smallest no-witness primary path first: proxy/API request shape, SDK/runtime defaults, frontend action payloads, and deterministic tests proving the primary demo no longer serializes static witness arrays. Defer broader manual E2E polish to `055`.

## Existing related work

- `docs/issues/041-official-encrypt-policy-graph-execution.md`
- `docs/issues/050-contract-official-encrypt-verified-ika-cpi-lifecycle.md`
- `docs/issues/051-encrypt-test-harness-compatibility.md`
- `docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`
- `docs/issues/053-agent-sdk-integration-kit.md`

## Progress

2026-05-07 slice:

- Landed no-witness primary proxy/API handling for official Encrypt-configured DCA and Ika requests. Omitted `encryptionWitness` now returns pending/verified official lifecycle states instead of failing request validation.
- Kept masked-witness evaluation as explicit fallback only when no official Encrypt ciphertext policy is configured; missing fallback witness returns `INVALID_POLICY_WITNESS`.
- Updated SDK high-level trade defaults and examples so `createPoletAgent()`, agent-kit tools, and OpenClaw/Hermes-style examples no longer serialize static `[1..32]` witness arrays by default.
- Updated frontend DCA/Ika action payloads and the Ika smoke runbook to omit witness bytes from primary action requests. The remaining frontend policy-save fixture is named as a masked-witness dev fixture.
- Added deterministic proxy regression tests for pending and verified-allowed official Encrypt DCA/Ika requests without witness bytes.

Remaining:

- Add owner/demo UX and proxy route coverage for registering real official Encrypt ciphertext policy inputs end to end.
- Add production transaction builders for verified Encrypt DCA/Ika paths that do not fall back to masked-witness instruction data when a resolver returns verified allowed output.
- Broaden SDK/frontend regression tests to snapshot primary serialized request bodies across all demo buttons and local-runtime modes.

## Grill decisions

Recommended scope: one vertical AFK issue. The completed slice must be demoable end to end: setup official Encrypt policy inputs, submit a DCA/Ika request without witness bytes, observe pending/verified states, and prove payload suppression or preparation based on verified output.

Recommended compatibility stance: keep masked witness only as a clearly named dev fixture for old tests and local fallback. Do not call it "Encrypt witness" or imply it comes from official Encrypt.

Recommended product stance: the user-facing story should be "official Encrypt pre-alpha ciphertext policy lifecycle", not "secret 32-byte witness". Static arrays in docs or examples should disappear from the main path.
