# Official Encrypt Execute Graph Payload ABI Fix

Labels: `needs-triage`, `critical-path`, `privacy`, `contract`, `proxy`

Type: `AFK`

Status: `DONE`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Fix Polet's live-devnet Official Encrypt graph submission so `execute_encrypt_policy_graph_as_session` sends the `execute_graph` CPI payload in the format expected by the current Encrypt pre-alpha Solana program.

Manual devnet diagnosis found that policy setup, policy reveal, and decryption response paths work, but graph execution fails immediately inside Encrypt:

```text
Program log: Instruction: ExecuteEncryptPolicyGraphAsSession
Program 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8 invoke [2]
Program 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8 consumed 186 compute units
Program 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8 failed: custom program error: 0x1
```

The strongest current hypothesis is an ABI/payload mismatch, not the earlier event-authority assumption. The Encrypt SDK's generated graph CPI wrapper builds instruction data as:

```text
[4 execute_graph discriminator] + [graph_len u16 LE] + [graph bytes] + [num_inputs u8]
```

Polet currently calls `encrypt_ctx.execute_graph(&polet_policy_guardrail_graph_bytes(), ...)`, passing raw graph bytes without the discriminator, graph length, or input count wrapper. That makes the live Encrypt program reject the CPI before fee/deposit logic or output lifecycle can be tested.

## Acceptance criteria

- [x] `execute_encrypt_policy_graph_as_session` wraps `polet_policy_guardrail_graph_bytes()` as `[4] + graph_len + graph + num_inputs` before calling Encrypt `execute_graph`, or uses the `#[encrypt_fn]` generated CPI helper that produces the same payload.
- [x] The graph input count is fixed to the four encrypted inputs Polet passes: source amount, max per run, daily spent, and daily cap.
- [x] Contract tests cover the exact execute-graph instruction payload format so raw graph bytes cannot regress.
- [x] Proxy/frontend behavior remains unchanged at the API level: guarded runs still submit graph first and suppress Jupiter/Ika artifacts until verified output exists.
- [x] Manual live devnet graph execution no longer fails at the immediate 186-CU `custom program error: 0x1` discriminator/payload boundary. The original `F7X...` program id was closed as requested and cannot be redeployed, so this was verified on replacement devnet program id `H6hT33LKBLnN1G55iRtjmMuNMmyJagxfxsvd7jTjw5oG` with fresh wallet/session state.
- [x] The fixed payload exposed no later Encrypt error in the fresh live E2E run: graph execution succeeded, wallet pending state was recorded, and both output ciphertexts reached `verified`.

## Progress notes

- Contract now builds the inline Encrypt `execute_graph` ABI payload as `[4] + [graph_len u16 LE] + [graph bytes] + [num_inputs u8]` before invoking `EncryptContext::execute_graph`.
- `num_inputs` is fixed at `4` for source amount, max per run, daily spent, and daily cap.
- Added a unit test for the exact payload layout and tightened the local mock Encrypt program so LiteSVM harness tests fail if Polet sends raw graph bytes again.
- Verification: `cd contract && NO_DNA=1 anchor build` passed; `cd contract && NO_DNA=1 cargo test -p contract` passed.
- Simulate-only devnet evidence was run without private keys using `sigVerify: false` and `replaceRecentBlockhash: true`; no broadcast was attempted. It still failed at the exact 186-CU Encrypt boundary. Evidence: `docs/evidence/069-official-encrypt-execute-graph-payload-abi-fix-simulate.json`.
- `solana program show F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p --url https://api.devnet.solana.com` reports upgrade authority `2WdWUNeKibeX1hyC6CscJeUa1EruKYDHcHHSUhHeSFKf`, program data `4Fr3PKsKWvEquMqyiVzn5TdXJcXySkyu1LQqFzR6Vu2s`, last deployed slot `460920402`.
- User requested closing the devnet program to reclaim SOL before redeploy. `solana program close F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p` succeeded and reclaimed `2.77184088 SOL`; redeploying the same id failed with `Program F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p has been closed, use a new Program Id`.
- Replacement devnet program id `H6hT33LKBLnN1G55iRtjmMuNMmyJagxfxsvd7jTjw5oG` was upgraded with the rebuilt fixed binary. Deploy signature: `4WznhghcpHae7mbC7MhYd1k29iLiYkzQ4XxzyWP3zFaxrSgy6esHU1KG71tweZzynVa6ns8uZTpMCJ6ui95HwBAm`; last deployed slot: `460989361`.
- Fresh live E2E on `33ubr...` created official Encrypt ciphertext inputs, initialized a new Polet wallet, set policy, granted a session, created owner/session Encrypt deposits, and executed the graph successfully. Wallet pending slot: `460989735`.
- Output ciphertexts were read back from devnet and both were `verified`: allowed output `3ijxbPpdyu3y6YARE5Uzg6YAym7DoZdDtXV7cpX1EKfR` (`EBool`, status byte `1`) and daily spent output `GTcbySXNveP1Jq3kqU1Y1kf2sgTv3ycER21ZfaMUcjZ3` (`EUint64`, status byte `1`).
- Evidence: `docs/evidence/069-official-encrypt-execute-graph-payload-abi-fix-redeploy-live-e2e.json`.

## Blocked by

None for this issue. Remaining operational caveat: the old `F7X...` program id is permanently closed, so all devnet demos must use replacement program id `33ubr...` and fresh wallet/session PDAs.

## Implementation notes

- Do not silently fall back to plaintext/local numeric policy evaluation while claiming Official Encrypt verification.
- Keep the manual reproduction loop simulate-only until a human explicitly approves broadcast.
- The previous `event_authority-missing` diagnosis was too broad: live decryption request/response transactions show Encrypt event emission can succeed even when the readonly `6Lu2...` event authority account has no account data.
- The current manual execution ciphertexts from diagnosis were:
  - source amount: `He5BuzdHpJmsxfbr2rJJJJveiZqk1vbfY63VLrHTKq49`
  - allowed output: `GUr3K19GhtqwDZenaBWcf7FZoGMwoKFW2L2QcHWUt7mQ`
  - daily spent output: `81J4UAsi1RxmRFVpbWhhrYxT1Q7mPqHtp5usE8jQSrXo`
- Policy ciphertexts in the diagnosed wallet were:
  - max per run: `2VB3z1kPxRmXDG3VdA5HtVJHDUaHZLGeVdv5Fqj6nQMq`
  - daily cap: `FN484jy2cuiiueBcAwjTwHMRhtic9WQD6KeR8oBSocfc`
  - daily spent: `DpvyjkKnRA3to2sWCtjB5uWAe6SnwU6WsJCpVXJJztgv`
