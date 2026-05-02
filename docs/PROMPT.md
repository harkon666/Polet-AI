# Ralph Prompt — Polet AI

Read the following files first:
- @docs/PRD.md
- @docs/progress.txt
- @docs/GRILL-SESSION.md

## Your task

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

## Git workflow

```bash
git add -A
git commit -m "[#N] implemented <feature>"
```

## Progress tracking

Update progress.txt with your changes. Keep it brief:
- DONE: #N — description
- IN-PROGRESS: (anything you're working on)
- BLOCKED: (anything waiting on another issue)