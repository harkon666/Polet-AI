# Hero Typography & Layout Rebalance

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

After the hero visual is replaced with a single product frame mockup (issue 042), re-balance the surrounding hero layout: grid column ratios, headline typography scale, vertical alignment, and spacing rhythm. The goal is a confident, vertically-centered hero where text and visual feel intentionally paired rather than awkwardly placed.

This issue exists because the current 1.3fr / 1fr split was tuned for a 3-card floating cluster on the right. With a single product frame (taller, narrower), the proportions need to change. Headline typography also needs an upper bound that scales correctly: current `lg:text-[4rem] xl:text-[4.5rem]` was a stopgap to make "careful delegates" rotor word fit; with a wider text column, the headline can grow back to natural display sizes.

## Acceptance criteria

- [ ] Hero grid columns adjusted to feel balanced with the single frame visual (likely `1fr 1fr` or `1.1fr 1fr`, decided after visual width is locked).
- [ ] Headline type scale: `text-[2.25rem] sm:text-5xl md:text-[3.75rem] lg:text-[4.25rem] xl:text-[5rem]` or similar; reads natural 3 lines on lg+, no awkward 4-line wraps.
- [ ] Text column vertically centered with the frame column on lg+.
- [ ] Subhead width tuned (`max-w-xl` or `max-w-lg`) so it does not run too wide.
- [ ] CTA row stays on one line at lg+, wraps cleanly on sm.
- [ ] Tiny tech meta strip (Program · 32 tests · build) sits with consistent spacing below CTAs.
- [ ] No text overflow, no awkward whitespace gaps between hero and the trust strip below.

## Implementation notes

Once Slice 042 lands the single frame, the visual is more compact horizontally but taller vertically than the 3-card cluster. This means the text column can have more horizontal space, and vertical alignment becomes important.

Centering strategy:
- `align-items: center` on the hero grid
- Or explicit padding-top on the visual column to align baselines

Headline balance test cases:
- Longest rotor word: "careful delegates" (17 chars)
- "Confidential control" first line should not wrap
- "layer for [rotor]" second line should not wrap on lg+
- "on Solana." third line is short, fine

## Blocked by

`docs/issues/042-hero-single-product-frame-mockup.md`
