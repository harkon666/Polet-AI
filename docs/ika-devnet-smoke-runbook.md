# Ika Devnet Smoke Runbook

This runbook is the manual issue 031 smoke path for proving Polet can use the official Ika Solana Pre-Alpha flow when the external devnet is available.

It is intentionally HITL. CI remains mocked/local. Do not run this against mainnet, do not put keypairs in this repository, and do not claim production MPC, production confidentiality, or real bridgeless asset settlement from this smoke.

## Scope

The smoke proves these outcomes:

1. A `25` USDC-equivalent Sui request is blocked by Polet confidential policy before any Ika approval data is created.
2. A `5` USDC-equivalent Sui request passes Polet policy and returns an unsigned `approve_ika_message_as_session` transaction for the session signer.
3. The signed Polet transaction CPI-calls official Ika Pre-Alpha `approve_message` and creates a `MessageApproval` account when Ika devnet is available.
4. The operator can poll and inspect the `MessageApproval` account until the mock signer writes a signature.

## Pinned Devnet Surface

Use these constants unless the official Pre-Alpha docs are updated:

```text
Solana cluster: devnet
Solana RPC: https://api.devnet.solana.com
Ika dWallet gRPC: https://pre-alpha-dev-1.ika.ika-network.net:443
Ika dWallet program id: 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
Polet program id: F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p
Polet wallet PDA seed: polet_wallet
Polet Ika CPI authority seed: __ika_cpi_authority
Sui-compatible signature scheme: EddsaSha512 / index 5
```

Official references:

- Ika guide: `https://solana-pre-alpha.ika.xyz/`
- Ika repo: `https://github.com/dwallet-labs/ika-pre-alpha`
- Local alignment memo: `docs/ika-dwallet-prealpha-alignment.md`
- Canonical order message: `docs/bridgeless-order-message.md`

## Required Accounts

Record these before starting the smoke:

```text
POLET_OWNER=<owner wallet public key>
POLET_WALLET_PDA=<derived Polet wallet PDA>
POLET_SESSION_KEY=<agent/session signer public key>
POLET_CPI_AUTHORITY=<PDA from ["__ika_cpi_authority"] under Polet program id>
IKA_DWALLET_ACCOUNT=<official Ika dWallet account>
IKA_USER_PUBLIC_KEY=<public key passed to Ika approve_message, usually the Polet owner>
IKA_MESSAGE_APPROVAL=<returned MessageApproval PDA after the 5 USDC path>
```

Account requirements:

- `POLET_OWNER` signs Polet wallet initialization, custody registration, confidential policy setup, and session authorization.
- `POLET_SESSION_KEY` signs the returned Polet Ika approval transaction and pays its devnet fee/rent.
- `IKA_DWALLET_ACCOUNT` must be an active Curve25519/Ed25519-compatible dWallet for the Sui smoke.
- `IKA_DWALLET_ACCOUNT.authority` must equal `POLET_CPI_AUTHORITY` before Polet can approve messages.
- `IKA_MESSAGE_APPROVAL` is created only by the 5 USDC approved path; the 25 USDC blocked path must not create one.

## Faucet And Funding Needs

Fund only devnet accounts:

```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2 "$POLET_OWNER"
solana airdrop 2 "$POLET_SESSION_KEY"
```

Additional Ika-side funding may be required by the official Pre-Alpha SDK:

- SOL for dWallet creation, authority transfer, and MessageApproval rent.
- Any Ika Pre-Alpha gas deposit required by the official examples or gRPC flow.
- Devnet USDC only if you also want the frontend custody panel to show funded token accounts; the Ika smoke itself uses a USDC-equivalent policy amount and does not settle assets.

## Environment

Proxy:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
JUPITER_API_KEY=<jupiter_api_key>
PROXY_MASTER_KEY=<64_hex_chars_for_local_demo_key_encryption>
PORT=3001
```

Frontend:

```bash
VITE_PROXY_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

Agent/runtime smoke:

```bash
POLET_OWNER=<owner wallet public key>
POLET_SESSION_KEY=<authorized session signer public key>
POLET_PROXY_URL=http://localhost:3001
```

No-witness official Encrypt is the primary smoke path. Do not set legacy witness env vars for official Encrypt evidence. Masked-witness env vars are only for legacy/local dev fixture wallets that have no official Encrypt ciphertext policy configured.

Ika smoke metadata:

```bash
IKA_DWALLET_GRPC_URL=https://pre-alpha-dev-1.ika.ika-network.net:443
IKA_DWALLET_PROGRAM_ID=87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
IKA_DWALLET_ACCOUNT=<official Ika dWallet account>
IKA_USER_PUBLIC_KEY=<owner or user public key for approve_message>
IKA_SIGNATURE_SCHEME=ed25519-prealpha
```

## Local Preflight

For hackathon issue `059`, run the official Encrypt devnet ciphertext/graph evidence path before the manual Ika send. If Encrypt devnet, gRPC, faucet, executor, or decryptor availability blocks the run, record the exact command, error, endpoint, and retry action. Do not replace live official Encrypt evidence with masked-witness or synthetic lifecycle output.

The local deterministic tests below remain useful as fallback engineering checks only. They are not sufficient evidence for the hackathon Encrypt core-integration claim.


Run deterministic local checks before touching devnet:

```bash
cd proxy
bun test ./tests/ika-bridgeless-request.test.ts ./tests/transaction-builder.test.ts
bun run build
```

```bash
cd sdk
bun test ./tests/local-agent-runtime.test.ts ./tests/intent-builder.test.ts
bun run build
```

If contract code changed, also run:

```bash
cd contract
NO_DNA=1 anchor build
NO_DNA=1 cargo test
```

## Official Encrypt Devnet E2E Checklist

Use this checklist for issue `059` and follow-up issue `055` evidence before any live Ika send:

```text
Cluster: devnet
Encrypt gRPC: https://pre-alpha-dev-1.encrypt.ika-network.net:443
Encrypt program id: 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
Polet program id: F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p
Polet wallet PDA:
Policy ciphertexts: max_per_run, daily_cap, daily_spent
Pending output ciphertexts: source_amount, allowed_output, daily_spent_output
Owner:
Session signer:
Ika dWallet:
MessageApproval:
CPI authority:
Unsigned transaction signer list:
Simulation result:
Explorer link if sent:
Settlement executed: no
Production privacy claimed: no
Production MPC claimed: no
```

Expected official no-witness states:

- `pending-encrypt-execution`: no Jupiter transaction, no dWallet, no MessageApproval, no destination digest, no unsigned approval transaction.
- `encrypt-verified-blocked`: verified Encrypt ciphertext ids only; execution payloads and Ika approval data remain suppressed.
- `encrypt-verified-allowed`: Jupiter preview or Ika approval data can be prepared, still unsigned and `settlement: not-executed`.
- `IKA_APPROVAL_QUORUM_REQUIRED`: shared approval counts/challenge only; no Ika approval transaction until quorum is satisfied.
- `approval-transaction-prepared`: unsigned Polet approval transaction includes `POLET_SESSION_KEY` as required signer. Simulate before asking for a signature.

Unsigned proxy builder routes for issue `059`:

```text
POST /wallet/set-official-encrypt-ciphertext-policy
POST /wallet/execute-encrypt-policy-graph
POST /wallet/approve-ika-with-verified-encrypt
```

These routes build unsigned Polet transactions only. They do not create ciphertext accounts by themselves, sign, simulate, send, decrypt, or claim settlement. Use official Encrypt client output for ciphertext account ids, then feed those ids into these routes. If the official client, gRPC endpoint, faucet, executor, or decryptor is unavailable, record the exact command/error below and keep local harness evidence labeled fallback.

Evidence files:

```text
055-frontend-official-encrypt-pending.png
055-frontend-official-encrypt-blocked.png
055-proxy-dca-no-witness-pending.json
055-proxy-ika-no-witness-verified-allowed.json
055-sdk-agent-kit-signer-required.json
055-simulation-result.json
```

## Step 1: Start Polet Devnet Stack

Start the proxy:

```bash
cd proxy
bun run dev
```

Start the frontend in a separate shell:

```bash
cd frontend
bun run dev
```

Open `http://localhost:3000`, connect the owner devnet wallet, initialize the Polet wallet, set up demo custody, save the confidential policy, and authorize the session signer.

Use the demo policy values:

```text
Max per run: 10 USDC
Daily cap: 20 USDC
Official Encrypt policy inputs: max-per-run, daily-cap, and daily-spent ciphertext accounts registered on the Polet wallet
Authorized session signer: POLET_SESSION_KEY
```

After setup, fetch wallet state and record `walletPda`, `policySeq`, `lastRevokedSlot`, and the active session entry:

```bash
curl "http://localhost:3001/wallet/$POLET_OWNER"
```

## Step 2: Create Or Import An Ika dWallet

Primary path: create a fresh Curve25519 dWallet through the official Ika Pre-Alpha DKG flow.

Use the official `ika-pre-alpha` repo and guide for the DKG request because Polet does not own dWallet creation:

```bash
git clone https://github.com/dwallet-labs/ika-pre-alpha
cd ika-pre-alpha
cargo build --workspace
```

Use the official examples or generated client against:

```text
gRPC: https://pre-alpha-dev-1.ika.ika-network.net:443
Solana RPC: https://api.devnet.solana.com
Program: 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
Curve: Curve25519
Signature scheme: EddsaSha512 / 5
```

Record the created dWallet account as `IKA_DWALLET_ACCOUNT`.

Imported dWallet path is optional. If used, record that the key-import trust model differs from fresh DKG and do not describe it as production MPC custody.

## Step 3: Transfer dWallet Authority To Polet

Derive Polet's CPI authority PDA with seed `__ika_cpi_authority` and Polet program id `F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p`.

The owner/current dWallet authority must transfer the dWallet authority to this PDA using the official Ika `TransferOwnership` flow. The proxy must not become dWallet authority.

Before signing the transfer transaction, simulate it with the operator's Ika client and inspect:

```text
Cluster: devnet
Fee payer: operator/current dWallet authority
dWallet: IKA_DWALLET_ACCOUNT
New authority: POLET_CPI_AUTHORITY
Program: IKA_DWALLET_PROGRAM_ID
```

After confirmation, fetch the dWallet account with the official SDK reader or `solana account` and verify:

```text
owner == IKA_DWALLET_PROGRAM_ID
data length matches official DWallet layout
authority == POLET_CPI_AUTHORITY
state == Active
curve == Curve25519
```

If authority is not `POLET_CPI_AUTHORITY`, stop. The 5 USDC Polet approval should fail with wrong authority until this is corrected.

## Step 4: Prove 25 USDC Is Blocked Before Ika Approval

Use either the frontend Ika blocked button or the SDK runner.

SDK runner path:

```bash
cd sdk
POLET_OWNER="$POLET_OWNER" \
POLET_SESSION_KEY="$POLET_SESSION_KEY" \
POLET_PROXY_URL=http://localhost:3001 \
POLET_AGENT_SCENARIO=ika-sui \
POLET_DCA_AMOUNT_USDC=25 \
bun run agent:run
```

Expected result:

```text
decision: blocked
proxy.code: CONFIDENTIAL_POLICY_BLOCKED
no ikaRequest object
no dWallet account
no MessageApproval account
no private threshold, daily cap, or witness bytes in the response
```

Record the response JSON or screenshot as `031-blocked-25-usdc` evidence.

## Step 5: Request The 5 USDC Sui Ika Approval

Submit an explicit multichain intent so the proxy uses the real `IKA_DWALLET_ACCOUNT` instead of its deterministic local placeholder.

```bash
curl -sS -X POST http://localhost:3001/intent/multichain/run \
  -H 'content-type: application/json' \
  -d "{
    \"id\": \"ika-sui-devnet-smoke-5\",
    \"owner\": \"$POLET_OWNER\",
    \"sessionKey\": \"$POLET_SESSION_KEY\",
    \"action\": \"multichain-strategy\",
    \"params\": {
      \"sourceChain\": \"solana\",
      \"sourceAsset\": \"USDC\",
      \"targetChain\": \"sui\",
      \"targetAsset\": \"SUI\",
      \"amount\": \"5\",
      \"executionRail\": \"ika\",
      \"strategy\": \"dca\",
      \"slippageBps\": 100,
      \"ikaPreAlpha\": {
        \"dwalletAccount\": \"$IKA_DWALLET_ACCOUNT\",
        \"userPublicKey\": \"$IKA_USER_PUBLIC_KEY\",
        \"signatureScheme\": \"ed25519-prealpha\"
      }
    },
    \"timestamp\": $(date +%s)
  }"
```

Expected proxy result before signing:

```text
success: true
data.allowed: true
data.code: IKA_APPROVAL_TRANSACTION_PREPARED
data.status: approval-transaction-prepared
data.ikaRequest.intentStrategy == dca
data.ikaRequest.executionRail == ika-bridgeless
data.ikaRequest.preAlphaSigning.dwalletAccount == IKA_DWALLET_ACCOUNT
data.ikaRequest.preAlphaSigning.approveMessage.programId == IKA_DWALLET_PROGRAM_ID
data.ikaRequest.preAlphaSigning.ikaMessageHash == data.ikaRequest.ikaMessageHash
data.ikaRequest.preAlphaSigning.ikaMessageHash != data.ikaRequest.suiTransactionDigest.digestHex
data.ikaRequest.preAlphaSigning.destinationSigningDigest.digestHex == data.ikaRequest.suiTransactionDigest.digestHex
data.ikaRequest.suiTransactionDigest.broadcastable == false
data.ikaRequest.suiTransactionDigest.productionSettlement == false
data.ikaRequest.preAlphaSigning.messageApprovalPda is present
data.ikaRequest.poletApprovalTransaction.transaction is present
data.ikaRequest.poletApprovalTransaction.signers == [POLET_SESSION_KEY]
data.ikaRequest.settlement == not-executed
```

Record:

```text
IKA_MESSAGE_APPROVAL=<data.ikaRequest.preAlphaSigning.messageApprovalPda>
IKA_MESSAGE_HASH=<data.ikaRequest.preAlphaSigning.ikaMessageHash>
IKA_SUI_DIGEST=<data.ikaRequest.suiTransactionDigest.digestBase58>
IKA_CANONICAL_ORDER_HASH=<data.ikaRequest.canonicalOrderHash>
POLET_APPROVAL_TRANSACTION=<base64 transaction from data.ikaRequest.poletApprovalTransaction.transaction>
```

## Hackathon Ika x Encrypt Evidence Checklist

Capture these artifacts for issue `052` without recording private thresholds, decrypted remaining caps, witness bytes, private keys, or seed phrases:

- `pending-encrypt-execution`: proxy response has `data.status: pending-encrypt-execution`, `data.encryptPolicy.graph: polet_policy_guardrail_graph`, and no `ikaRequest`, dWallet, MessageApproval, destination digest, or unsigned approval transaction.
- `encrypt-verified-blocked`: proxy response has `data.status: encrypt-verified-blocked`, verified Encrypt ciphertext ids, and no Ika approval data or unsigned transaction.
- `encrypt-verified-allowed`: proxy response has `data.ikaRequest.policyAttestation.status: encrypt-verified-allowed`, `data.ikaRequest.intentStrategy: dca`, `data.ikaRequest.executionRail: ika-bridgeless`, canonical order hash, Ika message hash, dWallet account, MessageApproval PDA, CPI authority PDA, and unsigned Polet approval transaction.
- `quorum required`: response has `data.code: IKA_APPROVAL_QUORUM_REQUIRED`, progress counts, and no `ikaRequest`, dWallet, MessageApproval, destination digest, or unsigned approval transaction.
- `quorum satisfied`: response has the same verified-allowed artifacts plus `poletApprovalTransaction.signers == [POLET_SESSION_KEY]`.
- `signer review`: record cluster, fee payer, required signer, Polet instruction, dWallet, MessageApproval, Ika program, and simulation result before any signature.
- `devnet/explorer`: if signed and sent manually, record Polet approval signature, explorer link, MessageApproval account lookup, and state that settlement remains `not-executed`.

Evidence language must say Encrypt and Ika are pre-alpha here. Do not claim production privacy, production MPC, or bridgeless asset settlement.

Fallback local checks for the same lifecycle control flow are covered by:

```bash
cd proxy
bun test ./tests/ika-bridgeless-request.test.ts
```

The proxy suite covers `pending-encrypt-execution`, `encrypt-verified-blocked`, `encrypt-verified-allowed`, quorum-required after verified allowed, quorum-satisfied, and suppression of dWallet, MessageApproval, destination digest, unsigned approval transaction, private thresholds, and witness bytes before the allowed/quorum-satisfied boundary.

```bash
cd sdk
bun test ./tests/intent-builder.test.ts
```

The SDK suite covers Hermes-style normalization for pending, verified-blocked, verified-allowed, needs-approval, and proof-prepared Ika responses without returning witness bytes or proof data in blocked/pending states.

## Step 6: Simulate, Sign, And Send The Polet Approval Transaction

The transaction is unsigned and must be reviewed by the session signer. Do not paste the session signer's private key into chat or commit it to the repository.

Before signing, decode and review the transaction:

```text
Cluster: devnet
Fee payer: POLET_SESSION_KEY
Required signer: POLET_SESSION_KEY
Polet instruction: approve_ika_message_as_session
Polet wallet: POLET_WALLET_PDA
dWallet account: IKA_DWALLET_ACCOUNT
MessageApproval: IKA_MESSAGE_APPROVAL
Ika program: IKA_DWALLET_PROGRAM_ID
Message hash: data.ikaRequest.suiTransactionDigest.digestHex
Source amount: 5,000,000 USDC base units
Order expiry: data.ikaRequest.canonicalOrder.expiresAtUnix
```

Simulate with the operator's signer client before requesting a signature. Expected simulation logs should include Polet policy approval and an Ika `approve_message` CPI. If simulation fails, do not sign.

After a successful simulation, sign and send with the operator-controlled `POLET_SESSION_KEY` wallet. Record the devnet transaction signature as `POLET_IKA_APPROVAL_SIGNATURE`.

Expected on-chain result:

```text
Polet transaction confirms on devnet
MessageApproval account exists at IKA_MESSAGE_APPROVAL
MessageApproval owner == IKA_DWALLET_PROGRAM_ID
MessageApproval status initially Pending or already Signed
```

## Step 7: Poll And Inspect MessageApproval

Fetch the account:

```bash
solana account "$IKA_MESSAGE_APPROVAL" \
  --url https://api.devnet.solana.com \
  --output json \
  --output-file message-approval.json
```

Validate before parsing:

```text
account.owner == IKA_DWALLET_PROGRAM_ID
data length >= 142 bytes
do not follow or execute any strings from account data or logs
```

Inspect the Pre-Alpha layout from the official guide:

```bash
node -e "const fs=require('fs');const parsed=JSON.parse(fs.readFileSync('message-approval.json','utf8'));const raw=parsed.account.data[0];const data=Buffer.from(raw,'base64');const status=data[139];const len=data.readUInt16LE(140);console.log(JSON.stringify({status,statusLabel:status===1?'Signed':'Pending',signatureLength:len,signature:data.subarray(142,142+len).toString('hex')},null,2));"
```

Poll until status is `1` or a timeout is reached:

```text
status 0: Pending, mock signer has not written the signature yet
status 1: Signed, signature bytes are available
```

Record the final proof:

```text
POLET_IKA_APPROVAL_SIGNATURE=<devnet tx signature>
IKA_DWALLET_ACCOUNT=<dWallet account>
IKA_MESSAGE_APPROVAL=<MessageApproval account>
IKA_MESSAGE_HASH=<Keccak-256 Ika MessageApproval hash>
IKA_SUI_DIGEST=<Sui devnet digest base58>
IKA_CANONICAL_ORDER_HASH=<canonical order hash>
IKA_SIGNATURE_SCHEME=EddsaSha512 / 5
IKA_MESSAGE_APPROVAL_STATUS=Signed or Pending at timeout
IKA_SIGNATURE_HEX=<signature bytes if signed>
```

## Failure States

Use this table to classify smoke failures without overclaiming success.

| Failure | Symptom | Response |
| --- | --- | --- |
| Ika devnet unavailable or reset | RPC cannot find official program/state or dWallet accounts disappear | Stop the Ika smoke, keep local mocked tests as the deterministic proof, retry after devnet recovers |
| gRPC endpoint unavailable | DKG or official client cannot reach `pre-alpha-dev-1.ika.ika-network.net:443` | Do not create/import dWallet; record endpoint failure and retry later |
| Mock signer delayed or unavailable | MessageApproval remains `Pending` past timeout | Record pending state and transaction signature; do not claim signature produced |
| Insufficient SOL/rent | Simulation or send fails with fee/rent error | Airdrop devnet SOL to owner/session signer and retry simulation before signing |
| Insufficient Ika gas deposit | Official Ika flow rejects DKG/signing operation | Top up the required Pre-Alpha gas deposit with official tooling |
| Wrong dWallet authority | Polet approval simulation fails in Ika CPI | Re-run authority transfer and verify `authority == POLET_CPI_AUTHORITY` |
| Wrong MessageApproval PDA derivation | Ika program rejects the account or account is not created | Use the official SDK PDA helper when available and compare with proxy output |
| Stale session | Proxy returns `SESSION_STALE` or contract rejects attestation slot | Authorize a fresh session key after the latest kill-switch slot |
| Expired session | Proxy returns `SESSION_EXPIRED` | Re-authorize the session signer with a future expiry |
| Expired order | Contract rejects `order_expires_at` | Rebuild the intent and approval transaction before signing |
| Missing masked-witness dev fixture | Proxy returns `INVALID_POLICY_WITNESS` only for wallets without official Encrypt ciphertext policy | Use the official Encrypt ciphertext policy path for hackathon evidence; masked witness is legacy/local fixture only |
| Over-limit policy block | Proxy returns `CONFIDENTIAL_POLICY_BLOCKED` | Expected only for the 25 USDC path; no Ika data should be present |

## Evidence Template

Paste this into the issue, PR, or demo notes after a run:

```text
Date:
Operator:
Solana RPC:
Polet program id:
Ika program id:
Owner:
Polet wallet PDA:
Session signer:
Polet CPI authority:
dWallet account:
dWallet authority verified as Polet CPI authority: yes/no
25 USDC response code:
25 USDC Ika approval data present: no
5 USDC response code:
Polet approval tx signer:
Polet approval devnet signature:
MessageApproval account:
MessageApproval status:
Signature length:
Signature hex prefix:
Settlement executed: no
Production MPC claimed: no
Notes/failures:
```

## CI Boundary

This smoke is optional and manual. It must not block CI because it depends on external Ika Pre-Alpha devnet, faucets, gRPC availability, and mock signer timing.

Deterministic CI remains:

```bash
cd contract && NO_DNA=1 cargo test
cd proxy && bun test
cd sdk && bun test
cd frontend && bun run test
```

The local contract tests use `mock_ika` to prove policy-gated CPI behavior. The devnet smoke only adds live Pre-Alpha evidence when the external network is available.


---

## Issue 080 — Full Ika Pre-Alpha Lifecycle (Polet wiring)

Issue 080 wires the complete Ika Pre-Alpha Common Flow (DKG → TransferOwnership → Approve → Presign → Sign → CommitSignature → destination broadcast) into Polet. The steps below cover the additions produced by that issue on top of the smoke runbook above.

Pre-alpha disclaimer: Ika signing uses a single mock signer, not production MPC. Destination broadcast is Sui devnet / Ethereum Sepolia only. Polet does not claim production bridgeless settlement or real-asset finality.

### Step 5 (signature-committed) live-devnet evidence (2026-05-10)

Full DKG → approve_message → Presign → Sign → CommitSignature has been verified end-to-end on devnet via the production `progressIkaLifecycle` code path. Evidence capture: `docs/evidence/080-ika-fresh-sign-v2-live.json`.

- Reproduce the isolated happy path (bypasses proxy): `cd proxy && bun run ../scripts/ika-fresh-sign-e2e-v2.ts` (requires `/tmp/fresh-owner.json`).
- Reproduce the production code path: `cd proxy && bun run ../scripts/ika-proxy-progression-live-e2e.ts` — exercises `progressIkaLifecycle` with the real `IkaGrpcClient` against devnet.

Working combination (do not change without re-running both scripts):

- `session_identifier_preimage` for Presign and Sign must be `new Uint8Array(32)` (all zeros). The official `@ika.xyz/pre-alpha-solana-client.requestDKG()` hardcodes the same preimage; the server uses it verbatim as the dWallet key lookup id, so Sign must match.
- `dwallet_attestation` on Sign must be the real `NetworkSignedAttestation` from the DKG response (`attestationDataHex`, `networkSignatureHex`, `networkPublicKeyHex`, `epoch`). Zero bytes trigger `"failed to decode dwallet_attestation"`.
- For Curve25519 + EdDSA use global `DWalletRequest::Presign`. `PresignForDWallet` is rejected server-side with `"PresignForDWallet is only for imported ECDSA keys"` and is only valid for imported ECDSA dWallets.
- `ApprovalProof::Solana.transaction_signature` must be the raw bytes of the `approve_message` Solana tx signature (bs58-decoded, not base64).
- `DWalletCurve` is a BCS enum with a single-byte variant tag (0..3). The earlier hand-rolled encoder wrote it as `u16 LE` which produced `"invalid signed_request_data: remaining input"`; fixed in `proxy/src/lib/ika-grpc-schema.ts`.

Known upstream gotchas (documented so future readers don't rediscover them):

- `@ika.xyz/pre-alpha-solana-client@0.1.1`'s `requestSign()` hardcodes zero-filled `dwallet_attestation`. The helper is unusable for signing as published. Same bug in the `_shared/ika-setup.ts` helper inside the public Ika repo (`chains/solana/examples/_shared/ika-setup.ts`), so the voting E2E demo in docs likely does not work as written.
- `DWalletCurve` is documented as "u16 (LE in on-chain accounts, BCS-serialized for gRPC)" in `docs/ika/raw.txt`. BCS serialization for enums is a single-byte variant tag, not a u16 scalar — the "u16 LE" note in docs only applies to on-chain DWallet account bytes.

### Managed Demo Mode (recommended for hackathon reviewers)

Issue 080 ships a **managed demo mode** that collapses the per-user dWallet setup into one frontend button. The operator runs the Ika DKG + TransferOwnership **once** at deployment time, writes the resulting dWallet metadata to a JSON fixture, and the proxy reuses it for all demo users. This mirrors the "house signer" pattern and avoids forcing hackathon reviewers through a Rust CLI.

Trade-offs:
- All demo users share the same underlying dWallet. Acceptable because Ika pre-alpha is mock-signer anyway.
- Clear disclosure copy in the frontend (`IkaSetupPanel`) and `GET /ika/managed-fixture/status` make the mode explicit.
- Production roadmap still points at per-user WASM DKG; see "Advanced self-custody path" below.

#### Operator one-time setup

1. Run `scripts/ika-setup-dwallet.ts --owner <OPERATOR_PUBKEY> --curve curve25519 --dkg-material ./dkg.json` (once per curve).
2. Capture the DKG attestation (`attestationDataHex`, `networkSignatureHex`, `networkPublicKeyHex`, `epoch`), network encryption key, dWallet pubkey + account, and the `messageCentralizedSignature` the DKG tooling returns.
3. Submit TransferOwnership so the dWallet's `authority` becomes Polet's `__ika_cpi_authority` PDA. Verify on-chain.
4. Write `.polet/ika-managed-fixture.json` (or point `POLET_IKA_MANAGED_FIXTURE_PATH` at a chosen path) with the shape:

   ```json
   {
     "version": 1,
     "disclosure": "Polet demo managed dWallet — pre-alpha mock signer only.",
     "dwallets": {
       "curve25519": {
         "curve": 2,
         "dwalletAccount": "…",
         "dwalletPublicKeyHex": "…",
         "transferredAuthority": "<Polet CPI authority PDA>",
         "createdEpoch": "<epoch>",
         "dwalletNetworkEncryptionPublicKeyHex": "…",
         "dwalletAttestation": {
           "attestationDataHex": "…",
           "networkSignatureHex": "…",
           "networkPublicKeyHex": "…",
           "epoch": "<epoch>"
         },
         "messageCentralizedSignatureHex": "…"
       },
       "secp256k1": { "…": "optional; required only for Ethereum broadcast" }
     }
   }
   ```

5. Optionally fund a subsidy keypair and expose it via `POLET_IKA_SUBSIDY_KEYPAIR_PATH` (json array) or `POLET_IKA_SUBSIDY_KEYPAIR` (base58) so `/ika/enable-chain` can auto-fund user `GasDeposit` PDAs. Without this, the endpoint returns `gasDeposit.action = 'gas-deposit-required'` and the frontend surfaces a faucet hint.

6. Sanity-check with `curl http://localhost:3001/ika/managed-fixture/status`.

#### Per-user demo click path

1. User connects wallet in the frontend and lands on the Demo Tab.
2. `IkaSetupPanel` auto-fetches `/ika/dwallet/:owner`, `/ika/gas-deposit/:owner`, and `/ika/managed-fixture/status` on mount. Status tiles show `dWallet`, `CPI authority`, `curve`, `gas deposit`.
3. User clicks **Enable Sui devnet** (or **Enable Ethereum Sepolia**). Frontend posts `/ika/enable-chain { owner, chain }`.
4. Proxy:
   - loads the managed fixture entry for the requested curve,
   - verifies on-chain that `dwallet.authority == transferredAuthority` (warning only if drifted),
   - upserts `registry[owner] -> dwallet`,
   - funds GasDeposit via `CreateDeposit` / `TopUp` if a subsidy keypair is configured,
   - returns `{ registry, gasDeposit, authorityVerification, fixtureDisclosure }`.
5. Demo Tab now unlocks the Ika trade buttons. No CLI, no DKG material upload, no local keypair.

#### Per-trade click path (after setup)

1. Agent submits a 5 USDC Ika intent via `/intent/multichain/run`.
2. Session signer lands `poletApprovalTransaction` on Solana devnet; frontend captures `signature + slot`.
3. Frontend calls `progressIkaLifecycle({ ikaRequest, approvalTransactionSignature, approvalTransactionSlot, managedFixture: true })`. With `managedFixture: true` (default), the proxy fills `dwalletAttestation`, `dwalletNetworkEncryptionPublicKeyHex`, and `messageCentralizedSignatureHex` from the fixture, so the browser never handles cryptographic material.
4. Proxy runs Presign → Sign → CommitSignature → destination broadcast as described below.
5. Frontend renders `lifecycleStatus`, the 64-byte signature, and the destination explorer URL (Sui or Sepolia).

#### Advanced self-custody path

Operators or reviewers who want a per-user zero-trust dWallet can skip the managed fixture and run:

```bash
bun run scripts/ika-setup-dwallet.ts \
  --owner <USER_PUBKEY> \
  --curve curve25519 \
  --dkg-material ./dkg.json
```

Then call `POST /ika/setup-dwallet/commit` with the resulting pubkey/authority, and supply `dwalletAttestation` + `dwalletNetworkEncryptionPublicKeyHex` + `messageCentralizedSignatureHex` explicitly on every `/ika/lifecycle/progress` call (`managedFixture: false`). This is the production-shaped path; it is deferred behind the managed demo mode for hackathon UX.

### Prerequisites specific to 080

- Devnet IKA + devnet SOL funded on the proxy service keypair that will authenticate Ika gRPC calls.
- Proxy environment:
  - `POLET_IKA_SERVICE_KEYPAIR_HEX` — 64-byte hex tweetnacl Ed25519 secret key (used to sign `SignedRequestData`).
  - `IKA_GRPC_URL` — defaults to `pre-alpha-dev-1.ika.ika-network.net:443`.
  - `POLET_IKA_GAS_MIN_IKA_BASE_UNITS` / `POLET_IKA_GAS_MIN_SOL_LAMPORTS` — floor guards for `Presign` / `Sign`.
  - `POLET_DESTINATION_BROADCAST_MODE` — one of `auto|live|demo-memo|disabled`. `auto` defaults to `demo-memo`.
  - `POLET_SUI_DEVNET_RPC_URL` / `POLET_ETHEREUM_SEPOLIA_RPC_URL` — override the public RPCs when needed.
- A DKG material JSON produced by the official `ika-dwallet` CLI. File shape:

  ```json
  {
    "dwalletNetworkEncryptionPublicKeyHex": "…",
    "centralizedPublicKeyShareAndProofHex": "…",
    "userPublicOutputHex": "…",
    "share": {
      "mode": "encrypted",
      "encryptedCentralizedSecretShareAndProofHex": "…",
      "encryptionKeyHex": "…",
      "signerPublicKeyHex": "…"
    }
  }
  ```

  Zero-trust `encrypted` mode is the default. `{"mode":"public", "publicUserSecretKeyShareHex":"…"}` is allowed for demo simplicity only.

### 1. Create the dWallet and transfer authority

Run the Polet setup helper:

```bash
bun run scripts/ika-setup-dwallet.ts \
  --owner <SOLANA_OWNER_PUBKEY> \
  --curve curve25519 \
  --dkg-material ./dkg.json
```

What it does:

1. Prints the Polet CPI authority PDA derived from seed `__ika_cpi_authority` under the Polet program id.
2. Submits `DWalletRequest::DKG` to the Ika gRPC endpoint using the service keypair.
3. Prints the BCS-serialized `TransferOwnership` (disc `24`) instruction data so the operator can submit it with the dWallet's current authority signer.
4. Instructs the operator to call `POST /ika/setup-dwallet/commit` after verifying `dwallet.authority == cpi_authority_pda` on-chain.

Commit endpoint example:

```bash
curl -X POST http://localhost:3001/ika/setup-dwallet/commit \
  -H 'content-type: application/json' \
  -d '{
    "owner": "<OWNER>",
    "dwalletAccount": "<DWALLET_PDA>",
    "dwalletPublicKeyHex": "<32 or 33 bytes hex>",
    "curve": "curve25519",
    "createdEpoch": "<epoch>",
    "transferredAuthority": "<cpi_authority_pda>"
  }'
```

The mapping is persisted to `.polet/ika-dwallets.json` (override with `POLET_IKA_REGISTRY_PATH`). Secret key share material is not written.

### 2. Provision the GasDeposit PDA

Use the official Ika CLI (or `CreateDeposit` / `TopUp` with discriminators `36` / `37`) to create and fund the `GasDeposit` PDA derived from seeds `["gas_deposit", owner_pubkey]`. Inspect status:

```bash
curl http://localhost:3001/ika/gas-deposit/<OWNER>
```

The response surfaces the on-chain balances and whether they pass `POLET_IKA_GAS_MIN_IKA_BASE_UNITS` / `POLET_IKA_GAS_MIN_SOL_LAMPORTS`. Polet refuses `Presign` / `Sign` below the floor; the refusal names only the gas thresholds, never the confidential policy values.

### 3. Run the confidential policy gate

Follow the existing smoke runbook to submit `/intent/multichain/run` with a 5 USDC-equivalent Ika intent. The response includes:

- `ikaRequest.preAlphaSigning` with the `messageApprovalPda`, `cpiAuthorityPda`, `coordinatorPda`, `ikaMessageHash`, `signatureScheme`.
- `ikaRequest.poletApprovalTransaction` — the unsigned Polet `approve_ika_message_as_session` (or `approve_ika_with_verified_encrypt`) transaction.

Sign and submit `poletApprovalTransaction` with the session signer. Capture the resulting Solana transaction signature + slot.

### 4. Progress Presign → Sign → CommitSignature

Call the Polet lifecycle endpoint:

```bash
curl -X POST http://localhost:3001/ika/lifecycle/progress \
  -H 'content-type: application/json' \
  -d @lifecycle-input.json
```

Body fields:

- `ikaRequest` — the exact object returned by `/intent/multichain/run`.
- `approvalTransactionSignature` — base58/base64/hex of the Solana approval tx.
- `approvalTransactionSlot` — the slot that landed the approval tx.
- `dwalletAttestation` — `{ attestationDataHex, networkSignatureHex, networkPublicKeyHex, epoch }` returned during the DKG response.
- `dwalletNetworkEncryptionPublicKeyHex` — same NEK used during DKG.
- `messageCentralizedSignatureHex` — the user's centralized partial signature for Sign.
- Optional `importedKey` (for ECDSA imports), `polling.timeoutMs`, `polling.intervalMs`, `broadcast.mode`.

Polet's proxy then:

1. Reads `GasDeposit` and rejects under-floor requests with `code=GAS_FLOOR_UNDERFUNDED` (never leaking policy values).
2. Checks Polet session revoke state before `Presign` (`pre-presign`), before `Sign` (`pre-sign`), and after `CommitSignature` before broadcast (`post-sign-pre-broadcast`). Any revoke returns `status=session-revoked-midflight` + `revokePhase`.
3. Submits `DWalletRequest::Presign` (or `PresignForDWallet` when `importedKey=true`) for the curve-inferred `signature_algorithm`.
4. Submits `DWalletRequest::Sign` with `ApprovalProof::Solana { transaction_signature, slot }` and the `dwallet_attestation`.
5. Polls the on-chain `MessageApproval` account (seeds `["dwallet", chunks…, "message_approval", scheme_u16_le, message_digest]`) until `status = Signed` with `signature_len = 64`.

Successful response excerpt:

```json
{
  "success": true,
  "data": {
    "lifecycleStatus": "signature-committed",
    "signatureHex": "…",
    "messageApprovalPda": "…",
    "signatureScheme": 5,
    "broadcast": {
      "ok": true,
      "chain": "sui",
      "receipt": {
        "transactionHash": "…",
        "explorerUrl": "https://suiscan.xyz/devnet/tx/…",
        "productionSettlement": false
      }
    }
  }
}
```

### 5. Destination broadcast

The dispatcher in `proxy/src/lib/destination-broadcast.ts` handles the final hop:

- `sui` — serializes an Ed25519 flag-prefixed signature (`0x00 || sig(64) || pubkey(32)`) and POSTs `sui_executeTransactionBlock` to `POLET_SUI_DEVNET_RPC_URL` (default `https://fullnode.devnet.sui.io:443`). Explorer links go through `https://suiscan.xyz/devnet/tx/<hash>`.
- `ethereum` — expects `ikaRequest.ethereumMessageDigest.unsignedRawTransactionHex` (RLP body without signature fields). Polet's current skeleton appends the Secp256k1 compact signature bytes; operators wanting a fully valid Sepolia transaction should re-RLP the v/r/s fields with an external tool (viem, ethers) before resubmitting through this endpoint. This is intentional for the pre-alpha slice so Sepolia broadcasts remain clearly operator-driven.
- `solana-demo` — memo-proof fallback from `destination-broadcast-demo.ts`, active when `POLET_DESTINATION_BROADCAST_MODE=demo-memo` or the `demo-memo` mode is selected at runtime.

When broadcast is disabled (`mode=disabled`), the response carries `status=broadcast-disabled` without contacting any RPC.

### 6. Kill switch evidence

To reproduce the session-revoke mid-flight scenarios:

1. Send `revoke_session` for the session key **before** `approve_message` lands — the existing contract path rejects; `/intent/multichain/run` returns `blocked` with `SESSION_STALE`.
2. Send `revoke_session` **after** `approve_message` but before `/ika/lifecycle/progress` — Polet aborts at the `pre-sign` checkpoint and returns `status=session-revoked-midflight`.
3. Send `revoke_session` **after** `Sign` completes but before broadcast — Polet aborts at the `post-sign-pre-broadcast` checkpoint; the on-chain `MessageApproval` may still show `Signed` (it was produced before the revoke), but no destination transaction is submitted.

### 7. Failure states to capture

| Lifecycle status | Trigger | Expected payload |
|---|---|---|
| `gas-floor-blocked` | GasDeposit balance < floor | `code=GAS_FLOOR_UNDERFUNDED`, gas thresholds surfaced, policy values absent |
| `session-revoked-midflight` | revoke after approval | `revokePhase` set to `pre-presign`/`pre-sign`/`post-sign-pre-broadcast` |
| `lifecycle-error` + `PRESIGN_REQUEST_FAILED` | gRPC returned Error or non-Attestation | `reason` contains the Ika error message |
| `lifecycle-error` + `SIGN_REQUEST_FAILED` | gRPC returned Error on Sign | `reason` contains the Ika error message |
| `lifecycle-error` + `COMMIT_SIGNATURE_TIMEOUT` | NOA didn't CommitSignature within polling window | `reason` includes the timeout value |
| `broadcast-disabled` / `broadcast-failed` | destination RPC path | `chain` identifies Sui/Ethereum/Solana-demo |

Captured evidence for each case goes under `docs/evidence/080-ika-lifecycle-*.json` alongside a short narrative in the issue thread.

### Tests covering these paths

- `proxy/tests/ika-grpc-schema.test.ts` — BCS encoding + `TransactionResponseData` decoding against known fixtures for all three response variants.
- `proxy/tests/ika-lifecycle-progression.test.ts` — lifecycle happy path, `session-revoked-midflight` (pre-sign), gas-floor-blocked, `SIGN_REQUEST_FAILED`, destination broadcast disabled / Sui live fetch / demo-memo fallback.

Run locally:

```bash
cd proxy && bun test tests/ika-grpc-schema.test.ts tests/ika-lifecycle-progression.test.ts
```
