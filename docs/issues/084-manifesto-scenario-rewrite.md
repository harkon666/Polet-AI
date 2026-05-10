# Manifesto Scenario Rewrite

Labels: `needs-triage`, `frontend`, `copy`, `product`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Rewrite the manifesto section copy to lead with a concrete agent-delegation
scenario instead of three abstract risks. The current 3-problem cards are
structurally fine — the body and problem descriptions need sharper, more
grounded language that matches the "nyawa" goal for the landing upgrade.

Keep the 3-card layout and the `qe-card` styling. Rewrite the kicker,
headline, body, and per-problem titles/descriptions. Localize in EN and ID.

## Acceptance criteria

- [ ] Keys updated in both `en` and `id` dictionaries:
  - `manifesto.kicker`
  - `manifesto.headlineLead`, `manifesto.headlineRest`
  - `manifesto.body` — rewritten as a one-paragraph concrete scenario
    (e.g. "A developer delegates DCA to an agent. Today they have two
    bad choices: give the agent full wallet access, or run their own
    off-chain policy server…"). Tone: casual-technical, matches hero
    voice.
  - `manifesto.problem1.title` + `.desc`: public rules are exploitable
  - `manifesto.problem2.title` + `.desc`: off-chain enforcement is
    bypass-able
  - `manifesto.problem3.title` + `.desc`: cross-chain signing without
    policy
- [ ] Each problem description stays ≤ 2 lines at 1280 viewport and ≤ 4
      lines at 375 viewport.
- [ ] Anti-claim checklist: no production FHE / MPC / mainnet / settled
      asset claims.
- [ ] `-index.test.tsx` assertions updated for the new copy in both
      locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Scenario anchors to consider:
- "You built a DCA bot in an afternoon. It works. Now what?" — relatable
  to hackathon judges who are engineers.
- "An Indonesian DeFi user wants their agent to rebalance overnight." —
  fits the README target-user #1.
- "An AI agent asks to move 25 USDC — over your private limit." — sets
  up the demo scenario that appears later on the page.

Pick one anchor and commit to it in the body copy. Problem titles can stay
parallel in shape (short, three-word phrases) — but descriptions should
reference concrete consequences, not abstract categories.

Out of scope:
- Visual / layout changes (stay with 3-card grid).
- Adding or removing problems — keep exactly three.
- Security-model section (slice 087).

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
