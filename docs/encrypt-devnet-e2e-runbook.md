# Official Encrypt Devnet Manual E2E Runbook

Issue: `docs/issues/055-official-encrypt-no-witness-manual-e2e-readiness.md`

This runbook documents the manual E2E path for the official Encrypt pre-alpha integration. It covers ciphertext creation, policy registration, graph execution, pending/verified lifecycle, and Ika approval preparation.

**Important**: Encrypt pre-alpha may store data publicly/plaintext internally. This is NOT production FHE or production privacy. The integration uses the correct interface (ciphertext + graph lifecycle), not masked XOR witness bytes.

## Prerequisites

```bash
# Clone and install
cd Polet-AI
bun install

# Required tools
bun --version          # >= 1.0
solana --version       # >= 1.18 (devnet)
```

## Environment Variables

```bash
# Required
export POLET_RPC_URL="https://api.devnet.solana.com"
export POLET_ENCRYPT_GRPC_URL="https://pre-alpha-dev-1.encrypt.ika-network.net:443"
export POLET_ENCRYPT_PROGRAM_ID="4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8"

# Optional (defaults shown)
export POLET_PROGRAM_ID="fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q"
export POLET_ENCRYPT_MAX_PER_RUN_USDC="10"
export POLET_ENCRYPT_DAILY_CAP_USDC="20"
export POLET_ENCRYPT_DAILY_SPENT_USDC="0"
export POLET_ENCRYPT_SOURCE_AMOUNT_USDC="5"
```

## Step 1: Devnet Owner/Session Setup

Generate throwaway keypairs (NEVER commit these):

```bash
solana-keygen new --no-bip39-passphrase -o /tmp/polet-owner.json
solana-keygen new --no-bip39-passphrase -o /tmp/polet-session.json

# Airdrop SOL for fees
solana airdrop 2 /tmp/polet-owner.json --url devnet
solana airdrop 1 /tmp/polet-session.json --url devnet
```

## Step 2: Official Encrypt Ciphertext Creation

Run the E2E script (handles steps 2-8 automatically):

```bash
bun run scripts/059-encrypt-devnet-e2e.ts /tmp/polet-owner.json
```

Or run manually via the SDK evidence runner:

```bash
bun run sdk/src/official-encrypt-evidence-runner.ts
```

### What happens internally:

1. Connects to Encrypt gRPC endpoint
2. Creates ciphertext accounts for:
   - `maxPerRun` (10 USDC base units, FHE_UINT64)
   - `dailyCap` (20 USDC base units, FHE_UINT64)
   - `dailySpent` (0 USDC base units, FHE_UINT64)
   - `sourceAmount` (5 USDC base units, FHE_UINT64)
3. Returns ciphertext account IDs

### Expected output:

```json
{
  "inputCiphertexts": {
    "maxPerRun": "<base58-account-id>",
    "dailyCap": "<base58-account-id>",
    "dailySpent": "<base58-account-id>",
    "sourceAmount": "<base58-account-id>"
  }
}
```

## Step 3: Polet `set_official_encrypt_ciphertext_policy`

Via proxy API:

```bash
curl -X POST http://localhost:3001/wallet/set-official-encrypt-ciphertext-policy \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "<owner-pubkey>",
    "sessionKey": "<session-pubkey>",
    "maxPerRunCiphertext": "<ciphertext-id>",
    "dailyCapCiphertext": "<ciphertext-id>",
    "dailySpentCiphertext": "<ciphertext-id>"
  }'
```

### Expected output:

```json
{
  "success": true,
  "data": {
    "transaction": "<base64-unsigned-tx>",
    "signers": ["<owner-pubkey>"],
    "encryptProgram": "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8",
    "status": "pending-encrypt-execution"
  }
}
```

## Step 4: Polet `execute_encrypt_policy_graph_as_session`

```bash
curl -X POST http://localhost:3001/wallet/execute-encrypt-policy-graph \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "<owner-pubkey>",
    "sessionKey": "<session-pubkey>",
    "sourceAmountCiphertext": "<ciphertext-id>"
  }'
```

### Expected output:

```json
{
  "success": true,
  "data": {
    "status": "pending-encrypt-execution",
    "encryptProgram": "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8",
    "grpcEndpoint": "https://pre-alpha-dev-1.encrypt.ika-network.net:443",
    "graph": "polet_policy_guardrail_graph",
    "inputCiphertexts": {
      "sourceAmount": "<id>",
      "maxPerRun": "<id>",
      "dailySpent": "<id>",
      "dailyCap": "<id>"
    },
    "pendingOutputCiphertexts": {
      "allowedOutput": "<id>",
      "dailySpentOutput": "<id>"
    },
    "suppressedUntilVerified": [
      "jupiterExecutionPayload",
      "dwallet",
      "messageApproval",
      "destinationDigest",
      "poletApprovalTransaction"
    ]
  }
}
```

## Step 5: Pending Output Evidence

While executor is processing:

- Status: `pending-encrypt-execution`
- Jupiter payloads are HIDDEN
- Ika dWallet/MessageApproval data is HIDDEN
- Thresholds, caps, witness bytes are HIDDEN
- Only ciphertext IDs and graph metadata are visible

## Step 6: Verified Blocked Evidence

If `sourceAmount > maxPerRun` or daily cap exceeded:

- Status: `encrypt-verified-blocked`
- ALL execution/approval artifacts are suppressed
- No Jupiter plan, no Ika approval, no transaction
- UI shows: "All execution artifacts suppressed"

## Step 7: Verified Allowed Evidence

If policy passes:

- Status: `encrypt-verified-allowed`
- Safe artifacts become visible for Ika approval preparation
- UI shows: "Ika approval preparation available"
- `allowedOutputCiphertext` and `dailySpentOutputCiphertext` are available

## Step 8: Ika Approval (After Verified Allowed Only)

```bash
curl -X POST http://localhost:3001/wallet/approve-ika-with-verified-encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "<owner-pubkey>",
    "sessionKey": "<session-pubkey>",
    "allowedOutputCiphertext": "<ciphertext-id>",
    "dailySpentOutputCiphertext": "<ciphertext-id>"
  }'
```

## Failure Table

| Failure | Error | Retry Action |
|---------|-------|-------------|
| gRPC unavailable | `ECONNREFUSED` or timeout | Wait 5min, retry. Check Encrypt status page. |
| Devnet reset | Account not found | Re-create ciphertext accounts from Step 2 |
| Faucet failure | Airdrop 429 | Wait 1min, use `solana airdrop 1` instead of 2 |
| Executor delay | Pending > 5min | Normal for pre-alpha. Poll every 30s. |
| Decryptor delay | Verified state not updating | Check gRPC health, retry poll |
| Client API mismatch | Type errors | Check `@encrypt.xyz/pre-alpha-solana-client` version |
| Ika devnet unavailable | Ika gRPC timeout | Skip Step 8, record blocker |

## Evidence Template

```json
{
  "timestamp": "<ISO-8601>",
  "encryptProgram": "<program-id>",
  "grpcEndpoint": "<url>",
  "solanaRpc": "<url>",
  "inputCiphertexts": {
    "maxPerRun": "<account-id>",
    "dailyCap": "<account-id>",
    "dailySpent": "<account-id>",
    "sourceAmount": "<account-id>"
  },
  "pendingOutputCiphertexts": {
    "allowedOutput": "<account-id>",
    "dailySpentOutput": "<account-id>"
  },
  "graphExecution": {
    "transaction": "<signature-or-null>",
    "status": "pending|verified-allowed|verified-blocked",
    "slot": "<number>"
  },
  "ikaApproval": {
    "prepared": true|false,
    "blocker": "<reason-if-blocked>"
  },
  "blockers": ["<list-of-external-blockers>"]
}
```

## Safety Rules

- NEVER commit private keys or seed phrases
- NEVER include full ciphertext values in evidence (use account IDs only)
- NEVER include plaintext thresholds after setup
- NEVER claim production FHE or production privacy
- ALWAYS label local fallback evidence as "fallback only"
- ALWAYS use devnet, never mainnet
