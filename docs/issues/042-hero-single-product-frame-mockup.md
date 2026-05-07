# Hero Single Product Frame Mockup

Labels: `needs-triage`

Type: `AFK`

## Parent

`docs/prd.md`

## What to build

Replace the current 3-floating-card hero visual (`frontend/src/components/HeroVisual.tsx`) with a single browser-framed product mockup component (`frontend/src/components/ProductFrameMockup.tsx`). The new component must mimic professional hero patterns from Linear, Phantom, and Mercury: one focal visual with a macOS-style window frame containing a polished representation of Polet's `/app` console.

This issue exists because the floating-cards approach has a structural failure mode: 3 absolute-positioned cards with variable content lengths and a continuous float animation produce unpredictable overlap and clipping at common viewport heights. Professional reference sites (Linear app screenshot, Phantom phone mockup, Stripe text-only hero) all show one focal visual or none — never multiple floating elements.

## Acceptance criteria

- [ ] New `frontend/src/components/ProductFrameMockup.tsx` renders a macOS-style browser window: traffic-light dots (red/yellow/green), URL bar showing `polet.ai/app`, and a content area below.
- [ ] Inside the frame, mock content shows: page title kicker + "Wallet console" heading, two stacked status cards (Confidential Policy with masked values + Active session with session-key info), and a "Run scenarios" button row with `25 USDC` / `5 USDC Jupiter` / `5 USDC Sui Ika` triplet styled like the actual `/app` Demo tab.
- [ ] No floating animation, no rotation, no scale differential — single focal element with one drop-shadow, optional fade-in on initial paint only.
- [ ] Frame fits within hero column without overflow at 1024-1920px viewports; content does not bleed beyond the frame.
- [ ] `routes/index.tsx` hero swaps `<HeroVisual />` for `<ProductFrameMockup />`.
- [ ] All 33 existing tests still pass.

## Implementation notes

Reference patterns:
- **Linear** uses one big app screenshot in a window frame as its hero visual. The screenshot shows real product UI with realistic content (ENG-2703 issue tracker, agents panel).
- **Phantom** uses one tilted iPhone mockup with the wallet app UI showing through the screen.
- **Mercury** shows one laptop/dashboard mockup with the banking UI.

The professional pattern is: one focal visual, framed cleanly, showing real product content. Not abstract floating compositions.

Component skeleton:

```tsx
<div className="qe-product-frame">
  <div className="qe-product-frame__chrome">
    <div className="qe-product-frame__dots"><span/><span/><span/></div>
    <div className="qe-product-frame__url">polet.ai/app</div>
  </div>
  <div className="qe-product-frame__viewport">
    {/* polished UI mock */}
  </div>
</div>
```

The viewport content should look like a real product screenshot, not a wireframe. Use the same tokens (`--lagoon-soft`, `--surface`, `--line`) as the rest of the design system so it feels native to Polet, not a stock template.

## Blocked by

None - can start immediately

## Reference research

- `https://linear.app/` — single app screenshot in window frame
- `https://phantom.com/` — single iPhone mockup hero
- `https://mercury.com/` — single dashboard mockup hero
- `https://stripe.com/` — text-only hero (no visual), proves single focal point principle
