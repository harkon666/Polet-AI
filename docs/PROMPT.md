# Ralph Prompt — Polet AI

Read the following files first:
- @docs/PRD-PRODUCTION.md
- @docs/progress.txt
- @docs/GRILL-SESSION.md

## Your Task

Find the **next incomplete task** in progress.txt and implement it.

## Rules

1. **ONLY do ONE task at a time**
2. Implement the task fully — code, tests, and commit
3. After committing, update progress.txt:
   - Mark the task as DONE
   - Note what was implemented
   - If anything needs follow-up, note it under IN-PROGRESS or BLOCKED
4. **Search before implementing** — use grep/find to check if something already exists
5. **Write actual code, not placeholders**
6. **Run tests after implementation** — verify it compiles and tests pass before committing
7. **Commit message format**: `[<issue#>] <short description>`
8. **Contract TDD first**: For contract work, write Rust Anchor tests before implementing instructions
9. **Vertical slices**: Complete contract → proxy → frontend per feature before moving to next feature

## Git Workflow

```bash
git add -A
git commit -m "[#N] implemented <feature>"
```

## Progress Tracking

Update progress.txt with your changes. Keep it brief:
- DONE: #N — description
- IN-PROGRESS: (anything you're working on)
- BLOCKED: (anything waiting on another issue)

## Issue References

Contract issues: #12 (wallet state), #13 (Merkle), #14 (slot revocation), #15 (TEE attestation)
Proxy issues: #16 (wallet store RPC), #17 (session key gen), #18 (wallet endpoints), #19 (agent auth), #20 (Merkle builder), #21 (SHA-256), #22 (devnet RPC)
Frontend issues: #23 (create wallet), #24 (DemoTab)
Integration issue: #25 (end-to-end devnet)

## Dependency Chain

- #13, #14, #15 blocked by #12
- #18, #19 blocked by #17
- #20 blocked by #12 (contract IDL)
- #23 blocked by #18
- #24 blocked by #21, #22
- #25 blocked by #12-#15, #16, #17, #18, #21, #22
