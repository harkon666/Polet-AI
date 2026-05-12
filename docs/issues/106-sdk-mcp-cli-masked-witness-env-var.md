# SDK MCP CLI Must Read `POLET_MASKED_WITNESS_DEV_FIXTURE`

Labels: `needs-triage`, `sdk`, `mcp`, `dx`, `bug`

Type: `AFK`

Status: `TODO`

## Problem

MCP tools (`polet_trade`, `polet_execute`) invoked from external agent
runtimes (Hermes Agent, Claude Desktop, Cursor, etc.) always fail with:

```
INVALID_POLICY_WITNESS

— or —

maskedWitnessDevFixture must contain exactly 32 bytes
for legacy masked-witness execution.
```

The masked witness fixture is never passed to the proxy, so the
intent-prep step throws before the call ever reaches the on-chain
policy gate.

## Root cause chain

Verified end-to-end against actual code (read-only audit):

1. **MCP tool call** — `sdk/src/mcp-server/tools.ts:235` calls
   `kit.trade(args)` with whatever args the LLM agent provides.
   Agents typically don't include `maskedWitnessDevFixture`.

2. **SDK fallback** — `sdk/src/index.ts:2073` resolves witness:
   ```ts
   const witness = input.maskedWitnessDevFixture
                 ?? options.maskedWitnessDevFixture;
   ```
   Both undefined when MCP CLI doesn't set `options.maskedWitnessDevFixture`.

3. **Conditional inclusion** — `sdk/src/index.ts:2082`:
   ```ts
   ...(witness ? { maskedWitnessDevFixture: witness } : {})
   ```
   Field omitted from the intent payload entirely.

4. **Proxy default** — `proxy/src/lib/confidential-dca-execution.ts:178`:
   ```ts
   maskedWitnessDevFixture: request.maskedWitnessDevFixture ?? [],
   ```
   Default is empty array `[]`.

5. **Transaction builder throws** —
   `proxy/src/lib/transaction-builder.ts:218-220`:
   ```ts
   const witness = Buffer.from(request.maskedWitnessDevFixture);
   if (witness.length !== 32) {
     throw new Error('maskedWitnessDevFixture must contain exactly 32 bytes');
   }
   ```

## What MCP CLI is missing

`sdk/src/mcp-server/cli.ts` `buildKit()` currently reads **5** env vars:

```
POLET_OWNER         (required)
POLET_SESSION_KEY   (required)
POLET_AGENT_KEYPAIR (optional, signer for tx broadcast)
POLET_PROXY_URL     (default localhost:3001)
POLET_RPC_URL       (default api.devnet.solana.com)
```

It does **NOT** read `POLET_MASKED_WITNESS_DEV_FIXTURE`.

For contrast, `sdk/src/local-agent-runner.ts:15` already reads this env
var and passes it through — MCP CLI just hasn't been updated to follow
the same pattern.

## Frontend witness — context for the fix

Frontend always uses the same demo witness fixture for both
set-confidential-policy AND every execute call
(`frontend/src/components/app/use-console-actions.tsx:97`):

```ts
const DEMO_WITNESS_FIXTURE = Array.from({ length: 32 }, () => 7)
```

So the on-chain `encryptionWitnessHash` stored at policy-seal time is
`SHA256([7,7,...,7])`. Any subsequent execute must pass the SAME
witness for `evaluateConfidentialNumericPolicy` to allow it
(`proxy/src/lib/confidential-numeric-policy.ts:93-99`).

If MCP CLI passes a witness that doesn't match, the result is
`INVALID_POLICY_WITNESS`. If MCP CLI passes nothing (current state),
the result is the 32-byte length error before reaching the hash check.

## Fix

### A. Patch `sdk/src/mcp-server/cli.ts`

```ts
function parseMaskedWitness(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length !== 32) {
      process.stderr.write(
        '[polet-mcp] POLET_MASKED_WITNESS_DEV_FIXTURE must be a JSON array of 32 bytes — ignoring\n',
      );
      return undefined;
    }
    return arr;
  } catch {
    process.stderr.write(
      '[polet-mcp] POLET_MASKED_WITNESS_DEV_FIXTURE could not be parsed as JSON — ignoring\n',
    );
    return undefined;
  }
}

function buildKit(): PoletAgentKit {
  const owner = requireEnv('POLET_OWNER');
  const sessionKey = requireEnv('POLET_SESSION_KEY');
  const baseUrl = process.env.POLET_PROXY_URL ?? 'http://localhost:3001';
  const rpcUrl = process.env.POLET_RPC_URL ?? 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const signer = resolveAgentSigner();
  const witness = parseMaskedWitness(
    process.env.POLET_MASKED_WITNESS_DEV_FIXTURE,
  );

  return createPoletAgentKit({
    owner,
    sessionKey,
    baseUrl,
    rpcUrl,
    connection,
    ...(signer && { agentSigner: signer }),
    ...(witness && { maskedWitnessDevFixture: witness }),
  });
}
```

### B. Update MCP client config (Hermes, Claude Desktop, etc.)

Sample for Hermes `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  polet:
    command: bunx
    args: ["@polet-ai/sdk", "polet-mcp"]
    env:
      POLET_OWNER: "<owner-pubkey>"
      POLET_SESSION_KEY: "<session-pubkey>"
      POLET_PROXY_URL: "https://api.polet.rifuki.dev"
      POLET_RPC_URL: "https://api.devnet.solana.com"
      POLET_AGENT_KEYPAIR: "<base58-secret>"
      POLET_MASKED_WITNESS_DEV_FIXTURE: >-
        [7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
         7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]
```

The witness value MUST match what the owner used to set policy. For
the current frontend-default policy that's `[7,7,...,7]` (32 sevens).

### C. README / MCP setup docs

Add `POLET_MASKED_WITNESS_DEV_FIXTURE` to the env-var list in:

- `sdk/README.md` (MCP setup section)
- `sdk/INTEGRATION.md` (if it documents MCP usage)
- Top of `sdk/src/mcp-server/cli.ts` JSDoc block (lines 9-17)

State explicitly: "Must match the witness used at policy-seal time.
For the canonical demo policy set via Polet Portal, use 32 sevens."

## What is NOT in scope

- **Don't default the witness in proxy** (`confidential-dca-execution.ts:178`).
  Empty default → explicit error is the right behavior for non-frontend
  callers. Silent default to `[7,...,7]` would mask configuration bugs.
- **Don't change frontend witness.** Frontend is correct; this is a
  pure SDK + config alignment.
- **Don't fix the legacy `[42,0,...,0]` witnesses** in
  `proxy/src/routes/legacy-intent.ts:67-68,171-172` and
  `proxy/src/routes/wallet.ts:601-602`. Those are separate code paths
  used for legacy intent/transfer flows — handle in a different issue
  if they ever surface to a real demo.

## Acceptance criteria

- [ ] `sdk/src/mcp-server/cli.ts` reads `POLET_MASKED_WITNESS_DEV_FIXTURE`
      (JSON array of 32 bytes, optional) and passes to
      `createPoletAgentKit({ maskedWitnessDevFixture })`.
- [ ] When env var is missing, MCP CLI starts normally (no witness in
      options). Existing behavior preserved.
- [ ] When env var is present but malformed (not JSON, wrong length),
      MCP CLI logs a stderr warning and continues without witness.
- [ ] Unit test in `sdk/tests/` covers: env var unset, valid 32-byte
      JSON, invalid JSON, wrong-length array.
- [ ] `bun run build` passes; `bun test` passes.
- [ ] README MCP section lists the new env var with the canonical
      demo value (`[7,...,7]`).
- [ ] Manual verification via Hermes (or `bunx polet-mcp` with the env
      var set):
      - `polet_trade` USDC 5 SOL → ALLOWED (route preview returned)
      - `polet_trade` USDC 25 SOL → BLOCKED with code
        `CONFIDENTIAL_POLICY_BLOCKED`
      - `polet_execute` Jupiter intent → transaction payload returned

## Frontend / demo impact

**Zero.** Frontend uses `DEMO_WITNESS_FIXTURE` directly and is already
end-to-end working (verified: Proof Trail shows successful policy
seal, custody deposit, session grant, gas funding, and demo intents).

MCP is the agent-bridge layer — useful for showing the SDK story but
not required for the three judge-verifiable demo outcomes (slide 5 of
the pitch deck) which run entirely from the Portal.

## Blocked by

None. Can be done independently.

## Related

- Issue 104 — Portal Agent Bridge surface (MCP config builder).
- Issue 098 — App/SDK/proxy integration rollout PRD.
- Issue 095 — Demo script bridges app to SDK.
