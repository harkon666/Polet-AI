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
Polet program id: fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q
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
Polet program id: fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q
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

Derive Polet's CPI authority PDA with seed `__ika_cpi_authority` and Polet program id `fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q`.

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
