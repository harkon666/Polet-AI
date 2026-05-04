# Real Agent Runtime Integration

Labels: `needs-triage`, `stretch`

## Parent

`docs/prd.md`

## What to build

Integrate the Polet SDK with a real AI agent runtime such as OpenClaw or Hermes if the core MVP is already stable. This is a stretch goal; the required MVP is an agent-compatible SDK example.

The integration should demonstrate a real runtime creating a DCA intent and submitting it through the Polet proxy.

## Acceptance criteria

- [ ] A target runtime is selected and documented.
- [ ] The runtime can load or call the Polet SDK example.
- [ ] The runtime can create a DCA intent for USDC to SOL.
- [ ] The runtime can submit the intent to the Polet proxy.
- [ ] The integration can show an allowed or blocked result from the Polet flow.
- [ ] Setup instructions are documented.
- [ ] This work does not block the primary hackathon MVP or submission deliverables.

## Blocked by

- `006-agent-sdk-strategy-intents.md`
