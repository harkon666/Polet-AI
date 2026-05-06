# Canonical Bridgeless Order Message

Schema: `polet.bridgeless.order.v1`

This is the deterministic message Polet prepares for Ika dWallet signing. The MVP signs this canonical order hash rather than a Sui or Ethereum transaction digest. Chain-specific transaction digest adapters remain follow-up issues.

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

## Agent Integration

OpenClaw/Hermes-style agents submit the normal Polet multichain intent. The proxy constructs this canonical order only after the confidential policy/session checks pass, then returns `canonicalOrder` and `canonicalOrderHash` in the allowed Ika request envelope.
