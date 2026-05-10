# Final CTA Audience-Split 3-Path

Labels: `needs-triage`, `frontend`, `copy`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Replace the final CTA panel's 2-button layout (`Open App` + `View on GitHub`)
with a 3-path audience-split: one path per reader type. The hero already
captures primary conversion ("Start building"). The final CTA should catch
the readers who aren't ready to jump into `/app` — reviewers, curious
users — by offering them a path that matches their stage.

## Acceptance criteria

- [ ] Final CTA panel shows three clearly separated paths:
  1. **Build** — `Open App` → `/app` (existing primary, remains the
     visually strongest)
  2. **Review** — `Read the demo script` OR `Watch the 3-min demo video`
     → external link or anchor. Appropriate for hackathon judges.
  3. **Explore** — `Try the simulation` → anchors to the demo widget
     (`#demo-widget`). For readers who want to play before reading.
- [ ] Each path has a one-line sub-label under the button explaining who
      it's for (e.g. "Developers" / "Reviewers" / "Curious").
- [ ] Layout: 3-column grid on `md+`, stacked on mobile with generous
      gap.
- [ ] Build / Open App remains visually primary (`qe-button--primary`).
      Review + Explore use `qe-button--secondary` or a softer variant.
- [ ] All copy in i18n keys under `cta.path.build.*`, `cta.path.review.*`,
      `cta.path.explore.*` (EN + ID). `cta.heading` and `cta.body` can
      stay (high-level framing) or be tightened.
- [ ] Review path destination: until a demo video exists, point to the
      GitHub demo-script doc or to `docs/demo-script.md` (external
      GitHub link). Note in the issue comment if the destination should
      change later.
- [ ] Mobile: buttons stack vertically with full width; sub-labels stay
      readable at 375 viewport.
- [ ] `-index.test.tsx` asserts the three button labels render in both
      locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Visual pattern reference: Vercel, Linear, and Stripe final CTA panels
sometimes segment by audience. Keep the split obvious (column separation,
slightly different button treatment per column) so a skimming reader
immediately sees "there is a path for me".

The existing `qe-cta-panel` class provides the gradient panel background.
No need to change the panel styling — the change is the button cluster
inside it.

Out of scope:
- Creating the actual demo video (separate future slice).
- Producing a dedicated reviewer landing page.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
