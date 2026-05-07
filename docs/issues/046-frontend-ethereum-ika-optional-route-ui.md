# Frontend Ethereum Ika Optional Route UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add the optional Ethereum/ETH Ika route as a first-class frontend demo path. The current frontend only demonstrates Sui/SUI success and an unsupported route block. This slice should let users request Solana USDC-equivalent to Ethereum ETH, show the Sepolia sign-only digest artifact, and preserve the same non-settlement boundary as the Sui path.

## Acceptance criteria

- [x] The frontend exposes Ethereum/ETH as an optional allowed Ika target, separate from unsupported route testing.
- [x] The proxy request includes route allowlist and risk guardrail inputs that permit the Ethereum/ETH route.
- [x] Approved Ethereum responses show the Sepolia EIP-191 digest artifact and Ika approval transaction metadata.
- [x] Blocked Ethereum responses suppress dWallet, MessageApproval, and digest proof data.
- [x] Unsupported route testing remains available but does not reuse Ethereum/ETH as the unsupported example.
- [x] Tests cover Ethereum approved, Ethereum blocked by confidential policy, and unsupported route states.

## Blocked by

None - can start immediately

## Implementation note

Completed in the frontend command center. The Ika controls now expose Sui/SUI primary approved/block paths plus Ethereum/ETH optional approved/block paths, while the unsupported route button remains Base/ETH. Ethereum requests include route allowlist and route-risk guardrails that permit `ethereum` / `ETH`; approved responses display the Sepolia EIP-191 destination digest alongside Ika approval transaction metadata, and blocked responses keep dWallet, MessageApproval, and digest proof data suppressed.

## Verification

- `cd frontend && bun run test src/components/DemoTab.test.tsx` — passed. Vitest still prints the existing `ReferenceError: module is not defined` and Vite close-timeout warnings, but exits 0 with 11 passing tests.
- `cd frontend && bun run build` — passed.
