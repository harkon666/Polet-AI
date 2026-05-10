# Ika Pre-Alpha Full Lifecycle Integration

Labels: `needs-triage`, `ika`, `sdk`, `proxy`, `contract`, `frontend`, `devnet`, `epic`

Type: `AFK`

Status: `TODO`

## Parent

`docs/issues/070-production-smart-wallet-agent-trading-prd.md`

## Context

Today Polet owns the on-chain CPI boundary (`approve_message`, `approve_ika_with_verified_encrypt`, route/risk/quorum guardrails) but the downstream signing pipeline is mocked with `demo-sig-...` placeholders. The Ika gRPC endpoint (`pre-alpha-dev-1.ika.ika-network.net:443`) is not wired anywhere in the repo, and no Polet flow creates a dWallet, transfers authority to Polet's CPI PDA, funds a `GasDeposit`, or actually produces a 64-byte signature from Ika Pre-Alpha. Approved Sui / Ethereum intents therefore stop at "signature pending" and never resolve to a real destination-chain transaction hash.

This is the one feature that turns Polet from "policy-gated intent preparator" into "policy-gated multichain AI-agent wallet" - the exact value proposition implied by the hackathon track items on bridgeless capital markets and multi-chain agentic wallets. Treat this as a single epic; do not split it into smaller slices until a first end-to-end path is green.

Pre-alpha disclaimers from `docs/ika/raw.txt` must remain visible. Do not claim production MPC, production settlement, or broadcast guarantees. Native asset movement is allowed only where the destination chain path is explicitly labeled devnet / testnet / non-settlement.

## What to build

Wire the full Ika Pre-Alpha "Common Flow" (DKG -> Transfer Ownership -> Approve -> Presign -> Sign -> CommitSignature -> Destination broadcast) on top of the existing Polet contract + proxy + SDK + frontend so an AI agent holding a Polet session key can execute `USDC -> SUI` on Sui devnet and `USDC -> ETH` on Ethereum Sepolia, starting from a Polet wallet on Solana, gated end-to-end by Polet confidential policy and Polet shared-access quorum, without bridges, without per-chain wallets, and without exposing private policy thresholds.

Work breaks into the following tightly coupled components. Build them in order; do not skip ahead until the prior component is demonstrably working.

### A. dWallet creation and authority transfer

- Add a reproducible Polet flow (standalone `scripts/ika-setup-dwallet.ts` and / or `POST /ika/setup-dwallet` proxy endpoint) that creates an Ika Pre-Alpha dWallet on devnet and immediately transfers its authority to Polet's CPI PDA under seed `__ika_cpi_authority` + pinned Polet program id.
- Use the official `ika-dwallet` SDK path described in `docs/ika/raw.txt` with the pinned Ika program id `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`.
- Support Curve25519 (primary, Sui / Solana Ed25519) and Secp256k1 (optional, Ethereum). Other curves reject with a clear error.
- Default to zero-trust `UserSecretKeyShare::Encrypted`. Trust-minimized `Public` mode is an explicit opt-in for demo simplicity only.
- After `CommitDWallet`, fetch the dWallet account and verify `authority` matches the caller, then submit official `TransferOwnership` (disc 24) and verify `authority` now matches Polet's CPI PDA.
- Persist the Polet owner -> dWallet pubkey / curve / created_epoch mapping to a Polet-local registry so later routes can resolve it.
- Redact secret key share material, ephemeral encryption keys, and private user output bytes from logs and API responses.

### B. GasDeposit provisioning and Ika gRPC client

- Provision a `GasDeposit` PDA for the signing payer (PDA seed `["gas_deposit", user_pubkey]`) via `CreateDeposit` (disc 36) and `TopUp` (disc 37) with configurable initial IKA and SOL amounts.
- Refuse to call `Presign` or `Sign` when `ika_balance` or `sol_balance` is below a configurable floor. The refusal is user-visible but does not leak policy thresholds.
- Document the `RequestWithdraw` -> wait one epoch -> `Withdraw` flow in the runbook even if not wired end-to-end.
- Build a proxy Ika gRPC client that connects to `pre-alpha-dev-1.ika.ika-network.net:443` with explicit TLS and an env override. Authenticate using a proxy KMS service keypair.
- Build and sign `UserSignedRequest` with BCS-serialized `UserSignature::Ed25519 { signature, public_key }` and `SignedRequestData { session_identifier_preimage, epoch, chain_id = Solana, intended_chain_sender, request }`.
- Support `DWalletRequest::Presign`, `DWalletRequest::PresignForDWallet`, and `DWalletRequest::Sign` for both Curve25519 and Secp256k1. Other variants may be stubbed as `Err("unimplemented in Polet")` but the wire format must accept them.
- Deserialize `TransactionResponseData::Signature { signature }`, `Attestation(NetworkSignedAttestation)`, and `Error { message }` correctly. Polet code never treats `Error` as success.

### C. Real presign + sign + CommitSignature lifecycle

- After `approve_message` or `approve_ika_with_verified_encrypt` lands and the `MessageApproval` PDA is `Pending`, the proxy progresses the intent from `approval-transaction-prepared` through:
  1. `DWalletRequest::Presign` (per `signature_algorithm`, or `PresignForDWallet` for imported ECDSA).
  2. `DWalletRequest::Sign` with `ApprovalProof::Solana { transaction_signature, slot }` referencing the on-chain approval transaction.
  3. Polling until the Ika NOA calls `CommitSignature` (disc 43) and the `MessageApproval` account reads back `status = Signed` with `signature_len > 0`.
- Produce a real 64-byte signature (Ed25519 for Curve25519, compact ECDSA for Secp256k1). Remove the `demo-sig-${...}` placeholders from the primary approved path.
- Use the correct `hash_scheme` in the `Sign` request so the produced signature is valid on the destination chain (Keccak256 for EVM, SHA-256 for Sui / Ed25519). The `MessageApproval` lookup hash remains Keccak-256 over the Polet approval preimage independently of `hash_scheme`.
- On any `Error`, `pending`, `needs-approval`, `stale`, or `signer-required` state, preserve the existing Polet error codes and never expose confidential numeric policy values or witness bytes.

### D. Destination broadcast and SDK cross-chain executor

- After a real signature is produced, broadcast the signed transaction to the destination chain RPC:
  - Sui devnet: wrap the signed digest in the existing Sui zero-mist transfer proof artifact and submit to Sui devnet RPC.
  - Ethereum Sepolia: wrap the signed digest in the existing EIP-191 zero-wei transfer proof artifact and submit to Sepolia RPC.
- Return the destination chain transaction hash and a verifiable explorer URL in the proxy response. If broadcast is disabled via `POLET_DESTINATION_BROADCAST_DEMO=enabled` flag gating, fall back to the existing Solana devnet memo proof clearly labeled as non-settlement.
- Extend the SDK agent-facing API so `agent.executeIntent({...})` or the equivalent existing kit surface returns `{ destinationChain, destinationTxHash, destinationExplorerUrl, lifecycleStatus, signature }` on success, consistent with the proxy. The existing blocked / pending / needs-approval / encrypt-verified-blocked paths continue to match their current contracts.

### E. Kill switch + observability across the lifecycle

- Session revoke (`revoke_session`) while an Ika signing is in flight must provably prevent the downstream broadcast:
  - If revoke lands before `approve_message`, the existing contract path already rejects. Confirm.
  - If revoke lands after `approve_message` but before `Sign`, the proxy must detect the revoke during lifecycle progression and abort the Sign request or discard its result without broadcasting.
  - If revoke lands after `Sign` but before broadcast, the proxy aborts broadcast. On-chain `MessageApproval` may still show `Signed`, but no destination-chain transaction is submitted.
- The observability surface (SDK + frontend activity log) renders a distinct `session-revoked-midflight` state for each case above without leaking policy thresholds.

### F. Demo runbook and video segment

- Extend `docs/ika-devnet-smoke-runbook.md` (or a new companion runbook) with: prerequisites (devnet IKA, devnet SOL, Polet program id, Ika program id, Solana RPC, Ika gRPC), step-by-step evidence capture for each Ika Pre-Alpha lifecycle stage, failure states, and a rollback checklist.
- Update `docs/demo-script.md` with a 60-90 second segment demonstrating: policy setup -> agent intent -> policy gate (FHE + shared quorum) -> `approve_message` -> Presign -> Sign -> real destination Sui / Sepolia tx hash viewable in explorer.
- Add one sentence to `README.md` that names the full lifecycle path and links the runbook.

## Acceptance criteria

- [ ] `scripts/ika-setup-dwallet.ts` or `POST /ika/setup-dwallet` creates an Ika Pre-Alpha dWallet on devnet (Curve25519 primary, Secp256k1 optional) and transfers authority to Polet's `__ika_cpi_authority` PDA under the pinned Polet program id, with on-chain verification after each step.
- [ ] Polet persists the owner -> dWallet mapping locally so later proxy routes resolve it without asking the user.
- [ ] `GasDeposit` PDA can be created and topped up through Polet with explicit IKA and SOL amounts; `Presign` and `Sign` are refused when balance is below the configured floor without leaking policy values.
- [ ] Proxy Ika gRPC client authenticates `SubmitTransaction` calls, encodes `UserSignedRequest` correctly for all three supported `DWalletRequest` variants, and parses `TransactionResponseData::{ Signature, Attestation, Error }` correctly under test fixtures.
- [ ] Approved `USDC -> SUI` intent produces a real `MessageApproval` with `status = Signed`, `signature_len = 64`, and a valid Ed25519 signature verifiable against the dWallet public key.
- [ ] Approved `USDC -> ETH` intent produces a real Secp256k1 signature verifiable with `hash_scheme = Keccak256` against the dWallet public key.
- [ ] On successful signature production, proxy broadcasts to the destination chain (Sui devnet, Ethereum Sepolia) and returns a real destination tx hash and explorer URL, or falls back to the existing Solana devnet memo proof under the existing feature flag with clear non-settlement labels.
- [ ] SDK agent-facing API returns `{ destinationChain, destinationTxHash, destinationExplorerUrl, lifecycleStatus, signature }` on the successful path and preserves blocked / pending / needs-approval / encrypt-verified-blocked contracts on the failure paths.
- [ ] Session revoke mid-flight aborts downstream `Sign` or broadcast without leaking policy thresholds; the SDK / frontend surface a distinct `session-revoked-midflight` state.
- [ ] No Ed25519 service private key, secret key share, ephemeral encryption key, private policy value, masked-witness byte, or plaintext amount appears in proxy responses, structured logs, or committed git history.
- [ ] Pre-alpha disclaimers remain visible in README, runbook, demo script, and frontend copy. Polet does not claim production MPC, production settlement, production bridgeless transfer, or real-asset finality.
- [ ] Runbook `docs/ika-devnet-smoke-runbook.md` (or new companion file) covers the end-to-end flow, prerequisites, expected evidence, and failure states. Demo script includes the 60-90 second multichain lifecycle segment. README links the runbook.
- [ ] Existing tests pass: `contract` `NO_DNA=1 cargo test`; `proxy` `bun test` + `bun run build`; `sdk` `bun test` + `bun run build`; `frontend` `bun run test src/components/DemoTab.test.tsx` + `bun run build`. New tests cover (a) UserSignedRequest BCS encoding against a known fixture, (b) TransactionResponseData parsing for all three variants, (c) lifecycle progression happy path, (d) session-revoke mid-flight abort, (e) destination broadcast happy path and disabled-flag fallback.

## Out of scope

- `DWalletRequest::ImportedKeyVerification`, `FutureSign`, `SignWithPartialUserSig`, `ReEncryptShare`, `MakeSharePublic`. Wire format may be acknowledged; integration is deferred.
- Multisig dWallet co-approval beyond the existing Polet shared-access M-of-N quorum. Shared quorum stays exactly as implemented in issue 035.
- Production MPC, production settlement, real-asset bridgeless finality, and mainnet claims. Language stays pre-alpha.
- Passkey co-approval beyond the existing prototype from issue 036. No new authority boundary is created by this work.
- Any change to the confidential numeric policy layer (FHE path from issue 041 / 050). This work sits downstream of policy approval.

## Blocked by

- `docs/issues/050-contract-official-encrypt-verified-ika-cpi-lifecycle.md`
- `docs/issues/035-shared-access-and-multisig-lite-ika-approvals.md`
- `docs/issues/040-official-ika-message-hash-and-signing-lifecycle.md`
