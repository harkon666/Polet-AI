# Local Agent Runtime

Issue 009 selects a local scripted agent runtime as the first real runtime integration target.

This target is intentionally small: it runs inside the Polet SDK package, loads the SDK's DCA and multichain intent builders, submits intents to the Polet proxy, and prints the allow/block decision. It is the base runtime adapter for OpenClaw, Hermes, or another external agent runtime.

## Why Local Scripted Runtime

- It exercises the same SDK interface an OpenClaw or Hermes adapter would call.
- It avoids adding an external runtime dependency during the hackathon critical path.
- It can run deterministic tests with injected `fetch`.
- It can hit the live local proxy when the devnet demo stack is running.

## Files

- `sdk/src/local-agent-runtime.ts`: reusable runtime class for DCA, Ika, and hybrid demo scenarios.
- `sdk/src/local-agent-runner.ts`: CLI entrypoint.
- `sdk/tests/local-agent-runtime.test.ts`: mocked proxy tests for allowed DCA, blocked DCA, Ika, and the final hybrid sequence.

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
POLET_AGENT_SCENARIO=ika
POLET_AGENT_SCENARIO=hybrid
POLET_DCA_AMOUNT_USDC=25
POLET_ENCRYPTION_WITNESS=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
```

Scenario defaults:

- `allow`: submits a 5 USDC DCA intent.
- `block`: submits a 25 USDC DCA intent.
- `ika`: submits a 5 USDC-denominated Solana USDC -> Sui SUI bridgeless request intent on the Ika rail and reports the local Ika Pre-Alpha compatibility metadata when returned.
- `hybrid`: runs the final three-step script: blocked 25 USDC DCA, approved 5 USDC Jupiter DCA, and approved 5 USDC Ika bridgeless request.

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

Ika request demo:

```bash
cd sdk
POLET_OWNER=<owner> \
POLET_SESSION_KEY=<granted-session-key> \
POLET_PROXY_URL=http://localhost:3001 \
POLET_AGENT_SCENARIO=ika \
bun run agent:run
```

Final hybrid demo:

```bash
cd sdk
POLET_OWNER=<owner> \
POLET_SESSION_KEY=<granted-session-key> \
POLET_PROXY_URL=http://localhost:3001 \
POLET_AGENT_SCENARIO=hybrid \
bun run agent:run
```

The runner prints JSON with:

- runtime name.
- scenario or hybrid step name.
- intent id/action/amount/rail metadata.
- proxy success/code/reason.
- Jupiter execution path or Ika request id when returned.
- Ika Pre-Alpha compatibility PDA/status metadata when returned.
- final decision: `allowed`, `blocked`, or `unknown`.

## Boundary

The runner does not sign or broadcast transactions. It creates agent intents and submits them to the Polet proxy. The proxy returns the policy result and, for allowed Jupiter runs, an unsigned smart-wallet transaction payload for the session signer flow. For Ika, the proxy returns a bridgeless request envelope plus local Pre-Alpha compatibility metadata. The official Solana Pre-Alpha CPI surface is pinned in `docs/ika-dwallet-prealpha-alignment.md`; real Ika MessageApproval verification, settlement, and production MPC signing remain outside this repo until issues 027 and 031 are complete.

## High-Level Trade API

Issue 018 adds `createPoletAgent()` for integrations that want one control-layer method instead of selecting lower-level intent builders directly:

```ts
import { createPoletAgent } from '@polet-ai/sdk';

const polet = createPoletAgent({
  owner: process.env.POLET_OWNER!,
  sessionKey: process.env.POLET_SESSION_KEY!,
  baseUrl: process.env.POLET_PROXY_URL!,
  encryptionWitness: [1, 2, 3 /* ...32 bytes total */],
});

const jupiter = await polet.trade({ from: 'USDC', to: 'SOL', amount: '5' });
const ika = await polet.trade({
  rail: 'ika',
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'sui', asset: 'SUI' },
  amount: '5',
});
```

Allowed Jupiter trades normalize to `status: "preview-ready"` and `settlement: "not-executed"`. Allowed Ika trades can progress from `status: "request-prepared"` to the current compatibility `status: "message-approved"` while keeping `settlement: "not-executed"`. In the official Pre-Alpha path, Polet should expose pending MessageApproval separately from a produced signature. Ika Pre-Alpha uses Solana devnet/mock-signer constraints; production MPC security and final settlement are not executed by this MVP slice.
