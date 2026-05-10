# Domain docs

How engineering skills should consume this repo's domain documentation when
exploring, writing issues, or making changes.

## Layout

**Single-context repo.** No `CONTEXT-MAP.md`. All domain language lives in
`docs/` at the repo root.

```
/
├── README.md                          ← public narrative
├── AGENTS.md                          ← agent orientation
├── docs/
│   ├── prd.md                         ← product requirements (source of language)
│   ├── demo-script.md                 ← 5-min judging demo, 3 required outcomes
│   ├── progress.txt                   ← milestone log
│   ├── agent-runtime.md               ← agent integration architecture
│   ├── agents/                        ← this folder: tracker / labels / domain
│   ├── encrypt-*.md                   ← Encrypt Pre-Alpha integration notes
│   ├── ika-*.md                       ← Ika Pre-Alpha integration notes
│   ├── jupiter-*.md                   ← Jupiter DX analysis
│   ├── landing-upgrade-compass.md     ← current landing tracker
│   └── issues/NNN-*.md                ← issue tracker
└── (no docs/adr/ yet)
```

## Read before writing

### For product copy or domain terminology

1. **`docs/prd.md`** — canonical source for terms like *smart wallet PDA*,
   *confidential numeric policy*, *policy gate*, *session key*, *policy_seq*,
   *execution rail*, *masked witness*, *MessageApproval*.
2. **`README.md`** — public-facing phrasing. When in doubt, match README over
   inventing new phrasing.
3. **`docs/demo-script.md`** — the three required demo outcomes
   (25 USDC blocked, 5 USDC Jupiter DCA approved, 5 USDC multi-chain Ika
   approved). Any copy that references scenarios should align with these.

### For integration-specific work

- **Encrypt**: `docs/encrypt-installation.md`, `docs/encrypt-devnet-e2e-runbook.md`,
  `docs/encrypt/`.
- **Ika**: `docs/ika-dwallet-prealpha-alignment.md`, `docs/ika-devnet-smoke-runbook.md`,
  `docs/ika-introduction.md`, `docs/ika-encrypt-integration-book.md`, `docs/ika/`.
- **Jupiter**: `docs/jupiter-dx-report.md`, `docs/jupiter-dx-notes.md`.

### For the landing page work (current focus)

- **`docs/landing-upgrade-compass.md`** — slice list, dependency graph,
  design-token reference, i18n cheat-sheet, definition of done.
- **`frontend/src/locale/dictionary.ts`** — source of all user-facing strings.

## Use the glossary's vocabulary

When your output names a domain concept (issue title, proposal, hypothesis,
test name, UI copy), use the term as defined in `docs/prd.md` / `README.md`.
Don't drift to synonyms that the product docs explicitly avoid.

Claim-sensitive phrasing to be careful with:

- **"Confidential" is OK.** "Private" and "encrypted" are also OK. "FHE"
  and "zero-knowledge" are **not** claimed — the Encrypt witness path is
  pre-alpha.
- **"Policy-gated signing" / "policy-gated approval" is OK for Ika.**
  "Settlement", "production MPC", "real bridgeless asset movement" are **not**
  claimed.
- **"Route/build preview" is OK for Jupiter.** "Mainnet swap execution" is
  **not** claimed.
- **"Devnet only"** must appear wherever a user could mistake the demo for
  mainnet-ready.

## Flag conflicts explicitly

If your output contradicts existing product copy or a documented position,
surface it rather than silently overriding:

> Contradicts `README.md` "How Polet uses Encrypt" section — proposing this
> change because the Encrypt witness fallback is no longer the primary path.

## ADRs

This repo doesn't have a `docs/adr/` folder yet. If you make a decision
significant enough to warrant one (e.g. replacing the Walrus-pattern hero
with a new approach, changing the i18n library, migrating off TanStack
Router), create `docs/adr/0001-<slug>.md` and flag it.

Until then, meaningful architectural decisions are captured inline in issues
under `## Implementation notes` and in this domain doc.
