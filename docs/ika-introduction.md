# dWallet Developer Guide - Introduction

**Overview:** dWallet enables smart contracts to control signing keys on any blockchain using 2PC-MPC distributed signing.

**Pre-Alpha Status:** This is a pre-alpha release for development/testing only. Uses a single mock signer rather than real distributed MPC. All 11 protocol operations are implemented across 4 curves and 7 signature schemes, but without real MPC security guarantees.

## How It Works

1. Create a dWallet (Ika network runs DKG)
2. Transfer authority to your program's CPI authority PDA
3. Your program CPI-calls `approve_message`
4. Ika validator network produces signature via 2PC-MPC
5. Signature stored on-chain in MessageApproval account

## Code Example (Anchor/Rust)

```rust
fn cast_vote(ctx: &DWalletContext, proposal: &Proposal) -> ProgramResult {
    if proposal.yes_votes >= proposal.quorum {
        ctx.approve_message(
            message_approval, dwallet, payer, system_program,
            proposal.message_hash, user_pubkey, signature_scheme, bump,
        )?;
    }
    Ok(())
}
```

## What You'll Learn

- Getting Started: Install dependencies, create first dWallet-controlled program
- Tutorial: Build voting app where quorum triggers signing
- On-Chain Integration: Accounts, message approval, CPI framework, gas deposits
- gRPC API: SubmitTransaction, request/response types
- Testing: Mollusk, LiteSVM, and E2E testing
- Reference: Instructions, accounts, events

## Links

- https://solana-pre-alpha.ika.xyz/print.html
- https://github.com/dwallet-labs/ika-pre-alpha
- https://solana-pre-alpha.ika.xyz/introduction#dwallet-developer-guide
- https://solana-pre-alpha.ika.xyz/introduction#how-it-works
- https://solana-pre-alpha.ika.xyz/introduction#what-youll-learn
- https://solana-pre-alpha.ika.xyz/getting-started/installation.html
