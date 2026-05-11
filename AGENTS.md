# Polet AI — Agent Guide

Polet AI is a confidential Solana control layer for AI agents. Funds custody
under a smart-wallet PDA, confidential numeric policy stays private on-chain,
AI agents get temporary session keys, and a single policy gate governs both
Jupiter DCA and Ika dWallet signing rails. Devnet-only, pre-alpha.

**Current focus: landing page upgrade for hackathon** (Colosseum Frontier ×
Solana). See `docs/landing-upgrade-compass.md`.

## Agent skills

### Issue tracker

Local markdown at `docs/issues/NNN-kebab-slug.md`. 79 issues so far (001–079).
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
| **Landing upgrade (current)** | `frontend/src/routes/index.tsx` + siblings in `frontend/src/components/` | `docs/landing-upgrade-compass.md`, issues 080–093 |
| Frontend app console (`/app`) | `frontend/src/routes/app.tsx`, `WalletDashboard`, `DemoTab` | issues 070–078 |
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
- **Design tokens**: CSS variables in `frontend/src/styles.css` — `--lagoon`,
  `--foam`, `--sea-ink`, `--sea-ink-soft`, `--coral`, `--palm`, `--sand`,
  `--sunset`, `--line`, `--line-strong`, `--bg-base`, `--surface`, etc. Class
  prefix `qe-*` for landing-scoped styles (wordmark, pills, badges, cards,
  buttons, reveal). Tailwind utility classes are fine for one-off spacing.
- **Motion**: always respect `@media (prefers-reduced-motion: reduce)`. Use
  `useScrollReveal()` for scroll-triggered reveals (see hook JSDoc for class
  names).
- **Section pattern**: JSX sections live inline in the route file for clarity;
  extract reusable primitives to `components/`. Dead code goes to
  `components/_archived/`.
- **Tests**: every landing section must have content assertions in
  `frontend/src/routes/-index.test.tsx` — ideally in both locales. Unit-level
  behaviour for extracted components gets its own test file.

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
| `docs/landing-upgrade-compass.md` | **Current landing upgrade tracker** |
| `docs/issues/` | Local markdown issue tracker |

## How skills should approach this repo

- Read `docs/prd.md` before touching product copy or domain terms.
- Read `docs/landing-upgrade-compass.md` before picking up a landing issue so
  dependencies and the slice goal are clear.
- For any new frontend string, add an i18n key — don't inline English.
- Publish new issues with the `NNN-kebab-slug.md` convention (next free number).
- Apply `needs-triage` on every new issue so `/triage` can pick it up.

## Git conventions

- **Commit author**: use the repo's existing `git config user.name`
  (currently `deranaz`). Do NOT change `git config`.
- **No agent attribution in commit messages**. Never add
  `Generated with [Devin]...`, `Co-Authored-By: Devin ...`, or any other
  agent / tool footer. Plain commit message body only. The repo's existing
  history is the canonical style — match it.
- **Commit message format**: `feat(scope): Phase N — short title` for phased
  rollouts, mirroring `feat(landing-v2): Phase N — ...` and
  `feat(portal): Phase N — ...`. Use `docs(...)`, `fix(...)`, `chore(...)`
  prefixes per Conventional Commits where appropriate.
- **Never push** unless the user explicitly asks.
