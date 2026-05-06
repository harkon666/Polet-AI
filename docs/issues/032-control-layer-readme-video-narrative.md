# Control Layer README and Video Narrative

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Rewrite the public project narrative around Polet as a confidential Solana control layer for AI agents. The docs and demo script should clearly explain how the project uses Encrypt-style confidential guardrails and Ika dWallet Pre-Alpha, while keeping pre-alpha limitations precise.

## Acceptance criteria

- [x] README headline and problem statement use "confidential Solana control layer for AI agents" rather than DCA-only positioning.
- [x] README has a clear "How Polet uses Encrypt" section with pre-alpha limitations.
- [x] README has a clear "How Polet uses Ika" section covering dWallet, Polet CPI authority PDA, `approve_message`, Sui primary destination, Ethereum optional destination, and MessageApproval/signature proof.
- [x] Demo script is updated to the three required outcomes: 25 USDC blocked/no Ika approval, 5 USDC Jupiter DCA approved, 5 USDC Sui Ika signed intent approved.
- [x] Agent runtime docs show OpenClaw/Hermes-style usage.
- [x] Docs avoid claims of production MPC, production confidentiality, real asset settlement, or mainnet trading.
- [x] The video outline fits under 5 minutes and makes the Ika/Encrypt integration central rather than decorative.

## Blocked by

- `docs/issues/030-control-layer-frontend-ika-dwallet-demo.md`
- `docs/issues/031-ika-devnet-smoke-and-messageapproval-verification.md`

## Architecture notes

This issue owns clarity for judging. It should preserve the stronger product vision while being strict about pre-alpha boundaries.

## Implementation notes

- Updated `README.md` to position Polet as a confidential Solana control layer for AI agents, with explicit Encrypt and Ika sections.
- Rewrote `docs/demo-script.md` around the three required outcomes and added an under-5-minute video outline.
- Updated `docs/agent-runtime.md` with an OpenClaw/Hermes-style adapter shape and runtime handling rules.
- The docs continue to state that Encrypt privacy, Ika MPC/signing, Ika settlement, and Jupiter/mainnet trading are pre-alpha, preview, or not executed unless explicitly proven by the manual devnet smoke path.
