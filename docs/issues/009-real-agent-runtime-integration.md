# Real Agent Runtime Integration

Labels: `done`

## Parent

`docs/prd.md`

## What to build

Integrate the Polet SDK with a real or scripted AI agent runtime such as OpenClaw, Hermes, or a local agent runner now that the core MVP is stable.

The integration should demonstrate a real runtime creating a DCA intent and submitting it through the Polet proxy.

## Acceptance criteria

- [x] A target runtime is selected and documented.
- [x] The runtime can load or call the Polet SDK example.
- [x] The runtime can create a DCA intent for USDC to SOL.
- [x] The runtime can submit the intent to the Polet proxy.
- [x] The integration can show an allowed or blocked result from the Polet flow.
- [x] Setup instructions are documented.
- [x] The integration becomes the base for later multichain/Ika intent slices.

## Completion notes

- Selected a local scripted agent runtime for the first integration target.
- Added reusable SDK runtime code in `sdk/src/local-agent-runtime.ts`.
- Added CLI runner in `sdk/src/local-agent-runner.ts` exposed as `bun run agent:run`.
- Added mocked proxy tests for 5 USDC allowed and 25 USDC blocked DCA scenarios.
- Added setup and run instructions in `docs/agent-runtime.md`.

## Blocked by

- `006-agent-sdk-strategy-intents.md`
