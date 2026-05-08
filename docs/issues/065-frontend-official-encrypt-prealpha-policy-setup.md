# Frontend Official Encrypt Pre-Alpha Policy Setup

Labels: `needs-triage`, `critical-path`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Replace the consumer demo's primary policy setup path with a real official Encrypt pre-alpha frontend flow:

1. User enters only numeric policy values:
   - max per run USDC,
   - daily cap USDC.
2. Frontend creates official Encrypt ciphertext inputs through gRPC-Web:
   - `createEncryptWebClient("https://pre-alpha-dev-1.encrypt.ika-network.net:443")`
   - `encryptValue(...)`
   - `createInput(...)`
3. Frontend receives fresh ciphertext account ids:
   - `maxPerRunCiphertext`,
   - `dailyCapCiphertext`,
   - `dailySpentCiphertext`.
4. Frontend calls Polet proxy to build:
   - optional/idempotent `/wallet/create-encrypt-deposit`,
   - `/wallet/set-official-encrypt-ciphertext-policy`.
5. User signs the Polet policy registration transaction.
6. Polet smart contract records official Encrypt ciphertext refs in wallet state.
7. Frontend displays ciphertext refs as read-only technical status after successful setup.

The primary setup must not use manual ciphertext inputs, static sample ciphertext refs, or the masked-witness numeric fallback. The fallback can remain explicitly labeled as dev/local compatibility, but it must not be the default path for this issue.

## Why this issue exists

During the May 8, 2026 debugging session, the demo was changed to hide manual ciphertext inputs from the primary UI. That UX decision was correct, but the first implementation accidentally sent static sample ciphertext refs into `/wallet/set-official-encrypt-ciphertext-policy`. Wallet signing then failed with:

```txt
WalletSendTransactionError
code: -32603
message: Unexpected error
```

This happened because the sample refs were not fresh official Encrypt ciphertext accounts for the current wallet/setup. The temporary fix reverted the primary policy button to the numeric masked fallback so users could sign policy updates again. That fallback produces successful `SetConfidentialNumericPolicy` logs, but it is not official Encrypt.

The correct next slice is to make the frontend create real ciphertext accounts first, then pass those fresh refs into Polet.

## Important current-state facts

- Current successful fallback transaction logs look like:

```txt
Instruction: SetConfidentialNumericPolicy
Confidential numeric policy updated, policy_seq=1
```

- That fallback stores Polet internal confidential numeric policy fields. It is not official Encrypt/FHE and must not be presented as production privacy.
- Official Encrypt success should instead produce Polet logs similar to:

```txt
Instruction: SetOfficialEncryptCiphertextPolicy
Official Encrypt ciphertext policy accepted, policy_seq=...
```

- Polet contract already has the official Encrypt foundation:
  - `contract/programs/contract/src/encrypt_policy_graph.rs`
  - `polet_policy_guardrail_graph(...) -> (allowed, updated_daily_spent)`
  - `set_official_encrypt_ciphertext_policy`
  - `execute_encrypt_policy_graph_as_session`
  - wallet state stores `confidential_policy.encrypt_ciphertexts`

- The missing slice is frontend/proxy orchestration, not a full contract rewrite.

## References from the debugging session

### Official Encrypt docs model

Relevant docs path:

- `docs/encrypt/raw.md`

Official Encrypt voting example references:

- https://docs.encrypt.xyz/examples/voting/02-program
- https://docs.encrypt.xyz/examples/voting/03-testing
- https://docs.encrypt.xyz/examples/voting/04-react
- https://docs.encrypt.xyz/examples/voting/05-e2e

Reference pattern from docs:

```ts
import { createEncryptWebClient, encryptValue, Chain } from "@encrypt.xyz/pre-alpha-solana-client/grpc-web";

const grpcClient = createEncryptWebClient("https://pre-alpha-dev-1.encrypt.ika-network.net:443");

const ids = await grpcClient.createInput({
  chain: Chain.SOLANA,
  inputs: [{ ciphertextBytes: encryptValue(value), fheType: FHE_UINT64 }],
  authorized: POLET_PROGRAM.toBytes(),
  networkEncryptionPublicKey: networkKey,
});
```

Mental model:

```txt
Browser
  -> encryptValue numeric policy values
  -> gRPC-Web createInput to Encrypt pre-alpha infra
  <- ciphertext account ids

Wallet
  -> signs Polet policy registration tx
  -> Polet stores ciphertext refs
```

### Endpoint check

Endpoint checked on May 8, 2026:

```txt
https://pre-alpha-dev-1.encrypt.ika-network.net:443
```

Observed:

```txt
HTTP/2 200
content-type: application/grpc
grpc-status: 12
access-control-allow-origin: *
```

Interpretation: endpoint is reachable; `grpc-status: 12` is expected for a plain `curl -I` probe that is not a real gRPC method call. Full validation must call `createInput(...)`.

### Devnet account checks

Observed from Solana devnet during the session:

```txt
Encrypt program:
4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
exists: true
executable: true

Encrypt config:
EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3
exists: true
owner: 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
dataLength: 133

Network encryption key:
2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur

Event authority:
6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ
```

`getAccountInfo(eventAuthority)` may return no initialized account data. The docs/examples still pass event authority as an account meta under `// ... encrypt program accounts ...`; do not treat missing account data alone as proof the account cannot be used.

### User-observed Encrypt create-input evidence

The user inspected this successful Encrypt program transaction:

```txt
Signature:
3SHFTj5Jqp5DgowjuWS7t1bRWJhaRe563yNNNaMhaEmL8SQifUYJEk3aL4qihmg8KJLDHcCPofGudMgwqw2E3eCF

Program:
4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8

Result:
Success / finalized

New account:
8FunJp27NYqiFZSLP1bx5VAu2aBhVdGUXXMuWiqxu5rC

Program owner:
4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
```

Interpretation: this is strong evidence that official Encrypt pre-alpha can create a ciphertext account on devnet. In the Encrypt model, a ciphertext account pubkey is the ciphertext identifier.

## Acceptance criteria

- [ ] The primary policy setup UI shows only `Max per run (USDC)` and `Daily cap (USDC)` as editable user inputs.
- [ ] The frontend imports and uses `@encrypt.xyz/pre-alpha-solana-client/grpc-web` to call `createEncryptWebClient(...)`, `encryptValue(...)`, and `createInput(...)`.
- [ ] The frontend creates fresh official Encrypt ciphertext accounts for max-per-run, daily-cap, and initial daily-spent zero.
- [ ] The frontend never sends static sample ciphertext refs to `/wallet/set-official-encrypt-ciphertext-policy`.
- [ ] The frontend calls `/wallet/create-encrypt-deposit` idempotently and signs the returned transaction only when the route returns a transaction.
- [ ] The frontend calls `/wallet/set-official-encrypt-ciphertext-policy` with fresh ciphertext ids and signs the Polet registration transaction.
- [ ] After successful setup, `/wallet/:owner` returns `confidentialPolicy.encryptCiphertexts.configured === true`.
- [ ] The UI displays official Encrypt ciphertext refs read-only after setup.
- [ ] A successful setup produces Polet logs for official Encrypt policy registration, not `SetConfidentialNumericPolicy`.
- [ ] If Encrypt gRPC-Web/createInput fails, the UI shows a clear pre-alpha infra error and does not fall through silently to sample refs.
- [ ] The masked-witness/numeric fallback remains available only as an explicitly labeled dev fallback, if retained at all.
- [ ] Tests prove the primary path does not call the masked fallback and does not use sample ciphertext refs.
- [ ] Targeted frontend tests and builds pass.

## Blocked by

None - can start immediately for policy setup/registration.

Not blocked by full graph execution. This issue only needs official Encrypt ciphertext creation plus Polet policy registration.

Follow-up graph execution may still be affected by external Encrypt pre-alpha executor/deposit/event-authority behavior. Keep that as a separate issue if policy registration succeeds but `execute_encrypt_policy_graph_as_session` fails.

## Implementation notes

- Add the Encrypt client dependency to `frontend/package.json` if not already available there:

```bash
bun add @encrypt.xyz/pre-alpha-solana-client
```

- Reuse constants already known in the repo where possible:
  - Encrypt program: `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8`
  - gRPC-Web endpoint: `https://pre-alpha-dev-1.encrypt.ika-network.net:443`
  - config: `EyqsEJaq86kqAbF3bNKQ3ydzAFXJZ5e8tuNr89CcmcH3`
  - network encryption key: `2YP2nxFoYcDFDBRygrN7C3Y3ENdcoaLjVeAmbX8HHwur`
  - event authority: `6Lu2AnYtC1HQHYjAovF2yykDq5ESjy9rUfxNATBamgAQ`

- Verify `Chain` enum naming from the installed package. Docs show both `Chain.SOLANA` and scripts in this repo use `Chain.Solana`; use the installed package's actual export.
- Verify `createInput(...)` result shape. Some docs show `ids[0]`; SDK scripts use `created.ciphertextIdentifiers[index]`.
- `encryptValue(...)` in pre-alpha is mock/client-side pre-alpha encryption. Use the disclaimer below in UI/copy.
- Convert USDC values to base units before encrypting. USDC uses 6 decimals.
- `dailySpent` initial value should be encrypted zero.
- `authorized` should be Polet program id bytes so Polet can use the ciphertext accounts in graph execution.

## Suggested implementation shape

1. Add a small frontend helper, for example:

```txt
frontend/src/lib/official-encrypt-client.ts
```

Responsibilities:

- parse/validate USDC input,
- encode base units,
- call `encryptValue(...)`,
- call `createInput(...)`,
- return `{ maxPerRun, dailyCap, dailySpent }` ciphertext ids.

2. Update `DemoTab` policy setup:

- `savePolicy` uses official Encrypt client first,
- then create/reuse Encrypt deposit,
- then call `setOfficialEncryptCiphertextPolicy`,
- then sign the Polet tx,
- then refresh wallet data and display read-only refs.

3. Keep the fallback separate:

- Rename/copy as local/dev only.
- Do not run fallback automatically after official Encrypt failure.

## Test plan

- Frontend unit/component tests:
  - mock official Encrypt client success,
  - assert `setOfficialEncryptCiphertextPolicy` receives fresh mock ciphertext ids,
  - assert `setConfidentialPolicy` is not called by the primary button,
  - assert read-only refs display after success,
  - assert gRPC failure renders an error and does not call Polet registration.

- Build:

```bash
cd frontend && bun run test src/components/DemoTab.test.tsx
cd frontend && bun run build
```

- Manual/devnet smoke:
  - connect a devnet wallet with SOL,
  - enter `10` and `25`,
  - create ciphertext inputs via gRPC-Web,
  - sign Polet policy registration,
  - inspect transaction logs for `Official Encrypt ciphertext policy accepted`,
  - refresh wallet and confirm `encryptCiphertexts.configured`.

## Demo wording

Use:

> Polet uses the official Encrypt pre-alpha interface for policy setup: the browser creates Encrypt ciphertext accounts for numeric limits, then Polet stores the ciphertext account refs on-chain. Encrypt pre-alpha is public/plaintext on-chain and not production privacy.

Avoid:

> Polet has production FHE privacy.

Avoid:

> The masked witness fallback is official Encrypt.

## Related files

- `frontend/src/components/DemoTab.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/i18n.ts`
- `proxy/src/routes/wallet.ts`
- `proxy/src/lib/transaction-builder.ts`
- `contract/programs/contract/src/encrypt_policy_graph.rs`
- `contract/programs/contract/src/lib.rs`
- `docs/encrypt/raw.md`
- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`
