# Owner-Only Official Encrypt Policy Reveal

Labels: `needs-triage`, `privacy`, `frontend`, `contract`

Type: `AFK`

## Parent

`docs/issues/052-hackathon-ika-encrypt-prealpha-integration.md`

## What to build

Add an explicit owner-only "Reveal my policy" path for official Encrypt pre-alpha policy values. The default frontend must keep policy values masked, but the owner can opt in to reveal one value at a time when they need to inspect a forgotten limit.

The reveal flow should use the same Encrypt decryption pattern documented in the voting example:

1. The owner chooses one policy value to reveal:
   - max per run,
   - daily cap,
   - daily spent.
2. The frontend shows a clear confirmation that this is an owner-signed reveal request and that Encrypt pre-alpha decryption request accounts can expose plaintext on-chain.
3. The frontend creates a fresh decryption request keypair for that value.
4. The owner signs a Polet transaction that requests decryption for the selected official Encrypt ciphertext account.
5. Polet verifies the signer is the wallet owner, verifies the selected ciphertext matches the wallet's configured official Encrypt policy refs, and CPI-calls Encrypt `request_decryption`.
6. The frontend polls the decryption request account until the decryptor has written the result.
7. The frontend decodes and displays the USDC value in memory only, with a `Hide` action that returns the value to `********`.

This is a consented inspection/recovery feature for the wallet owner, not an agent/session capability and not a private local decrypt. The UI and docs must be explicit that, in Encrypt pre-alpha, plaintext may be readable from the public decryption request account after the decryptor responds.

## Acceptance criteria

- [x] Default policy display remains masked as `********`.
- [x] A connected non-owner, agent session key, or shared approver cannot request policy decryption.
- [x] Owner can reveal max-per-run, daily-cap, and daily-spent independently, one value at a time.
- [x] Reveal confirmation states that the request is owner-signed and may expose plaintext through the Encrypt pre-alpha decryption request account.
- [x] Polet contract rejects reveal requests unless an official Encrypt ciphertext policy is configured.
- [x] Polet contract rejects requests whose ciphertext does not match the wallet's configured official Encrypt policy refs for the selected value.
- [x] Polet requests decryption through Encrypt CPI and preserves a digest/request reference for verification or audit without storing plaintext policy values.
- [x] Frontend polls the decryption request account and decodes the result into USDC display units.
- [x] Plaintext revealed values are kept only in frontend memory and are not written to localStorage, sessionStorage, backend state, activity logs, Polet wallet state, or progress/evidence files.
- [x] Refreshing the page returns revealed values to masked state.
- [x] Activity log entries mention the reveal lifecycle without including plaintext policy amounts.
- [x] Tests cover owner-only authorization, ciphertext-ref mismatch rejection, no plaintext persistence, masked-by-default UI, hide/reset behavior, and safe activity log text.

## Result

Implemented in one vertical slice:

- Contract instruction `request_policy_value_decryption(kind, cpi_authority_bump)` verifies owner authority, configured official Encrypt refs, selected ciphertext match, and calls Encrypt `request_decryption`.
- Wallet state stores only reveal request pubkey, ciphertext pubkey, digest snapshot, and selected kind. It does not store plaintext policy values.
- Proxy route `/wallet/request-policy-value-decryption` builds the unsigned owner/payer/request-keypair transaction.
- Frontend adds one-value-at-a-time `Reveal` / `Hide` controls, confirmation warning, decryption request polling, in-memory USDC display, and safe lifecycle activity logs.

Verification:

- `cd contract && NO_DNA=1 anchor build` passed.
- `cd contract && NO_DNA=1 cargo test -p contract encrypt_harness` passed.
- `cd contract && NO_DNA=1 cargo test -p contract policy_reveal` passed.
- `cd contract && NO_DNA=1 cargo test -p contract owner_can_request` passed.
- `cd proxy && bun test ./tests/transaction-builder.test.ts` passed.
- `cd proxy && bun run build` passed.
- `cd frontend && bun run test src/components/DemoTab.test.tsx` passed.
- `cd frontend && bun run typecheck` passed.
- `cd frontend && bun run build` passed.

## Blocked by

- `docs/issues/065-frontend-official-encrypt-prealpha-policy-setup.md`

## Out of scope

- Private local-only decryption. Encrypt pre-alpha decryption request accounts are public on-chain accounts once populated by the decryptor.
- Agent/session reveal capability.
- Automatically revealing values after policy setup.
- Storing plaintext policy values in wallet state, proxy store, browser storage, logs, or evidence artifacts.
- Claiming production FHE privacy or mainnet security.

## Implementation notes

- Prefer a narrow contract instruction such as `request_policy_value_decryption(kind, request_acct, cpi_authority_bump)` rather than writing plaintext back into Polet state.
- If a `reveal_policy_value` instruction is added for digest verification, it must not persist plaintext policy values. A frontend-only decode after request completion is preferable if it can verify enough request-account structure safely.
- Reuse the docs model from `docs/encrypt/raw.md` sections "request_tally_decryption", "reveal_tally", and "Decrypting and revealing".
- Use wording like "Reveal to owner" and "Hide"; avoid wording that implies the value remains private after decryption.
