# Control Layer README and Video Narrative

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Rewrite the public project narrative around Polet as a confidential Solana control layer for AI agents. The docs and demo script should clearly explain how the project uses Encrypt-style confidential guardrails and Ika dWallet Pre-Alpha, while keeping pre-alpha limitations precise.

## Acceptance criteria

- [ ] README headline and problem statement use "confidential Solana control layer for AI agents" rather than DCA-only positioning.
- [ ] README has a clear "How Polet uses Encrypt" section with pre-alpha limitations.
- [ ] README has a clear "How Polet uses Ika" section covering dWallet, Polet CPI authority PDA, `approve_message`, Sui primary destination, Ethereum optional destination, and MessageApproval/signature proof.
- [ ] Demo script is updated to the three required outcomes: 25 USDC blocked/no Ika approval, 5 USDC Jupiter DCA approved, 5 USDC Sui Ika signed intent approved.
- [ ] Agent runtime docs show OpenClaw/Hermes-style usage.
- [ ] Docs avoid claims of production MPC, production confidentiality, real asset settlement, or mainnet trading.
- [ ] The video outline fits under 5 minutes and makes the Ika/Encrypt integration central rather than decorative.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`
- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Architecture notes

This issue owns clarity for judging. It should preserve the stronger product vision while being strict about pre-alpha boundaries.

