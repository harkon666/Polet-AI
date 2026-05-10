# Demo Widget Simulation Badge And Live Deeplink

Labels: `needs-triage`, `frontend`, `copy`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Upgrade the `LandingDemoWidget` component so reviewers cannot mistake the
mock scenarios for a live devnet run. The current widget has a subtle
"polet · mock api" header badge, but reviewers scanning the section can
miss it. Add a prominent "Simulation" badge and a per-response deeplink
that invites the user to re-run the same scenario on `/app` against live
devnet.

## Acceptance criteria

- [ ] Widget shows an explicit "Simulation · 0ms latency" pill in the
      header (or near the title), visually distinguishable from other
      badges on the page (e.g. tinted `--sunset-soft` background).
- [ ] Each allowed-state (Jupiter, Ika) response renders a small
      "Run this live on /app →" link at the bottom of the output card.
      The link is a `<Link to="/app">` (TanStack Router) so the app
      route pre-warms / prefetches.
- [ ] Blocked-state response renders an equivalent "See full blocked
      path on /app →" link.
- [ ] The reset button (`Reset ↺`) remains but is slightly de-emphasized
      so the "run live" link reads as the primary next action.
- [ ] All new copy lives in i18n keys under `demoWidget.live.*` and
      `demoWidget.simulation.*` (EN + ID).
- [ ] Visual: badge uses existing `qe-pill` tokens — no new one-off hex.
- [ ] ARIA: new link has a descriptive `aria-label` ("Open /app to run
      this Jupiter scenario on devnet", etc.).
- [ ] Anti-claim: "Simulation" is explicit — does not suggest the mock
      numbers match real devnet outcomes.
- [ ] Widget still works when a user clicks through all three scenarios
      consecutively (reset → run → reset → run).
- [ ] No behaviour regression: mock timings, output shapes, reset all
      still work.
- [ ] `-index.test.tsx` or a new `LandingDemoWidget.test.tsx` asserts the
      simulation badge + at least one live-deeplink render in both
      locales.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

Pairs well with slice 082 which adds the hero secondary CTA pointing at
`#demo-widget`. Once both land, a user can: land on hero → scroll to
demo → try scenarios → click "live on /app" → end up in the console. That
arc is the primary conversion path for a developer audience.

The existing mock timings (420 / 540 / 600ms) stay — don't "speed up to
0ms". The "0ms latency" text in the badge is editorial (refers to there
being no real network call), not a timing claim.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
