# Security Threat Model Intro

Labels: `needs-triage`, `frontend`, `copy`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Add a threat-model framing paragraph above the security 4-quadrant in the
current security section. The 4 quadrant cards are fine, but they list
defenses without first naming what they're defending against. A one-liner
threat assumption turns the section from "here are four technical facts"
into "assume your agent is compromised — here's what still protects you".

## Acceptance criteria

- [ ] New paragraph inserted between the existing section headline
      ("Layered defenses, no unilateral authority") and the 4-quadrant
      grid.
- [ ] Paragraph explicitly states the threat assumption: the agent, the
      proxy, or a session key may be compromised — the user is still
      protected because [the 4 layered defenses that follow].
- [ ] Copy localized in both EN and ID via new `security.threat.intro`
      key (and `security.threat.kicker` if a small lead-in is needed).
- [ ] Tone matches the existing `security.body` copy (technical, no
      marketing fluff, no inflated claims).
- [ ] Anti-claim: does not claim "unhackable", "zero trust", or
      production-grade privacy.
- [ ] Visual: paragraph uses existing body-copy styling (`qe-card` not
      needed — inline copy). No new tokens introduced.
- [ ] Mobile: paragraph remains readable at 375 viewport (≤ 5 lines).
- [ ] `-index.test.tsx` asserts the intro copy renders in both locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Suggested shape (EN):
> Assume the agent is compromised. Assume the proxy is compromised. Assume
> a session key leaks. Polet's smart-wallet PDA still owns the funds, the
> confidential policy still blocks over-limit spends, and `policy_seq`
> still rejects replayed attestations.

ID equivalent:
> Anggap agent-nya dikompromikan. Anggap proxy-nya dikompromikan. Anggap
> session key bocor. Smart-wallet PDA Polet tetap yang memegang dana,
> policy rahasia tetap memblokir spend di atas limit, dan `policy_seq`
> tetap menolak attestation yang direplay.

Keep the "assume X" parallel phrasing — it makes the threat model
memorable.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
