# Canonical Bridgeless Order Message

Schema: `polet.bridgeless.order.v1`

This is the deterministic Polet order reference for Ika dWallet signing. For Sui-primary and Ethereum-optional rails, Polet keeps this canonical order hash as the audit/reference hash, then maps the approved order into a narrow chain-specific sign-only digest artifact before building the Ika approval.

## Payload

Example Sui-primary order:

```json
{
  "schema": "polet.bridgeless.order.v1",
  "intentId": "ika-sui-allow-1",
  "source": {
    "chain": "solana",
    "asset": "USDC",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },
  "target": {
    "chain": "sui",
    "asset": "SUI"
  },
  "amount": {
    "display": "5",
    "baseUnits": "5000000",
    "policyAsset": "USDC",
    "policyBaseUnits": "5000000"
  },
  "slippageBps": 100,
  "owner": "AxV7mf7pAkNxcU99Si13rYq3iwz9qP5r8fH6gS5tT3wQ2",
  "sessionKey": "BxW8ng8qBlOydV0W10Ti14rZ4juxA1sB9mK3lU6vV5xR4",
  "policySequence": 7,
  "nonce": "nonce-001",
  "expiresAtUnix": 1900000000
}
```

The canonical serialized form sorts object keys recursively and omits undefined fields. For the payload above, the SHA-256 digest is:

```text
e33cfb1071118e2303819a7cd1eb30dd1438b41ccb35a344f120ca813d734b26
```

## Validation Rules

- Source chain must be `solana`.
- Source asset must be `USDC`; the policy amount is the source USDC-equivalent amount.
- Primary target shape is Sui/SUI.
- Ethereum/ETH is accepted as the optional destination shape.
- Other destination chains are rejected for this issue.
- `nonce` and `expiresAtUnix` are part of the hash for replay protection.
- Expired orders are rejected before Ika approval.
- Private policy witness bytes are not included in the canonical order.

## Sui Devnet Digest Adapter

Schema: `polet.sui.devnet.transaction-digest.v1`

Selected narrow action: `zero-mist-transfer-proof`.

For approved Solana USDC -> Sui SUI orders, the proxy builds a sign-only Sui devnet verification artifact with:

- Sui `TransactionData` intent prefix: `0x000000`.
- Digest hash: BLAKE2b-256 over the intent prefix plus a stable JSON devnet payload.
- Recipient: `nativeDestinationAccount` when supplied and valid, otherwise Polet's fixed devnet verifier address `0x0000000000000000000000000000000000000000000000000000000000000001`.
- Amount: `0` MIST.
- Ika signature scheme: `ed25519-prealpha` / EddsaSha512 for the Sui rail unless an explicit Pre-Alpha override is supplied.
- `broadcastable: false` and `productionSettlement: false`.

The Sui `suiTransactionDigest.digestHex` remains destination sign-only proof metadata. Polet separately derives `ikaMessageHash` as Keccak-256 over the stable `polet.ika.message-approval.v1` preimage and passes only that hash into `approve_ika_message_as_session` / Ika `approve_message`. The response still includes `canonicalOrderHash` so operators can verify which Polet order was mapped into the Sui digest. This artifact is devnet/sign-only proof metadata; it is not a production Sui transaction, not production MPC evidence, and not bridgeless settlement.

## Ethereum Sepolia Message Digest Adapter

Schema: `polet.ethereum.sepolia.message-digest.v1`

Selected narrow action: `zero-wei-transfer-proof`.

For optional approved Solana USDC -> Ethereum ETH orders, the proxy builds a sign-only Ethereum Sepolia verification artifact with:

- EVM message standard: EIP-191 `personal_sign`.
- Digest hash: Keccak-256 over the EIP-191 prefix plus a stable JSON Sepolia payload.
- Chain id: `11155111`.
- Recipient: `nativeDestinationAccount` when supplied and valid, otherwise Polet's fixed Sepolia verifier address `0x0000000000000000000000000000000000000001`.
- Amount: `0` wei.
- Ika signature scheme: `ecdsa-secp256k1-sha256` unless an explicit Pre-Alpha override is supplied.
- `broadcastable: false` and `productionSettlement: false`.

The Ethereum `ethereumMessageDigest.digestHex` remains destination sign-only proof metadata. Polet separately derives `ikaMessageHash` as Keccak-256 over the stable `polet.ika.message-approval.v1` preimage and passes only that hash into `approve_ika_message_as_session` / Ika `approve_message`. The response still includes `canonicalOrderHash` for order verification. This artifact is Sepolia/sign-only proof metadata; it is not a production Ethereum transaction, not production MPC evidence, and not bridgeless settlement.

## Agent Integration

OpenClaw/Hermes-style agents submit the normal Polet multichain intent. The proxy constructs this canonical order only after the confidential policy/session checks pass, then returns `canonicalOrder`, `canonicalOrderHash`, `ikaMessageHash`, `destinationSigningDigest`, and the chain-specific digest field in the allowed Ika request envelope. Blocked responses suppress all Ika, Sui, and Ethereum digest proof fields.
