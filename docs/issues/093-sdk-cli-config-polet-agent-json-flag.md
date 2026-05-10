# SDK CLI: `--config polet-agent.json` Flag

Labels: `needs-triage`, `sdk`, `dx`, `demo`

Type: `AFK`

Status: `TODO`

## What to build

Bridge the `/app` SessionKeypairAffordance download with the SDK CLI
runners by accepting `--config <path>` on all three SDK entry points.
Today the operator has to either:

```bash
export $(cat polet-agent.json | jq -r 'to_entries[] | "\(.key)=\(.value)"')
bun run agent:run
```

or paste each env var manually. After this slice:

```bash
bun run agent:run -- --config ~/Downloads/polet-agent.json
```

The flag reads the JSON envelope downloaded by `/app`
(`SetupLedger.tsx → SessionKeypairAffordance → handleDownload`) and
pushes each top-level key into `process.env` BEFORE the existing
env-loader logic runs. Existing `POLET_*` env vars take precedence —
the flag is additive, not overriding — so operators with a real shell
config keep working.

End-to-end behaviour:

- `bun run agent:run -- --config polet-agent.json` runs without any
  manual `export` step. Same 3 outcomes (blocked / allowed / allowed)
  as the `/app` Try / Run / Approve buttons emit.
- `bun run mcp-server -- --config polet-agent.json` (or
  `npx @polet-ai/sdk mcp-server --config polet-agent.json`) launches
  the MCP server in a Claude Desktop / Cursor config without inline
  env declarations.
- `bun run polet-readiness -- --config polet-agent.json` is the
  smoke check before the demo.

## Acceptance criteria

- [ ] `sdk/src/local-agent-runner.ts` accepts `--config <path>` and
      loads the JSON envelope into `process.env` before the existing
      `requiredEnv('POLET_OWNER')` / `requiredEnv('POLET_SESSION_KEY')`
      calls.
- [ ] `sdk/src/mcp-server/cli.ts` accepts the same flag.
- [ ] `sdk/src/bin/readiness.ts` accepts the same flag.
- [ ] All three commands take precedence in this order:
      `process.env` (existing) > `--config` JSON > defaults.
- [ ] JSON schema validated minimally — must be an object, keys must
      be strings, values must be primitives (string / number / null).
      Reject anything else with a clear error and exit code 1.
- [ ] Unit test in `sdk/tests/` that:
      - Loads a fixture `polet-agent.json` (matching the `/app`
        download exactly: `POLET_OWNER`, `POLET_SESSION_KEY`,
        `POLET_AGENT_KEYPAIR`, `POLET_PROXY_URL`, `POLET_RPC_URL`).
      - Verifies `process.env` is populated as expected.
      - Verifies existing env vars are not overridden.
- [ ] Update `sdk/README.md` quick-start to show the one-liner with
      `--config`.
- [ ] No changes to the JSON schema itself — `/app` already emits the
      canonical shape (see
      `frontend-v2/src/components/app/SetupLedger.tsx:365-372`).
- [ ] `bun run build` passes; `bun test` passes.

## Implementation notes

- The JSON envelope shape is already documented in
  `sdk/src/mcp-server/cli.ts:10-17` (env var table) and emitted by
  `/app` in `SetupLedger.tsx:handleDownload`. Both are 1:1 matched —
  this slice formalizes that contract by making the JSON consumable
  as a CLI argument.
- `sdk/src/index.ts:1228-1296` already exports a `kit.exportConfig()`
  that returns the same shape. Issue 094 (ADR) may codify this as
  the canonical config format.

## Blocked by

None - can start immediately.
