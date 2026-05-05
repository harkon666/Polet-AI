# Hybrid Agent Demo with Jupiter, Ika, and Encrypt

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Create the final demo path for Polet as a hybrid multichain agentic wallet. A real or scripted AI agent should choose an action, submit it through Polet, pass or fail confidential guardrails, and receive the correct execution output: Jupiter route/build preview for Solana execution or an Ika bridgeless execution request for multichain execution.

The goal is a credible ending narrative: AI agents can manage native assets across chains through private guardrails enforced from Solana, with Jupiter powering Solana market intelligence and Ika positioned as the bridgeless execution rail.

## Acceptance criteria

- [x] The demo agent can submit a Solana USDC -> SOL DCA intent and receive a Jupiter route/build preview after approval.
- [x] The demo agent can submit a multichain bridgeless trading intent and receive an Ika execution request after approval.
- [x] A 25 USDC-denominated over-limit action is blocked without revealing the private threshold.
- [x] A 5 USDC-denominated in-limit action is approved and returns the expected execution payload.
- [x] The frontend activity log can show both Solana/Jupiter and multichain/Ika outcomes.
- [x] The demo script states clearly what is executed, what is previewed, and what remains pre-alpha or future integration.

## Blocked by

- `011-ika-bridgeless-execution-request.md`

## Completion Notes

Issue 012 is implemented as the final hybrid scripted-agent slice. The SDK local runtime can now run a three-step `hybrid` scenario: blocked 25 USDC DCA, approved 5 USDC Jupiter DCA, and approved 5 USDC Ika bridgeless request. The frontend already displays both Jupiter and Ika outcomes in the safe activity log, and the demo script now includes the Ika request plus CLI hybrid proof.
