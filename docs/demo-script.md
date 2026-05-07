# Polet AI Demo Script

Goal: show Polet as a confidential Solana control layer for AI agents. The demo must make Encrypt-style guardrails and Ika dWallet Pre-Alpha central, while staying strict that privacy, MPC, settlement, and mainnet trading are not production claims.

Target length: under 5 minutes.

## Three Required Outcomes

1. `25` USDC-equivalent agent request is blocked by Polet confidential policy, and no Ika dWallet approval data is created.
2. `5` USDC Jupiter DCA is approved and returns a Jupiter route/build preview plus an unsigned policy-gated smart-wallet payload.
3. `5` USDC-equivalent Sui Ika signed intent is approved after Polet policy gating and returns a Sui devnet sign-only digest, an unsigned Polet `approve_ika_message_as_session` transaction, and MessageApproval proof metadata.

## Setup

- Solana cluster: devnet.
- Polet program ID: `fyXZDXLNmygJ7FeXYW8uae4V1kiZJojsS9YoRE2VW1Q`.
- Ika Pre-Alpha program ID: `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`.
- Proxy running at `http://localhost:3001`.
- Frontend running at `http://localhost:3000`.
- `JUPITER_API_KEY` configured in the proxy.
- Devnet wallet connected in the frontend.
- Agent session public key available and authorized on-chain.
- Optional live Ika smoke evidence from `docs/ika-devnet-smoke-runbook.md` if Ika devnet is available.
- Deterministic local evidence from `docs/evidence/hackathon-encrypt-ika-local-evidence.txt` for pending, verified blocked, verified allowed, quorum, redaction, and unsigned signer coverage.

Demo policy values for narration only:

- Max per run: 10 USDC.
- Daily cap: 20 USDC.
- Blocked request: 25 USDC.
- Allowed request: 5 USDC.

Do not reveal exact saved thresholds from the normal product UI after setup. Do not show witness bytes in public evidence.

## Video Outline

Use this timing if recording a judge-facing video:

1. `0:00-0:30` Problem and thesis.
   Say: "Polet AI is a confidential Solana control layer for AI agents. Users delegate strategy requests without revealing private spending guardrails or giving agents unlimited wallet authority."
2. `0:30-1:25` Owner setup and Encrypt boundary.
   Show wallet PDA, custody setup, confidential policy save, policy redaction, and session signer authorization. Say this is an Encrypt pre-alpha masked witness flow, not production privacy.
3. `1:25-2:15` Required outcome 1: blocked Ika request.
   Run `25` USDC-equivalent Ika. Show blocked status, safe explanation, no dWallet, no MessageApproval, and no threshold leak.
4. `2:15-3:05` Required outcome 2: approved Jupiter DCA.
   Run `5` USDC Jupiter DCA. Show route/build preview and unsigned smart-wallet transaction. Say no mainnet swap is executed.
5. `3:05-4:15` Required outcome 3: approved Sui Ika signed intent.
   Run `5` USDC-equivalent Sui Ika. Show dWallet, MessageApproval, Sui devnet message digest, signature scheme, CPI authority, and unsigned Polet approval transaction for the session signer. If live smoke was run, show MessageApproval signature evidence. Say no bridgeless asset settlement is executed.
6. `4:15-4:50` Close.
   Emphasize that the same Polet policy gate controls Jupiter and Ika rails; blocked requests create no Ika approval data, approved requests remain bounded by pre-alpha and unsigned-transaction review.

## Script

1. Open the app and introduce Polet.

   "Polet AI is a confidential Solana control layer for AI agents. The owner keeps funds and policy authority in a smart wallet PDA. Agents submit intents, and Polet enforces private guardrails before Jupiter or Ika actions can proceed."

2. Connect the owner wallet and initialize or load the Polet wallet.

   Point out the smart wallet PDA and devnet boundary. Do not describe the app as mainnet-ready.

3. Set up demo custody.

   Use the "Setup custody PDA" action. Show the PDA-owned USDC and SOL/wSOL accounts. Explain that Polet is not only an off-chain policy checker.

4. Save the confidential policy.

   Enter the demo values, sign the setup transaction, then show that the UI redacts the values after save.

   Say: "For the hackathon MVP, this is an Encrypt pre-alpha style masked witness flow. It proves the confidential enforcement path, not production-grade privacy."

5. Grant or paste the agent session key.

   Explain that the agent gets scoped temporary authority, not the owner's main wallet key.

6. Required outcome 1: run the blocked Ika request first.

   Click "Try 25 Ika request".

   Expected result:

   - Status: blocked.
   - No private threshold shown.
   - No dWallet approval object.
   - No MessageApproval account or signature proof shown.

   Say: "The agent asked for a Sui Ika signed intent above the private limit. Polet blocks it before Ika approval, so there is no dWallet approval data to inspect or misuse."

7. Required outcome 2: run the approved Jupiter DCA.

   Click "Try 25 USDC through proxy" if the linear UI requires the block-before-allow path, then click "Run 5 USDC through proxy".

   Expected result:

   - Status: approved.
   - Jupiter route/build preview appears.
   - Unsigned policy-gated smart-wallet transaction payload is returned for the session signer.

   Say: "The in-limit DCA passes the same policy gate. Jupiter provides the route/build preview, and Polet wraps execution behind the smart-wallet policy boundary. This demo does not execute a mainnet swap."

8. Required outcome 3: run the approved Sui Ika signed-intent path.

   Click "Approve 5 USDC-equivalent Ika".

   Expected result:

   - Status: approved.
   - Sui/SUI target is shown.
   - dWallet, MessageApproval, message hash, signature scheme, and CPI authority proof metadata appear.
   - Unsigned Polet `approve_ika_message_as_session` transaction appears for the session signer.
   - Settlement boundary says real bridgeless settlement is not executed.

   Say: "The same confidential guardrail model extends to Ika. Polet approves only the in-limit Sui signed-intent request, maps it into a Sui devnet sign-only digest, then prepares an unsigned Polet approval transaction that can CPI-call Ika `approve_message`. The frontend does not sign, broadcast, or settle bridgeless assets."

9. Optional live Ika devnet smoke proof.

   Use only when `docs/ika-devnet-smoke-runbook.md` has been completed with a real Pre-Alpha dWallet whose authority was transferred to Polet's CPI authority PDA.

   Expected proof:

   - Polet approval devnet transaction signature.
   - dWallet account.
   - MessageApproval account.
   - Message hash and signature scheme.
   - MessageApproval status `Signed`, or `Pending` with a recorded timeout if the mock signer is delayed.

   Say: "This optional live smoke proves the Pre-Alpha MessageApproval inspection path when Ika devnet is available. It still uses the Pre-Alpha mock signer and does not claim production MPC or real settlement."

   If live devnet is unavailable, use `./scripts/hackathon-encrypt-ika-local-evidence.sh` and show `docs/evidence/hackathon-encrypt-ika-local-evidence.txt` as the deterministic local evidence pack. Say: "Local evidence covers the Encrypt/Ika lifecycle and redaction guarantees. Live MessageApproval/explorer evidence is retried later when the Pre-Alpha devnet, faucets, gRPC, and mock signer are available."

10. Optional CLI agent proof.

    Run the scripted runtime from `sdk/`:

    ```bash
    POLET_OWNER=<owner> \
    POLET_SESSION_KEY=<granted-session-key> \
    POLET_PROXY_URL=http://localhost:3001 \
    POLET_AGENT_SCENARIO=hybrid \
    bun run agent:run
    ```

    Expected JSON summary:

    - `blockedDca`: `blocked`.
    - `jupiterDca`: `allowed`.
    - `ikaBridgeless`: `allowed`.

## Reviewer Notes

- Encrypt: confidential numeric policy enforcement is core to the allow/block path, but current privacy is pre-alpha and non-production.
- Jupiter: Tokens, Price, Recurring compatibility analysis, and Swap V2 `/build` fallback are documented and implemented; no mainnet swap execution is claimed.
- Ika: official Solana Pre-Alpha surface is documented; Polet prepares policy-approved `approve_message` transactions and can inspect MessageApproval proof when devnet is available.
- Ika settlement: no production MPC, no production bridgeless settlement, and no asset movement are claimed.
- Mainnet: no mainnet trading claim from this devnet demo.
