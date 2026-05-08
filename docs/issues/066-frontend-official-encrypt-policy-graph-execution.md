# Frontend Official Encrypt Policy Graph Execution

Labels: `needs-triage`, `critical-path`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## Blocked by

- `docs/issues/065-frontend-official-encrypt-prealpha-policy-setup.md`

## What to build

After official Encrypt policy setup exists in the frontend, wire the DCA/Ika execution path to Polet's official Encrypt graph:

1. User or agent requests a guarded strategy amount, for example 5 USDC or 25 USDC.
2. Frontend creates fresh official Encrypt ciphertext inputs through gRPC-Web:
   - `sourceAmountCiphertext`,
   - `allowedOutputCiphertext` initialized for an `EBool` output,
   - `dailySpentOutputCiphertext` initialized for an `EUint64` output.
3. Frontend/proxy builds `execute_encrypt_policy_graph_as_session` using the wallet's registered policy ciphertext refs:
   - `maxPerRunCiphertext`,
   - `dailyCapCiphertext`,
   - `dailySpentCiphertext`.
4. Session signer signs the graph execution transaction.
5. Polet smart contract CPIs into Encrypt through `EncryptContext.execute_graph(...)`.
6. Polet records pending graph output refs in wallet state:
   - pending source amount,
   - pending allowed output,
   - pending updated daily-spent output,
   - pending slot,
   - pending policy sequence.
7. Frontend displays `pending-encrypt-execution` and suppresses Jupiter/Ika execution artifacts until a verified result is available.

This issue should prove the live graph submission path from frontend to Polet to Encrypt. Verified allowed/blocked consumption can remain in existing mock/resolver paths if live executor verification is unavailable, but the issue must capture exact live blocker evidence rather than silently falling back.

## Why this issue exists

Issue `065` handles official Encrypt policy setup: numeric user inputs become fresh Encrypt ciphertext account ids and Polet stores those refs. That is necessary but not enough for the policy gate.

Polet's core privacy/control story needs the strategy amount to pass through `polet_policy_guardrail_graph`:

```rust
source_amount <= max_per_run
daily_spent + source_amount <= daily_cap
allowed = within_run & within_daily
updated_daily_spent = allowed ? next_daily_spent : daily_spent
```

The contract already exposes `execute_encrypt_policy_graph_as_session`, but the frontend needs to create execution ciphertexts, build/sign the graph execution transaction, and surface the lifecycle honestly.

## Current contract foundation

Polet already has the official graph code:

- `contract/programs/contract/src/encrypt_policy_graph.rs`
- `contract/programs/contract/src/lib.rs`

Key graph:

```rust
#[encrypt_fn]
pub fn polet_policy_guardrail_graph(
    source_amount: EUint64,
    max_per_run: EUint64,
    daily_spent: EUint64,
    daily_cap: EUint64,
) -> (EBool, EUint64) {
    let within_run = max_per_run >= source_amount;
    let next_daily_spent = daily_spent + source_amount;
    let within_daily = daily_cap >= next_daily_spent;
    let allowed = within_run & within_daily;
    let updated_daily_spent = if allowed {
        next_daily_spent
    } else {
        daily_spent
    };
    (allowed, updated_daily_spent)
}
```

Key instruction:

```rust
pub fn execute_encrypt_policy_graph_as_session(
    ctx: Context<ExecuteEncryptPolicyGraphAsSession>,
    attestation_slot: u64,
    attestation_policy_seq: u64,
    cpi_authority_bump: u8,
) -> Result<()>
```

It already calls:

```rust
encrypt_ctx.execute_graph(
    &polet_policy_guardrail_graph_bytes(),
    &[
        source_amount_ciphertext,
        max_per_run_ciphertext,
        daily_spent_ciphertext,
        daily_cap_ciphertext,
        allowed_output_ciphertext,
        daily_spent_output_ciphertext,
    ],
)?;
```

## Contract-change expectation

Start with the assumption that **no major smart contract rewrite is required**.

Small contract adjustments may be needed if live testing reveals one of these issues:

- account mutability/order does not match the latest Encrypt Anchor docs,
- output ciphertext accounts need different initialization/update-mode handling,
- ciphertext owner/type/status validation should be stricter,
- `execute_graph` should move from inline graph bytes to registered graphs,
- attestation/session validation needs a narrow tweak for the frontend-driven session path.

Any smart contract change must be narrowly scoped and backed by targeted tests. Do not create a second Polet program.

## References

Official docs:

- https://docs.encrypt.xyz/getting-started/concepts?highlight=graph#computation-graph
- https://docs.encrypt.xyz/dsl/graph-compilation?highlight=graph#registered-graphs
- https://docs.encrypt.xyz/frameworks/anchor?highlight=graph#execute-graph
- https://docs.encrypt.xyz/examples/pc-token/02-program?highlight=graph#fhe-graphs
- https://docs.encrypt.xyz/examples/voting/02-program
- https://docs.encrypt.xyz/examples/voting/03-testing
- https://docs.encrypt.xyz/examples/voting/04-react
- https://docs.encrypt.xyz/examples/voting/05-e2e

Local docs/issues:

- `docs/encrypt/raw.md`
- `docs/issues/059-official-encrypt-devnet-ciphertext-graph-e2e.md`
- `docs/issues/065-frontend-official-encrypt-prealpha-policy-setup.md`

## Acceptance criteria

- [ ] Requires an official Encrypt policy configured by issue `065`.
- [ ] Creates a fresh `sourceAmountCiphertext` through gRPC-Web for each guarded run.
- [ ] Creates or prepares output ciphertext accounts for allowed output and updated daily-spent output.
- [ ] Builds `execute_encrypt_policy_graph_as_session` using the wallet's on-chain policy ciphertext refs.
- [ ] Signs graph execution with the configured session signer/payer path.
- [ ] Successful graph submission records pending output refs in wallet state.
- [ ] Frontend displays `pending-encrypt-execution` with graph name, policy sequence, pending slot, and safe ciphertext refs.
- [ ] Pending state suppresses Jupiter payloads, Ika dWallet data, MessageApproval data, destination digest, unsigned approval transactions, private thresholds, decrypted caps, and witness bytes.
- [ ] If live Encrypt executor verification is unavailable, the UI and evidence report the exact blocker and retry step instead of claiming verified allowed/blocked.
- [ ] Tests prove DCA/Ika requests use official Encrypt refs and do not pass `encryptionWitness` in the primary path.
- [ ] Targeted frontend/proxy tests and builds pass.

## Out of scope

- Production FHE/privacy claims. Encrypt pre-alpha stores data publicly/plaintext on-chain according to official docs.
- Mainnet execution.
- Real Jupiter swap broadcast.
- Real Ika MPC settlement.
- A full smart contract rewrite.

## Test plan

- Frontend component tests:
  - graph execution pending state renders without leaking artifacts,
  - blocked/allowed buttons use official Encrypt execution refs,
  - no primary path request contains static witness bytes.

- Proxy tests:
  - transaction builder account order matches `ExecuteEncryptPolicyGraphAsSession`,
  - pending output refs are returned in builder response,
  - invalid refs are rejected against wallet state where applicable.

- Contract tests, only if smart contract changes are made:

```bash
cd contract && NO_DNA=1 cargo test
```

- Builds:

```bash
cd frontend && bun run test src/components/DemoTab.test.tsx
cd frontend && bun run build
cd proxy && bun run build
```

## Demo wording

Use:

> Polet submits its policy graph through official Encrypt pre-alpha. The graph produces pending encrypted allow/block and updated-spend outputs; execution artifacts remain suppressed until verified output is available.

Avoid:

> Polet has production FHE privacy.

Avoid:

> Pending Encrypt output is equivalent to allowed execution.
