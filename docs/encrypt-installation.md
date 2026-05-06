# Encrypt Developer Guide - Installation

## Prerequisites

- **Rust** (edition 2024): Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Solana CLI** 3.x+: Install via `sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`
- **Bun** (for TypeScript clients): Install via `curl -fsSL https://bun.sh/install | bash`

## Dependencies

### For Pinocchio Programs
```toml
[dependencies]
encrypt-types = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-dsl = { package = "encrypt-solana-dsl", git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-pinocchio = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
pinocchio = "0.10"

[dev-dependencies]
encrypt-solana-test = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
```

### For Anchor Programs
```toml
[dependencies]
encrypt-types = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-dsl = { package = "encrypt-solana-dsl", git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-anchor = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
anchor-lang = "0.32"

[dev-dependencies]
encrypt-solana-test = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
```

### For Native Programs
```toml
[dependencies]
encrypt-types = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-dsl = { package = "encrypt-solana-dsl", git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
encrypt-native = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
solana-program = "4"

[dev-dependencies]
encrypt-solana-test = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
```

## Client SDKs

### Rust gRPC Client
```toml
[dependencies]
encrypt-solana-client = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha" }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
```

### TypeScript gRPC Client
```bash
bun add @encrypt.xyz/pre-alpha-solana-client
```

## Pre-Alpha Environment

The Encrypt program is deployed to Solana devnet. Resources:

| Resource | Endpoint |
|----------|----------|
| **Encrypt gRPC** | `https://pre-alpha-dev-1.encrypt.ika-network.net:443` |
| **Solana RPC** | `https://api.devnet.solana.com` |
| **Program ID** | `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8` |

No local executor or validator setup needed — just connect to devnet.

## Links

- https://docs.encrypt.xyz/print.html
- https://github.com/dwallet-labs/encrypt-pre-alpha
- https://docs.encrypt.xyz/getting-started/installation#installation
- https://docs.encrypt.xyz/getting-started/installation#prerequisites
- https://docs.encrypt.xyz/getting-started/installation#add-dependencies
- https://docs.encrypt.xyz/getting-started/installation#for-pinocchio-programs
- https://docs.encrypt.xyz/getting-started/installation#for-anchor-programs
- https://docs.encrypt.xyz/getting-started/installation#for-native-programs
- https://docs.encrypt.xyz/getting-started/installation#client-sdks
- https://docs.encrypt.xyz/getting-started/installation#rust-grpc-client
- https://docs.encrypt.xyz/getting-started/installation#typescript-grpc-client
- https://docs.encrypt.xyz/getting-started/installation#pre-alpha-environment
- https://docs.encrypt.xyz/introduction.html
- https://docs.encrypt.xyz/getting-started/quick-start.html
