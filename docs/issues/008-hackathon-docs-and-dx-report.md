# Hackathon Docs and DX Report

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Prepare the documentation deliverables needed for the selected hackathon tracks. The repo should clearly explain the product, how it uses Encrypt/Ika and Jupiter, how to run the MVP, what is pre-alpha or non-production, and what developer experience feedback was gathered while integrating Jupiter.

## Acceptance criteria

- [x] The README describes Polet AI as a confidential DCA smart wallet for AI agents.
- [x] The README explains the target users, problem, solution, and demo flow.
- [x] The README explains how Polet uses Encrypt pre-alpha and states the confidentiality limitations honestly.
- [x] The README explains how Polet uses Jupiter APIs and which path is primary vs fallback.
- [x] Build, test, and run instructions are current.
- [x] Deployed program IDs, frontend links, and proxy URLs are documented if available.
- [x] A Jupiter DX report exists and includes onboarding time, API key setup, docs friction, API edge cases, AI stack feedback, missing features, and actionable recommendations.
- [x] A demo script exists for the allow/block USDC to SOL DCA story.
- [x] The docs avoid claiming production-grade privacy or mainnet readiness.

## Completion notes

- Added root `README.md`.
- Added `docs/jupiter-dx-report.md`.
- Added `docs/demo-script.md`.
- Replaced the generated frontend README with Polet-specific run/build/test notes.
- Ika is documented as a target boundary only; no verified Ika settlement is claimed.

## Original blockers

- `004-jupiter-strategy-gateway.md`
- `005-confidential-dca-execution-path.md`
- `006-agent-sdk-strategy-intents.md`
- `007-consumer-demo-frontend.md`
- `012-hybrid-agent-demo-jupiter-ika-encrypt.md`

Issue 008 was executed as the current hackathon documentation slice after issue 007. Issue 012 remains future hybrid implementation work, so the docs explicitly describe Ika as a target rail rather than a completed settlement path.
