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

- [ ] Default policy display remains masked as `********`.
- [ ] A connected non-owner, agent session key, or shared approver cannot request policy decryption.
- [ ] Owner can reveal max-per-run, daily-cap, and daily-spent independently, one value at a time.
- [ ] Reveal confirmation states that the request is owner-signed and may expose plaintext through the Encrypt pre-alpha decryption request account.
- [ ] Polet contract rejects reveal requests unless an official Encrypt ciphertext policy is configured.
- [ ] Polet contract rejects requests whose ciphertext does not match the wallet's configured official Encrypt policy refs for the selected value.
- [ ] Polet requests decryption through Encrypt CPI and preserves a digest/request reference for verification or audit without storing plaintext policy values.
- [ ] Frontend polls the decryption request account and decodes the result into USDC display units.
- [ ] Plaintext revealed values are kept only in frontend memory and are not written to localStorage, sessionStorage, backend state, activity logs, Polet wallet state, or progress/evidence files.
- [ ] Refreshing the page returns revealed values to masked state.
- [ ] Activity log entries mention the reveal lifecycle without including plaintext policy amounts.
- [ ] Tests cover owner-only authorization, ciphertext-ref mismatch rejection, no plaintext persistence, masked-by-default UI, hide/reset behavior, and safe activity log text.

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
