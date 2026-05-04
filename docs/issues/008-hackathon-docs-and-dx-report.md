# Hackathon Docs and DX Report

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Prepare the documentation deliverables needed for the selected hackathon tracks. The repo should clearly explain the product, how it uses Encrypt/Ika and Jupiter, how to run the MVP, what is pre-alpha or non-production, and what developer experience feedback was gathered while integrating Jupiter.

## Acceptance criteria

- [ ] The README describes Polet AI as a confidential DCA smart wallet for AI agents.
- [ ] The README explains the target users, problem, solution, and demo flow.
- [ ] The README explains how Polet uses Encrypt pre-alpha and states the confidentiality limitations honestly.
- [ ] The README explains how Polet uses Jupiter APIs and which path is primary vs fallback.
- [ ] Build, test, and run instructions are current.
- [ ] Deployed program IDs, frontend links, and proxy URLs are documented if available.
- [ ] A Jupiter DX report exists and includes onboarding time, API key setup, docs friction, API edge cases, AI stack feedback, missing features, and actionable recommendations.
- [ ] A demo script exists for the allow/block USDC to SOL DCA story.
- [ ] The docs avoid claiming production-grade privacy or mainnet readiness.

## Blocked by

- `004-jupiter-strategy-gateway.md`
- `005-confidential-dca-execution-path.md`
- `006-agent-sdk-strategy-intents.md`
- `007-consumer-demo-frontend.md`
