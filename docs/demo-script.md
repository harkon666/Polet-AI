# Polet AI Demo Script

Goal: show that an AI agent can request USDC -> SOL DCA runs and a multichain bridgeless request while Polet enforces private guardrails without revealing the user's thresholds.

Target length: 4-5 minutes.

## Setup

- Solana cluster: devnet.
- Program ID: `J1AmhNEsVQukD8cvRh7zRD9jh56QocsoGCBrfTvTmAus`.
- Proxy running at `http://localhost:3001`.
- Frontend running at `http://localhost:3000`.
- `JUPITER_API_KEY` configured in the proxy.
- Devnet wallet connected in the frontend.
- Agent session public key available.

Demo policy values for narration only:

- Max per run: 10 USDC.
- Daily cap: 20 USDC.
- Blocked request: 25 USDC.
- Allowed request: 5 USDC.

Do not reveal the exact saved thresholds from the normal product UI after setup.

## Script

1. Open the app and introduce Polet.

   "Polet AI is a confidential DCA smart wallet for AI agents. The user keeps custody in a smart wallet PDA, gives the agent a temporary session key, and Polet enforces private spending guardrails before any strategy run."

2. Connect the owner wallet and initialize or load the Polet wallet.

   Point out the smart wallet PDA and devnet boundary. Do not describe the app as mainnet-ready.

3. Set up demo custody.

   Use the "Setup custody PDA" action. Show the PDA-owned USDC and SOL/wSOL accounts. Explain that this proves the product is not only an off-chain policy checker.

4. Save the confidential policy.

   Enter the demo values, sign the setup transaction, then show that the UI redacts the values after save.

   Say: "For the hackathon MVP, this is an Encrypt pre-alpha style masked witness flow. It proves the confidential enforcement path, not production-grade privacy."

5. Grant or paste the agent session key.

   Explain that the agent gets scoped temporary authority, not the owner's main wallet key.

6. Run the blocked scenario.

   Click "Try 25 USDC through proxy".

   Expected result:

   - Status: blocked.
   - No private threshold shown.
   - Safe explanation only.

   Say: "The agent asked for a run that violates the private policy. Polet blocks it without displaying the max-per-run or remaining daily cap."

7. Run the allowed scenario.

   Click "Run 5 USDC through proxy".

   Expected result:

   - Status: approved.
   - Jupiter route/build preview appears.
   - Unsigned policy-gated smart-wallet transaction payload is returned for the session signer.

   Say: "The in-limit run passes the policy gate. Jupiter provides the route/build preview, and Polet wraps execution behind the smart-wallet policy boundary."

8. Close with the multichain direction.

   Click "Request Ika bridgeless route".

   Expected result:

   - Status: approved.
   - Ika request envelope appears.
   - Source/target chains are shown.
   - Settlement boundary says real bridgeless settlement is not executed.

   Say: "The same model extends to multichain requests through Ika: the agent submits an intent, Polet checks confidential guardrails, and only approved requests receive an execution request envelope. This repo does not claim verified Ika settlement yet."

9. Optional Pre-Alpha destination broadcast proof.

   Use only when the proxy is explicitly configured:

   ```bash
   POLET_DESTINATION_BROADCAST_DEMO=enabled \
   POLET_DESTINATION_BROADCAST_FEE_PAYER=<devnet-fee-payer-secret-key-json-or-base58> \
   POLET_DESTINATION_BROADCAST_CONFIRM=false \
   bun run dev
   ```

   Submit the approved Ika request plus a `signature-produced-prealpha` result to:

   ```text
   POST /intent/ika/destination-broadcast
   ```

   Expected result:

   - `status`: `broadcast-submitted` or `broadcast-confirmed`.
   - Receipt: Solana devnet transaction id and explorer URL.
   - Action: Solana Memo proof only.

   Say: "This optional final leg broadcasts a narrow devnet memo proof that a policy-approved Ika Pre-Alpha signature result existed. It does not transfer assets and is not production bridgeless settlement."

10. Optional CLI agent proof.

   Run the final scripted runtime from `sdk/`:

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
- Jupiter: Tokens, Price, Recurring compatibility analysis, and Swap V2 `/build` fallback are documented and implemented.
- Ika: approved request envelope only; no real settlement claim yet.
- Ika broadcast proof: optional Solana devnet memo receipt only; no asset movement, no production MPC, no arbitrary destination-chain support.
- Mainnet: no mainnet swap execution claim from the devnet demo.
