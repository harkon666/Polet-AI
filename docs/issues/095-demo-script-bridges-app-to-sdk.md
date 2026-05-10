# Demo Script Bridges /app → SDK

Labels: `needs-triage`, `docs`, `demo`, `sdk`, `frontend`

Type: `AFK`

Status: `TODO`

## What to build

Update `docs/demo-script.md` (the 5-minute hackathon judging flow)
so the bridge between `/app` and the SDK is explicit and demoable.

Current state: the demo script covers the `/app` operator console
flow (Try 25 USDC blocked, Run 5 USDC allowed, Approve 5 USDC Ika
allowed) and mentions the SDK separately. Judges don't see the bridge
moment where the SAME policy gate enforces the SAME outcomes for both
HITL and AFK rails.

After this slice the judge flow has an explicit bridge step:

1. `/app` demo — visible operator console
2. Click **Download polet-agent.json** in the SESSION row affordance
3. Switch to terminal — `bun run agent:run -- --config polet-agent.json`
4. Same 3 outcomes (blocked / allowed / allowed)
5. Same `policyCommitment` (visible in `/app` Policy row hash and SDK
   stdout)
6. Same `constraintRefs[]` (visible in `/app` ReceiptLog tooltips and
   SDK stdout structured receipts)

This reinforces the pitch "Three rails · One gate · Policy stays
private" — judges see ONE gate enforce TWO surfaces.

## Acceptance criteria

- [ ] `docs/demo-script.md` updated with a new Step (or set of steps)
      covering the bridge.
- [ ] The step references the canonical CLI command:
      `bun run agent:run -- --config ~/Downloads/polet-agent.json`
- [ ] The step calls out the parity invariants for judges:
      - Same proxy
      - Same `policyCommitment`
      - Same `constraintRefs[]`
      - Same on-chain transaction shape
- [ ] The step calls out the divergence on purpose:
      - `/app` shows proof grids visually
      - SDK emits structured JSON receipts (consumable by external
        agents / observability)
- [ ] Bilingual where applicable — if `docs/demo-script.md` has
      Indonesian copy, mirror the bridge step there too.
- [ ] Timing budget for the bridge step is ≤ 60 seconds within the
      5-minute total.
- [ ] Screenshots or terminal captures committed under `docs/demo/`
      showing the `/app` download click + SDK terminal output. Optional
      if the live demo is good enough — judge for yourself.
- [ ] Linked from the `README.md` demo section.

## Implementation notes

- Blocked by issue 093 because Step 3 above relies on the `--config`
  flag landing. If 093 slips, fall back to the export-jq one-liner
  but keep the bridge narrative intact.
- The `polet-agent.json` download already works today
  (`frontend-v2/src/components/app/SetupLedger.tsx → SessionKeypairAffordance`).
- For a slicker live demo, consider:
      - A `tmux` split-pane that shows `/app` on the left and the
        terminal on the right
      - A pre-recorded screencast as a fallback for judges
        watching async

## Blocked by

- `docs/issues/093-sdk-cli-config-polet-agent-json-flag.md`
