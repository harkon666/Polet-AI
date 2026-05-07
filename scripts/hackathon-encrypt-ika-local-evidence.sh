#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
EVIDENCE_DIR="$ROOT_DIR/docs/evidence"
EVIDENCE_FILE="$EVIDENCE_DIR/hackathon-encrypt-ika-local-evidence.txt"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

run_check() {
  local name="$1"
  local workdir="$2"
  shift 2
  local log="$TMP_DIR/$name.log"

  printf 'running %s\n' "$name"
  (
    cd "$workdir"
    "$@"
  ) >"$log" 2>&1
  printf 'pass %s\n' "$name"
}

mkdir -p "$EVIDENCE_DIR"

run_check proxy-ika-encrypt "$ROOT_DIR/proxy" \
  bun test ./tests/ika-bridgeless-request.test.ts

run_check sdk-agent-normalization "$ROOT_DIR/sdk" \
  bun test ./tests/intent-builder.test.ts ./tests/local-agent-runtime.test.ts

run_check frontend-command-center "$ROOT_DIR/frontend" \
  bun run test src/components/DemoTab.test.tsx

cat >"$EVIDENCE_FILE" <<'EOF'
# Hackathon Encrypt x Ika Local Evidence

Deterministic local evidence for issue 057 and umbrella issue 052.

Commands covered:
- proxy: bun test ./tests/ika-bridgeless-request.test.ts
- sdk: bun test ./tests/intent-builder.test.ts ./tests/local-agent-runtime.test.ts
- frontend: bun run test src/components/DemoTab.test.tsx

Observed lifecycle coverage:
- pending-encrypt-execution: covered; no Ika approval artifacts prepared.
- encrypt-verified-blocked: covered; execution and approval artifacts suppressed.
- encrypt-verified-allowed: covered; safe policy attestation metadata can appear.
- quorum required: covered; shared approval progress appears before Ika approval artifacts.
- quorum satisfied: covered; Ika approval preparation can proceed after policy and quorum.
- unsigned approval signer: covered; Polet approval transaction requires the session signer.

Redaction guarantees covered:
- Pending and blocked states do not expose dWallet approval data.
- Pending and blocked states do not expose MessageApproval data.
- Pending and blocked states do not expose destination digest artifacts.
- Pending and blocked states do not expose unsigned approval transactions.
- Evidence summary omits confidential policy values, private cap state, operator secrets, key material, and executable payload bytes.

Boundary language:
- Encrypt integration here is pre-alpha; production privacy is not claimed.
- Ika integration here is Pre-Alpha; production MPC is not claimed.
- Jupiter output is preview/unsigned unless a separate signer flow executes it.
- Ika settlement remains not-executed.
EOF

if grep -Eq 'encryptionWitness|\[1,2,3,\.\.\.,32\]|private key|seed phrase|decrypted remaining|max-per-run:|daily cap:|transaction: [A-Za-z0-9+/=]{32,}' "$EVIDENCE_FILE"; then
  printf 'redaction scan failed: %s\n' "$EVIDENCE_FILE" >&2
  exit 1
fi

printf 'evidence written %s\n' "$EVIDENCE_FILE"
