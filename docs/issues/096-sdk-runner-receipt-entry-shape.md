# SDK Runner Emits ReceiptEntry-Shaped JSON

Labels: `needs-triage`, `sdk`, `dx`, `demo`, `observability`

Type: `AFK`

Status: `TODO`

## What to build

Standardize the JSON shape that `bun run agent:run` (the local agent
runner) emits to stdout so it matches the `ReceiptEntry` schema used
by `/app`'s ReceiptLog.

Today the SDK runner prints ad-hoc objects per rail call. Frontend-v2
ReceiptLog has a well-defined shape:

```ts
type ReceiptEntry = {
  id: string
  timestamp: number
  action: string           // "JUPITER RUN — ALLOWED" etc.
  status: 'success' | 'failure' | 'info'
  signature: string | null
  description: string
  body: string
  constraintRefs?: string[]   // ["pi_numeric_limit ✓", ...]
  jupiterProof?: JupiterProof // routePlan, slippage, priceImpact, ...
  ikaProof?: IkaProof         // messageApproval, dwalletId, ...
}
```

This slice aligns the SDK runner output with that shape so:

- `bun run agent:run | jq` produces parseable, predictable receipts
- External observability tools can ingest the stream
- A future `/app` page (or the existing ReceiptLog) can render SDK
  receipts as-is by piping through
- Issue 097 (shared constraint vocabulary) plugs into the
  `constraintRefs[]` field cleanly
- Demo script (095) can prove "same constraint refs, same proofs" by
  pointing at the JSON

## Acceptance criteria

- [ ] `sdk/src/local-agent-runner.ts` emits one JSON line per receipt
      to stdout (NDJSON), matching the `ReceiptEntry` schema.
- [ ] Schema is defined once in `sdk/src/types/` (e.g.
      `receipt-entry.ts`) and exported from the SDK index so external
      consumers can type-check against it.
- [ ] Frontend-v2 references the same schema (either via a shared
      `protocol/` workspace, or by importing the SDK type — decision
      from ADR 094).
- [ ] Each rail outcome the runner produces emits:
      - `action` — uppercase action label
        (e.g. "JUPITER RUN — ALLOWED")
      - `status` — success / failure / info
      - `signature` — base58 tx sig (null on intent-prep failures)
      - `description` — single-line summary
      - `body` — multi-line explanation
      - `constraintRefs[]` — array of constraint markers
        ("pi_numeric_limit ✓" / "✗", etc.)
      - `jupiterProof?` — when the rail is Jupiter
      - `ikaProof?` — when the rail is Ika
- [ ] Stderr is used for human-readable narration; stdout is ONLY for
      JSON receipts. Already true for MCP server (see
      `sdk/src/mcp-server/cli.ts:18` — "Logs go to stderr…"); the
      runner should follow the same convention.
- [ ] `bun run agent:run | jq -c .` round-trips cleanly with no
      malformed lines.
- [ ] Unit test in `sdk/tests/` that parses each emitted line as
      `ReceiptEntry`, verifying all required fields are present and
      typed correctly.
- [ ] Existing `agent:run` exit codes preserved (0 on success, non-0
      on failure — unchanged).
- [ ] `bun run build` passes; `bun test` passes.

## Implementation notes

- The frontend-v2 `ReceiptEntry` type lives in
  `frontend-v2/src/components/app/use-console-actions.tsx`
  (lines 140-170 approx — `JupiterProof`, `IkaProof`, `ReceiptEntry`).
- The runner currently prints with `console.log(JSON.stringify(...))`
  but the shape is per-scenario, not canonicalized.
- The `JupiterProof` shape was finalized in commit `586a232`
  (route plan, slippage bps, price impact, in/out mints, etc.).
- The `IkaProof` shape was finalized in commit `ea0b8fe`
  (messageApproval, dwalletId, networkEncryptionKey, etc.).
- This issue does NOT extract a shared `protocol/` workspace — that's
  a decision for ADR 094. Whatever ADR decides, this slice follows.

## Blocked by

None - can start immediately. (ADR 094 may rename / relocate the
type, but the schema shape is well-known.)
