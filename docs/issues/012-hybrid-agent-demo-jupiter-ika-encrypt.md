# Hybrid Agent Demo with Jupiter, Ika, and Encrypt

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Create the final demo path for Polet as a hybrid multichain agentic wallet. A real or scripted AI agent should choose an action, submit it through Polet, pass or fail confidential guardrails, and receive the correct execution output: Jupiter route/build preview for Solana execution or an Ika bridgeless execution request for multichain execution.

The goal is a credible ending narrative: AI agents can manage native assets across chains through private guardrails enforced from Solana, with Jupiter powering Solana market intelligence and Ika positioned as the bridgeless execution rail.

## Acceptance criteria

- [ ] The demo agent can submit a Solana USDC -> SOL DCA intent and receive a Jupiter route/build preview after approval.
- [ ] The demo agent can submit a multichain bridgeless trading intent and receive an Ika execution request after approval.
- [ ] A 25 USDC-denominated over-limit action is blocked without revealing the private threshold.
- [ ] A 5 USDC-denominated in-limit action is approved and returns the expected execution payload.
- [ ] The frontend activity log can show both Solana/Jupiter and multichain/Ika outcomes.
- [ ] The demo script states clearly what is executed, what is previewed, and what remains pre-alpha or future integration.

## Blocked by

- `011-ika-bridgeless-execution-request.md`
