# Frontend Ethereum Ika Optional Route UI

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Add the optional Ethereum/ETH Ika route as a first-class frontend demo path. The current frontend only demonstrates Sui/SUI success and an unsupported route block. This slice should let users request Solana USDC-equivalent to Ethereum ETH, show the Sepolia sign-only digest artifact, and preserve the same non-settlement boundary as the Sui path.

## Acceptance criteria

- [ ] The frontend exposes Ethereum/ETH as an optional allowed Ika target, separate from unsupported route testing.
- [ ] The proxy request includes route allowlist and risk guardrail inputs that permit the Ethereum/ETH route.
- [ ] Approved Ethereum responses show the Sepolia EIP-191 digest artifact and Ika approval transaction metadata.
- [ ] Blocked Ethereum responses suppress dWallet, MessageApproval, and digest proof data.
- [ ] Unsupported route testing remains available but does not reuse Ethereum/ETH as the unsupported example.
- [ ] Tests cover Ethereum approved, Ethereum blocked by confidential policy, and unsupported route states.

## Blocked by

None - can start immediately

