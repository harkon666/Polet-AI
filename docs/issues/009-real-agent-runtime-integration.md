# Real Agent Runtime Integration

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Integrate the Polet SDK with a real or scripted AI agent runtime such as OpenClaw, Hermes, or a local agent runner now that the core MVP is stable.

The integration should demonstrate a real runtime creating a DCA intent and submitting it through the Polet proxy.

## Acceptance criteria

- [ ] A target runtime is selected and documented.
- [ ] The runtime can load or call the Polet SDK example.
- [ ] The runtime can create a DCA intent for USDC to SOL.
- [ ] The runtime can submit the intent to the Polet proxy.
- [ ] The integration can show an allowed or blocked result from the Polet flow.
- [ ] Setup instructions are documented.
- [ ] The integration becomes the base for later multichain/Ika intent slices.

## Blocked by

- `006-agent-sdk-strategy-intents.md`
