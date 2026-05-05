# Quiet Fintech Frontend Visual Refresh

Labels: `needs-triage`

## Parent

`docs/prd.md`

## What to build

Refresh the frontend visual system from the current bright teal/green decorative presentation into a quieter fintech dashboard style. The product should feel like a serious wallet/security workflow: neutral surfaces, restrained primary color, readable status colors, compact information density, and no decorative background blobs or oversized marketing hero treatment.

## Acceptance criteria

- [x] The homepage first viewport is operational, not a large marketing hero.
- [x] Decorative radial blobs/orbs and high-saturation background effects are removed.
- [x] The palette uses neutral background and surface colors with a restrained primary action color.
- [x] Success, blocked, warning, and error colors are reserved for state communication and remain readable.
- [x] Cards and panels use consistent compact radii, borders, spacing, and typography suitable for a dashboard.
- [x] Text does not overflow buttons, tabs, cards, status strips, or activity log entries on mobile and desktop widths.
- [x] The visual refresh preserves Indonesian and English copy support in the key demo flow.
- [x] Frontend tests or screenshot checks cover the first viewport and the main DCA workflow at mobile and desktop widths.

## Implementation notes

- Replaced the large landing hero on `/` with an operational wallet workspace header and placed the DCA dashboard directly in the first viewport.
- Removed decorative radial/orb backgrounds from global CSS and route content; the background is now a neutral dashboard surface.
- Swapped the bright teal/green theme for neutral surfaces and a restrained blue primary action color, while keeping red/green/amber only for blocked/success/warning/error states.
- Tightened panel/card radii and shadows across the consumer dashboard path for a quieter fintech UI.
- Added first-viewport coverage in `frontend/src/routes/-index.test.tsx` and retained DCA workflow coverage in `DemoTab`/`WalletDashboard` tests.

## Verification

- `bun run test src/routes/-index.test.tsx src/components/DemoTab.test.tsx src/components/WalletDashboard.test.tsx` passes in `frontend/`.
- `bun run build` passes in `frontend/`.

## Blocked by

- `docs/issues/021-consumer-frontend-navigation-simplification.md`
