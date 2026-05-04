# Local Agent Runtime

Issue 009 selects a local scripted agent runtime as the first real runtime integration target.

This target is intentionally small: it runs inside the Polet SDK package, loads the SDK's DCA intent builder, submits the intent to the Polet proxy, and prints the allow/block decision. It is the base runtime adapter for later multichain and Ika intent slices.

## Why Local Scripted Runtime

- It exercises the same SDK interface an OpenClaw or Hermes adapter would call.
- It avoids adding an external runtime dependency during the hackathon critical path.
- It can run deterministic tests with injected `fetch`.
- It can hit the live local proxy when the devnet demo stack is running.

## Files

- `sdk/src/local-agent-runtime.ts`: reusable runtime class.
- `sdk/src/local-agent-runner.ts`: CLI entrypoint.
- `sdk/tests/local-agent-runtime.test.ts`: mocked proxy tests for allowed and blocked DCA runs.

## Environment

```bash
POLET_OWNER=owner_wallet_public_key
POLET_SESSION_KEY=agent_session_public_key
POLET_PROXY_URL=http://localhost:3001
POLET_AGENT_SCENARIO=allow
```

Optional:

```bash
POLET_AGENT_SCENARIO=block
POLET_DCA_AMOUNT_USDC=25
POLET_ENCRYPTION_WITNESS=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
```

Scenario defaults:

- `allow`: submits a 5 USDC DCA intent.
- `block`: submits a 25 USDC DCA intent.

## Run

Start the proxy first:

```bash
cd proxy
bun run dev
```

Then run the local agent:

```bash
cd sdk
POLET_OWNER=<owner> \
POLET_SESSION_KEY=<granted-session-key> \
POLET_PROXY_URL=http://localhost:3001 \
POLET_AGENT_SCENARIO=allow \
bun run agent:run
```

Blocked demo:

```bash
cd sdk
POLET_OWNER=<owner> \
POLET_SESSION_KEY=<granted-session-key> \
POLET_PROXY_URL=http://localhost:3001 \
POLET_AGENT_SCENARIO=block \
bun run agent:run
```

The runner prints JSON with:

- runtime name.
- scenario.
- DCA intent id/action/amount/mints.
- proxy success/code/reason.
- final decision: `allowed`, `blocked`, or `unknown`.

## Boundary

The runner does not sign or broadcast transactions. It creates the agent intent and submits it to the Polet proxy. The proxy returns the policy result and, for allowed runs, an unsigned smart-wallet transaction payload for the session signer flow.
