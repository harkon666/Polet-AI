# Hero Scenario Copy And Secondary CTA

Labels: `needs-triage`, `frontend`, `copy`, `design`

Type: `AFK`

Status: `TODO`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Rewrite the hero section copy to lead with a concrete scenario of agent
delegation instead of abstract claims, and add a secondary CTA that scrolls
to the demo widget section. Keep the current Walrus-style layout
(type-driven, single column, single focal CTA cluster) — this slice changes
copy and adds one button, not the layout.

This slice absorbs what would have been a separate "secondary CTA" slice
because the change lives in the same JSX block.

### Why this matters for "nyawa"

The current hero subhead reads like a product spec (three claims packed
into one run-on sentence). Competitors reviewers will compare against
(Linear, Phantom, Mercury, Walrus) all lead with a human moment — a user
outcome, not a feature list. The headline "Agents spend. Stay private." is
concise but disconnected; a reader doesn't know what "private" refers to.

Scenario-led hero:

- **Hook a reader on a mental image** of the delegation decision: "you want
  the agent to spend, but you don't want to hand over your wallet".
- **Name the fear** ("not your wallet") so the headline stakes out Polet's
  position instead of just describing mechanics.
- **Subhead anchors the three claims** (private limits, temporary sessions,
  policy-gated cross-chain) against the mental image, not in a vacuum.

## Acceptance criteria

- [ ] Hero dictionary keys rewritten in both EN and ID in
      `frontend/src/locale/dictionary.ts`:
  - `hero.kicker`
  - `hero.headline.line1`
  - `hero.headline.line2`
  - `hero.subhead`
  - `hero.cta.primary` (may stay "Start building" / "Mulai bangun")
  - `hero.cta.secondary` (new key, e.g. "See the policy gate →" /
    "Lihat policy gate-nya →")
- [ ] Secondary CTA button rendered in the hero `.qe-hero-cta-row`, styled
      as `qe-button qe-button--secondary qe-button--xl` to sit alongside
      the existing primary button.
- [ ] Secondary CTA is an anchor link (`<a href="#demo-widget">`) or
      `<button>` with a scroll handler that smooth-scrolls to the demo
      widget section.
- [ ] The demo widget `<section>` (currently "INTERACTIVE DEMO WIDGET" in
      `routes/index.tsx`) receives `id="demo-widget"` so the anchor resolves.
- [ ] CSS respects `@media (prefers-reduced-motion: reduce)`: reduced motion
      falls back to instant jump, not smooth scroll.
- [ ] `html { scroll-behavior: smooth; }` (or equivalent scoped rule) set in
      `styles.css`, wrapped in a `@media (prefers-reduced-motion: no-preference)`
      guard. If a scoped JS handler is used instead, it must also respect
      the media query.
- [ ] Primary + secondary CTAs stay on one line at ≥ 768 viewport; wrap
      cleanly on mobile (stacked, full-width each).
- [ ] Subhead reads ≤ 3 lines at 1280 viewport; ≤ 5 lines at 375 viewport.
- [ ] Hero headline fits without horizontal overflow at 375 viewport for
      both EN and ID copies (Indonesian strings can be longer).
- [ ] Meta strip (Devnet · Pre-Alpha · Program ID · tests · verified) is
      unchanged.
- [ ] `-index.test.tsx` assertions updated to match new hero copy in both
      locales. Include a new assertion that the secondary CTA text appears
      and that `#demo-widget` is a valid anchor target.
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

### Suggested copy (EN)

Draft only — finalize during implementation against `docs/prd.md` tone:

- `hero.kicker`: "Confidential wallet layer for AI agents"
- `hero.headline.line1`: "Give your agent a budget."
- `hero.headline.line2`: "Not your wallet."
- `hero.subhead`: "Set a private spending limit on a Solana smart-wallet
  PDA. Grant the agent a temporary session key. Jupiter DCA and Ika dWallet
  signings all pass the same on-chain policy gate — nothing leaks, nothing
  bypasses."
- `hero.cta.primary`: "Start building"
- `hero.cta.secondary`: "See the policy gate →"

### Suggested copy (ID)

- `hero.kicker`: "Lapisan wallet rahasia untuk AI agent"
- `hero.headline.line1`: "Kasih agent-mu budget."
- `hero.headline.line2`: "Bukan wallet-mu."
- `hero.subhead`: "Atur limit spending rahasia di smart-wallet PDA Solana.
  Kasih agent session key sementara. Jupiter DCA dan Ika dWallet signing
  lewat policy gate yang sama — tidak ada yang bocor, tidak ada yang
  bypass."
- `hero.cta.primary`: "Mulai bangun"
- `hero.cta.secondary`: "Lihat policy gate-nya →"

### Anti-claim check (required per `docs/agents/domain.md`)

- "Private spending limit" ✅ (matches README's "private spending
  guardrails").
- "Policy gate" / "policy-gated" ✅.
- Does NOT claim production MPC, production privacy, mainnet swap, or
  bridgeless settlement.
- "Devnet" is visible in the meta strip below the hero — don't remove.

### Scroll-to-anchor pattern

Simplest route: make the secondary CTA an `<a href="#demo-widget">` that
inherits the button styling:

```tsx
<a
  href="#demo-widget"
  className="qe-button qe-button--secondary qe-button--xl"
>
  {t('hero.cta.secondary')}
</a>
```

Then add the anchor target to the demo widget section in the same file:

```tsx
<section id="demo-widget" className="border-b border-[var(--line)] …">
```

Global smooth-scroll (respecting reduced motion):

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

Verify that on a reduced-motion setting the jump is instant (not "no scroll
at all" — that would be a regression).

### Out of scope

This slice does NOT:

- Add a visual mockup to the hero — that's slice 083 (HITL).
- Change hero grid, typography scale, or spacing — those rebalance to pair
  with 083.
- Touch the demo widget itself — that's slice 088.

## Verification

```bash
cd frontend
bun run test src/routes/-index.test.tsx
bun run test
bun run build
```

Manual:

1. `bun run dev` → open `http://localhost:3000/`.
2. Confirm new headline, subhead, primary + secondary CTAs render in EN.
3. Toggle locale → confirm ID copy renders and fits without overflow.
4. Click "See the policy gate →" → confirm smooth scroll (or instant jump
   under reduced-motion) to the demo widget section.
5. Test at 375 / 768 / 1280 / 1920 viewports — no horizontal overflow,
   no layout shift.

## Blocked by

- `docs/issues/080-landing-full-i18n-coverage.md`
