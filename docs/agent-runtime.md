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
POLET_AGENT_SCENARIO=ika-sui
POLET_AGENT_SCENARIO=ika
POLET_AGENT_SCENARIO=hybrid
POLET_DCA_AMOUNT_USDC=25
POLET_ENCRYPTION_WITNESS=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
```

Scenario defaults:

- `allow`: submits a 5 USDC DCA intent.
- `block`: submits a 25 USDC DCA intent.
- `ika-sui`: submits a 5 USDC-denominated Solana USDC -> Sui SUI bridgeless request intent on the Ika rail and reports Ika Pre-Alpha proof metadata plus the unsigned Polet approval transaction when returned.
- `ika`: compatibility alias for the same Sui-primary Ika scenario in the CLI.
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
POLET_AGENT_SCENARIO=ika-sui \
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
- Ika Pre-Alpha dWallet, optional dWallet curve/public-key derivation inputs, Sui devnet message digest, MessageApproval, signature scheme, PDA/status metadata, and Polet approval transaction signers when returned.
- final decision: `allowed`, `blocked`, or `unknown`.

## Boundary

The runner does not sign or broadcast transactions. It creates agent intents and submits them to the Polet proxy. The proxy returns the policy result and, for allowed Jupiter runs, an unsigned smart-wallet transaction payload for the session signer flow. For Ika, the proxy returns a bridgeless request envelope, technical proof fields, and an unsigned Polet approval transaction for the session signer. Live Ika MessageApproval inspection is documented in `docs/ika-devnet-smoke-runbook.md`; production MPC signing and real settlement remain out of scope.

For Ika devnet smoke work, pass `ikaPreAlpha.dwalletCurve` and `ikaPreAlpha.dwalletPublicKey` when the real dWallet public key is known. The proxy then uses the official MessageApproval PDA derivation from the Ika examples instead of the compatibility fallback.

## Transaction Simulation Helper

The SDK exposes `simulatePoletTransaction()` for agent runtimes that need to verify a returned unsigned Polet transaction before asking a session signer or human operator to approve it.

```ts
import { createPoletAgent, simulatePoletTransaction } from '@polet-ai/sdk';

const polet = createPoletAgent({
  owner: process.env.POLET_OWNER!,
  sessionKey: process.env.POLET_SESSION_KEY!,
  baseUrl: process.env.POLET_PROXY_URL!,
  encryptionWitness: [1, 2, 3 /* ...32 bytes total */],
});

const trade = await polet.trade({ from: 'USDC', to: 'SOL', amount: '5' });

if (trade.allowed && trade.execution?.payload) {
  const simulation = await simulatePoletTransaction({
    transaction: trade.execution.payload as { transaction?: string; unsignedTransaction?: string },
    rpcUrl: process.env.SOLANA_RPC_URL!,
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  if (!simulation.ok) {
    throw new Error(`Polet transaction simulation failed: ${JSON.stringify(simulation.err)}`);
  }
}
```

Simulation safety rules:

- Use an explicit devnet/localnet RPC URL. Do not silently simulate against mainnet.
- Default `sigVerify: false` is intended for unsigned transaction preview. If the runtime has a wallet-standard/session signer, it can pass `signers` and set `sigVerify: true`.
- Simulation is not signing or broadcasting. A separate user/session-signer approval step is still required before any transaction can be sent.
- Never pass private keys, seed phrases, or keypair files through the agent model context.

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
const ikaEth = await polet.trade({
  rail: 'ika',
  from: { chain: 'solana', asset: 'USDC' },
  to: { chain: 'ethereum', asset: 'ETH' },
  amount: '5',
  nativeDestinationAccount: '0x0000000000000000000000000000000000000001',
});
```

Allowed Jupiter trades normalize to `status: "preview-ready"` and `settlement: "not-executed"`. Allowed Ika Sui and optional Ethereum trades can progress through `status: "request-prepared"`, `"message-approved"`, `"signature-produced-prealpha"`, or `"devnet-smoke-proof"` while keeping `settlement: "not-executed"`. SDK results expose `details.proof` with dWallet, canonical order hash, Sui devnet digest or Ethereum Sepolia EIP-191 digest, MessageApproval, signature scheme, destination, optional Polet approval transaction, and optional devnet smoke proof. Returned high-level results redact the confidential witness from `execution.intent`. Ika Pre-Alpha uses Solana devnet/mock-signer constraints; production MPC security and final settlement are not executed by this MVP slice.

## OpenClaw/Hermes-Style Usage

OpenClaw, Hermes, or another agent runtime should treat Polet as a policy oracle plus unsigned-transaction/proof builder. The runtime decides the strategy, but it does not build Solana or Ika transactions directly.

Minimal adapter shape:

```ts
import { createPoletAgent } from '@polet-ai/sdk';

export function createPoletTool(env: {
  owner: string;
  sessionKey: string;
  proxyUrl: string;
  encryptionWitness: number[];
}) {
  const polet = createPoletAgent({
    owner: env.owner,
    sessionKey: env.sessionKey,
    baseUrl: env.proxyUrl,
    encryptionWitness: env.encryptionWitness,
  });

  return {
    async runSolanaDca(amount: string) {
      return polet.trade({
        from: 'USDC',
        to: 'SOL',
        amount,
      });
    },

    async requestSuiSignedIntent(amount: string) {
      return polet.trade({
        rail: 'ika',
        from: { chain: 'solana', asset: 'USDC' },
        to: { chain: 'sui', asset: 'SUI' },
        amount,
        strategy: 'dca',
      });
    },

    async requestEthereumSignedIntent(amount: string, recipient: string) {
      return polet.trade({
        rail: 'ika',
        from: { chain: 'solana', asset: 'USDC' },
        to: { chain: 'ethereum', asset: 'ETH' },
        amount,
        strategy: 'dca',
        nativeDestinationAccount: recipient,
      });
    },
  };
}
```

Runtime handling rules:

- If `status` is `blocked`, tell the user Polet blocked the action without exposing private thresholds.
- If Ika returns `needs-approval`, show shared approval progress such as `1/2 ready`, collect co-approver signatures over the returned challenge outside the model context, and resubmit without showing confidential numeric thresholds.
- If Jupiter returns `preview-ready`, show the route/build preview and require a session-signer flow before any transaction can be sent.
- If Ika returns `message-approved`, show the dWallet, MessageApproval, Sui or Ethereum message digest, signature scheme, and unsigned Polet approval transaction; do not claim settlement.
- If a live `devnet-smoke-proof` is attached, show it as Pre-Alpha evidence only.
- Never ask the model or user to paste private keys, seed phrases, or keypair files into the agent context.
