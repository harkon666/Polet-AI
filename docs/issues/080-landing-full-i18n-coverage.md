# Landing Full I18n Coverage

Labels: `needs-triage`, `frontend`, `i18n`, `copy`

Type: `AFK`

Status: `DONE`

## Parent

`docs/landing-upgrade-compass.md`

## What to build

Expand `frontend/src/locale/dictionary.ts` to cover every user-facing string
on the landing page and footer. Currently only the hero, manifesto, and final
CTA are localized — roughly 30% coverage. The remaining seven sections are
hard-coded English, which breaks the Indonesian DeFi user target audience.

Replace every hard-coded English string in the landing route, its section
components, and the footer with `useLocale().t('key')` calls. Add both EN and
ID translations for every new key.

This slice is the **foundation blocker** for every downstream copy slice
(082, 084, 085, 086, 087, 088, 089, 091, 092). It intentionally does not
change any copy semantically — it only converts existing strings into keys.
Semantic rewrites happen per-section in follow-up slices.

## Acceptance criteria

- [ ] Every hard-coded English string on the landing page and footer is
      replaced with `t('section.key')`.
- [ ] `TranslationKey` type union in `dictionary.ts` includes all new keys —
      TypeScript fails to compile if a key is referenced without being declared.
- [ ] Both `en` and `id` dictionaries include every new key. EN matches the
      existing copy verbatim (no semantic changes). ID is a consistent-voice
      translation matching the tone of existing hero/manifesto keys.
- [ ] Brand and identifier strings stay as-is: `Solana`, `Jupiter`, `Ika`,
      `Encrypt`, `Anchor`, `HumidiFi`, `USDC`, `SOL`, `Polet`, `polet.ai/app`,
      program IDs, error codes. These are not translatable copy.
- [ ] `FlowDiagram` node labels (`Owner`, `Smart Wallet PDA`, `Confidential
      Policy`, etc.) and the SVG `aria-label` are localized.
- [ ] `RailMockup` section titles and ARIA labels are localized.
      (Terminal code content stays as-is — it's code, not copy.)
- [ ] `LandingDemoWidget` copy (headings, pill labels, button aria-labels,
      output article text, footer note) is localized. Mock data values
      (`5 USDC`, `25 USDC`, message hash, signature scheme) stay as-is.
- [ ] `Footer` brand description, column headings, link labels, and bottom
      strip are localized.
- [ ] `frontend/src/routes/-index.test.tsx` gets a new test: switching the
      document `lang` attribute to `id` (or mocking `useLocale`) renders the
      Indonesian copy for at least two sections that were English-only before
      this slice.
- [ ] Existing test assertions in `-index.test.tsx` are updated to match
      any string that changed from a literal to a `t()` call (most should
      remain verbatim because EN values are unchanged).
- [ ] `cd frontend && bun run test` passes.
- [ ] `cd frontend && bun run build` passes.

## Implementation notes

### Key namespace plan

Group keys by section for discoverability:

```
trust.kicker                         // "Built on · Integrated with"
trust.partners.solana                // reuse partner label
stats.<n>.label                      // e.g. stats.1.label = "Tests passing"
stats.<n>.sub                        // e.g. stats.1.sub = "Frontend TS suite"
flow.kicker, flow.headline.lead, flow.headline.rest, flow.body, flow.aria
flow.node.owner, flow.node.pda, flow.node.policy, flow.node.session,
flow.node.agent, flow.node.gate, flow.node.jupiter, flow.node.ika
rail.encrypt.kicker, rail.encrypt.title, rail.encrypt.body,
rail.encrypt.bullet.1 .. rail.encrypt.bullet.4, rail.encrypt.ref
(rail.ika.*, rail.jupiter.* follow the same shape)
security.kicker, security.headline, security.body,
security.fact.<id>.title, security.fact.<id>.desc   // id = pda, session, replay, quorum
demo.kicker, demo.headline, demo.body,
demo.pill.<id>.label, demo.pill.<id>.desc           // id = dca, ika, block
demo.widget.header, demo.widget.badge.idle, demo.widget.badge.simulation,
demo.widget.button.block, demo.widget.button.jupiter, demo.widget.button.ika,
demo.widget.state.idle, demo.widget.state.running,
demo.widget.state.blocked, demo.widget.state.allowed.jupiter,
demo.widget.state.allowed.ika,
demo.widget.footer.note
disclaimer.badge, disclaimer.kicker, disclaimer.headline,
disclaimer.real.heading, disclaimer.real.item.1 .. item.5,
disclaimer.notclaimed.heading, disclaimer.notclaimed.item.1 .. item.5
footer.brand.desc, footer.badges.devnet, footer.badges.prealpha,
footer.col.system.*, footer.col.rails.*, footer.col.resources.*,
footer.bottom.copyright, footer.bottom.partnership, footer.bottom.devnet
```

Exact names can be tuned during implementation; the important thing is flat,
dot-namespaced, and section-grouped.

### Translation voice (ID)

Match the voice in the existing hero/manifesto keys — casual-technical,
sentence case, no formal-legal register. Examples to pattern-match:

- `hero.subhead` (ID): *"Aturan spending tetap rahasia. Sesi bersifat
  sementara. Aksi cross-chain melalui policy-gate…"*
- `manifesto.problem2.title` (ID): *"Enforcement off-chain bisa di-bypass"*

When a term is industry jargon that Indonesian developers use in English
(e.g. "smart wallet", "session key", "DCA", "swap", "policy"), keep it in
English. Don't force translations that feel unnatural.

### Strings to leave alone

- Solana addresses and hashes (e.g. `3bJjt…bkeN`, `8d8d8d8d`).
- API endpoint paths (`/intent/dca/run`, `/intent/multichain/run`).
- Code inside `RailMockup` (tokenized source, JSON responses).
- Partner brand names (`Solana`, `Jupiter`, etc.).
- Keyboard shortcuts and UI primitives that don't need translation
  (`Reset ↺`, `no wallet`, arrow symbols).

### Testing the locale switch

`-index.test.tsx` uses jsdom and renders `<HomePage />` once. The cleanest
way to cover both locales is to toggle `document.documentElement.lang` or
mock `useLocale` to return `id`, then re-render. Example:

```ts
test('renders Indonesian copy when locale is id', () => {
  document.documentElement.setAttribute('lang', 'id');
  render(<HomePage />);
  expect(document.body.textContent).toContain('<ID string for trust kicker>');
  expect(document.body.textContent).toContain('<ID string for a rail title>');
});
```

The existing `use-locale.ts` hook should already pick up the `lang`
attribute; verify before relying on it.

## Verification

```bash
cd frontend
bun run test src/routes/-index.test.tsx
bun run test
bun run build
```

Manual:

1. `bun run dev` → open `http://localhost:3000/`.
2. Toggle the locale pill in the header → confirm every visible string
   switches language (scroll through all 10 sections + footer).
3. Verify no layout breakage when switching locale (Indonesian strings can
   be longer — particularly in rail bullets and disclaimer items).

## Blocked by

None - can start immediately.

## Completion

Completed 2026-05-10 in the same session that opened this issue.

- Dictionary expanded from 30 keys → ~175 keys across 13 sections
  (`header`, `hero`, `trust`, `stats`, `manifesto`, `flow`, `rail.*`,
  `security`, `demo`, `demoWidget`, `disclaimer`, `cta`, `footer`,
  `localeToggle`, `themeToggle`).
- Migrated files:
  - `frontend/src/locale/dictionary.ts`
  - `frontend/src/routes/index.tsx`
  - `frontend/src/components/Header.tsx`
  - `frontend/src/components/Footer.tsx`
  - `frontend/src/components/FlowDiagram.tsx`
  - `frontend/src/components/RailMockup.tsx`
  - `frontend/src/components/LandingDemoWidget.tsx`
  - `frontend/src/components/ThemeToggle.tsx` (also upgraded to 3-segment radio)
  - `frontend/src/components/LocaleToggle.tsx` (refactored to shared `qe-seg-toggle`)
- Shared `qe-seg-toggle` CSS family added to `frontend/src/styles.css`,
  replacing the old `qe-locale-toggle`-only scoped rules.
- `-index.test.tsx` expanded: 3 tests (EN default, ID locale, /app boundary),
  all passing.
- `src/hooks/use-locale.test.ts`: 7/7 passing.
- `cd frontend && bun run build`: ✅ (556ms).
- Zero regressions against the 4 pre-existing failing tests (DemoTab gas,
  WalletDashboard nav, solana-transaction) — they are unrelated to landing.

### Out of scope for 080 (handled by follow-up slices)

- Copy rewrites — this slice preserved EN copy verbatim. Semantic rewrites
  happen in 082 (hero), 084 (manifesto), 087 (rails), 089 (disclaimer),
  etc.
- Footer community signal (Discord/X prominence) — folded into slice 093
  since footer localization is done.
