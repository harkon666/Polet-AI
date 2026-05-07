# Agent SDK Integration Kit

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Improve the Polet SDK so Hermes, OpenClaw, and similar AI agent runtimes can integrate Polet without hand-rolling JavaScript glue files for wallet discovery, smart wallet PDA derivation, config validation, status checks, transaction simulation, signing, or result normalization.

The SDK should expose a generic agent integration kit, not a Hermes-specific plugin. Agent runtimes should be able to load one SDK entry point, inspect whether the Polet wallet/session is ready, register a small set of tool functions, submit Jupiter or Ika intents, safely handle blocked/pending/needs-approval responses, and sign/send Polet unsigned transactions only when an explicit session signer is available.

Runtime-safe tools should be available by default. Owner/setup helpers should exist under an explicit onboarding namespace and must not silently perform owner-authority actions such as wallet initialization, policy setup, session grants, recovery, or shared approver rotation.

## Acceptance criteria

- [ ] SDK exposes a generic `createPoletAgentKit()` entry point for Hermes/OpenClaw-style runtimes.
- [ ] `kit.status()` checks proxy health, program id, derived smart wallet PDA, wallet existence, policy state, session authorization, shared Ika approval state, and recovery metadata without requiring the agent to build ad hoc curl or JS scripts.
- [ ] `kit.validateConfig()` returns structured missing/invalid config diagnostics for `owner`, `sessionKey`, `baseUrl`, optional `encryptionWitness`, optional RPC URL, and optional signer/keypair settings.
- [ ] `kit.tools()` returns generic runtime-safe tool descriptors and callable handlers for `polet_status`, `polet_trade`, `polet_ika_request`, `polet_simulate_transaction`, `polet_sign_and_send_transaction`, and `polet_shared_ika_approval_status`.
- [ ] Runtime tools normalize Polet responses into stable agent-facing statuses: `blocked`, `pending-encrypt-execution`, `needs-approval`, `preview-ready`, `approval-transaction-prepared`, `submitted`, `failed`, and `not-supported`.
- [ ] Runtime tools never expose private thresholds, decrypted remaining caps, seed phrases, private keys, or raw `encryptionWitness` values in returned tool output.
- [ ] Signing/sending is opt-in and only works when an explicit session signer/keypair provider is configured; otherwise the tool returns a clear `signer-required` result with the required signer public keys.
- [ ] Onboarding helpers include smart wallet PDA derivation, environment/config export, required owner setup explanation, and agent secret/witness provisioning guidance without automatically executing owner-authority transactions.
- [ ] The kit exposes smart wallet and authority addresses agents commonly need: Polet program id, owner, wallet PDA, session key, CPI authority PDA where applicable, dWallet/MessageApproval when returned by an allowed Ika request, and required transaction signers.
- [ ] SDK docs include a 10-20 line generic agent integration example and a tool-registration example that can be adapted by Hermes, OpenClaw, or other runtimes.
- [ ] Existing ad hoc debug/private-key helper patterns are not reintroduced. Tests or examples must not hardcode private keys, seed phrases, keypair JSON, or production secrets.
- [ ] Tests cover missing wallet, wrong owner/session, missing witness, blocked request, allowed Jupiter unsigned transaction, Ika needs-approval, Ika approval transaction prepared, signer-required, and sign/send with an injected test signer.

## Blocked by

None - can start immediately

## Existing related work

- `docs/issues/009-real-agent-runtime-integration.md`
- `docs/issues/018-agent-trade-sdk-adapters.md`
- `docs/issues/029-agent-sdk-ika-sui-signed-intent.md`
- `docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## Grill decisions

Recommended target: build a generic SDK integration kit rather than a Hermes-specific plugin. Hermes is one consumer, but the SDK should be useful for OpenClaw and any other agent runtime.

Recommended namespace split: runtime-safe tools are exposed by default; owner/setup helpers live under an explicit onboarding namespace. The SDK may help explain or build owner setup flows, but it must not silently perform owner-authority actions.

Recommended UX bar: an agent runtime should not need to create temporary files like `check_key.js`, `debug_keypair.js`, or custom curl wrappers just to understand Polet wallet status, smart wallet PDA, required signers, or allowed/blocked trade results.

Recommended safety stance: signing and broadcasting remain explicit. If the agent does not hold a configured session signer, the SDK returns a structured signer-required result instead of trying to infer private key material or asking the model for secrets.
