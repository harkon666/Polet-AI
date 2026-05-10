# Polet AI Frontend

Consumer demo for the Polet AI confidential USDC -> SOL DCA smart wallet.

The app connects to the Polet proxy, lets the owner set up PDA custody and confidential policy transactions, and shows the agent allow/block demo without revealing saved private thresholds.

## Environment

```bash
VITE_PROXY_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

The current Polet devnet program id surfaced by the frontend is:

```text
9CN8mR6Hf3vmyX1HnSzP5TKW8HicAFhLsWv7vVqpf3Hc
```

The frontend receives transaction builders and wallet PDAs from the proxy, so the proxy must be running with the same program id.

## Run

```bash
bun install
bun run dev
```

The default dev URL is `http://localhost:3000`.

## Build

```bash
bun run build
```

## Test

```bash
bun run test
```

Focused demo test:

```bash
bun run test src/components/DemoTab.test.tsx
```

## Demo Boundary

The frontend proves the devnet policy-gated flow and displays Jupiter Swap V2 route/build details for approved runs. It does not claim production Encrypt privacy, mainnet swap execution, or verified Ika settlement.
