# Polet Proxy

Bun/Hono HTTP proxy that sits between the frontend/SDK and the Solana devnet.
It handles wallet setup transactions, confidential policy evaluation, Jupiter
DCA route building, and the Ika dWallet pre-alpha lifecycle.

- Default port: **3001**
- Solana cluster: **devnet**
- Polet program ID: `9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc`
- Ika pre-alpha program ID: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- A funded Solana devnet keypair (for running the managed Ika fixture setup script)
- A [Jupiter API key](https://portal.jup.ag)

---

## Step 1 — Install dependencies

```bash
cd proxy
bun install
```

---

## Step 2 — Create the environment file

```bash
cp .env.example .env
```

Fill in the required values (see `.env.example` for all options):

| Variable | Required | Description |
|---|---|---|
| `JUPITER_API_KEY` | Yes | Jupiter portal API key |
| `SOLANA_RPC_URL` | Yes | Solana RPC (default: devnet) |
| `POLET_IKA_SERVICE_KEYPAIR_HEX` | Yes | 64-byte tweetnacl Ed25519 secret key (hex) for signing Ika gRPC requests |
| `POLET_IKA_GAS_MIN_IKA_BASE_UNITS` | Yes (pre-alpha) | Set to `0` — mock signer does not consume gas |
| `POLET_IKA_GAS_MIN_SOL_LAMPORTS` | Yes (pre-alpha) | Set to `0` — mock signer does not consume gas |

### Generate `POLET_IKA_SERVICE_KEYPAIR_HEX`

```bash
bun -e '
import nacl from "tweetnacl";
const kp = nacl.sign.keyPair();
console.log("SECRET_HEX:", Buffer.from(kp.secretKey).toString("hex"));
console.log("PUBKEY_HEX:", Buffer.from(kp.publicKey).toString("hex"));
'
```

Copy the `SECRET_HEX` value into `.env`. The `PUBKEY_HEX` is the identity the
Ika network will see on gRPC requests — keep it for reference.

---

## Step 3 — Generate the managed Ika dWallet fixture

This is a **one-time operator step** that must be re-run every time the Polet
program is redeployed (because the CPI authority PDA is derived from the
program ID).

The script runs DKG against the Ika pre-alpha gRPC service, creates a dWallet
on devnet, transfers its authority to Polet's CPI authority PDA, and writes the
fixture to `.polet/ika-managed-fixture.json`.

```bash
POLET_LIVE_OWNER_SECRET=<base58_secret_of_any_funded_devnet_keypair> \
POLET_PROGRAM_ID=9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc \
  bun run scripts/ika-setup-managed-fixture.ts --curve curve25519
```

> **Note:** The keypair used here only needs to be funded with ~0.01 SOL to
> pay for the `TransferOwnership` transaction. It does not need to be the
> wallet owner. After the script completes, the dWallet authority is the Polet
> CPI PDA — not this keypair.

Verify the fixture was written:

```bash
cat .polet/ika-managed-fixture.json | grep transferredAuthority
# Should print: "transferredAuthority": "B5tt88pShbCkcHbQospMHJd6uzW5wk8FeJE3kS1ZeH1n"
# (or whatever the current program's CPI PDA is)
```

### When to re-run this step

- After any Polet program redeploy (program ID changes → CPI PDA changes → old dWallet authority no longer matches)
- After the Ika pre-alpha network wipes its state (periodic)

---

## Step 4 — Start the proxy

```bash
bun run dev
```

The proxy starts on `http://localhost:3001`.

---

## Step 5 — Bind an owner to the managed dWallet

After the proxy is running, call `POST /ika/enable-chain` for each owner who
wants to use the Ika rail. This registers the owner → dWallet mapping in
`.polet/ika-dwallets.json` and verifies the on-chain authority is correct.

```bash
curl -X POST http://localhost:3001/ika/enable-chain \
  -H 'Content-Type: application/json' \
  -d '{"owner":"<OWNER_PUBKEY>","chain":"sui"}'
```

Expected response includes `"authorityVerification": { "ok": true }`. If
`ok: false`, the fixture is stale — re-run Step 3.

---

## Troubleshooting

### `EXECUTE ABORTED — Proxy did not return an unsigned smart-wallet tx`

The Encrypt policy graph has not been executed yet for this run. The frontend
will automatically kick off the preflight and retry. If it keeps failing, check
that the wallet's confidential policy is configured via the Portal workspace.

### `missing required signature for instruction` (Ika CPI)

The managed dWallet's on-chain authority no longer matches the current Polet
program's CPI PDA. This happens after a program redeploy. Fix:

1. Re-run Step 3 to regenerate the fixture.
2. Delete `.polet/ika-dwallets.json` so the registry is rebuilt.
3. Restart the proxy.
4. Re-run Step 5 for each owner.

### `POLET_IKA_SERVICE_KEYPAIR_HEX is not configured on the proxy`

Add `POLET_IKA_SERVICE_KEYPAIR_HEX` to `.env` (see Step 2) and restart the proxy.

### `GasDeposit account has not been created`

Set `POLET_IKA_GAS_MIN_IKA_BASE_UNITS=0` and `POLET_IKA_GAS_MIN_SOL_LAMPORTS=0`
in `.env`. The Ika pre-alpha mock signer does not actually consume gas, so the
floor check can be bypassed for demo purposes.

---

## Key files

| Path | Description |
|---|---|
| `.polet/ika-managed-fixture.json` | Master dWallet fixture (DKG attestation + authority). Operator-generated, shared across all users. |
| `.polet/ika-dwallets.json` | Per-owner registry cache. Auto-created by `/ika/enable-chain`. Safe to delete and rebuild. |
| `src/routes/ika-lifecycle.ts` | Ika lifecycle endpoints (`/ika/enable-chain`, `/ika/lifecycle/progress`, etc.) |
| `src/lib/confidential-dca-execution.ts` | Jupiter DCA policy gate logic |
| `src/lib/ika-lifecycle-progression.ts` | Presign + Sign gRPC flow |
| `scripts/ika-setup-managed-fixture.ts` | One-time operator DKG + fixture generation script |

---

## Routes

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/intent/dca/run` | Confidential DCA policy gate + Jupiter route build |
| POST | `/intent/multichain/run` | Ika bridgeless intent (policy gate + approve_message tx) |
| POST | `/wallet/initialize` | Initialize Polet smart wallet PDA |
| POST | `/wallet/set-confidential-policy` | Save confidential numeric policy |
| POST | `/wallet/grant-session` | Grant agent session key |
| POST | `/ika/enable-chain` | Bind owner to managed dWallet + fund GasDeposit |
| POST | `/ika/lifecycle/progress` | Progress Ika signing lifecycle (presign + sign) |
| GET | `/ika/dwallet/:owner` | Look up registered dWallet for an owner |
