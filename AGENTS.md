# Polet AI — Agent Guide

Polet AI is a confidential Solana control layer for AI agents. Funds custody
under a smart-wallet PDA, confidential numeric policy stays private on-chain,
AI agents get temporary session keys, and a single policy gate governs both
Jupiter DCA and Ika dWallet signing rails. Devnet-only, pre-alpha.

**Current focus: canonical frontend portal + landing for hackathon**
(Colosseum Frontier × Solana). See `docs/landing-v2-compass.md`.

## Agent skills

### Issue tracker

Local markdown at `docs/issues/NNN-kebab-slug.md`. 105 issues so far (001–105).
Sequential numbering, kebab-case slug. See
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Five canonical triage states (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`) plus repo category labels tuned for the hackathon
scope. See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Single-context repo. `docs/prd.md` is the source of product language,
`README.md` is the public narrative, `docs/demo-script.md` is the judging
narrative. See [`docs/agents/domain.md`](docs/agents/domain.md).

## Active work surfaces

| Surface | Where | Tracker refs |
|---|---|---|
| **Canonical frontend (current)** | `frontend/src/routes/index.tsx`, `frontend/src/routes/app*.tsx`, `frontend/src/components/` | `docs/landing-v2-compass.md`, issues 080–105 |
| Portal app console (`/app`) | `frontend/src/components/app/{portal,workspace,gate,funds,proof,bridge}/` | issues 099–105 |
| Contract | `contract/programs/` | issues 001–002, 014, 027, 050 |
| Proxy | `proxy/src/` | issues 016–017, 028 |
| SDK | `sdk/src/` | issues 006, 018, 029, 053 |

## Stack quick reference

| Workspace | Tech | Common commands |
|---|---|---|
| `frontend/` | TanStack Router v1 · Vite · React · Bun · Vitest · Playwright | `bun run dev` · `bun run test` · `bun run build` |
| `contract/` | Anchor (Solana), devnet | `NO_DNA=1 anchor build` · `NO_DNA=1 cargo test` |
| `proxy/` | Bun · Hono | `bun run dev` · `bun test` |
| `sdk/` | TypeScript | `bun run build` · `bun test` |

Program ID (devnet): `F7XdiThjkdRxmVpUDKn92Vf53SUEQbPqkTsmWNzrS99p`.
Ika Pre-Alpha program ID (devnet): `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`.

## Frontend conventions

These apply to the landing page and the `/app` console.

- **i18n**: every user-facing string lives in `frontend/src/locale/dictionary.ts`
  as a flat dot-namespaced key. EN is canonical; ID is a mirrored dictionary.
  Access via `const { t } = useLocale(); t('section.key')`. Never hard-code
  English in JSX.
- **Design tokens**: Tailwind v4 `@theme` tokens in `frontend/src/styles.css`
  — `--color-bg-base`, `--color-bg-deep`, `--color-surface`,
  `--color-line`, `--color-ink`, `--color-ink-soft`, `--color-lagoon`,
  `--color-lagoon-bright`, `--color-coral`, `--font-sans`, `--font-mono`,
  etc. Class prefix `pl-*` for landing/portal-scoped styles, motion, cards,
  buttons, reveal, and app shell compatibility. Tailwind utility classes are
  fine for one-off spacing.
- **Motion**: always respect `@media (prefers-reduced-motion: reduce)`. Use
  `useScrollReveal()` for scroll-triggered reveals (see hook JSDoc for class
  names).
- **Section pattern**: landing sections are extracted to `components/`; portal
  sections live under `components/app/`. Dead portal code goes to
  `components/app/_archived/`.
- **Tests**: every landing section must have content assertions in
  `frontend/src/routes/-index.test.tsx` — ideally in both locales. Route tests
  under `frontend/src/routes/` use the TanStack ignore prefix (`-*.test.*`).
  Unit-level behaviour for extracted components gets its own test file.

## Project docs map

| Doc | Purpose |
|---|---|
| `README.md` | Public narrative, run instructions, program IDs |
| `docs/prd.md` | Product requirements (source of domain language) |
| `docs/demo-script.md` | 5-minute hackathon demo flow, 3 required outcomes |
| `docs/progress.txt` | Progress log across milestones |
| `docs/agent-runtime.md` | Agent integration architecture |
| `docs/ika-dwallet-prealpha-alignment.md` | Ika Pre-Alpha integration pinning |
| `docs/jupiter-dx-report.md` | Jupiter API analysis |
| `docs/landing-v2-compass.md` | **Current canonical frontend tracker** |
| `docs/issues/` | Local markdown issue tracker |

## How skills should approach this repo

- Read `docs/prd.md` before touching product copy or domain terms.
- Read `docs/landing-v2-compass.md` before picking up a frontend issue so
  dependencies and the slice goal are clear.
- For any new frontend string, add an i18n key — don't inline English.
- Publish new issues with the `NNN-kebab-slug.md` convention (next free number).
- Apply `needs-triage` on every new issue so `/triage` can pick it up.